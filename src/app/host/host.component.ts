/**
 * HostComponent - Main container for host control interface
 */

import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { GameStateService } from '../shared/services/game-state.service';
import { BuzzerService } from '../shared/services/buzzer.service';
import { SyncService } from '../shared/services/sync.service';
import { AudioService } from '../shared/services/audio.service';
import { PlayerSetupComponent } from './components/player-setup/player-setup.component';
import { GameBoardControlComponent } from './components/game-board-control/game-board-control.component';
import { BuzzerPanelComponent } from './components/buzzer-panel/buzzer-panel.component';
import { ScoreAdjudicationComponent } from './components/score-adjudication/score-adjudication.component';
import { GameImportComponent } from './components/game-import/game-import.component';
import { DailyDoubleWagerComponent } from './components/daily-double-wager/daily-double-wager.component';
import { FinalJeopardyComponent } from './components/final-jeopardy/final-jeopardy.component';
import { GameRulesComponent } from './components/game-rules/game-rules.component';
import { SoundboardComponent } from './components/soundboard/soundboard.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-host',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatExpansionModule,
    MatDividerModule,
    MatSidenavModule,
    PlayerSetupComponent,
    GameBoardControlComponent,
    BuzzerPanelComponent,
    ScoreAdjudicationComponent,
    GameImportComponent,
    DailyDoubleWagerComponent,
    FinalJeopardyComponent,
    GameRulesComponent,
    SoundboardComponent
  ],
  templateUrl: './host.component.html',
  styleUrl: './host.component.scss'
})
export class HostComponent implements OnInit, OnDestroy {
  private buzzSubscription?: Subscription;
  private boardReadySubscription?: Subscription;
  private stateSubscription?: Subscription;
  private boardWindow: Window | null = null;
  private lastDailyDoubleClueId: string | null = null;
  protected readonly gameLoaded = signal(false);
  protected readonly currentRound = signal<'round1' | 'round2' | 'final'>('round1');
  protected readonly finalActive = signal(false);

  constructor(
    private readonly gameStateService: GameStateService,
    private readonly buzzerService: BuzzerService,
    private readonly syncService: SyncService,
    private readonly audioService: AudioService
  ) {}

  ngOnInit(): void {
    // Initialize SyncService as host (T040)
    this.syncService.initialize('host');

    // Set sync service reference in GameStateService
    this.gameStateService.setSyncService(this.syncService);

    // Subscribe to game state to configure buzzer keys
    this.stateSubscription = this.gameStateService.getState().subscribe(state => {
      this.gameLoaded.set(state.gameSet !== null);
      this.currentRound.set(state.currentRound);
      this.finalActive.set(state.currentRound === 'final');

      const keyMap = new Map<string, string>();
      state.players.forEach(player => {
        if (player.buzzerKey) {
          keyMap.set(player.buzzerKey, player.id);
        }
      });
      this.buzzerService.configureBuzzerKeys(keyMap);

      // Update lockouts in buzzer service
      this.buzzerService.setLockedOutPlayers(state.lockedOutPlayerIds);

      // Enable/disable buzzer based on state
      if (state.buzzerEnabled) {
        this.buzzerService.enableBuzzer();
      } else {
        this.buzzerService.disableBuzzer();
      }

      // Lock buzzer if needed
      if (state.buzzLocked) {
        this.buzzerService.lockBuzzer();
      }

      // Play Daily Double sting once per clue when a Daily Double is opened
      const activeClue = state.activeClue;
      if (activeClue?.isDailyDouble && activeClue.clue.id !== this.lastDailyDoubleClueId) {
        this.audioService.play('daily-double');
        this.lastDailyDoubleClueId = activeClue.clue.id;
      } else if (!activeClue) {
        this.lastDailyDoubleClueId = null;
      }
    });

    // Subscribe to buzzer events
    this.buzzSubscription = this.buzzerService.getBuzzEvents().subscribe(buzzEvent => {
      this.gameStateService.lockBuzz(buzzEvent.playerId, buzzEvent.timestamp);
    });

    // Subscribe to BOARD_READY messages to respond with full state (T043)
    this.boardReadySubscription = this.syncService.onBoardReady().subscribe(() => {
      const currentState = this.gameStateService.getCurrentState();
      this.syncService.broadcastStateSync(currentState);
    });
  }

  ngOnDestroy(): void {
    this.buzzSubscription?.unsubscribe();
    this.boardReadySubscription?.unsubscribe();
    this.stateSubscription?.unsubscribe();
    this.syncService.destroy();
  }

  /**
   * Open board display in new window
   */
  protected openBoard(): void {
    const width = 1920;
    const height = 1080;
    const left = window.screen.width - width;
    const top = 0;

    this.boardWindow = window.open(
      '/board',
      'jeopardy-board',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  }

  /**
   * Start game (transition from setup to round1)
   */
  protected startGame(): void {
    this.gameStateService.startRound('round1');
  }

  /**
   * T082: Start Round 1
   */
  protected startRound1(): void {
    this.gameStateService.startRound('round1');
  }

  /**
   * T082: Start Round 2 (Double Jeopardy)
   */
  protected startRound2(): void {
    this.gameStateService.startRound('round2');
  }

  /**
   * T082: Advance to next round
   */
  protected advanceRound(): void {
    this.gameStateService.advanceRound();
  }

  protected startFinalJeopardy(): void {
    this.gameStateService.startFinalJeopardy();
  }

  /**
   * T082: Check if current round is complete
   */
  protected isRoundComplete(): boolean {
    return this.gameStateService.isRoundComplete();
  }

  protected pauseAllAudio(): void {
    this.audioService.pauseAll();
  }

  protected resumeAudio(): void {
    this.audioService.resumeAll();
  }
}
