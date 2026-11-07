import { expect, test } from '@playwright/test';
import {
  collectBrowserDiagnostics,
  expectNoBrowserErrors,
  expectRoundOneBoard,
  openBoardFromHost,
  openHost,
} from './helpers/game';

test('host configures two contestants and resolves a duplicate buzzer key before loading', async ({
  page,
}) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);

  await page.getByRole('button', { name: 'Add Player' }).click();
  await page.getByRole('button', { name: 'Add Player' }).click();

  const names = page.getByRole('textbox', { name: 'Player Name' });
  await names.nth(0).fill('Ada');
  await names.nth(1).fill('Grace');
  await names.nth(1).press('Tab');

  const keys = page.getByRole('textbox', { name: 'Buzzer Key' });
  await keys.nth(0).fill('Q');
  await keys.nth(1).fill('Q');
  await expect(page.getByText('Key conflict!')).toHaveCount(2);

  await page.locator('.library-entry').filter({ hasText: 'Sample' }).click();
  await expect(page.getByText('Preview only · not shown on the audience board')).toBeVisible();
  await page.getByRole('button', { name: 'Load game' }).click();
  await expect(page.getByText(/Player setup is invalid: All players must have unique buzzer keys/)).toBeVisible();

  await keys.nth(1).fill('W');
  await expect(page.getByText('Key conflict!')).not.toBeVisible();
  await page.getByRole('button', { name: 'Load game' }).click();
  await expect(
    page.getByRole('button', { name: /Game setup Game loaded · click to edit/ }),
  ).toBeVisible();

  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await expectRoundOneBoard(board);
  await expect(board.locator('.player-score').filter({ hasText: 'Ada' })).toBeVisible();
  await expect(board.locator('.player-score').filter({ hasText: 'Grace' })).toBeVisible();
  await expect(board.locator('.player-score')).toHaveCount(2);

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});
