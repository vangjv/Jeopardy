import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { GameStateService } from '../../../shared/services/game-state.service';
import { GameRules } from '../../../shared/models/game-state.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-game-rules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSlideToggleModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatExpansionModule
  ],
  templateUrl: './game-rules.component.html',
  styleUrl: './game-rules.component.scss'
})
export class GameRulesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  rules: GameRules = {
    wrongAnswerSubtractsValue: true,
    allowNegativeScores: true,
    lockoutWrongResponder: true,
    buzzerTimeoutSeconds: null,
    responseTimeoutSeconds: 10,
    showCorrectResponseOnBoard: false,
    showWagersOnBoard: false,
    showResponsesOnBoard: false,
    round1Values: [200, 400, 600, 800, 1000],
    round2Values: [400, 800, 1200, 1600, 2000],
  };

  constructor(private gameStateService: GameStateService) {}

  ngOnInit(): void {
    // Load current rules from game state
    this.gameStateService.getState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.rules = { ...state.rules };
      });

    // Try to load saved rules from localStorage
    this.loadSavedRules();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Apply rules to game state
   */
  applyRules(): void {
    this.gameStateService.updateRules(this.rules);
    this.saveRules();
  }

  /**
   * Reset rules to defaults
   */
  resetToDefaults(): void {
    this.rules = {
      wrongAnswerSubtractsValue: true,
      allowNegativeScores: true,
      lockoutWrongResponder: true,
      buzzerTimeoutSeconds: null,
      responseTimeoutSeconds: 10,
      showCorrectResponseOnBoard: false,
      showWagersOnBoard: false,
      showResponsesOnBoard: false,
      round1Values: [200, 400, 600, 800, 1000],
      round2Values: [400, 800, 1200, 1600, 2000],
    };
    this.applyRules();
  }

  /**
   * Save rules to localStorage (T123)
   */
  private saveRules(): void {
    try {
      localStorage.setItem('jeopardy-game-rules', JSON.stringify(this.rules));
    } catch (error) {
      console.error('Failed to save rules to localStorage:', error);
    }
  }

  /**
   * Load rules from localStorage (T124)
   */
  private loadSavedRules(): void {
    try {
      const saved = localStorage.getItem('jeopardy-game-rules');
      if (saved) {
        const loadedRules = JSON.parse(saved);
        this.rules = { ...this.rules, ...loadedRules };
        // Apply loaded rules to game state
        this.gameStateService.updateRules(this.rules);
      }
    } catch (error) {
      console.error('Failed to load rules from localStorage:', error);
    }
  }

  /**
   * Update round values
   */
  updateRound1Values(index: number, value: number): void {
    this.rules.round1Values[index] = value;
  }

  updateRound2Values(index: number, value: number): void {
    this.rules.round2Values[index] = value;
  }

  /**
   * Handle timeout value changes (convert null/undefined to null for "no timeout")
   */
  onBuzzerTimeoutChange(value: number | null): void {
    this.rules.buzzerTimeoutSeconds = value === 0 || !value ? null : value;
  }

  onResponseTimeoutChange(value: number | null): void {
    this.rules.responseTimeoutSeconds = value === 0 || !value ? null : value;
  }
}
