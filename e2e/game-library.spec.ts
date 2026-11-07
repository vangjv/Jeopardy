import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  collectBrowserDiagnostics,
  configurePlayers,
  expectNoBrowserErrors,
  expectRoundOneBoard,
  openBoardFromHost,
  openHost,
} from './helpers/game';

test('built-in library preview is searchable and isolated from live state until explicit load', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);

  const search = page.getByRole('searchbox', { name: 'Search titles and category names' });
  await search.fill('Sample Jeopardy Game');
  const sample = page.locator('.library-entry').filter({ hasText: 'Sample Jeopardy Game' });
  await expect(sample).toHaveCount(1);
  await expect(sample).toContainText('Game ID: sample-game-001');
  await expect(page.locator('.library-entry')).toHaveCount(1);
  await sample.click();

  const preview = page.locator('app-game-import .preview');
  await expect(preview).toContainText('Preview only');
  await expect(preview.locator('.category-column')).toHaveCount(6);
  await expect(preview.locator('.clue-preview')).toHaveCount(30);
  const previewAccessibility = await new AxeBuilder({ page }).include('app-game-import').analyze();
  expect(previewAccessibility.violations).toEqual([]);
  await expect(page.locator('app-game-board-control .clue-cell')).toHaveCount(0);
  await expect(board.locator('.category-header')).toHaveCount(0);
  await expect(page.getByText('No players added yet. Add 2-3 players to start.')).toBeVisible();

  const firstQuestion = preview.locator('.clue-preview').first();
  await expect(firstQuestion).toHaveAttribute('aria-label', /points/);
  await firstQuestion.click();
  await expect(preview.locator('.question')).toBeVisible();
  await expect(preview.locator('.answer')).toHaveCount(0);
  await preview.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(preview.locator('.answer')).toBeVisible();
  await expect(board.locator('.clue-display .clue-text')).toHaveCount(0);
  await expect(board.getByText(/World Geography/)).toHaveCount(0);

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth <= window.innerWidth,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  }));
  expect(dimensions).toEqual({ width: true, viewport: '1366x768' });
  const screenshot = testInfo.outputPath('host-library-preview-1366x768.png');
  await preview.scrollIntoViewIfNeeded();
  await page.screenshot({ path: screenshot, animations: 'disabled' });
  await testInfo.attach('host-library-preview-1366x768', {
    path: screenshot,
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: 'Load game' }).click();
  await expect(page.locator('app-game-import [role="alert"]')).toContainText('Must have 2-3 players');
  await expect(page.getByText('No players added yet. Add 2-3 players to start.')).toBeVisible();
  await expect(board.locator('.category-header')).toHaveCount(0);

  await configurePlayers(page, [
    { name: 'Ada', buzzerKey: 'A' },
    { name: 'Grace', buzzerKey: 'S' },
  ]);
  await page.getByRole('button', { name: 'Load game' }).click();
  await expect(page.getByRole('button', { name: /Game setup Game loaded · click to edit/ })).toBeVisible();
  await expectRoundOneBoard(board);
  await expect(board.locator('.player-score')).toHaveCount(2);
  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});
