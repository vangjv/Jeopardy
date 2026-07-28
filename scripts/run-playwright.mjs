import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import process from 'node:process';

const require = createRequire(import.meta.url);
const ngCli = require.resolve('@angular/cli/bin/ng.js');
const playwrightCli = require.resolve('@playwright/test/cli');
let targetUrl = process.env.PLAYWRIGHT_BASE_URL;

let server;
let ownsServer = false;

async function responds() {
  try {
    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function allocateBaseUrl() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close();
        reject(new Error('Unable to allocate an isolated Playwright server port.'));
        return;
      }

      const allocatedUrl = `http://127.0.0.1:${address.port}`;
      probe.close(error => error ? reject(error) : resolve(allocatedUrl));
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (await responds()) {
      return;
    }
    if (server && server.exitCode !== null) {
      throw new Error(`Angular dev server exited with code ${server.exitCode}.`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Angular dev server did not become ready at ${targetUrl}.`);
}

function stopOwnedServer() {
  if (!ownsServer || !server?.pid) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    server.kill('SIGTERM');
  }

  ownsServer = false;
}

async function main() {
  if (targetUrl) {
    await waitForServer();
  } else {
    targetUrl = await allocateBaseUrl();
    const targetPort = new URL(targetUrl).port;
    server = spawn(
      process.execPath,
      [ngCli, 'serve', '--host', '127.0.0.1', '--port', targetPort],
      {
        stdio: 'inherit',
        windowsHide: true,
      },
    );
    ownsServer = true;
    await waitForServer();
  }

  const runner = spawn(
    process.execPath,
    [playwrightCli, 'test', ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      windowsHide: true,
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: targetUrl,
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? '0',
      },
    },
  );

  const exitCode = await new Promise((resolve, reject) => {
    runner.once('error', reject);
    runner.once('exit', code => resolve(code ?? 1));
  });

  process.exitCode = exitCode;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    stopOwnedServer();
    process.exitCode = 130;
  });
}

try {
  await main();
} finally {
  stopOwnedServer();
}

process.exit(process.exitCode ?? 0);
