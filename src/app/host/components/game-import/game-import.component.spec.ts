import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GameState } from '../../../shared/models/game-state.model';
import { GameStateService } from '../../../shared/services/game-state.service';
import { ValidationService } from '../../../shared/services/validation.service';
import { BUILT_IN_GAME_LIBRARY } from './built-in-game-library';
import { GameImportComponent } from './game-import.component';

describe('GameImportComponent', () => {
  const players = [
    { id: 'player-1', name: 'Ada', score: 125, buzzerKey: 'A', color: '#3b82f6' },
    { id: 'player-2', name: 'Grace', score: 250, buzzerKey: 'S', color: '#ef4444' },
  ];
  let state: GameState;
  let initializeGame: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    state = {
      players,
      gameSet: null,
      currentRound: 'round1',
      phase: 'round1',
      usedClueIds: new Set(),
      activeClue: null,
      finalJeopardyState: null,
    } as unknown as GameState;
    initializeGame = vi.fn();
    await TestBed.configureTestingModule({
      imports: [GameImportComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: GameStateService,
          useValue: {
            getCurrentState: () => state,
            initializeGame,
          },
        },
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(GameImportComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('activates the native single-file JSON picker explicitly', () => {
    const fixture = createComponent();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    const button = Array.from(element.querySelectorAll('button')).find(
      candidate => candidate.textContent?.includes('Import JSON file'),
    )!;

    button.click();

    expect(click).toHaveBeenCalledTimes(1);
    expect(input.accept).toBe('.json');
    expect(input.multiple).toBe(false);
  });

  it('treats picker cancellation as a no-op', () => {
    const fixture = createComponent();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    const read = vi.spyOn(FileReader.prototype, 'readAsText');

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(read).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(initializeGame).not.toHaveBeenCalled();
    read.mockRestore();
  });

  it('statically includes and validates all 22 games-folder JSON files plus the sample', () => {
    const validation = TestBed.inject(ValidationService);
    const builtInGames = BUILT_IN_GAME_LIBRARY.filter(item => !item.isSample);

    expect(builtInGames).toHaveLength(22);
    expect(BUILT_IN_GAME_LIBRARY).toHaveLength(23);
    expect(new Set(BUILT_IN_GAME_LIBRARY.map(item => item.id)).size).toBe(23);
    for (const item of BUILT_IN_GAME_LIBRARY) {
      expect(validation.validateGameSetJson(item.game), item.title).toMatchObject({ valid: true });
      expect(item.game.round1.categories).toHaveLength(6);
      expect(item.game.round2.categories).toHaveLength(6);
      expect(item.game.round1.categories.every(category => category.clues.length === 5)).toBe(true);
      expect(item.game.round2.categories.every(category => category.clues.length === 5)).toBe(true);
      const clues = [
        ...item.game.round1.categories.flatMap(category => category.clues),
        ...item.game.round2.categories.flatMap(category => category.clues),
        item.game.final.category.clue,
      ];
      expect(clues).toHaveLength(61);
      expect(new Set(clues.map(clue => clue.id)).size).toBe(61);
      expect(new Set(clues.map(clue => clue.clueText)).size).toBe(61);
      expect(clues.filter(clue => clue.dailyDouble).length).toBe(3);
      expect(item.game.round1.categories.flatMap(category => category.clues).filter(clue => clue.dailyDouble)).toHaveLength(1);
      expect(item.game.round2.categories.flatMap(category => category.clues).filter(clue => clue.dailyDouble)).toHaveLength(2);
    }
  });

  it('stages library content for preview without creating players or initializing live state', () => {
    const fixture = createComponent();
    const sampleButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.library-entry'),
    ).find(button => button.textContent?.includes('Sample'))!;

    sampleButton.click();
    fixture.detectChanges();

    expect(initializeGame).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Preview only');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.library-entry').length).toBe(23);
    expect(state.players).toEqual(players);
  });

  it('previews each round and hides the selected response until explicitly revealed', () => {
    const fixture = createComponent();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector('.library-entry')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(element.querySelectorAll('.category-column')).toHaveLength(6);
    expect(element.querySelectorAll('.clue-preview')).toHaveLength(30);
    const clue = element.querySelector<HTMLButtonElement>('.clue-preview')!;
    clue.click();
    fixture.detectChanges();
    expect(element.querySelector('.question')?.textContent?.trim()).toBeTruthy();
    expect(element.querySelector('.answer')).toBeNull();
    element.querySelector<HTMLButtonElement>('.clue-detail button')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.answer')?.textContent).toContain('Response:');

    element.querySelector<HTMLButtonElement>('.round-tabs button[aria-pressed="false"]')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.category-column')).toHaveLength(6);
    element.querySelector<HTMLButtonElement>('.round-tabs button:last-child')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.final-preview')).not.toBeNull();
    expect(element.querySelectorAll('.category-column')).toHaveLength(0);
    expect(initializeGame).not.toHaveBeenCalled();
  });

  it('blocks explicit load with invalid player setup and preserves a valid staged game', () => {
    state = { ...state, players: [] };
    const fixture = createComponent();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector('.library-entry')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.preview-actions button:last-child')!.click();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Must have 2-3 players');
    expect(element.querySelector('.preview')).not.toBeNull();
    expect(initializeGame).not.toHaveBeenCalled();
  });

  it('loads only on explicit action and preserves existing contestants and scores', () => {
    const fixture = createComponent();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector('.library-entry')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(initializeGame).not.toHaveBeenCalled();

    element.querySelector<HTMLButtonElement>('.preview-actions button:last-child')!.click();

    expect(initializeGame).toHaveBeenCalledOnce();
    expect(initializeGame.mock.calls[0][0]).toBe(players);
    expect(initializeGame.mock.calls[0][0].map((player: typeof players[number]) => player.score)).toEqual([
      125,
      250,
    ]);
    expect(initializeGame.mock.calls[0][1]).toBe(BUILT_IN_GAME_LIBRARY[0].game);
  });

  it('cancels preview without mutating live state and protects in-progress replacement', () => {
    const fixture = createComponent();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector('.library-entry')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.preview-actions button:first-child')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.preview')).toBeNull();
    expect(initializeGame).not.toHaveBeenCalled();

    element.querySelector('.library-entry')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    state = { ...state, gameSet: BUILT_IN_GAME_LIBRARY[0].game, usedClueIds: new Set(['clue-1']) };
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    element.querySelector<HTMLButtonElement>('.preview-actions button:last-child')!.click();
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(initializeGame).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('preserves an earlier staged game when an invalid imported JSON file is selected', async () => {
    const fixture = createComponent();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector('.library-entry')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    const invalid = new File(['{"title": "broken"}'], 'broken.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [invalid] });
    input.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 20));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('.preview')).not.toBeNull();
    expect(element.querySelector('[role="alert"]')?.textContent).toMatch(/Validation failed|Could not read/);
    expect(initializeGame).not.toHaveBeenCalled();
  });
});
