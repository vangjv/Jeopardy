/**
 * PlayerSetupComponent - Contestant configuration interface
 * Allows host to add/remove players and assign buzzer keys
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { GameStateService } from '../../../shared/services/game-state.service';
import { Player } from '../../../shared/models/player.model';

interface PlayerForm {
  id: string;
  name: string;
  buzzerKey: string;
}

@Component({
  selector: 'app-player-setup',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule
  ],
  templateUrl: './player-setup.component.html',
  styleUrl: './player-setup.component.scss'
})
export class PlayerSetupComponent implements OnInit {
  protected readonly players = signal<PlayerForm[]>([]);
  protected readonly keyConflicts = signal<Set<string>>(new Set());
  protected readonly canAddPlayer = signal(true);

  constructor(private readonly gameStateService: GameStateService) {}

  ngOnInit(): void {
    // Subscribe to game state to sync players
    this.gameStateService.getState().subscribe(state => {
      const playerForms = state.players.map(p => ({
        id: p.id,
        name: p.name,
        buzzerKey: p.buzzerKey
      }));
      this.players.set(playerForms);
      this.canAddPlayer.set(state.players.length < 3);
    });
  }

  /**
   * Add a new player
   */
  protected addPlayer(): void {
    const defaultKeys = ['A', 'S', 'D'];
    const defaultColors = ['#3b82f6', '#ef4444', '#10b981'];
    const usedKeys = new Set(this.players().map(p => p.buzzerKey));
    const nextKey = defaultKeys.find(k => !usedKeys.has(k)) || '';
    const nextColor = defaultColors[this.players().length] || '#808080';

    // Add to service (addPlayer generates ID)
    this.gameStateService.addPlayer({
      name: `Player ${this.players().length + 1}`,
      score: 0,
      buzzerKey: nextKey,
      color: nextColor
    });
  }

  /**
   * Remove a player
   */
  protected removePlayer(id: string): void {
    this.gameStateService.removePlayer(id);
  }

  /**
   * Update player name
   */
  protected updatePlayerName(id: string, name: string): void {
    this.gameStateService.updatePlayer(id, { name });
  }

  /**
   * Update player buzzer key
   */
  protected updateBuzzKey(id: string, buzzerKey: string): void {
    const upperKey = buzzerKey.toUpperCase();
    this.gameStateService.updatePlayer(id, { buzzerKey: upperKey });
    this.validateKeys();
  }

  /**
   * Validate buzzer keys for conflicts
   */
  private validateKeys(): void {
    const keys = this.players().map(p => p.buzzerKey).filter(k => k);
    const conflicts = new Set<string>();
    const seen = new Set<string>();

    for (const key of keys) {
      if (seen.has(key)) {
        conflicts.add(key);
      }
      seen.add(key);
    }

    this.keyConflicts.set(conflicts);
  }

  /**
   * Check if a key has a conflict
   */
  protected hasKeyConflict(buzzerKey: string): boolean {
    return this.keyConflicts().has(buzzerKey);
  }
}
