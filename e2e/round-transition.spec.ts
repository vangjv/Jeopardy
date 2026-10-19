import { expect, test } from '@playwright/test';
import {
  collectBrowserDiagnostics,
  completeCurrentRound,
  expectNoBrowserErrors,
  loadSampleGame,
  openBoardFromHost,
  openHost,
} from './helpers/game';

test('completing Round 1 enables Double Jeopardy with a fresh 6x5 board', async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await context.addInitScript(() => {
    const testWindow = window as Window & { __playedSounds: string[] };
    testWindow.__playedSounds = [];
    HTMLMediaElement.prototype.play = function () {
      testWindow.__playedSounds.push(new URL(this.src, location.href).pathname);
      return Promise.resolve();
    };
  });

  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);
  const boardFillCount = () =>
    page.evaluate(
      () =>
        (window as Window & { __playedSounds: string[] }).__playedSounds.filter(
          sound => sound === '/sounds/board-fill.mp3',
        ).length,
    );
  await expect.poll(boardFillCount).toBe(1);

  await completeCurrentRound(page, board);
  expect(await boardFillCount()).toBe(1);
  const advance = page.getByRole('button', { name: 'Advance' });
  await expect(advance).toBeEnabled();
  await advance.click();
  await expect.poll(boardFillCount).toBe(2);

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
