import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AudioService, SOUND_LIBRARY, SoundDefinition } from '../../../shared/services/audio.service';

@Component({
  selector: 'app-soundboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './soundboard.component.html',
  styleUrl: './soundboard.component.scss'
})
export class SoundboardComponent {
  protected readonly sounds = SOUND_LIBRARY;

  @Output() readonly close = new EventEmitter<void>();

  constructor(private readonly audioService: AudioService) {}

  protected play(sound: SoundDefinition): void {
    this.audioService.play(sound.id, sound.src, !!sound.loop);
  }

  protected closePanel(): void {
    this.close.emit();
  }
}
