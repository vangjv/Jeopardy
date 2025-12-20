import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { GameStateService } from '../../../shared/services/game-state.service';
import { GameState, FinalJeopardyPhase } from '../../../shared/models/game-state.model';
import { Player } from '../../../shared/models/player.model';
import { ValidationService } from '../../../shared/services/validation.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-final-jeopardy',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatStepperModule
  ],
  templateUrl: './final-jeopardy.component.html',
  styleUrl: './final-jeopardy.component.scss'
})
export class FinalJeopardyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  gameState: GameState | null = null;
  wagerForm: FormGroup;
  responseForm: FormGroup;
  adjudicationForm: FormGroup;

  categoryRevealed = false;
  wagersCollected = false;
  clueRevealed = false;
  responsesCollected = false;

  constructor(
    private gameStateService: GameStateService,
    private validationService: ValidationService,
    private fb: FormBuilder
  ) {
    // Initialize forms
    this.wagerForm = this.fb.group({});
    this.responseForm = this.fb.group({});
    this.adjudicationForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.gameStateService.getState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.gameState = state;
        this.updatePhaseState(state);
        this.buildForms(state.players);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updatePhaseState(state: GameState): void {
    if (!state.finalJeopardyState) return;

    const phase = state.finalJeopardyState.phase;
    this.categoryRevealed = phase !== 'category-reveal';
    this.wagersCollected = phase !== 'category-reveal' && phase !== 'wager-collection';
    this.clueRevealed = phase === 'clue-reveal' || phase === 'response-collection' || phase === 'adjudication';
    this.responsesCollected = phase === 'adjudication';
  }

  private buildForms(players: Player[]): void {
    // Build wager form
    const wagerControls: { [key: string]: any } = {};
    players.forEach(player => {
      const maxWager = this.getMaxWager(player);
      wagerControls[player.id] = [
        this.gameState?.finalJeopardyState?.wagers.get(player.id) || 0,
        [Validators.required, Validators.min(0), Validators.max(maxWager)]
      ];
    });
    this.wagerForm = this.fb.group(wagerControls);

    // Build response form
    const responseControls: { [key: string]: any } = {};
    players.forEach(player => {
      responseControls[player.id] = [
        this.gameState?.finalJeopardyState?.responses.get(player.id) || '',
        [Validators.required]
      ];
    });
    this.responseForm = this.fb.group(responseControls);

    // Build adjudication form
    const adjudicationControls: { [key: string]: any } = {};
    players.forEach(player => {
      adjudicationControls[player.id] = [
        this.gameState?.finalJeopardyState?.adjudications.get(player.id) || false
      ];
    });
    this.adjudicationForm = this.fb.group(adjudicationControls);
  }

  startFinalJeopardy(): void {
    this.gameStateService.startFinalJeopardy();
  }

  revealCategory(): void {
    this.categoryRevealed = true;
    this.gameStateService.transitionFinalPhase('wager-collection');
  }

  getMaxWager(player: Player): number {
    return Math.max(0, player.score);
  }

  validateWager(playerId: string): boolean {
    const wager = this.wagerForm.get(playerId)?.value;
    const player = this.gameState?.players.find(p => p.id === playerId);
    if (!player || !this.gameState) return false;

    const result = this.validationService.validateFinalWager(playerId, wager, this.gameState);
    return result.valid;
  }

  collectWagers(): void {
    if (this.wagerForm.invalid) {
      Object.keys(this.wagerForm.controls).forEach(key => {
        this.wagerForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Save all wagers
    Object.keys(this.wagerForm.value).forEach(playerId => {
      const wager = this.wagerForm.value[playerId];
      this.gameStateService.setFinalWager(playerId, wager);
    });

    this.wagersCollected = true;
    this.gameStateService.transitionFinalPhase('clue-reveal');
  }

  revealClue(): void {
    this.clueRevealed = true;
    this.gameStateService.transitionFinalPhase('response-collection');
  }

  collectResponses(): void {
    if (this.responseForm.invalid) {
      Object.keys(this.responseForm.controls).forEach(key => {
        this.responseForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Save all responses
    Object.keys(this.responseForm.value).forEach(playerId => {
      const response = this.responseForm.value[playerId];
      this.gameStateService.setFinalResponse(playerId, response);
    });

    this.responsesCollected = true;
    this.gameStateService.transitionFinalPhase('adjudication');
  }

  adjudicateResponse(playerId: string, correct: boolean): void {
    this.gameStateService.adjudicateFinalResponse(playerId, correct);
    this.adjudicationForm.patchValue({ [playerId]: correct });
  }

  revealResults(): void {
    // All adjudications complete, show winner
    this.gameStateService.determineWinner();
  }

  get finalCategory(): string {
    return this.gameState?.gameSet?.final?.category?.title || '';
  }

  get finalClue(): string {
    return this.gameState?.gameSet?.final?.category?.clue?.clueText || '';
  }

  get correctResponse(): string {
    return this.gameState?.gameSet?.final?.category?.clue?.correctResponse || '';
  }

  get winner(): Player | null {
    if (!this.gameState?.winnerId) return null;
    return this.gameState.players.find(p => p.id === this.gameState?.winnerId) || null;
  }

  /**
   * Helper to check if a player has been adjudicated
   */
  isAdjudicated(playerId: string): boolean {
    return this.gameState?.finalJeopardyState?.adjudications?.get(playerId) !== undefined;
  }

  /**
   * Helper to get adjudication result for a player
   */
  getAdjudicationResult(playerId: string): boolean | undefined {
    return this.gameState?.finalJeopardyState?.adjudications?.get(playerId);
  }
}
