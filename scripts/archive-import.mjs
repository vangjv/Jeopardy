import { readFile, mkdir, open, link, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { JSDOM } from 'jsdom';
import Ajv from 'ajv';
import ts from 'typescript';

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const HELP = `Convert a complete modern J-Archive HTML board to validated app JSON.

Usage:
  npm run import:archive -- --game-id 9553 --output ".\\games\\game-9553.json"
  npm run import:archive -- --input ".\\games\\saved.html" --output ".\\games\\saved.json"

Options:
  --game-id ID   Positive archive game ID; one HTTPS request, no retries/redirects.
  --input PATH   Saved UTF-8 HTML instead of a live request (mutually exclusive).
  --output PATH Required JSON destination; existing files are never overwritten.
  --help        Show this help.

Requires project dev dependencies (npm ci). Supports complete modern $200/$400
boards with DOM response nodes; historical hover-only answers are unsupported.
Media is NOT downloaded or attached. Review warnings for media/category notes
before offline play. Use only content you have permission to access and reuse.`;

export function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  const options = {};
  const keys = new Map([['--game-id', 'gameId'], ['--input', 'input'], ['--output', 'output']]);
  for (let index = 0; index < args.length; index += 2) {
    const key = keys.get(args[index]);
    if (!key) throw new Error(`Unknown option: ${args[index]}. Use --help.`);
    if (Object.hasOwn(options, key)) throw new Error(`Duplicate option: ${args[index]}.`);
    const value = args[index + 1];
    if (!value?.trim() || value.startsWith('--')) throw new Error(`Missing value for ${args[index]}.`);
    options[key] = value;
  }
  if (Boolean(options.gameId) === Boolean(options.input)) {
    throw new Error('Specify exactly one of --game-id or --input. Use --help.');
  }
  if (options.gameId && !/^[1-9]\d{0,9}$/.test(options.gameId)) {
    throw new Error('--game-id must be a positive decimal ID of at most 10 digits.');
  }
  if (!options.output) throw new Error('--output is required. Use --help.');
  if (options.input && resolve(options.input) === resolve(options.output)) {
    throw new Error('--input and --output must be different files.');
  }
  return options;
}

