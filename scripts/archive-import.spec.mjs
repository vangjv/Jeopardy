import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { archiveHtml } from './fixtures/archive-html.mjs';
import { fetchHtml, main, parseArchive, parseArgs, writeGame } from './archive-import.mjs';

const directories = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

async function workspace() {
  const path = resolve('test-results', `archive-unit-${randomUUID()}`);
  directories.push(path);
  await mkdir(path, { recursive: true });
  return path;
}

describe('archive conversion', () => {
  it('ignores all 61 known UI markers without importing response or marker markup', async () => {
    const html = archiveHtml();
    expect(html.match(/id="clue_(?:J_\d_\d|DJ_\d_\d|FJ)_stuck"/g)).toHaveLength(61);
    const { game } = await parseArchive(html);
    const clues = [...game.round1.categories, ...game.round2.categories]
      .flatMap(category => category.clues).concat(game.final.category.clue);
    expect(clues).toHaveLength(61);
    expect(new Set(clues.map(clue => clue.id)).size).toBe(61);
    expect(JSON.stringify(game)).not.toMatch(/_stuck|WRONG|COMMENTARY/);
  });

  it('uses board coordinates, face values, exact responses and the existing app schema', async () => {
    const html = archiveHtml();
    const { game, warnings } = await parseArchive(html, { gameId: '9553' });
    expect(game.id).toBe('archive-9553');
    expect(game.round1.categories).toHaveLength(6);
    expect(game.round1.categories[0].clues[0]).toMatchObject({
      id: 'archive-9553-clue_J_1_1', value: 200, dailyDouble: false,
      clueText: 'An original & tiny clue about a square.',
      correctResponse: 'Original answer J 1 1',
    });
    expect(game.round1.categories[1].clues[3]).toMatchObject({ value: 800, dailyDouble: true });
    expect(game.round2.categories[5].clues[2]).toMatchObject({ value: 1200, dailyDouble: true });
    expect(game.round2.categories[0].clues[3]).toMatchObject({ value: 1600, dailyDouble: true });
    expect(game.round2.categories[5].title).toBe('Original & Shapes');
    expect(game.final.category.clue).toMatchObject({
      value: 1, dailyDouble: false, correctResponse: 'An original final answer',
    });
    expect(JSON.stringify(game)).not.toMatch(/WRONG|COMMENTARY|media"/);
    expect(warnings.join('\n')).toMatch(/clue_J_1_1: possible media/);
    expect(warnings.join('\n')).toMatch(/Each response must name two shapes/);
    expect(warnings.join('\n')).toMatch(/DJ category 6: possible media/);
    expect((await parseArchive(html)).game).toEqual((await parseArchive(html)).game);
  });

  it.each([
    ['missing question', html => html.replace('id="clue_J_1_1"', ''), /30 visible/],
    ['missing response', html => html.replace('id="clue_J_1_1_r"', ''), /correct response/],
    ['empty response', html => html.replace('Original answer J 1 1', ' '), /minLength|fewer than 1/],
    ['duplicate coordinate', html => html.replace('id="clue_J_1_2"', 'id="clue_J_1_1"'), /Duplicate HTML ID/],
    ['out-of-range coordinate', html => html.replace('id="clue_J_1_1"', 'id="clue_J_7_1"'), /out-of-range/],
    ['malformed coordinate', html => html.replace('id="clue_DJ_1_1"', 'id="clue_DJ_one_1"'), /out-of-range/],
    ['unknown UI suffix', html => html.replace('id="clue_J_1_1_stuck"', 'id="clue_J_1_1_unknown"'), /out-of-range/],
    ['out-of-range UI marker', html => html.replace('id="clue_DJ_1_1_stuck"', 'id="clue_DJ_7_1_stuck"'), /out-of-range/],
    ['out-of-range response', html => html.replace('id="clue_J_1_1_r"', 'id="clue_J_1_6_r"'), /out-of-range/],
    ['malformed Final marker', html => html.replace('id="clue_FJ_stuck"', 'id="clue_FJ_1_stuck"'), /out-of-range/],
    ['duplicate UI marker', html => html.replace('id="clue_DJ_1_1_stuck"', 'id="clue_J_1_1_stuck"'), /Duplicate HTML ID/],
    ['missing category', html => html.replace('class="category_name"', ''), /6 categories/],
    ['wrong ladder', html => html.replace('>$200<', '>$100<'), /unsupported value ladder/],
    ['extra Daily Double', html => html.replace('class="clue_value">$200', 'class="clue_value_daily_double">DD: $500'), /exactly 1 Daily/],
    ['missing Daily Double', html => html.replace('class="clue_value_daily_double">DD: $7,200', 'class="clue_value">$800'), /exactly 1 Daily/],
    ['long title', html => html.replace('Original Practice #42 - 2026-10-18', 'T'.repeat(101)), /title.*100/],
    ['long category', html => html.replace('Original Category 1', 'C'.repeat(51)), /title.*50/],
    ['long clue', html => html.replace('Original J column 1, row 2.', 'Q'.repeat(501)), /clueText.*500/],
    ['long response', html => html.replace('Original answer J 1 1', 'A'.repeat(201)), /correctResponse.*200/],
    ['hover-only answers', html => html.replace('id="clue_J_1_1_r"', 'onmouseover="toggle()"'), /hover-only/],
  ])('rejects %s without guessing or truncating', async (_, change, message) => {
    await expect(parseArchive(change(archiveHtml()))).rejects.toThrow(message);
  });
});

describe('CLI arguments and files', () => {
  it.each([
    [], ['--game-id', '9553'], ['--output', 'x.json'],
    ['--game-id', '0', '--output', 'x'], ['--game-id', '-1', '--output', 'x'],
    ['--game-id', '1.2', '--output', 'x'], ['--game-id', '1e3', '--output', 'x'],
    ['--game-id', '9553', '--input', 'x', '--output', 'y'],
    ['--input', 'x', '--input', 'y', '--output', 'z'],
    ['--input', '--output', 'x'], ['--input', 'x', '--output', 'x'],
    ['--input', 'x', '--output', ' '], ['--wat'], ['--help', '--input', 'x'],
  ])('rejects invalid arguments %j', (...args) => {
    expect(() => parseArgs(args)).toThrow();
  });

  it('prints help without reading or fetching content', async () => {
    const messages = [];
    await main(['--help'], { stdout: message => messages.push(message) });
    expect(messages[0]).toMatch(/--game-id[\s\S]*--input[\s\S]*--output/);
  });

  it('exits nonzero with an actionable error and no success output', () => {
    const result = spawnSync(process.execPath, [
      resolve('scripts', 'archive-import.mjs'), '--game-id', 'bad', '--output', 'unused.json',
    ], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Import failed: --game-id must be/);
    expect(result.stdout).toBe('');
  });

  it('imports saved HTML, reports source/notes and atomically refuses clobber', async () => {
    const path = await workspace();
    const input = resolve(path, 'source.html');
    const output = resolve(path, 'game.json');
    await writeFile(input, archiveHtml());
    const stdout = [];
    const stderr = [];
    const io = { stdout: message => stdout.push(message), stderr: message => stderr.push(message) };
    await main(['--input', input, '--output', output], io);
    expect(JSON.parse(await readFile(output, 'utf8')).final.category.clue.value).toBe(1);
    expect(stdout.join()).toMatch(/validated 61-clue/);
    expect(stderr.join()).toMatch(/Source:[\s\S]*category instructions/);
    const before = await readFile(output, 'utf8');
    await expect(main(['--input', input, '--output', output], io)).rejects.toThrow(/destination exists/);
    expect(await readFile(output, 'utf8')).toBe(before);
    expect((await readdir(path)).filter(file => file.endsWith('.partial'))).toEqual([]);
    await writeFile(input, '<html>not a game</html>');
    await expect(main(['--input', input, '--output', resolve(path, 'bad.json')], io)).rejects.toThrow();
    expect(await readdir(path)).not.toContain('bad.json');
  });

  it('uses the requested live URL exactly once without real network', async () => {
    const path = await workspace();
    const calls = [];
    await main(['--game-id', '9555', '--output', resolve(path, 'live.json')], {
      stdout: () => {}, stderr: () => {},
      fetchImpl: async (url, options) => {
        calls.push([url, options]);
        return new Response(archiveHtml(), { headers: { 'content-type': 'text/html; charset=utf-8' } });
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('https://j-archive.com/showgame.php?game_id=9555');
    expect(calls[0][1].redirect).toBe('manual');
  });

  it('leaves no partial output when publication fails', async () => {
    const path = await workspace();
    await mkdir(resolve(path, 'target'));
    await expect(writeGame(resolve(path, 'target'), {})).rejects.toThrow(/Cannot write/);
    expect(await readdir(path)).toEqual(['target']);
  });
});

describe('bounded network failures', () => {
  it.each([403, 404, 429, 500, 302])('reports HTTP %i without retries', async status => {
    let calls = 0;
    await expect(fetchHtml('https://example.invalid', { fetchImpl: async () => {
      calls++;
      return new Response('blocked', { status });
    } })).rejects.toThrow(new RegExp(`HTTP ${status}`));
    expect(calls).toBe(1);
  });

  it('reports DNS/connection failures', async () => {
    await expect(fetchHtml('https://example.invalid', { fetchImpl: async () => {
      throw new Error('ENOTFOUND');
    } })).rejects.toThrow(/download failed.*ENOTFOUND/);
  });

  it('rejects non-HTML and oversized responses', async () => {
    await expect(fetchHtml('https://example.invalid', { fetchImpl: async () =>
      new Response('{}', { headers: { 'content-type': 'application/json' } }),
    })).rejects.toThrow(/content type/);
    for (const headers of [{ 'content-length': '6000000' }, {}]) {
      await expect(fetchHtml('https://example.invalid', { fetchImpl: async () =>
        new Response('x'.repeat(5 * 1024 * 1024 + 1), { headers: { 'content-type': 'text/html', ...headers } }),
      })).rejects.toThrow(/5 MiB/);
    }
  });

  it('bounds both a stalled response and a stalled body using a local server', async () => {
    const server = createServer((request, response) => {
      if (request.url === '/body') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.write('<html>');
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      for (const path of ['/headers', '/body']) {
        await expect(fetchHtml(`http://127.0.0.1:${server.address().port}${path}`, {
          timeoutMs: 100,
        })).rejects.toThrow(/timed out after 100 ms/);
      }
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  });
});
