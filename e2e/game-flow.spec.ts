import { expect, test } from '@playwright/test';
import {
  buzz,
  collectBrowserDiagnostics,
  expectNoBrowserErrors,
  expectRoundOneBoard,
  loadSampleGame,
  openBoardFromHost,
  openHost,
  selectFirstClue,
} from './helpers/game';

test('a clue can be selected, buzzed, scored, and marked used', async ({ page }) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);

  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);
  await expectRoundOneBoard(board);

  await selectFirstClue(page, board);
  await buzz(page, board, 'A', 'Player 1');
  await page.keyboard.press('S');
  await expect(board.locator('.buzz-indicator .player-name')).toHaveText('Player 1');

  await expect(page.getByRole('button', { name: 'Correct', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expectRoundOneBoard(board, 29);
  await expect(board.locator('.player-score').filter({ hasText: 'Player 1' })).toContainText('$200');
  await expect(board.locator('.clue-cell.used')).toHaveCount(1);

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});
