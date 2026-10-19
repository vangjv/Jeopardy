import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GameStateService } from '../../../shared/services/game-state.service';
import { GameImportComponent } from './game-import.component';

describe('GameImportComponent file picker', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameImportComponent],
      providers: [
        provideHttpClient(),
        provideZonelessChangeDetection(),
        { provide: GameStateService, useValue: {} },
      ],
    }).compileComponents();
  });

  it('explicitly activates the native file input from the import button', () => {
    const fixture = TestBed.createComponent(GameImportComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    const button = Array.from(element.querySelectorAll('button')).find(
      candidate => candidate.textContent?.includes('Import JSON File'),
    )!;

    button.click();

    expect(click).toHaveBeenCalledTimes(1);
    expect(input.accept).toBe('.json');
    expect(input.multiple).toBe(false);
  });

  it('does not start reading or show an error when the picker is cancelled', () => {
    const fixture = TestBed.createComponent(GameImportComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    const read = vi.spyOn(FileReader.prototype, 'readAsText');

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(read).not.toHaveBeenCalled();
    expect(element.querySelector('.error-message')).toBeNull();
    expect(element.querySelector('button')?.disabled).toBe(false);
    read.mockRestore();
  });
});
