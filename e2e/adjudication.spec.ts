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
}, testInfo) => {
  await page.context().addInitScript(() => {
    const playedSources: string[] = [];
    Object.defineProperty(window, '__playedAudioSources', { value: playedSources });
    HTMLMediaElement.prototype.play = function () {
      playedSources.push(new URL(this.src, window.location.href).pathname);
      return Promise.resolve();
    };
  });

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
  await page.screenshot({
    path: testInfo.outputPath('host-current-clue-buzzed.png'),
    fullPage: true,
  });
  await expect(page.getByRole('button', { name: 'Incorrect', exact: true })).toContainText(
    'reopen buzzer',
  );
  await page.getByRole('button', { name: 'Incorrect', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __playedAudioSources: string[] }).__playedAudioSources.filter(
            source => source === '/sounds/correct.mp3' || source === '/sounds/incorrect.mp3',
          ),
      ),
    )
    .toContain('/sounds/incorrect.mp3');
  await expect
    .poll(() =>
      board.evaluate(
        () => (window as Window & { __playedAudioSources: string[] }).__playedAudioSources,
      ),
    )
    .toEqual([]);

  await expect(page.getByText('Cannot rebuzz:')).toBeVisible();
  await expect(page.locator('.lockout-player')).toHaveText('Player 1');
  await expect(page.getByText('Listening for a buzz')).toBeVisible();
  await expect(page.getByTestId('host-answer-key')).toContainText('What is Paris?');
  await page.keyboard.press('A');
  await expect(board.locator('.buzz-indicator')).not.toBeVisible();

  await buzz(page, board, 'S', 'Player 2');
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __playedAudioSources: string[] }).__playedAudioSources,
      ),
    )
    .toContain('/sounds/correct.mp3');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as Window & { __playedAudioSources: string[] }).__playedAudioSources.filter(
          source => source === '/sounds/correct.mp3' || source === '/sounds/incorrect.mp3',
        ),
      ),
    )
    .toEqual(['/sounds/incorrect.mp3', '/sounds/correct.mp3']);
  await expect
    .poll(() =>
      board.evaluate(
        () => (window as Window & { __playedAudioSources: string[] }).__playedAudioSources,
      ),
    )
    .toEqual([]);

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

test('a timed-out response is penalized as incorrect and plays the incorrect sound', async ({
  page,
}) => {
  await page.context().addInitScript(() => {
    const playedSources: string[] = [];
    Object.defineProperty(window, '__playedAudioSources', { value: playedSources });
    HTMLMediaElement.prototype.play = function () {
      playedSources.push(new URL(this.src, window.location.href).pathname);
      return Promise.resolve();
    };
  });

  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  await page.getByRole('button', { name: 'Buzzer Rules' }).click();
  const responseTimeout = page.getByRole('spinbutton', { name: 'Response Timeout (seconds)' });
  await expect(responseTimeout).toHaveValue('10');
  await responseTimeout.fill('1');
  await page.getByRole('button', { name: 'Apply Rules' }).click();

  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);
  await selectFirstClue(page, board);
  await buzz(page, board, 'A', 'Player 1');

  await expect(page.locator('.lockout-player')).toHaveText('Player 1', { timeout: 3000 });
  await expect(page.getByText('Listening for a buzz')).toBeVisible();
  await expect(
    page.locator('.player-row').filter({ hasText: 'Player 1' }),
  ).toContainText('-$200');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __playedAudioSources: string[] }).__playedAudioSources.filter(
            source => source === '/sounds/correct.mp3' || source === '/sounds/incorrect.mp3',
          ),
      ),
    )
    .toEqual(['/sounds/incorrect.mp3']);

  await buzz(page, board, 'S', 'Player 2');
  await expect(page.locator('.responder-banner')).toContainText('Player 2');
  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});

test('the clue closes automatically after every contestant answers incorrectly', async ({
  page,
}) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);

  await selectFirstClue(page, board);
  const incorrect = page.getByRole('button', { name: 'Incorrect', exact: true });
  for (const [key, name] of [
    ['A', 'Player 1'],
    ['S', 'Player 2'],
  ] as const) {
    await buzz(page, board, key, name);
    await incorrect.click();
    await expect(page.getByText('Listening for a buzz')).toBeVisible();
  }
  await buzz(page, board, 'D', 'Player 3');
  await incorrect.click();

  await expect(page.getByText('Choose the next clue')).toBeVisible();
  await expectRoundOneBoard(board, 29);
  await expect(board.locator('[data-clue-id="clue-1-1-1"]')).toHaveClass(/used/);
  for (const name of ['Player 1', 'Player 2', 'Player 3']) {
    await expect(board.locator('.player-score').filter({ hasText: name })).toContainText('-$200');
  }

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});

test('the host can reset or close a clue while listening for a buzz', async ({ page }) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);

  await selectFirstClue(page, board);
  const resetClue = page.getByRole('button', { name: 'Reset clue' });
  await expect(resetClue).toBeDisabled();

  await buzz(page, board, 'A', 'Player 1');
  await page.getByRole('button', { name: 'Incorrect', exact: true }).click();
  await expect(page.locator('.lockout-player')).toHaveText('Player 1');

  await resetClue.click();
  await expect(page.getByText('Cannot rebuzz:')).toBeHidden();
  await buzz(page, board, 'A', 'Player 1');
  await page.getByRole('button', { name: 'Reset Buzzer' }).first().click();
  await expect(page.getByText('Listening for a buzz')).toBeVisible();

  await page.getByRole('button', { name: 'Close clue' }).click();
  await expect(page.getByText('Choose the next clue')).toBeVisible();
  await expectRoundOneBoard(board, 29);

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
