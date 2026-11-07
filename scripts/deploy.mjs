import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browserDir = join(root, 'dist', 'jeopardy', 'browser');
const usage = `Usage: node scripts/deploy.mjs [--preview | --dry-run] [--skip-build]

Default       Build production assets and deploy to Cloudflare Workers.
--preview     Build and upload a version without shifting production traffic.
--dry-run     Build and validate locally; no authentication or upload.
--skip-build  Use existing dist/jeopardy/browser output (may be stale).
--help, -h    Show this help.

Authenticate with "npx wrangler login", or set CLOUDFLARE_API_TOKEN
and CLOUDFLARE_ACCOUNT_ID in CI.`;

export function parseArgs(args) {
  const allowed = new Set(['--preview', '--dry-run', '--skip-build', '--help', '-h']);
  for (const arg of args) {
    if (!allowed.has(arg)) {
      throw new Error(`Unknown argument: ${arg}\n${usage}`);
    }
  }
  const flags = new Set(args);
  if (flags.has('--preview') && flags.has('--dry-run')) {
    throw new Error('--preview and --dry-run cannot be combined. No upload was attempted.');
  }
  return {
    preview: flags.has('--preview'),
    dryRun: flags.has('--dry-run'),
    skipBuild: flags.has('--skip-build'),
    help: flags.has('--help') || flags.has('-h'),
  };
}

function runCli(tool, args, failureHint = '') {
  const cli = tool === 'ng'
    ? require.resolve('@angular/cli/bin/ng.js')
    : join(dirname(require.resolve('wrangler/package.json')), 'bin', 'wrangler.js');
  console.log(`\n> ${tool} ${args.join(' ')}`);
  // Invoke local JS entry points to avoid Windows .cmd shims and shell quoting.
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  if (result.error || result.status !== 0) {
    const reason = result.error?.message ?? result.signal ?? `exit ${result.status}`;
    const error = new Error(`${tool} failed (${reason}). ${failureHint}`.trim());
    error.exitCode = result.status || 1;
    throw error;
  }
}

export function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(usage);
    return;
  }

  if (!options.dryRun) {
    runCli('wrangler', ['whoami', '--json'],
      'Run "npx wrangler login" or set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.');
  }

  if (!options.skipBuild) {
    // Angular's application builder cleans its own output before building.
    runCli('ng', ['build', '--configuration', 'production']);
  }
  if (!existsSync(join(browserDir, 'index.html'))) {
    throw new Error(`Missing ${join(browserDir, 'index.html')}. Run "npm run build" first.`);
  }

  const command = options.preview
    ? ['versions', 'upload']
    : ['deploy', ...(options.dryRun ? ['--dry-run'] : [])];
  runCli('wrangler', [...command, '--config', join(root, 'wrangler.toml')]);
  console.log(options.dryRun
    ? '\nDry run complete. Nothing was uploaded.'
    : options.preview
      ? '\nPreview version uploaded. Production traffic is unchanged.'
      : '\nProduction deployment complete.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode ?? 1;
  }
}
