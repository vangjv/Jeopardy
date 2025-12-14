/**
 * BuzzIndicatorComponent - Buzz-in indicator for board display
 * Shows which player has buzzed in
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../shared/services/game-state.service';
import { Player } from '../../../shared/models/player.model';

@Component({
  selector: 'app-buzz-indicator',
  imports: [CommonModule],
  templateUrl: './buzz-indicator.component.html',
  styleUrl: './buzz-indicator.component.scss'
})
export class BuzzIndicatorComponent implements OnInit {
  protected readonly buzzActive = signal(false);
  protected readonly lockedPlayer = signal<Player | null>(null);
  protected readonly lockedOutPlayers = signal<Player[]>([]);

  constructor(private readonly gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.gameStateService.getState().subscribe(state => {
      this.buzzActive.set(state.buzzLocked && state.lockedPlayerId !== null);

      if (state.lockedPlayerId) {
        const player = state.players.find(p => p.id === state.lockedPlayerId);
        this.lockedPlayer.set(player || null);
      } else {
        this.lockedPlayer.set(null);
      }

      // Track locked-out players (T070)
      const lockedOut = state.players.filter(p =>
        state.lockedOutPlayerIds.has(p.id)
      );
      this.lockedOutPlayers.set(lockedOut);
    });
  }
}
