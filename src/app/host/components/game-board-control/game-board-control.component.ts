/**
 * GameBoardControlComponent - Clue selection interface for host
 * Displays game board with category/value grid and tracks used clues
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { GameStateService } from '../../../shared/services/game-state.service';
import { Category, Clue } from '../../../shared/models/game-content.model';
import { isRound } from '../../../shared/utils/type-guards';

interface ClueCell {
  clue: Clue;
  categoryId: string;
  used: boolean;
  dailyDouble: boolean;
}

@Component({
  selector: 'app-game-board-control',
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './game-board-control.component.html',
  styleUrl: './game-board-control.component.scss'
})
export class GameBoardControlComponent implements OnInit {
  protected readonly categories = signal<Category[]>([]);
  protected readonly clueGrid = signal<ClueCell[][]>([]);
  protected readonly currentRound = signal<string>('round1');
  protected readonly canSelectClues = signal(false);

  constructor(private readonly gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.gameStateService.getState().subscribe(state => {
      this.currentRound.set(state.currentRound);
      this.canSelectClues.set(
        state.phase === 'round1' || state.phase === 'round2'
      );

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
            clue,
            categoryId: category.id,
            used: usedClueIds.has(clue.id),
            dailyDouble: clue.dailyDouble || false
          });
        }
      }
      grid.push(rowCells);
    }
    
    this.clueGrid.set(grid);
  }

  /**
   * Select a clue
   */
  protected selectClue(cell: ClueCell): void {
    if (!this.canSelectClues() || cell.used) {
      return;
    }

    const state = this.gameStateService.getCurrentState();
    const round = state.gameSet?.[state.currentRound];
    
    if (round && isRound(round)) {
      const category = round.categories.find((c: Category) => c.id === cell.categoryId);
      if (category) {
        this.gameStateService.selectClue(cell.categoryId, cell.clue.id);
      }
    }
  }

  /**
   * Get CSS class for a clue cell
   */
  protected getCellClass(cell: ClueCell): string {
    const classes: string[] = ['clue-cell'];
    if (cell.used) classes.push('used');
    if (cell.dailyDouble) classes.push('daily-double');
    return classes.join(' ');
  }
}
