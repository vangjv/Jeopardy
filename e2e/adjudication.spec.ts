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

test('an incorrect response deducts, locks out, and reopens for another contestant', async ({
  page,
}) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);

  await selectFirstClue(page, board);
  await expect(page.getByTestId('host-answer-key')).toContainText('What is Paris?');
  await expect(page.getByText('Listening for a buzz')).toBeVisible();
  await expect(page.locator('[data-clue-id="clue-1-1-2"]')).toBeDisabled();

  await buzz(page, board, 'A', 'Player 1');
  await expect(page.getByText('Buzzed first')).toBeVisible();
  await expect(page.locator('.responder-banner')).toContainText('Player 1');
  await expect(page.getByRole('button', { name: 'Incorrect', exact: true })).toContainText(
    'reopen buzzer',
  );
  await page.getByRole('button', { name: 'Incorrect', exact: true }).click();

  await expect(page.getByText('Cannot rebuzz:')).toBeVisible();
  await expect(page.locator('.lockout-player')).toHaveText('Player 1');
  await expect(page.getByText('Listening for a buzz')).toBeVisible();
  await expect(page.getByTestId('host-answer-key')).toContainText('What is Paris?');
  await page.keyboard.press('A');
  await expect(board.locator('.buzz-indicator')).not.toBeVisible();

  await buzz(page, board, 'S', 'Player 2');
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expectRoundOneBoard(board, 29);
  await expect(board.locator('.player-score').filter({ hasText: 'Player 1' })).toContainText(
    '-$200',
  );
  const playerTwoScore = board.locator('.player-score').filter({ hasText: 'Player 2' });
  await expect(playerTwoScore).toContainText('$200');
  await expect(playerTwoScore).toContainText('CONTROL');

  await page.getByRole('button', { name: 'Give board control to Player 1' }).click();
  await expect(board.locator('.player-score').filter({ hasText: 'Player 1' })).toContainText(
    'CONTROL',
  );

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});

test('Daily Double validates a wager, never opens buzzing, scores, and returns to the board', async ({
  page,
}) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);

  await page.locator('[data-clue-id="clue-1-2-3"]').click();
  await expect(board.getByText('DAILY DOUBLE')).toBeVisible();
  await expect(board.getByText('Awaiting wager...')).toBeVisible();

  await page.keyboard.press('S');
  await expect(board.locator('.buzz-indicator')).not.toBeVisible();

  const wager = page.getByRole('spinbutton', { name: 'Wager Amount' });
  await wager.fill('600');
  await page.getByRole('button', { name: 'Set Wager' }).click();
  await expect(board.getByText('The largest planet in our solar system')).toBeVisible();
  await expect(board.getByText('$600')).toBeVisible();

  await page.keyboard.press('S');
  await expect(board.locator('.buzz-indicator')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Correct', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await expectRoundOneBoard(board, 29);
  await expect(board.locator('.player-score').filter({ hasText: 'Player 1' })).toContainText('$600');
  await expect(board.locator('[data-clue-id="clue-1-2-3"]')).toHaveClass(/used/);

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});
