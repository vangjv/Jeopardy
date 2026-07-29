import { expect, Page, test, TestInfo } from '@playwright/test';
import {
  buzz,
  collectBrowserDiagnostics,
  completeCurrentRound,
  configurePlayers,
  expectBoardGrid,
  expectNoBrowserErrors,
  loadGame,
  openBoardFromHost,
  openHost,
  PlayerConfiguration,
  selectDailyDouble,
  selectFirstRegularClue,
} from './helpers/game';

const DEFAULT_PLAYERS: PlayerConfiguration[] = [
  { name: 'Player 1', buzzerKey: 'A' },
  { name: 'Player 2', buzzerKey: 'S' },
  { name: 'Player 3', buzzerKey: 'D' },
];

function configuredPlayers(): PlayerConfiguration[] {
  const value = process.env['JEOPARDY_PLAYERS'];
  if (!value) {
    return DEFAULT_PLAYERS;
  }

  const players = value.split(',').map(entry => {
    const separator = entry.lastIndexOf(':');
    return {
      name: entry.slice(0, separator).trim(),
      buzzerKey: entry.slice(separator + 1).trim().toUpperCase(),
    };
  });
  const keys = players.map(player => player.buzzerKey);

  if (
    players.length < 2 ||
    players.length > 3 ||
    players.some(player => !player.name || player.buzzerKey.length !== 1) ||
    new Set(keys).size !== keys.length
  ) {
    throw new Error(
      'JEOPARDY_PLAYERS must contain 2-3 unique Name:Key pairs, for example "Ada:A,Grace:S,Linus:D".',
    );
  }
  return players;
}

function formatScore(score: number): string {
  return score < 0 ? `-$${Math.abs(score)}` : `$${score}`;
}

async function saveVideo(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const video = page.video();
  if (!video) {
    throw new Error(`Video recording is not enabled for the ${name} page.`);
  }

  await page.close();
  const path = testInfo.outputPath(`${name}.webm`);
  await video.saveAs(path);
  await testInfo.attach(name, { path, contentType: 'video/webm' });
}

async function attachBoardScreenshot(
  board: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = testInfo.outputPath(`${name}.png`);
  await board.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test('canonical playable journey produces a reviewable receipt', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const players = configuredPlayers();
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);

  await configurePlayers(page, players);
  await loadGame(page, process.env['JEOPARDY_GAME_SET']);
  await page.getByRole('button', { name: 'Round 1', exact: true }).click();

  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);

  await expectBoardGrid(board);
  await attachBoardScreenshot(board, 'round-1-board', testInfo);

  const openingClueValue = await selectFirstRegularClue(page, board);
  await attachBoardScreenshot(board, 'standard-clue', testInfo);

  await buzz(page, board, players[0].buzzerKey, players[0].name);
  await attachBoardScreenshot(board, 'buzz-winner', testInfo);

  await page.getByRole('button', { name: 'Incorrect', exact: true }).click();
  await expect(page.locator('.lockout-player')).toHaveText(players[0].name);
  await buzz(page, board, players[1].buzzerKey, players[1].name);
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(board.locator('.player-score').filter({ hasText: players[0].name })).toContainText(
    formatScore(-openingClueValue),
  );
  await expect(board.locator('.player-score').filter({ hasText: players[1].name })).toContainText(
    formatScore(openingClueValue),
  );
  await expect(
    board.locator('.player-score').filter({ hasText: players[1].name }),
  ).toContainText('CONTROL');

  await selectDailyDouble(page, board);
  await attachBoardScreenshot(board, 'daily-double', testInfo);
  await page.getByRole('spinbutton', { name: 'Wager Amount' }).fill('600');
  await page.getByRole('button', { name: 'Set Wager' }).click();
  await page.getByRole('button', { name: 'Incorrect', exact: true }).click();
  await expect(board.locator('.player-score').filter({ hasText: players[1].name })).toContainText(
    formatScore(openingClueValue - 600),
  );

  await completeCurrentRound(page, board);
  const advance = page.getByRole('button', { name: 'Advance' });
  await expect(advance).toBeEnabled();
  await advance.click();
  await expect(board.locator('.round-transition')).toBeHidden({ timeout: 5_000 });
  await expect(board.locator('.clue-cell .value').first()).toHaveText('$400');
  await attachBoardScreenshot(board, 'double-jeopardy-board', testInfo);

  await completeCurrentRound(page, board);
  await expect(advance).toBeEnabled();
  await advance.click();
  await expect(board.getByText('FINAL JEOPARDY')).toBeVisible();
  await attachBoardScreenshot(board, 'final-category', testInfo);

  await page.getByRole('button', { name: 'Reveal Category' }).click();
  await page.getByRole('tab', { name: 'Collect Wagers' }).click();
  for (const [index, player] of players.entries()) {
    await page
      .getByRole('spinbutton', { name: `${player.name} Wager` })
      .fill(index === 0 ? '1000' : '0');
  }
  await page.getByRole('button', { name: 'Confirm Wagers' }).click();
  await page.getByRole('button', { name: 'Reveal Clue' }).click();
  await expect(board.getByText('Write your responses...')).toBeVisible();
  await attachBoardScreenshot(board, 'final-clue', testInfo);

  for (const [index, player] of players.entries()) {
    await page
      .getByRole('textbox', { name: `${player.name}'s Response` })
      .fill(index === 0 ? 'Automated correct response' : 'No response');
  }
  await page.getByRole('button', { name: 'Confirm Responses' }).click();
  const adjudications = page.locator('.player-adjudication');
  for (const [index] of players.entries()) {
    await adjudications
      .nth(index)
      .getByRole('button', { name: index === 0 ? 'Correct' : 'Incorrect', exact: true })
      .click();
  }
  await expect(board.locator('.player-adjudication')).toHaveCount(players.length);
  await attachBoardScreenshot(board, 'final-results', testInfo);

  await page.getByRole('button', { name: 'Show Winner on Board' }).click();
  await expect(board.getByText('CHAMPION')).toBeVisible();
  await expect(board.locator('.winner-name')).toHaveText(players[0].name);
  await attachBoardScreenshot(board, 'winner', testInfo);

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await saveVideo(board, 'game-board', testInfo);
  await saveVideo(page, 'host-board', testInfo);
});
