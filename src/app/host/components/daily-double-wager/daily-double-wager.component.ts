/**
 * DailyDoubleWagerComponent - Daily Double wager input
 * Allows host to enter wager for Daily Double clues (T073)
 */

import { Component, OnInit, OnDestroy, signal } from '@angular/core';
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
import { Subscription } from 'rxjs';

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
export class DailyDoubleWagerComponent implements OnInit, OnDestroy {
  protected readonly showWagerInput = signal(false);
  protected readonly controlPlayer = signal<Player | null>(null);
  private readonly _wagerAmount = signal<number>(0);
  protected readonly minWager = signal<number>(5);
  protected readonly maxWager = signal<number>(1000);
  protected readonly errorMessage = signal<string | null>(null);
  
  private stateSubscription?: Subscription;
  private wagerInitialized = false;
  private lastActiveClueId: string | null = null;

  // Getter/setter for two-way binding with validation
  protected get wagerAmount(): number {
    return this._wagerAmount();
  }
  
  protected set wagerAmount(value: number) {
    this._wagerAmount.set(value);
    // Validation will be triggered on blur or submit to avoid excessive calls
  }

  constructor(
    private readonly gameStateService: GameStateService,
    private readonly validationService: ValidationService
  ) {}

  ngOnInit(): void {
    this.stateSubscription = this.gameStateService.getState().subscribe(state => {
      // Show wager input when Daily Double is active and wager not yet set
      const isDailyDouble = state.activeClue?.isDailyDouble || false;
      const wagerNotSet = state.dailyDoubleWager === null;
      const currentClueId = state.activeClue?.clue.id || null;
      
      // Detect when a new Daily Double clue is selected
      const isNewClue = currentClueId !== this.lastActiveClueId;
      if (isNewClue) {
        this.lastActiveClueId = currentClueId;
        this.wagerInitialized = false;
      }
      
      this.showWagerInput.set(isDailyDouble && wagerNotSet);

      if (state.controlPlayerId) {
        const player = state.players.find(p => p.id === state.controlPlayerId);
        this.controlPlayer.set(player || null);

        if (player) {
          // Update wager limits
          this.updateWagerLimits(player, state);
          
          // Set default only for new Daily Double clues
          if (isDailyDouble && !this.wagerInitialized) {
            this._wagerAmount.set(this.maxWager());
            this.wagerInitialized = true;
          }
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
   * Update wager min/max limits (DRY principle)
   */
  private updateWagerLimits(player: Player, state: any): void {
    this.minWager.set(getMinDailyDoubleWager());
    this.maxWager.set(getMaxDailyDoubleWager(player, state));
  }

  /**
   * Validate current wager (DRY principle)
   */
  private validateCurrentWager(): boolean {
    const player = this.controlPlayer();
    const wager = this._wagerAmount();
    
    if (!player) {
      this.errorMessage.set('No player selected');
      return false;
    }

    const state = this.gameStateService.getCurrentState();
    const validation = this.validationService.validateDailyDoubleWager(
      player.id, 
      wager, 
      state
    );

    if (!validation.valid) {
      const errorMsg = validation.errors.map(e => e.message).join(', ');
      this.errorMessage.set(errorMsg);
      return false;
    }

    this.errorMessage.set(null);
    return true;
  }

  /**
   * Submit wager (T078)
   */
  protected submitWager(): void {
    if (!this.validateCurrentWager()) {
      return;
    }

    // Set wager in game state
    this.gameStateService.setDailyDoubleWager(this._wagerAmount());
  }

  /**
   * Validate wager on blur (avoids excessive validation on every keystroke)
   */
  protected onWagerBlur(): void {
    this.validateCurrentWager();
  }

  /**
   * Clean up subscription to prevent memory leaks
   */
  ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
  }
}
