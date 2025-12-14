/**
 * ClueBoardComponent - Main game board display for contestants/audience
 * Shows 6 categories × 5 clue values, optimized for 1080p+ displays
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../shared/services/game-state.service';
import { Category } from '../../../shared/models/game-content.model';
import { isRound } from '../../../shared/utils/type-guards';

interface ClueCell {
  id: string;
  value: number;
  used: boolean;
}

@Component({
  selector: 'app-clue-board',
  imports: [CommonModule],
  templateUrl: './clue-board.component.html',
  styleUrl: './clue-board.component.scss'
})
export class ClueBoardComponent implements OnInit {
  protected readonly categories = signal<Category[]>([]);
  protected readonly clueGrid = signal<ClueCell[][]>([]);
  protected readonly currentRound = signal<string>('round1');

  constructor(private readonly gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.gameStateService.getState().subscribe(state => {
      this.currentRound.set(state.currentRound);

      // Load current round categories
      if (state.gameSet) {
        const round = state.gameSet[state.currentRound];
        if (round && isRound(round)) {
          this.categories.set(round.categories);
          this.buildClueGrid(round.categories, state.usedClueIds);
        }
      }
    });
  }

  /**
   * Build 2D grid of clue cells
   */
  private buildClueGrid(categories: Category[], usedClueIds: Set<string>): void {
    const grid: ClueCell[][] = [];
    
    // Assuming 5 clues per category
    const clueCount = categories[0]?.clues.length || 5;
    
    for (let row = 0; row < clueCount; row++) {
      const rowCells: ClueCell[] = [];
      for (const category of categories) {
        const clue = category.clues[row];
        if (clue) {
          rowCells.push({
            id: clue.id,
            value: clue.value,
            used: usedClueIds.has(clue.id)
          });
        }
      }
      grid.push(rowCells);
    }
    
    this.clueGrid.set(grid);
  }

  /**
   * Get round title
   */
  protected getRoundTitle(): string {
    return this.currentRound() === 'round1' ? 'Jeopardy!' : 'Double Jeopardy!';
  }
}
