/**
 * BuzzerService - Handles keyboard buzzer input with high-precision timing
 * Detects first buzz with <10ms accuracy using DOMHighResTimeStamp
 */

import { Injectable } from '@angular/core';
import { Subject, Observable, fromEvent } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface BuzzEvent {
  playerId: string;
  buzzKey: string;
  timestamp: number; // DOMHighResTimeStamp from performance.now()
}

@Injectable({
  providedIn: 'root'
})
export class BuzzerService {
  private buzzSubject = new Subject<BuzzEvent>();
  private activeKeys = new Map<string, string>(); // key -> playerId
  private buzzerEnabled = false;
  private buzzLocked = false;
  private lockedOutPlayerIds = new Set<string>();
  private keydownListener: ((event: KeyboardEvent) => void) | null = null;

  constructor() {
    this.initializeKeyboardListener();
  }

  /**
   * Get observable of buzz events
   */
  getBuzzEvents(): Observable<BuzzEvent> {
    return this.buzzSubject.asObservable();
  }

  /**
   * Configure buzzer keys for players
   * @param keyMap Map of buzz key to player ID
   */
  configureBuzzerKeys(keyMap: Map<string, string>): void {
    this.activeKeys = new Map(keyMap);
  }

  /**
   * Enable buzzer input
   */
  enableBuzzer(): void {
    this.buzzerEnabled = true;
    this.buzzLocked = false;
  }

  /**
   * Disable buzzer input
   */
  disableBuzzer(): void {
    this.buzzerEnabled = false;
  }

  /**
   * Lock buzzer (after first buzz)
   */
  lockBuzzer(): void {
    this.buzzLocked = true;
  }

  /**
   * Reset buzzer state (clear lock and lockouts)
   */
  resetBuzzer(): void {
    this.buzzLocked = false;
  }

  /**
   * Set locked-out players who cannot buzz
   */
  setLockedOutPlayers(playerIds: Set<string>): void {
    this.lockedOutPlayerIds = new Set(playerIds);
  }

  /**
   * Clear all lockouts
   */
  clearLockouts(): void {
    this.lockedOutPlayerIds.clear();
  }

  /**
   * Initialize keyboard event listener
   */
  private initializeKeyboardListener(): void {
    this.keydownListener = (event: KeyboardEvent) => {
      // Ignore if buzzer not enabled or already locked
      if (!this.buzzerEnabled || this.buzzLocked) {
        return;
      }

      // Get uppercase key
      const key = event.key.toUpperCase();

      // Check if key is mapped to a player
      const playerId = this.activeKeys.get(key);
      if (!playerId) {
        return;
      }

      // Check if player is locked out
      if (this.lockedOutPlayerIds.has(playerId)) {
        return;
      }

      // Prevent default to avoid key handling in forms
      event.preventDefault();

      // Get high-resolution timestamp
      const timestamp = performance.now();

      // Lock buzzer immediately to prevent duplicates
      this.buzzLocked = true;

      // Emit buzz event
      this.buzzSubject.next({
        playerId,
        buzzKey: key,
        timestamp
      });
    };

    // Attach listener to document
    document.addEventListener('keydown', this.keydownListener);
  }

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
    }
    this.buzzSubject.complete();
  }
}
