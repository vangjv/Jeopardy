import { Player } from '../models/player.model';
import { ValidationService } from './validation.service';

describe('ValidationService player setup', () => {
  let service: ValidationService;
  let players: Player[];

  beforeEach(() => {
    service = new ValidationService();
    players = [
      { id: 'p1', name: 'Ada', score: 0, buzzerKey: 'A', color: '#3b82f6' },
      { id: 'p2', name: 'Grace', score: 0, buzzerKey: 'S', color: '#ef4444' },
    ];
  });

  it('accepts two or three contestants with unique buzzer keys', () => {
    expect(service.validatePlayers(players).valid).toBe(true);
    expect(
      service.validatePlayers([
        ...players,
        { id: 'p3', name: 'Katherine', score: 0, buzzerKey: 'D', color: '#10b981' },
      ]).valid,
    ).toBe(true);
  });

  it('rejects an invalid contestant count', () => {
    const result = service.validatePlayers(players.slice(0, 1));
    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.code === 'PLAYER_COUNT')).toBe(true);
  });

  it('rejects duplicate buzzer keys', () => {
    players[1] = { ...players[1], buzzerKey: 'A' };
    const result = service.validatePlayers(players);
    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.code === 'DUPLICATE_BUZZER_KEY')).toBe(true);
  });
});
