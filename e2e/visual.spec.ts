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

async function expectBoardGeometry(board: import('@playwright/test').Page): Promise<void> {
  const geometry = await board.evaluate(() => {
    const categoryElements = Array.from(document.querySelectorAll<HTMLElement>('.category-header'));
    const categoryWidths = categoryElements.map(element => element.getBoundingClientRect().width);
    const clipped = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.category-header, .clue-cell, .clue-text, .player-name, .score',
      ),
    )
      .filter(
        element =>
          element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1,
      )
      .map(element => ({
        className: element.className,
        client: [element.clientWidth, element.clientHeight],
        scroll: [element.scrollWidth, element.scrollHeight],
      }));
    return {
      viewport: [window.innerWidth, window.innerHeight],
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      verticalOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      categoryWidthDelta:
        categoryWidths.length > 0 ? Math.max(...categoryWidths) - Math.min(...categoryWidths) : 0,
      clipped,
    };
  });

  expect(geometry.viewport).toEqual([1920, 1080]);
  expect(geometry.horizontalOverflow).toBe(false);
  expect(geometry.verticalOverflow).toBe(false);
  expect(geometry.categoryWidthDelta).toBeLessThanOrEqual(2);
  expect(geometry.clipped).toEqual([]);
}

test('Round 1 board matches the approved 1920x1080 presentation', async ({ page }) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);
  await expectRoundOneBoard(board);

  await expectBoardGeometry(board);
  await expect(board).toHaveScreenshot('round-1-board.png', { fullPage: true });

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});

test('standard clue matches the approved presentation', async ({ page }) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);
  await selectFirstClue(page, board);

  await expectBoardGeometry(board);
  await expect(board).toHaveScreenshot('standard-clue.png', { fullPage: true });

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});

test('all remaining broadcast states match their approved presentations', async ({ page }) => {
  test.setTimeout(60_000);
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);

  await selectFirstClue(page, board);
  await buzz(page, board, 'A', 'Player 1');
  await expect(board).toHaveScreenshot('buzz-winner.png', { fullPage: true });
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await page.locator('[data-clue-id="clue-1-2-3"]').click();
  await expect(board.getByText('DAILY DOUBLE')).toBeVisible();
  await expect(board).toHaveScreenshot('daily-double.png', { fullPage: true });
  await page.getByRole('spinbutton', { name: 'Wager Amount' }).fill('5');
  await page.getByRole('button', { name: 'Set Wager' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();

  await page.getByRole('button', { name: 'Round 2' }).click();
  await expect(board.locator('.round-transition')).toBeHidden({ timeout: 5_000 });
  await expectBoardGeometry(board);
  await expect(board).toHaveScreenshot('double-jeopardy-board.png', { fullPage: true });

  await page.getByRole('button', { name: 'Start Final Jeopardy' }).click();
  await expect(board.getByText('FINAL JEOPARDY')).toBeVisible();
  await expect(board).toHaveScreenshot('final-category.png', { fullPage: true });

  await page.getByRole('button', { name: 'Reveal Category' }).click();
  await page.getByRole('tab', { name: 'Collect Wagers' }).click();
  for (const field of await page.getByRole('spinbutton', { name: /Wager/ }).all()) {
    await field.fill('0');
  }
  await page.getByRole('button', { name: 'Confirm Wagers' }).click();
  await page.getByRole('button', { name: 'Reveal Clue' }).click();
  await expect(board.getByText('Write your responses...')).toBeVisible();
  await expect(board).toHaveScreenshot('final-clue.png', { fullPage: true });

  for (const [index, field] of (
    await page.getByRole('textbox', { name: /Response/ }).all()
  ).entries()) {
    await field.fill(index === 0 ? 'Who is William Henry Harrison?' : 'No response');
  }
  await page.getByRole('button', { name: 'Confirm Responses' }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).nth(0).click();
  await page.getByRole('button', { name: 'Incorrect', exact: true }).nth(1).click();
  await page.getByRole('button', { name: 'Incorrect', exact: true }).nth(2).click();
  await expect(board.locator('.player-adjudication')).toHaveCount(3);
  await expect(board).toHaveScreenshot('final-results.png', { fullPage: true });

  await page.getByRole('button', { name: 'Show Winner on Board' }).click();
  await expect(board.getByText('CHAMPION')).toBeVisible();
  await expect(board).toHaveScreenshot('winner.png', { fullPage: true });

  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});

test('host console matches the approved 1440x900 operator layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const diagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  await loadSampleGame(page);
  await page.locator('[data-clue-id="clue-1-1-1"]').click();
  await page.keyboard.press('A');
  await page.locator('.left-column').evaluate(element => element.scrollTo(0, 0));

  const geometry = await page.evaluate(() => {
    const selectors = [
      '[data-testid="host-answer-key"]',
      'button[aria-label="Correct"]',
      'button[aria-label="Incorrect"]',
      '[data-clue-id="clue-1-1-1"]',
    ];
    const criticalControls = selectors.map(selector => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect
        ? {
            selector,
            visible:
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= window.innerHeight &&
              rect.right <= window.innerWidth,
          }
        : { selector, visible: false };
    });
    return {
      viewport: [window.innerWidth, window.innerHeight],
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      criticalControls,
    };
  });
  expect(geometry).toEqual({
    viewport: [1440, 900],
    horizontalOverflow: false,
    criticalControls: [
      { selector: '[data-testid="host-answer-key"]', visible: true },
      { selector: 'button[aria-label="Correct"]', visible: true },
      { selector: 'button[aria-label="Incorrect"]', visible: true },
      { selector: '[data-clue-id="clue-1-1-1"]', visible: true },
    ],
  });
  const playerScoreRightGap = await page.locator('.player-row').first().evaluate(element => {
    const row = element.getBoundingClientRect();
    const score = element.querySelector('.player-score')?.getBoundingClientRect();
    return score ? Math.round(row.right - score.right) : Number.POSITIVE_INFINITY;
  });
  expect(playerScoreRightGap).toBeLessThanOrEqual(16);
  await expect(page.getByRole('button', { name: 'Open Board' })).toBeVisible();
  await expect(page.getByTestId('host-answer-key')).toContainText('What is Paris?');
  await expect(page.locator('.responder-banner')).toContainText('Player 1');
  await expect(page).toHaveScreenshot('host-console.png');

  expectNoBrowserErrors(diagnostics);
});
