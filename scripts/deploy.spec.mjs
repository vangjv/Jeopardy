import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { spawnSync, existsSync } = vi.hoisted(() => ({
  spawnSync: vi.fn(),
  existsSync: vi.fn(),
}));
vi.mock('node:child_process', () => ({ spawnSync }));
vi.mock('node:fs', async importOriginal => ({
  ...await importOriginal(),
  existsSync,
}));

import { main, parseArgs } from './deploy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configArgs = ['--config', join(root, 'wrangler.toml')];
const commands = () => spawnSync.mock.calls.map(([, args]) => args.slice(1));

beforeEach(() => {
  spawnSync.mockReset().mockReturnValue({ status: 0 });
  existsSync.mockReset().mockReturnValue(true);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('Cloudflare deployment script', () => {
  it('authenticates, builds production assets, then deploys with explicit config', () => {
    main([]);
    expect(commands()).toEqual([
      ['whoami', '--json'],
      ['build', '--configuration', 'production'],
      ['deploy', ...configArgs],
    ]);
    expect(existsSync).toHaveBeenCalledWith(
      join(root, 'dist', 'jeopardy', 'browser', 'index.html'),
    );
    for (const [command, args, options] of spawnSync.mock.calls) {
      expect(command).toBe(process.execPath);
      expect(args[0]).toMatch(/(?:ng|wrangler)\.js$/);
      expect(options).toMatchObject({
        cwd: root,
        stdio: 'inherit',
        env: { WRANGLER_SEND_METRICS: 'false' },
      });
      expect(options.shell).toBeUndefined();
    }
  });

  it('uploads previews without invoking a production deploy', () => {
    main(['--preview']);
    expect(commands()).toEqual([
      ['whoami', '--json'],
      ['build', '--configuration', 'production'],
      ['versions', 'upload', ...configArgs],
    ]);
  });

  it('dry-runs without authentication or any upload command', () => {
    main(['--dry-run']);
    expect(commands()).toEqual([
      ['build', '--configuration', 'production'],
      ['deploy', '--dry-run', ...configArgs],
    ]);
    expect(console.log).toHaveBeenLastCalledWith('\nDry run complete. Nothing was uploaded.');
  });

  it.each([
    { flags: [] },
    { flags: ['--preview'] },
    { flags: ['--dry-run'] },
  ])('can skip the build with $flags', ({ flags }) => {
    main([...flags, '--skip-build']);
    expect(commands().some(args => args[0] === 'build')).toBe(false);
    expect(existsSync).toHaveBeenCalledOnce();
  });

  it.each(['--help', '-h'])('prints %s without spawning commands', flag => {
    main([flag]);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it.each([
    ['--preview', '--dry-run'],
    ['--dry-run', '--preview', '--skip-build'],
    ['--dryrun'],
    ['--unknown'],
  ])('rejects unsafe or unknown flags %j before running anything', (...args) => {
    expect(() => main(args)).toThrow(/cannot be combined|Unknown argument/);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('stops before building or uploading if authentication fails', () => {
    spawnSync.mockReturnValueOnce({ status: 1 });
    expect(() => main([])).toThrow(/wrangler login.*CLOUDFLARE_API_TOKEN/);
    expect(commands()).toEqual([['whoami', '--json']]);
  });

  it('stops before uploading if the production build fails', () => {
    spawnSync.mockReturnValueOnce({ status: 2 });
    expect(() => main(['--dry-run'])).toThrow(/ng failed \(exit 2\)/);
    expect(commands()).toEqual([['build', '--configuration', 'production']]);
    expect(existsSync).not.toHaveBeenCalled();
  });

  it('rejects missing output rather than attempting an upload', () => {
    existsSync.mockReturnValue(false);
    expect(() => main(['--dry-run', '--skip-build'])).toThrow(/Missing.*index\.html/);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it.each([
    { status: 3 },
    { status: null, signal: 'SIGTERM' },
    { status: null, error: new Error('spawn failed') },
  ])('surfaces deployment failure %j instead of reporting success', result => {
    spawnSync.mockReturnValueOnce(result);
    expect(() => main(['--dry-run', '--skip-build'])).toThrow(/wrangler failed/);
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('complete'));
  });

  it('keeps the Workers asset directory aligned with the Angular output', () => {
    const config = readFileSync(join(root, 'wrangler.toml'), 'utf8');
    const angular = JSON.parse(readFileSync(join(root, 'angular.json'), 'utf8'));
    expect(angular.projects.jeopardy.architect.build.builder).toBe('@angular/build:application');
    expect(config).toMatch(/directory = "dist\/jeopardy\/browser"/);
    expect(config).toMatch(/not_found_handling = "single-page-application"/);
    expect(config).toMatch(/preview_urls = true/);
    expect(parseArgs([])).toMatchObject({ preview: false, dryRun: false, skipBuild: false });
  });

  it('excludes only the unused oversized reference dataset from Cloudflare uploads', () => {
    const ignore = readFileSync(join(root, 'public', '.assetsignore'), 'utf8');
    const patterns = ignore.split(/\r?\n/).filter(line => line && !line.startsWith('#'));
    expect(patterns).toEqual(['/jeopardy-dataset/200k_questions.json']);
  });
});
