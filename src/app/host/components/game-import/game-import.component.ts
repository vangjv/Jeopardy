import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameStateService } from '../../../shared/services/game-state.service';
import { ValidationService } from '../../../shared/services/validation.service';
import { Category, Clue, GameSet, RoundType } from '../../../shared/models/game-content.model';
import { ValidationResult } from '../../../shared/models/validation.model';
import { BUILT_IN_GAME_LIBRARY, GameLibraryEntry } from './built-in-game-library';

interface PreviewClue {
  readonly categoryTitle: string;
  readonly clue: Clue;
}

@Component({
  selector: 'app-game-import',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './game-import.component.html',
  styleUrl: './game-import.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameImportComponent {
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal(false);
  protected readonly search = signal('');
  protected readonly pendingGame = signal<GameSet | null>(null);
  protected readonly pendingSource = signal('');
  protected readonly previewRound = signal<RoundType>('round1');
  protected readonly selectedClue = signal<PreviewClue | null>(null);
  protected readonly answerRevealed = signal(false);
  protected readonly library = BUILT_IN_GAME_LIBRARY;
  protected readonly filteredLibrary = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.library
      .filter(item => !query || this.searchableText(item).includes(query))
      .slice()
      .sort((left, right) => left.title.localeCompare(right.title, undefined, { numeric: true }));
  });
  protected readonly previewCategories = computed<readonly Category[]>(() => {
    const game = this.pendingGame();
    const round = this.previewRound();
    if (!game || round === 'final') return [];
    return game[round].categories;
  });

  constructor(
    private readonly gameStateService: GameStateService,
    private readonly validationService: ValidationService,
  ) {}

  protected categorySummary(item: GameLibraryEntry): string {
    return item.game.round1.categories.map(category => category.title).join(' · ');
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected stageLibraryGame(item: GameLibraryEntry): void {
    this.stageGame(item.game, item.isSample ? 'Built-in sample questions' : 'Built-in game library');
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset immediately so cancellation and same-file retry remain native-picker compatible.
    input.value = '';
    if (!file) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);
    const reader = new FileReader();
    reader.onerror = () => {
      this.error.set(`Could not read "${file.name}". Choose the file again and retry.`);
      this.loading.set(false);
    };
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result ?? ''));
        const validation = this.validationService.validateGameSetJson(parsed);
        if (!validation.valid) {
          this.error.set(this.validationMessage(validation));
          return;
        }
        this.stageGame(parsed as GameSet, `Imported file: ${file.name}`);
      } catch (cause: unknown) {
        const message = cause instanceof Error ? cause.message : 'Unknown JSON parsing error';
        this.error.set(`Could not parse "${file.name}" as JSON: ${message}`);
      } finally {
        this.loading.set(false);
      }
    };
    reader.readAsText(file);
  }

  protected setPreviewRound(round: RoundType): void {
    this.previewRound.set(round);
    this.selectedClue.set(null);
    this.answerRevealed.set(false);
  }

  protected inspectClue(categoryTitle: string, clue: Clue): void {
    this.selectedClue.set({ categoryTitle, clue });
    this.answerRevealed.set(false);
  }

  protected revealAnswer(): void {
    this.answerRevealed.set(true);
  }

  protected cancelPreview(): void {
    this.pendingGame.set(null);
    this.pendingSource.set('');
    this.selectedClue.set(null);
    this.answerRevealed.set(false);
    this.error.set(null);
    this.success.set(false);
  }

  protected loadGame(): void {
    const game = this.pendingGame();
    if (!game || this.loading()) return;

    const state = this.gameStateService.getCurrentState();
    const playerValidation = this.validationService.validatePlayers(state.players);
    if (!playerValidation.valid) {
      this.error.set(`Player setup is invalid: ${playerValidation.errors.map(issue => issue.message).join(', ')}`);
      this.success.set(false);
      return;
    }

    if (this.isGameInProgress() && !window.confirm('Load this game and reset the current game progress?')) {
      return;
    }

    this.error.set(null);
    this.gameStateService.initializeGame(state.players, game);
    this.success.set(true);
  }

  private stageGame(game: GameSet, source: string): void {
    const validation = this.validationService.validateGameSetJson(game);
    if (!validation.valid) {
      this.error.set(this.validationMessage(validation));
      this.success.set(false);
      return;
    }
    this.pendingGame.set(game);
    this.pendingSource.set(source);
    this.previewRound.set('round1');
    this.selectedClue.set(null);
    this.answerRevealed.set(false);
    this.error.set(null);
    this.success.set(false);
  }

  private validationMessage(validation: ValidationResult): string {
    return `Validation failed: ${validation.errors.map(issue => `${issue.path} ${issue.message}`).join('; ')}`;
  }

  private searchableText(item: GameLibraryEntry): string {
    const categories = [
      ...item.game.round1.categories,
      ...item.game.round2.categories,
      item.game.final.category,
    ].map(category => category.title);
    return `${item.title} ${item.id} ${categories.join(' ')}`.toLocaleLowerCase();
  }

  private isGameInProgress(): boolean {
    const state = this.gameStateService.getCurrentState();
    return Boolean(
      state.gameSet &&
        (state.usedClueIds.size > 0 ||
          state.activeClue ||
          state.currentRound !== 'round1' ||
          state.phase !== 'round1' ||
          state.finalJeopardyState),
    );
  }
}
