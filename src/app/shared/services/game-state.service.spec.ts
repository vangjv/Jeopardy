import { GameSet, Round } from '../models/game-content.model';
import { Player } from '../models/player.model';
import { GameStateService } from './game-state.service';

function createRound(prefix: string, dailyDoubleIds: string[] = []): Round {
  return {
    categories: Array.from({ length: 6 }, (_, categoryIndex) => ({
      id: `${prefix}-category-${categoryIndex}`,
      title: `Category ${categoryIndex + 1}`,
      clues: Array.from({ length: 5 }, (_, clueIndex) => {
        const id = `${prefix}-clue-${categoryIndex}-${clueIndex}`;
        return {
          id,
          clueText: `Clue ${categoryIndex + 1}-${clueIndex + 1}`,
          correctResponse: 'What is the response?',
          value: (clueIndex + 1) * (prefix === 'r1' ? 200 : 400),
          dailyDouble: dailyDoubleIds.includes(id),
        };
      }),
    })),
  };
}

function createGameSet(): GameSet {
  return {
    id: 'game',
    title: 'Deterministic Game',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    round1: createRound('r1', ['r1-clue-1-2']),
    round2: createRound('r2', ['r2-clue-0-1', 'r2-clue-2-3']),
    final: {
      category: {
        id: 'final-category',
        title: 'Final Category',
        clue: {
          id: 'final-clue',
          clueText: 'Final clue',
          correctResponse: 'Final response',
          value: 0,
          dailyDouble: false,
        },
      },
    },
  };
}

function createPlayers(): Player[] {
  return [
    { id: 'p1', name: 'Ada', score: 100, buzzerKey: 'A', color: '#3b82f6' },
    { id: 'p2', name: 'Grace', score: 200, buzzerKey: 'S', color: '#ef4444' },
  ];
}

describe('GameStateService', () => {
  let service: GameStateService;

  beforeEach(() => {
    service = new GameStateService();
    service.initializeGame(createPlayers(), createGameSet());
  });

  it('does not allow an already-used clue to be selected again', () => {
    service.selectClue('r1-category-0', 'r1-clue-0-0');
    service.clearActiveClue();
    service.selectClue('r1-category-0', 'r1-clue-0-0');

    expect(service.getCurrentState().activeClue).toBeNull();
    expect(service.getCurrentState().usedClueIds.has('r1-clue-0-0')).toBe(true);
  });

  it('keeps buzzing disabled for a Daily Double after the wager is set', () => {
    service.selectClue('r1-category-1', 'r1-clue-1-2');
    service.setDailyDoubleWager(100);

    const state = service.getCurrentState();
    expect(state.dailyDoubleWager).toBe(100);
    expect(state.buzzerEnabled).toBe(false);
    expect(state.lockedPlayerId).toBeNull();
  });

  it('starts Double Jeopardy with fresh clue usage', () => {
    service.markClueUsed('r1-clue-0-0');
    service.startRound('round2');

    expect(service.getCurrentState().currentRound).toBe('round2');
    expect(service.getCurrentState().usedClueIds.size).toBe(0);
  });

  it('scores each Final response once and waits for every adjudication before choosing a winner', () => {
    service.startFinalJeopardy();
    service.setFinalWager('p1', 50);
    service.setFinalWager('p2', 100);

    service.adjudicateFinalResponse('p1', true);
    service.adjudicateFinalResponse('p1', true);
    service.determineWinner();
    expect(service.getCurrentState().winnerId).toBeNull();

    service.adjudicateFinalResponse('p2', false);
    service.determineWinner();
    const state = service.getCurrentState();
    expect(state.players.find(player => player.id === 'p1')?.score).toBe(150);
    expect(state.players.find(player => player.id === 'p2')?.score).toBe(100);
    expect(state.winnerId).toBe('p1');
  });
});
