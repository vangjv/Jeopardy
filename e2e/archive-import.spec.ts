import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// @ts-expect-error The original fixture builder is shared with Node tooling tests.
import { archiveHtml } from '../scripts/fixtures/archive-html.mjs';
import {
  collectBrowserDiagnostics,
  configurePlayers,
  expectBoardGrid,
  expectNoBrowserErrors,
  loadGame,
  openBoardFromHost,
  openHost,
} from './helpers/game';

test('CLI-generated original archive fixture imports through host FileReader and synchronizes', async ({
  page,
}, testInfo) => {
  const input = testInfo.outputPath('original-source.html');
  const output = testInfo.outputPath('original-game.json');
  await writeFile(input, archiveHtml());
  execFileSync(process.execPath, [
    resolve('scripts', 'archive-import.mjs'), '--input', input, '--output', output,
  ], { stdio: 'pipe' });

  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  await configurePlayers(page, [
    { name: 'Ada', buzzerKey: 'A' },
    { name: 'Grace', buzzerKey: 'S' },
  ]);
  await loadGame(page, output);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await expectBoardGrid(board);
  await expect(board.getByText('Original & Shapes', { exact: true })).toBeVisible();
  await board.screenshot({ path: testInfo.outputPath('archive-original-round-1.png') });

  await page.locator('app-game-board-control .clue-cell').first().click();
  await expect(board.locator('.clue-display .clue-text')).toHaveText(
    'An original & tiny clue about a square.',
  );
  await expect(page.getByText('Original answer J 1 1', { exact: true })).toBeVisible();
  await expect(board.getByText('Original answer J 1 1', { exact: true })).toHaveCount(0);
  await board.reload();
  await expect(board.locator('.clue-display .clue-text')).toHaveText(
    'An original & tiny clue about a square.',
  );
  expect(await board.evaluate(() => ({
    width: document.documentElement.scrollWidth <= innerWidth,
    height: document.documentElement.scrollHeight <= innerHeight,
  }))).toEqual({ width: true, height: true });
  await board.screenshot({ path: testInfo.outputPath('archive-original-clue.png') });
  await page.screenshot({ path: testInfo.outputPath('archive-original-host.png') });
  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});
