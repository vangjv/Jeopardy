/**
 * GameImportComponent - Load game content from JSON
 */

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameStateService } from '../../../shared/services/game-state.service';
import { ValidationService } from '../../../shared/services/validation.service';
import { GameSet } from '../../../shared/models/game-content.model';

@Component({
  selector: 'app-game-import',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './game-import.component.html',
  styleUrl: './game-import.component.scss'
})
export class GameImportComponent {
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal(false);

  constructor(
    private readonly http: HttpClient,
    private readonly gameStateService: GameStateService,
    private readonly validationService: ValidationService
  ) {}

  /**
   * Load sample game
   */
  protected loadSampleGame(): void {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    this.http.get<GameSet>('/assets/game-sets/sample-game.json').subscribe({
      next: (gameSet) => {
        // Validate game set
        const validation = this.validationService.validateGameSetJson(gameSet);
        
        if (!validation.valid) {
          this.error.set(`Validation failed: ${validation.errors.map((e: any) => e.message).join(', ')}`);
          this.loading.set(false);
          return;
        }

        // Initialize game with sample players (use existing or create new)
        const state = this.gameStateService.getCurrentState();
        const players = state.players.length > 0 ? state.players : [
          { id: crypto.randomUUID(), name: 'Player 1', score: 0, buzzerKey: 'A', color: '#3b82f6' },
          { id: crypto.randomUUID(), name: 'Player 2', score: 0, buzzerKey: 'S', color: '#ef4444' },
          { id: crypto.randomUUID(), name: 'Player 3', score: 0, buzzerKey: 'D', color: '#10b981' }
        ];

        const playerValidation = this.validationService.validatePlayers(players);
        if (!playerValidation.valid) {
          this.error.set(
            `Player setup is invalid: ${playerValidation.errors.map(e => e.message).join(', ')}`,
          );
          this.loading.set(false);
          return;
        }

        this.gameStateService.initializeGame(players, gameSet);
        this.success.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(`Failed to load game: ${err.message}`);
        this.loading.set(false);
      }
    });
  }

  /**
   * Handle file input
   */
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const gameSet = JSON.parse(content) as GameSet;

        // Validate game set
        const validation = this.validationService.validateGameSetJson(gameSet);
        
        if (!validation.valid) {
          this.error.set(`Validation failed: ${validation.errors.map((e: any) => e.message).join(', ')}`);
          this.loading.set(false);
          return;
        }

        // Load game (players should already be set up)
        const state = this.gameStateService.getCurrentState();
        const playerValidation = this.validationService.validatePlayers(state.players);
        if (!playerValidation.valid) {
          this.error.set(
            `Player setup is invalid: ${playerValidation.errors.map(e => e.message).join(', ')}`,
          );
          this.loading.set(false);
          return;
        }

        this.gameStateService.initializeGame(state.players, gameSet);
        this.success.set(true);
        this.loading.set(false);
      } catch (err) {
        this.error.set(`Failed to parse JSON: ${(err as Error).message}`);
        this.loading.set(false);
      }
    };

    reader.readAsText(file);
  }
}
