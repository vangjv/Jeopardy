import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  collectBrowserDiagnostics,
  expectNoBrowserErrors,
  expectRoundOneBoard,
  loadSampleGame,
  openBoardFromHost,
  openHost,
} from './helpers/game';

test('host and audience board have no serious automated accessibility violations', async ({
  page,
}, testInfo) => {
  const hostDiagnostics = collectBrowserDiagnostics(page);
  await openHost(page);
  const board = await openBoardFromHost(page);
  const boardDiagnostics = collectBrowserDiagnostics(board);
  await loadSampleGame(page);
  await expectRoundOneBoard(board);

  const hostReport = await new AxeBuilder({ page }).analyze();
  const boardReport = await new AxeBuilder({ page: board }).analyze();
  await testInfo.attach('host-accessibility-report', {
    body: Buffer.from(JSON.stringify(hostReport, null, 2)),
    contentType: 'application/json',
  });
  await testInfo.attach('board-accessibility-report', {
    body: Buffer.from(JSON.stringify(boardReport, null, 2)),
    contentType: 'application/json',
  });

  const seriousViolations = [...hostReport.violations, ...boardReport.violations].filter(
    violation => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(seriousViolations).toEqual([]);
  expectNoBrowserErrors(hostDiagnostics, boardDiagnostics);
  await board.close();
});

test('the critical clue and adjudication journey is keyboard operable', async ({ page }) => {
  await openHost(page);
  const board = await openBoardFromHost(page);
  await loadSampleGame(page);

  const firstClue = page.locator('[data-clue-id="clue-1-1-1"]');
  await firstClue.focus();
  await page.keyboard.press('Enter');
  await expect(board.getByText('This is the capital of France')).toBeVisible();

  await page.keyboard.press('A');
  const correct = page.getByRole('button', { name: 'Correct', exact: true });
  await correct.focus();
  await page.keyboard.press('Enter');
  await expect(board.locator('.player-score').filter({ hasText: 'Player 1' })).toContainText('$200');
  await board.close();
});
