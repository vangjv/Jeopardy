import { expect, test } from '@playwright/test';
import {
  buzz,
  collectBrowserDiagnostics,
  expectNoBrowserErrors,
  loadSampleGame,
  openBoardFromHost,
  openHost,
  selectFirstClue,
} from './helpers/game';

async function scoreOpeningClues(host: import('@playwright/test').Page, board: import('@playwright/test').Page) {
  await selectFirstClue(host, board);
  await buzz(host, board, 'A', 'Player 1');
  await host.getByRole('button', { name: 'Correct', exact: true }).click();

  await host.locator('[data-clue-id="clue-1-1-2"]').click();
  await buzz(host, board, 'S', 'Player 2');
  await host.getByRole('button', { name: 'Correct', exact: true }).click();
}

test('Final Jeopardy collects private entries, scores each player once, and announces the winner', async ({
  page,
}) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);
  await scoreOpeningClues(page, board);

  await page.getByRole('button', { name: 'Start Final Jeopardy' }).click();
  await expect(board.getByText('FINAL JEOPARDY')).toBeVisible();
  await expect(board.getByText('U.S. Presidents')).toBeVisible();

  await board.reload();
  await expect(board.getByText('FINAL JEOPARDY')).toBeVisible();
  await page.getByRole('button', { name: 'Reveal Category' }).click();
  await board.reload();
  await expect(board.getByText('Make your wagers...')).toBeVisible();
  await page.getByRole('tab', { name: 'Collect Wagers' }).click();

  await page.getByRole('spinbutton', { name: /Player 1 Wager/ }).fill('100');
  await page.getByRole('spinbutton', { name: /Player 2 Wager/ }).fill('200');
  await page.getByRole('spinbutton', { name: /Player 3 Wager/ }).fill('0');
  await page.getByRole('button', { name: 'Confirm Wagers' }).click();

  await expect(board.getByText('Wagers locked. Stand by...')).toBeVisible();
  await board.reload();
  await expect(board.getByText('U.S. Presidents')).toBeVisible();

  await page.getByRole('button', { name: 'Reveal Clue' }).click();
  await expect(board.getByText('Write your responses...')).toBeVisible();
  await expect(
    board.getByText(
      'This president served the shortest term, dying just 31 days after his inauguration',
    ),
  ).toBeVisible();

  await page.getByRole('textbox', { name: "Player 1's Response" }).fill(
    'Who is William Henry Harrison?',
  );
  await page.getByRole('textbox', { name: "Player 2's Response" }).fill('Who is James Garfield?');
  await page.getByRole('textbox', { name: "Player 3's Response" }).fill(
    'Who is William Henry Harrison?',
  );
  await page.getByRole('button', { name: 'Confirm Responses' }).click();

  const correctButtons = page.getByRole('button', { name: 'Correct', exact: true });
  const incorrectButtons = page.getByRole('button', { name: 'Incorrect', exact: true });
  await correctButtons.nth(0).click();
  await incorrectButtons.nth(1).click();
  await correctButtons.nth(2).click();

  await expect(board.getByText('Who is William Henry Harrison?')).toBeVisible();
  await expect(board.locator('.player-result').filter({ hasText: 'Player 1' })).toContainText(
    'Final Score: $300',
  );
  await expect(board.locator('.player-result').filter({ hasText: 'Player 2' })).toContainText(
    'Final Score: $200',
  );

  await page.getByRole('button', { name: 'Show Winner on Board' }).click();
  await expect(board.getByText('CHAMPION')).toBeVisible();
  await expect(board.locator('.winner-name')).toHaveText('Player 1');
  await expect(board.locator('.winner-score')).toHaveText('$300');

  await board.reload();
  await expect(board.locator('.winner-name')).toHaveText('Player 1');
  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});
