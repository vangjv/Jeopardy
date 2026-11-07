import { expect, Page } from '@playwright/test';
import { resolve } from 'node:path';

export interface BrowserDiagnostics {
  errors: string[];
}

export interface PlayerConfiguration {
  name: string;
  buzzerKey: string;
}

export function collectBrowserDiagnostics(page: Page): BrowserDiagnostics {
  const diagnostics: BrowserDiagnostics = { errors: [] };

  page.on('console', message => {
    if (message.type() === 'error') {
      diagnostics.errors.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', error => {
    diagnostics.errors.push(`page: ${error.message}`);
  });

  return diagnostics;
}

export async function openHost(page: Page): Promise<void> {
  await page.goto('/host');
  await expect(page.getByRole('heading', { name: 'Live Control' })).toBeVisible();
}

export async function openBoardFromHost(host: Page): Promise<Page> {
  const popupPromise = host.waitForEvent('popup');
  await host.getByRole('button', { name: 'Open Board' }).click();
  const board = await popupPromise;
  await board.waitForLoadState('domcontentloaded');
  await expect(board).toHaveURL(/\/board$/);
  return board;
}

export async function loadSampleGame(host: Page): Promise<void> {
  if ((await host.getByRole('textbox', { name: 'Player Name' }).count()) === 0) {
    await configurePlayers(host, [
      { name: 'Player 1', buzzerKey: 'A' },
      { name: 'Player 2', buzzerKey: 'S' },
      { name: 'Player 3', buzzerKey: 'D' },
    ]);
  }
  await host.locator('.library-entry').filter({ hasText: 'Sample' }).click();
  await expect(host.getByText('Preview only · not shown on the audience board')).toBeVisible();
  await host.getByRole('button', { name: 'Load game' }).click();
  await expect(
    host.getByRole('button', { name: /Game setup Game loaded · click to edit/ }),
  ).toBeVisible();
}

export async function configurePlayers(
  host: Page,
  players: PlayerConfiguration[],
): Promise<void> {
  for (const _player of players) {
    await host.getByRole('button', { name: 'Add Player' }).click();
  }

  const names = host.getByRole('textbox', { name: 'Player Name' });
  const keys = host.getByRole('textbox', { name: 'Buzzer Key' });

  for (const [index, player] of players.entries()) {
    await names.nth(index).fill(player.name);
    await names.nth(index).press('Tab');
    await keys.nth(index).fill(player.buzzerKey);
  }
}

export async function loadGame(host: Page, gameSetPath?: string): Promise<void> {
  if (gameSetPath) {
    await host.locator('app-game-import input[type="file"]').setInputFiles(resolve(gameSetPath));
    await expect(host.getByRole('button', { name: 'Load game' })).toBeVisible();
    await host.getByRole('button', { name: 'Load game' }).click();
  } else {
    await loadSampleGame(host);
  }

  await expect(
    host.getByRole('button', { name: /Game setup Game loaded · click to edit/ }),
  ).toBeVisible();
}

export async function expectBoardGrid(board: Page, visibleValues = 30): Promise<void> {
  await expect(board.locator('.category-header')).toHaveCount(6);
  await expect(board.locator('.clue-cell')).toHaveCount(30);
  await expect(board.locator('.clue-cell .value')).toHaveCount(visibleValues);
}

export async function expectRoundOneBoard(board: Page, visibleValues = 30): Promise<void> {
  await expect(board.getByText('World Geography')).toBeVisible();
  await expectBoardGrid(board, visibleValues);
}

export async function selectFirstClue(host: Page, board: Page): Promise<void> {
  await host.locator('app-game-board-control .clue-cell').first().click();
  await expect(board.getByText('This is the capital of France')).toBeVisible();
  await expect(board.getByText('World Geography')).toBeVisible();
}

export async function selectFirstRegularClue(host: Page, board: Page): Promise<number> {
  const availableClues = host.locator(
    'app-game-board-control button.clue-cell:not([disabled])',
  );
  const clueCount = await availableClues.count();

  for (let index = 0; index < clueCount; index += 1) {
    const clue = availableClues.nth(index);
    const label = (await clue.getAttribute('aria-label')) ?? '';
    if (!label.startsWith('Daily Double')) {
      const value = Number(label.match(/\$(\d+)/)?.[1]);
      await clue.click();
      await expect(board.locator('.clue-display .clue-text')).toBeVisible();
      return value;
    }
  }

  throw new Error('The current round does not contain an available regular clue.');
}

export async function selectDailyDouble(host: Page, board: Page): Promise<void> {
  const dailyDouble = host
    .locator('app-game-board-control button.clue-cell:not([disabled])')
    .filter({ has: host.locator('.dd-indicator') })
    .first();
  await expect(dailyDouble).toBeVisible();
  await dailyDouble.click();
  await expect(board.getByText('DAILY DOUBLE')).toBeVisible();
}

export async function buzz(host: Page, board: Page, key: string, playerName: string): Promise<void> {
  await host.keyboard.press(key);
  await expect(board.locator('.buzz-indicator .player-name')).toHaveText(playerName);
}

export async function completeCurrentRound(host: Page, board: Page): Promise<void> {
  const availableClues = host.locator(
    'app-game-board-control button.clue-cell:not([disabled])',
  );
  for (let clueIndex = 0; clueIndex < 30 && (await availableClues.count()) > 0; clueIndex += 1) {
    const nextClue = availableClues.first();
    const label = (await nextClue.getAttribute('aria-label')) ?? '';
    await nextClue.click();

    if (label.startsWith('Daily Double')) {
      await host.getByRole('spinbutton', { name: 'Wager Amount' }).fill('5');
      await host.getByRole('button', { name: 'Set Wager' }).click();
    } else {
      await host.keyboard.press('A');
    }

    await host.getByRole('button', { name: 'Correct', exact: true }).click();
    await expect(board.locator('.clue-board')).toBeVisible();
  }
}

export function expectNoBrowserErrors(...diagnostics: BrowserDiagnostics[]): void {
  expect(diagnostics.flatMap(item => item.errors)).toEqual([]);
}
