/**
 * DailyDoubleWagerComponent - Daily Double wager input
 * Allows host to enter wager for Daily Double clues (T073)
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { GameStateService } from '../../../shared/services/game-state.service';
import { ValidationService } from '../../../shared/services/validation.service';
import { Player } from '../../../shared/models/player.model';
import { 
  getMinDailyDoubleWager, 
  getMaxDailyDoubleWager 
} from '../../../shared/utils/wager-calculator';

@Component({
  selector: 'app-daily-double-wager',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './daily-double-wager.component.html',
  styleUrl: './daily-double-wager.component.scss'
})
export class DailyDoubleWagerComponent implements OnInit {
  protected readonly showWagerInput = signal(false);
  protected readonly controlPlayer = signal<Player | null>(null);
  protected readonly wagerAmount = signal<number>(0);
  protected readonly minWager = signal<number>(5);
  protected readonly maxWager = signal<number>(1000);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly gameStateService: GameStateService,
    private readonly validationService: ValidationService
  ) {}

  ngOnInit(): void {
    this.gameStateService.getState().subscribe(state => {
      // Show wager input when Daily Double is active and wager not yet set
      const isDailyDouble = state.activeClue?.isDailyDouble || false;
      const wagerNotSet = state.dailyDoubleWager === null;
      this.showWagerInput.set(isDailyDouble && wagerNotSet);

      if (state.controlPlayerId) {
        const player = state.players.find(p => p.id === state.controlPlayerId);
        this.controlPlayer.set(player || null);

        // Calculate wager limits
        if (player) {
          this.minWager.set(getMinDailyDoubleWager());
          this.maxWager.set(getMaxDailyDoubleWager(player, state));
          
          // Default wager to max
          this.wagerAmount.set(this.maxWager());
        }
      } else {
        this.controlPlayer.set(null);
      }

      // Hide input once wager is set
      if (state.dailyDoubleWager !== null) {
        this.showWagerInput.set(false);
      }
    });
  }

  /**
   * Submit wager (T078)
   */
  protected submitWager(): void {
    const player = this.controlPlayer();
    const wager = this.wagerAmount();
    
    if (!player) {
      this.errorMessage.set('No player selected');
      return;
    }

    const state = this.gameStateService.getCurrentState();
    
    // Validate wager (T076)
    const validation = this.validationService.validateDailyDoubleWager(
      player.id, 
      wager, 
      state
    );

    if (!validation.valid) {
      const errorMsg = validation.errors.map(e => e.message).join(', ');
      this.errorMessage.set(errorMsg);
      return;
    }

    // Clear error and set wager
    this.errorMessage.set(null);
    this.gameStateService.setDailyDoubleWager(wager);
  }

  /**
   * Validate wager on input change
   */
  protected onWagerChange(): void {
    const wager = this.wagerAmount();
    const min = this.minWager();
    const max = this.maxWager();

    if (wager < min || wager > max) {
      this.errorMessage.set(`Wager must be between $${min} and $${max}`);
    } else {
      this.errorMessage.set(null);
    }
  }
}
