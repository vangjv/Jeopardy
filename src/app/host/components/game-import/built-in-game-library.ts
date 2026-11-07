import game9533 from '../../../../../games/game-9533.json';
import game9534 from '../../../../../games/game-9534.json';
import game9535 from '../../../../../games/game-9535.json';
import game9536 from '../../../../../games/game-9536.json';
import game9537 from '../../../../../games/game-9537.json';
import game9538 from '../../../../../games/game-9538.json';
import game9539 from '../../../../../games/game-9539.json';
import game9540 from '../../../../../games/game-9540.json';
import game9541 from '../../../../../games/game-9541.json';
import game9542 from '../../../../../games/game-9542.json';
import game9543 from '../../../../../games/game-9543.json';
import game9544 from '../../../../../games/game-9544.json';
import game9545 from '../../../../../games/game-9545.json';
import game9546 from '../../../../../games/game-9546.json';
import game9547 from '../../../../../games/game-9547.json';
import game9548 from '../../../../../games/game-9548.json';
import game9549 from '../../../../../games/game-9549.json';
import game9550 from '../../../../../games/game-9550.json';
import game9551 from '../../../../../games/game-9551.json';
import game9552 from '../../../../../games/game-9552.json';
import game9553 from '../../../../../games/game-9553.json';
import game9555 from '../../../../../games/game-9555.json';
import sampleGame from '../../../../assets/game-sets/sample-game.json';
import { GameSet } from '../../../shared/models/game-content.model';

export interface GameLibraryEntry {
  readonly id: string;
  readonly title: string;
  readonly game: GameSet;
  readonly isSample?: boolean;
}

function entry(game: unknown, isSample = false): GameLibraryEntry {
  const content = game as GameSet;
  return { id: content.id, title: content.title, game: content, isSample };
}

/** Statically bundled question sets; selecting one never performs a network request. */
export const BUILT_IN_GAME_LIBRARY: readonly GameLibraryEntry[] = [
  entry(sampleGame, true),
  entry(game9533),
  entry(game9534),
  entry(game9535),
  entry(game9536),
  entry(game9537),
  entry(game9538),
  entry(game9539),
  entry(game9540),
  entry(game9541),
  entry(game9542),
  entry(game9543),
  entry(game9544),
  entry(game9545),
  entry(game9546),
  entry(game9547),
  entry(game9548),
  entry(game9549),
  entry(game9550),
  entry(game9551),
  entry(game9552),
  entry(game9553),
  entry(game9555),
];
