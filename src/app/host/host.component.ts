/**
 * HostComponent - Main container for host control interface
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameStateService } from '../shared/services/game-state.service';
import { BuzzerService } from '../shared/services/buzzer.service';
import { PlayerSetupComponent } from './components/player-setup/player-setup.component';
import { GameBoardControlComponent } from './components/game-board-control/game-board-control.component';
import { BuzzerPanelComponent } from './components/buzzer-panel/buzzer-panel.component';
import { ScoreAdjudicationComponent } from './components/score-adjudication/score-adjudication.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-host',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    PlayerSetupComponent,
    GameBoardControlComponent,
    BuzzerPanelComponent,
    ScoreAdjudicationComponent
  ],
  templateUrl: './host.component.html',
  styleUrl: './host.component.scss'
})
export class HostComponent implements OnInit, OnDestroy {
  private buzzSubscription?: Subscription;
  private boardWindow: Window | null = null;

  constructor(
    private readonly gameStateService: GameStateService,
    private readonly buzzerService: BuzzerService
  ) {}

  ngOnInit(): void {
    // Subscribe to game state to configure buzzer keys
    this.gameStateService.getState().subscribe(state => {
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
    });

    // Subscribe to buzzer events
    this.buzzSubscription = this.buzzerService.getBuzzEvents().subscribe(buzzEvent => {
      this.gameStateService.lockBuzz(buzzEvent.playerId, buzzEvent.timestamp);
    });
  }

  ngOnDestroy(): void {
    this.buzzSubscription?.unsubscribe();
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
}
