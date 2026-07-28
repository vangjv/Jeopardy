import { expect, Page } from '@playwright/test';

export interface BrowserDiagnostics {
  errors: string[];
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
  await host.getByRole('button', { name: 'Load Sample Game' }).click();
  await expect(
    host.getByRole('button', { name: /Game setup Game loaded · click to edit/ }),
  ).toBeVisible();
}

export async function expectRoundOneBoard(board: Page, visibleValues = 30): Promise<void> {
  await expect(board.getByText('World Geography')).toBeVisible();
  await expect(board.locator('.category-header')).toHaveCount(6);
  await expect(board.locator('.clue-cell')).toHaveCount(30);
  await expect(board.locator('.clue-cell .value')).toHaveCount(visibleValues);
}

export async function selectFirstClue(host: Page, board: Page): Promise<void> {
  await host.locator('app-game-board-control .clue-cell').first().click();
  await expect(board.getByText('This is the capital of France')).toBeVisible();
  await expect(board.getByText('World Geography')).toBeVisible();
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
