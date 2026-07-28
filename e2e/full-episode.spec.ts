import { expect, test } from '@playwright/test';
import {
  buzz,
  collectBrowserDiagnostics,
  completeCurrentRound,
  expectNoBrowserErrors,
  expectRoundOneBoard,
  loadSampleGame,
  openBoardFromHost,
  openHost,
  selectFirstClue,
} from './helpers/game';

test('canonical playable journey produces a reviewable receipt', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);

  await loadSampleGame(page);
  await expectRoundOneBoard(board);
  await testInfo.attach('round-1-board', {
    body: await board.screenshot(),
    contentType: 'image/png',
  });

  await selectFirstClue(page, board);
  await testInfo.attach('standard-clue', {
    body: await board.screenshot(),
    contentType: 'image/png',
  });

  await buzz(page, board, 'A', 'Player 1');
  await testInfo.attach('buzz-winner', {
    body: await board.screenshot(),
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: 'Incorrect', exact: true }).click();
  await expect(page.locator('.lockout-player')).toHaveText('Player 1');
  await buzz(page, board, 'S', 'Player 2');
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(board.locator('.player-score').filter({ hasText: 'Player 1' })).toContainText(
    '-$200',
  );
  await expect(board.locator('.player-score').filter({ hasText: 'Player 2' })).toContainText('$200');
  await expect(
    board.locator('.player-score').filter({ hasText: 'Player 2' }),
  ).toContainText('CONTROL');

  await page.locator('[data-clue-id="clue-1-2-3"]').click();
  await expect(board.getByText('DAILY DOUBLE')).toBeVisible();
  await testInfo.attach('daily-double', {
    body: await board.screenshot(),
    contentType: 'image/png',
  });
  await page.getByRole('spinbutton', { name: 'Wager Amount' }).fill('600');
  await page.getByRole('button', { name: 'Set Wager' }).click();
  await page.getByRole('button', { name: 'Incorrect', exact: true }).click();
  await expect(board.locator('.player-score').filter({ hasText: 'Player 2' })).toContainText(
    '-$400',
  );

  await completeCurrentRound(page, board);
  const advance = page.getByRole('button', { name: 'Advance' });
  await expect(advance).toBeEnabled();
  await advance.click();
  await expect(board.locator('.round-transition')).toBeHidden({ timeout: 5_000 });
  await expect(board.locator('.clue-cell .value').first()).toHaveText('$400');
  await testInfo.attach('double-jeopardy-board', {
    body: await board.screenshot(),
    contentType: 'image/png',
  });

  await completeCurrentRound(page, board);
  await expect(advance).toBeEnabled();
  await advance.click();
  await expect(board.getByText('FINAL JEOPARDY')).toBeVisible();
  await testInfo.attach('final-category', {
    body: await board.screenshot(),
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: 'Reveal Category' }).click();
  await page.getByRole('tab', { name: 'Collect Wagers' }).click();
  await page.getByRole('spinbutton', { name: /Player 1 Wager/ }).fill('1000');
  await page.getByRole('spinbutton', { name: /Player 2 Wager/ }).fill('0');
  await page.getByRole('spinbutton', { name: /Player 3 Wager/ }).fill('0');
  await page.getByRole('button', { name: 'Confirm Wagers' }).click();
  await page.getByRole('button', { name: 'Reveal Clue' }).click();
  await expect(board.getByText('Write your responses...')).toBeVisible();
  await testInfo.attach('final-clue', {
    body: await board.screenshot(),
    contentType: 'image/png',
  });

  await page
    .getByRole('textbox', { name: "Player 1's Response" })
    .fill('Who is William Henry Harrison?');
  await page.getByRole('textbox', { name: "Player 2's Response" }).fill('No response');
  await page.getByRole('textbox', { name: "Player 3's Response" }).fill('No response');
  await page.getByRole('button', { name: 'Confirm Responses' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).nth(0).click();
  await page.getByRole('button', { name: 'Incorrect', exact: true }).nth(1).click();
  await page.getByRole('button', { name: 'Incorrect', exact: true }).nth(2).click();
  await expect(board.locator('.player-adjudication')).toHaveCount(3);
  await testInfo.attach('final-results', {
    body: await board.screenshot(),
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: 'Show Winner on Board' }).click();
  await expect(board.getByText('CHAMPION')).toBeVisible();
  await expect(board.locator('.winner-name')).toHaveText('Player 1');
  await testInfo.attach('winner', {
    body: await board.screenshot(),
    contentType: 'image/png',
  });

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});
