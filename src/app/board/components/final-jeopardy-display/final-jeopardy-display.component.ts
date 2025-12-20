import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameState, FinalJeopardyPhase } from '../../../shared/models/game-state.model';
import { Player } from '../../../shared/models/player.model';

@Component({
  selector: 'app-final-jeopardy-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './final-jeopardy-display.component.html',
  styleUrl: './final-jeopardy-display.component.scss'
})
export class FinalJeopardyDisplayComponent {
  @Input() gameState: GameState | null = null;

  get currentPhase(): FinalJeopardyPhase | null {
    return this.gameState?.finalJeopardyState?.phase || null;
  }

  get categoryTitle(): string {
    return this.gameState?.gameSet?.final?.category?.title || '';
  }

  get clueText(): string {
    return this.gameState?.gameSet?.final?.category?.clue?.clueText || '';
  }

  get correctResponse(): string {
    return this.gameState?.gameSet?.final?.category?.clue?.correctResponse || '';
  }

  get players(): Player[] {
    return this.gameState?.players || [];
  }

  get showWagers(): boolean {
    return this.gameState?.rules?.showWagersOnBoard || false;
  }

  get showResponses(): boolean {
    return this.gameState?.rules?.showResponsesOnBoard || false;
  }

  getPlayerWager(playerId: string): number | undefined {
    return this.gameState?.finalJeopardyState?.wagers.get(playerId);
  }

  getPlayerResponse(playerId: string): string | undefined {
    return this.gameState?.finalJeopardyState?.responses.get(playerId);
  }

  getPlayerAdjudication(playerId: string): boolean | undefined {
    return this.gameState?.finalJeopardyState?.adjudications.get(playerId);
  }

  get winner(): Player | null {
    if (!this.gameState?.winnerId) return null;
    return this.players.find(p => p.id === this.gameState?.winnerId) || null;
  }

  get isCategoryReveal(): boolean {
    return this.currentPhase === 'category-reveal';
  }

  get isWagerCollection(): boolean {
    return this.currentPhase === 'wager-collection';
  }

  get isClueReveal(): boolean {
    return this.currentPhase === 'clue-reveal';
  }

  get isResponseCollection(): boolean {
    return this.currentPhase === 'response-collection';
  }

  get isAdjudication(): boolean {
    return this.currentPhase === 'adjudication';
  }
}
