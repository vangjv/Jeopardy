import { Injectable } from '@angular/core';

export type SoundKey =
  | 'board-fill'
  | 'daily-double'
  | 'correct'
  | 'incorrect'
  | 'final-jeopardy'
  | 'jeopardy-think'
  | 'round-over'
  | 'times-up';

export interface SoundDefinition {
  id: SoundKey;
  label: string;
  src: string;
  loop?: boolean;
}

export const SOUND_LIBRARY: SoundDefinition[] = [
  { id: 'board-fill', label: 'Board Fill', src: '/sounds/board-fill.mp3' },
  { id: 'daily-double', label: 'Daily Double', src: '/sounds/daily-double.mp3' },
  { id: 'correct', label: 'Correct Response', src: '/sounds/correct.mp3' },
  { id: 'incorrect', label: 'Incorrect Response', src: '/sounds/incorrect.mp3' },
  { id: 'final-jeopardy', label: 'Final Jeopardy', src: '/sounds/final-jeopardy.mp3' },
  { id: 'jeopardy-think', label: 'Think Music', src: '/sounds/jeopardy-think-music.mp3', loop: true },
  { id: 'round-over', label: 'Round Over', src: '/sounds/round-over.mp3' },
  { id: 'times-up', label: 'Times Up', src: '/sounds/times-up.mp3' }
];

@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly audioMap = new Map<string, HTMLAudioElement>();
  private currentSoundId: string | null = null;

  play(soundId: SoundKey | string, src?: string, loop = false): void {
    const resolvedSrc = src ?? this.resolveSrc(soundId);
    if (!resolvedSrc) {
      console.warn(`[AudioService] No source found for soundId: ${soundId}`);
      return;
    }

    this.stopAll();

    const audio = this.ensureAudio(soundId, resolvedSrc);
    audio.loop = loop;
    audio.currentTime = 0;

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(err => this.reportPlaybackError('Playback', err));
    }

    this.currentSoundId = soundId;
  }

  pauseAll(): void {
    if (!this.currentSoundId) {
      return;
    }

    const audio = this.audioMap.get(this.currentSoundId);
    if (audio && !audio.paused) {
      audio.pause();
    }
  }

  resumeAll(): void {
    if (!this.currentSoundId) {
      return;
    }

    const audio = this.audioMap.get(this.currentSoundId);
    if (audio && audio.paused) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(err => this.reportPlaybackError('Resume', err));
      }
    }
  }

  stopAll(): void {
    this.audioMap.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.currentSoundId = null;
  }

  getAvailableSounds(): SoundDefinition[] {
    return SOUND_LIBRARY;
  }

  private ensureAudio(soundId: SoundKey | string, src: string): HTMLAudioElement {
    if (!this.audioMap.has(soundId)) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      this.audioMap.set(soundId, audio);
    }

    return this.audioMap.get(soundId)!;
  }

  private resolveSrc(soundId: SoundKey | string): string | undefined {
    const match = SOUND_LIBRARY.find(sound => sound.id === soundId);
    return match?.src;
  }

  private reportPlaybackError(action: 'Playback' | 'Resume', error: unknown): void {
    if (
      error !== null &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      return;
    }

    console.error(`[AudioService] ${action} error`, error);
  }
}
