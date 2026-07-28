import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  buzz,
  collectBrowserDiagnostics,
  expectNoBrowserErrors,
  loadSampleGame,
  openBoardFromHost,
  openHost,
} from './helpers/game';

test('clue images have accessible alternatives and failed media shows a stable fallback', async ({
  page,
}) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  await loadSampleGame(page);

  const game = JSON.parse(readFileSync('src/assets/game-sets/sample-game.json', 'utf8'));
  game.round1.categories[0].clues[0].media = {
    type: 'image',
    url:
      'data:image/svg+xml;base64,' +
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240"><rect width="100%" height="100%" fill="#123caa"/><circle cx="320" cy="120" r="70" fill="#f3c750"/></svg>',
      ).toString('base64'),
    altText: 'A gold circle on a blue field',
  };
  game.round1.categories[0].clues[1].media = {
    type: 'image',
    url: 'data:image/png;base64,SGVsbG8=',
    altText: 'Unavailable clue image',
  };

  await page.getByRole('button', { name: /Game setup Game loaded · click to edit/ }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'media-game.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(game)),
  });
  await expect(page.getByText('Game loaded successfully!')).toBeVisible();

  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await page.locator('[data-clue-id="clue-1-1-1"]').click();
  await expect(board.getByRole('img', { name: 'A gold circle on a blue field' })).toBeVisible();

  await buzz(page, board, 'A', 'Player 1');
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.locator('[data-clue-id="clue-1-1-2"]').click();
  await expect(board.getByRole('status')).toHaveText('Clue media is unavailable.');

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});
