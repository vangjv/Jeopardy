import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

function printUsage() {
  console.log(`Usage:
  npm run record:game
  npm run record:game -- --game-set <questions.json>
  npm run record:game -- --players "Ada:A,Grace:S,Linus:D"

Options:
  --game-set <path>  Import a game-set JSON file instead of the bundled sample.
  --players <list>   Configure 2-3 players as comma-separated Name:Key pairs.
  --help             Show this message.`);
}

function readOption(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

const args = process.argv.slice(2);
const environment = { ...process.env };

try {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help') {
      printUsage();
      process.exit(0);
    }
    if (argument === '--game-set') {
      environment['JEOPARDY_GAME_SET'] = resolve(readOption(args, index, argument));
      index += 1;
      continue;
    }
    if (argument === '--players') {
      environment['JEOPARDY_PLAYERS'] = readOption(args, index, argument);
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
} catch (error) {
  console.error((error).message);
  printUsage();
  process.exit(2);
}

const runner = spawn(
  process.execPath,
  [resolve('scripts/run-playwright.mjs'), '--project=receipt'],
  {
    stdio: 'inherit',
    windowsHide: true,
    env: environment,
  },
);

runner.once('error', error => {
  console.error(error);
  process.exitCode = 1;
});
runner.once('exit', code => {
  process.exitCode = code ?? 1;
});
