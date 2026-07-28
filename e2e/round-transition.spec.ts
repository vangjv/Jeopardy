import { expect, test } from '@playwright/test';
import {
  collectBrowserDiagnostics,
  completeCurrentRound,
  expectNoBrowserErrors,
  loadSampleGame,
  openBoardFromHost,
  openHost,
} from './helpers/game';

test('completing Round 1 enables Double Jeopardy with a fresh 6x5 board', async ({ page }) => {
  test.setTimeout(60_000);
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);

  await completeCurrentRound(page, board);
  const advance = page.getByRole('button', { name: 'Advance' });
  await expect(advance).toBeEnabled();
  await advance.click();

  await expect(board.locator('.round-transition').getByText('Double Jeopardy!')).toBeVisible();
  await expect(board.getByText('Movies')).toBeVisible({ timeout: 10_000 });
  await expect(board.locator('.clue-cell')).toHaveCount(30);
  await expect(board.locator('.clue-cell.used')).toHaveCount(0);
  await expect(board.locator('.clue-cell .value').first()).toHaveText('$400');

  await board.reload();
  await expect(board.getByText('Movies')).toBeVisible();
  await expect(board.locator('.clue-cell.used')).toHaveCount(0);

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});
