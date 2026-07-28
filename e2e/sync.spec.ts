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

test('host opens a synchronized board and board reload restores state', async ({ page }) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);

  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);

  await loadSampleGame(page);
  await expectRoundOneBoard(board);

  await board.reload();
  await expectRoundOneBoard(board);

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});

test('board reload restores active clue, buzz winner, and Daily Double phases', async ({ page }) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);

  await selectFirstClue(page, board);
  await board.reload();
  await expect(board.getByText('This is the capital of France')).toBeVisible();

  await buzz(page, board, 'A', 'Player 1');
  await board.reload();
  await expect(board.locator('.buzz-indicator .player-name')).toHaveText('Player 1');
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await page.locator('[data-clue-id="clue-1-2-3"]').click();
  await board.reload();
  await expect(board.getByText('DAILY DOUBLE')).toBeVisible();
  await expect(board.getByText('Awaiting wager...')).toBeVisible();

  await page.getByRole('spinbutton', { name: 'Wager Amount' }).fill('600');
  await page.getByRole('button', { name: 'Set Wager' }).click();
  await board.reload();
  await expect(board.getByText('The largest planet in our solar system')).toBeVisible();
  await expect(board.getByText('$600')).toBeVisible();

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});