export async function fetchHtml(url, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      redirect: 'manual',
      headers: { Accept: 'text/html', 'User-Agent': 'Jeopardy-game-import/1.0' },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${url}. No retry or access-control bypass attempted. Check site availability/permissions, or use --input with legitimately saved HTML.`);
    }
    if (!/^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '')) {
      await response.body?.cancel();
      throw new Error('Expected text/html from archive; received a different content type.');
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body?.cancel();
      throw new Error('HTML exceeds the 5 MiB limit.');
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > MAX_BYTES) {
        controller.abort();
        throw new Error('HTML exceeds the 5 MiB limit.');
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch (error) {
    if (controller.signal.aborted && !error.message.includes('5 MiB')) {
      throw new Error(`Archive request timed out after ${timeoutMs} ms. Try later or use --input.`);
    }
    throw new Error(`Archive download failed: ${error.message}`, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

let schemaValidator;
async function getSchemaValidator() {
  if (!schemaValidator) {
    // Compile our trusted, type-only TS schema module without a second schema copy.
    const source = await readFile(new URL('../src/app/shared/schemas/game-set.schema.ts', import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    });
    const { gameSetSchema } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
    schemaValidator = new Ajv({ allErrors: true, strict: true }).compile(gameSetSchema);
  }
  return schemaValidator;
}

const text = element => {
  const copy = element.cloneNode(true);
  copy.querySelectorAll('script, style').forEach(node => node.remove());
  copy.querySelectorAll('br').forEach(node => node.replaceWith(' '));
  copy.querySelectorAll('p, div, li, blockquote').forEach(node => {
    node.prepend(' ');
    node.append(' ');
  });
  return copy.textContent.replace(/\s+/gu, ' ').trim();
};

function one(root, selector, label = selector) {
  const nodes = root.querySelectorAll(selector);
  if (nodes.length !== 1) throw new Error(`Expected exactly one ${label}; found ${nodes.length}. Incomplete or unsupported HTML (hover-only answers are not supported).`);
  return nodes[0];
}

export async function parseArchive(html, { gameId } = {}) {
  if (Buffer.byteLength(html) > MAX_BYTES) throw new Error('HTML exceeds the 5 MiB limit.');
  // jsdom defaults deliberately leave scripts and external resources disabled.
  const dom = new JSDOM(html);
  try {
    const document = dom.window.document;
    const title = text(one(document, '#game_title h1'));
    const identity = gameId ?? `local-${createHash('sha256').update(html).digest('hex').slice(0, 16)}`;
    const prefix = `archive-${identity}`;
    const warnings = [];
    const seenIds = new Set();
    for (const element of document.querySelectorAll('[id]')) {
      if (seenIds.has(element.id)) throw new Error(`Duplicate HTML ID: ${element.id}.`);
      seenIds.add(element.id);
    }
    // Response nodes and sticky-display UI markers use the same coordinate IDs.
    const expected = new Set(['clue_FJ', 'clue_FJ_r', 'clue_FJ_stuck']);
    for (const round of ['J', 'DJ']) {
      for (let col = 1; col <= 6; col++) for (let row = 1; row <= 5; row++) {
        expected.add(`clue_${round}_${col}_${row}`);
        expected.add(`clue_${round}_${col}_${row}_r`);
        expected.add(`clue_${round}_${col}_${row}_stuck`);
      }
    }
    for (const id of seenIds) {
      if (id.startsWith('clue_') && !expected.has(id)) throw new Error(`Unexpected/out-of-range clue ID: ${id}.`);
    }
    function reportDetails(node, location) {
      const links = [...node.querySelectorAll('a[href], img, audio, video, source, iframe, object, embed')];
      if (links.length) {
        const references = links.map(element => element.getAttribute('href') ?? element.getAttribute('src') ?? element.getAttribute('data') ?? '(embedded media)');
        warnings.push(`${location}: possible media/reference dependency ${JSON.stringify(references)}. Not downloaded/attached; review before offline play.`);
      }
    }
    function categoryDetails(node, location) {
      reportDetails(node, location);
      const cell = node.closest('td.category') ?? node.parentElement;
      for (const note of cell.querySelectorAll('.category_comments')) {
        if (text(note)) warnings.push(`${location}: category instructions/notes: ${text(note)}. Preserve applicable instructions when preparing the game.`);
        reportDetails(note, `${location} notes`);
      }
    }
    function clue(root, archiveId, value, dailyDouble) {
      const question = one(root, `td.clue_text[id="${archiveId}"]`, `${archiveId} question`);
      const response = one(root, `[id="${archiveId}_r"] em.correct_response`, `${archiveId} correct response`);
      reportDetails(question, archiveId);
      reportDetails(response, `${archiveId} response`);
      return { id: `${prefix}-${archiveId}`, clueText: text(question), correctResponse: text(response), value, dailyDouble };
    }
    function round(selector, code, step, ddCount) {
      const table = one(document, `${selector} > table.round`);
      const names = [...table.querySelectorAll('.category_name')];
      if (names.length !== 6) throw new Error(`${code}: expected 6 categories, found ${names.length}.`);
      if (table.querySelectorAll('td.clue_text[id]:not([id$="_r"])').length !== 30) {
        throw new Error(`${code}: expected 30 visible coordinate clues.`);
      }
      let doubles = 0;
      const categories = names.map((name, index) => {
        categoryDetails(name, `${code} category ${index + 1}`);
        return {
          id: `${prefix}-${code}-category-${index + 1}`,
          title: text(name),
          clues: Array.from({ length: 5 }, (_, row) => {
            const archiveId = `clue_${code}_${index + 1}_${row + 1}`;
            const question = one(table, `td.clue_text[id="${archiveId}"]`, archiveId);
            const cell = question.closest('table') ?? question.parentElement;
            const normal = cell.querySelectorAll('td.clue_value');
            const dd = cell.querySelectorAll('td.clue_value_daily_double');
            if (normal.length + dd.length !== 1) throw new Error(`${archiveId}: expected one normal or Daily Double value.`);
            const value = (row + 1) * step;
            if (dd.length) {
              if (!/^DD:\s*\$[\d,]+$/u.test(text(dd[0]))) throw new Error(`${archiveId}: unsupported Daily Double value.`);
              doubles++;
            } else if (!/^\$(?:\d+|\d{1,3}(?:,\d{3})+)$/u.test(text(normal[0]))
              || Number(text(normal[0]).replace(/[$,]/gu, '')) !== value) {
              throw new Error(`${archiveId}: unsupported value ladder; expected $${value} (modern boards only).`);
            }
            return clue(table, archiveId, value, dd.length === 1);
          }),
        };
      });
      if (doubles !== ddCount) throw new Error(`${code}: expected exactly ${ddCount} Daily Doubles, found ${doubles}.`);
      return { categories };
    }
    const round1 = round('#jeopardy_round', 'J', 200, 1);
    const round2 = round('#double_jeopardy_round', 'DJ', 400, 2);
    const finalTable = one(document, '#final_jeopardy_round > table.final_round');
    if (finalTable.querySelectorAll('td.clue_text[id]:not([id$="_r"])').length !== 1) {
      throw new Error('FJ: expected exactly one visible clue.');
    }
    const finalName = one(finalTable, '.category_name');
    categoryDetails(finalName, 'FJ category');
    const game = {
      id: prefix, title, author: 'J-Archive (source transcription)',
      // Deterministic conversion; do not mistake conversion time for episode date.
      createdAt: '1970-01-01T00:00:00.000Z',
      round1, round2,
      final: { category: {
        id: `${prefix}-FJ-category`, title: text(finalName),
        clue: clue(finalTable, 'clue_FJ', 1, false),
      } },
    };
    const validate = await getSchemaValidator();
    if (!validate(game)) {
      throw new Error(`App schema validation failed:\n${validate.errors.map(error => `${error.instancePath || '/'} ${error.message}`).join('\n')}`);
    }
    const ids = [game.id];
    for (const category of [...round1.categories, ...round2.categories, game.final.category]) {
      ids.push(category.id, ...(category.clues ?? [category.clue]).map(item => item.id));
    }
    if (new Set(ids).size !== ids.length) throw new Error('Generated game IDs are not unique.');
    return { game, warnings };
  } finally {
    dom.window.close();
  }
}

export async function writeGame(output, game) {
  const destination = resolve(output);
  await mkdir(dirname(destination), { recursive: true });
  const staging = `${destination}.${randomUUID()}.partial`;
  try {
    const file = await open(staging, 'wx');
    try {
      await file.writeFile(`${JSON.stringify(game, null, 2)}\n`, 'utf8');
      await file.sync();
    } finally {
      await file.close();
    }
    // A same-directory hard link publishes a complete file, atomically, without clobbering.
    await link(staging, destination);
  } catch (error) {
    throw new Error(`Cannot write ${destination}: ${error.code === 'EEXIST' ? 'destination exists; choose a new --output path' : error.message}.`, { cause: error });
  } finally {
    await unlink(staging).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

export async function main(args, { stdout = console.log, stderr = console.error, fetchImpl } = {}) {
  const options = parseArgs(args);
  if (options.help) { stdout(HELP); return; }
  const source = options.gameId
    ? `https://j-archive.com/showgame.php?game_id=${options.gameId}`
    : resolve(options.input);
  const html = options.gameId
    ? await fetchHtml(source, { fetchImpl })
    : await readFile(source, 'utf8');
  const { game, warnings } = await parseArchive(html, options);
  stderr(`Source: ${source}\nAttribution: J-Archive; episode title/date preserved in title. Verify rights and attribution before reuse.\ncreatedAt is a fixed conversion sentinel, not the episode date.`);
  for (const warning of warnings) stderr(`WARNING: ${warning}`);
  await writeGame(options.output, game);
  stdout(`Wrote validated 61-clue game to ${resolve(options.output)}. Media review may be required for offline play.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
  });
}
