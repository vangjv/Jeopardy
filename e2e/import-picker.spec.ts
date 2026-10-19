import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import {
  collectBrowserDiagnostics,
  configurePlayers,
  expectNoBrowserErrors,
  openHost,
} from './helpers/game';

test('Import JSON File opens the chooser and supports cancellation and retrying the same file', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const diagnostics = collectBrowserDiagnostics(page);
  const gamePath = resolve(
    process.env['IMPORT_GAME_PATH'] ?? 'src\\assets\\game-sets\\sample-game.json',
  );
  await openHost(page);
  const importButton = page.getByRole('button', { name: 'Import JSON File' });
  const input = page.locator('app-game-import input[type="file"]');
  const loadedSetup = page.getByRole('button', {
    name: /Game setup Game loaded · click to edit/,
  });

  async function openPicker(keyboard = false) {
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
    if (keyboard) {
      await importButton.focus();
      await importButton.press('Enter');
    } else {
      await importButton.click();
    }
    const chooser = await chooserPromise;
    expect(chooser.isMultiple()).toBe(false);
    await expect(input).toHaveAttribute('accept', '.json');
    return chooser;
  }

  // An empty selection models dismissing the chooser without a file.
  await (await openPicker()).setFiles([]);
  await expect(loadedSetup).toHaveCount(0);
  await expect(importButton).toBeEnabled();
  await expect(page.locator('app-game-import .error-message')).toHaveCount(0);
  await page.locator('app-game-import').screenshot({
    path: testInfo.outputPath('host-import-ready.png'),
  });

  await (await openPicker(true)).setFiles(gamePath);
  await expect(page.getByText(/Player setup is invalid:/)).toBeVisible();
  await expect(importButton).toBeEnabled();
  await expect(input).toHaveValue('');

  await configurePlayers(page, [
    { name: 'Ada', buzzerKey: 'A' },
    { name: 'Grace', buzzerKey: 'S' },
  ]);
  await (await openPicker()).setFiles(gamePath);
  await expect(loadedSetup).toBeVisible();
  await expect(page.locator('app-game-board-control .clue-cell')).toHaveCount(30);
  await loadedSetup.click();
  await expect(page.getByText('Game loaded successfully!', { exact: true })).toBeVisible();
  await expect(input).toHaveValue('');
  await expect(page.locator('app-game-import .error-message')).toHaveCount(0);
  await page.locator('app-game-import').screenshot({
    path: testInfo.outputPath('host-import-loaded.png'),
  });

  await (await openPicker()).setFiles([]);
  await expect(page.getByText('Game loaded successfully!', { exact: true })).toBeVisible();
  await expect(page.locator('app-game-board-control .clue-cell')).toHaveCount(30);
  expectNoBrowserErrors(diagnostics);
});
