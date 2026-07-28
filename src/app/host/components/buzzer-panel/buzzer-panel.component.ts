/**
 * BuzzerPanelComponent - Displays buzzer state and controls for host
 * Shows who buzzed in and provides controls to reset buzzer
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameStateService } from '../../../shared/services/game-state.service';
import { Player } from '../../../shared/models/player.model';

@Component({
  selector: 'app-buzzer-panel',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './buzzer-panel.component.html',
  styleUrl: './buzzer-panel.component.scss'
})
export class BuzzerPanelComponent implements OnInit {
  protected readonly buzzerEnabled = signal(false);
  protected readonly buzzLocked = signal(false);
  protected readonly lockedPlayer = signal<Player | null>(null);
  protected readonly lockedOutPlayers = signal<Player[]>([]);
  protected readonly players = signal<Player[]>([]);
  protected readonly controlPlayerId = signal<string | null>(null);

  constructor(private readonly gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.gameStateService.getState().subscribe(state => {
      this.buzzerEnabled.set(state.buzzerEnabled);
      this.buzzLocked.set(state.buzzLocked);
      this.players.set(state.players);
      this.controlPlayerId.set(state.controlPlayerId);

      // Find locked player
      if (state.lockedPlayerId) {
        const player = state.players.find(p => p.id === state.lockedPlayerId);
        this.lockedPlayer.set(player || null);
      } else {
        this.lockedPlayer.set(null);
      }

      // Find locked-out players
      const lockedOut = state.players.filter(p =>
        state.lockedOutPlayerIds.has(p.id)
      );
      this.lockedOutPlayers.set(lockedOut);
    });
  }

  /**
   * Reset buzzer state
   */
  protected resetBuzz(): void {
    this.gameStateService.resetBuzz();
  }

  /**
   * Clear all lockouts
   */
  protected clearLockouts(): void {
    this.gameStateService.clearLockouts();
  }

  protected setControl(playerId: string): void {
    this.gameStateService.setControlPlayer(playerId);
  }
}
