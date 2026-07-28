# Dependency security review

Last reviewed: 2026-07-28

## Status

`OPS-03` is complete. An authorized online `npm audit --json` against the
installed clean lockfile reports:

- 0 critical
- 0 high
- 3 moderate
- 0 low

The three remaining moderate findings are confined to the Angular CLI development
toolchain (`@angular/cli` → `@modelcontextprotocol/sdk` →
`@hono/node-server`). npm offers only a framework-major change for that path.
They do not violate the acceptance criterion, which requires no unresolved high
or critical production or development findings.

## Highest-priority findings

| Package/path | Original resolution | Finding | Completed remediation |
| --- | --- | --- | --- |
| `@angular/common`, `@angular/core`, `@angular/compiler` | `20.3.15` | Multiple high-severity XSS, transfer-cache, hydration, and formatting advisories. | Aligned the Angular 20 LTS framework and compiler packages at `20.3.26`. |
| `@angular/build` → `vite` | `20.3.13` → `7.1.11` | High-severity development-server file-read and `server.fs.deny` bypass advisories affected Vite through `7.3.4`. | Updated `@angular/build` to `20.3.32`; the lockfile resolves Vite `7.3.6`. |
| `@angular/cli` → `pacote`/`node-gyp`/`cacache` → `tar` | `20.3.13` → `7.5.2` and `6.2.1` | The critical `GHSA-23hp-3jrh-7fpw` decompression/parse DoS affected `tar <=7.5.18`, alongside high-severity traversal findings. | Updated `@angular/cli` to `20.3.32`; the lockfile resolves tar `7.5.22`. |
| `karma` → `glob`/`rimraf`/`minimatch`/`brace-expansion` | `karma 6.4.4` and legacy transitive packages | After compatible patch refreshes, this unsupported test stack remained the sole source of all nine high findings. | Migrated all 8 unit tests to Angular's Vitest runner and regenerated the lockfile from the manifest. Karma and the vulnerable legacy chain are absent. |

Other high-severity packages named by the retained audit response are
`@isaacs/brace-expansion`, `@modelcontextprotocol/sdk`, `brace-expansion`,
`minimatch`, `picomatch`, `engine.io`, `fast-uri`, `flatted`, `immutable`,
`path-to-regexp`, `piscina`, `postcss`, `rollup`, `sigstore`,
`socket.io-parser`, and `vite`/`ws`. They were transitive to the Angular
CLI/build toolchain, AJV, or Karma in the original tree; the regenerated
lockfile either advances them past the reported ranges or removes their parent
chain entirely.

## Completed upgrade record

The compatible remediation deliberately stays on Angular 20 LTS:

- Angular framework and compiler packages: `20.3.26`
- Angular CLI and build packages: `20.3.32`
- AJV: `8.20.0`
- Remaining transitive packages: newest compatible fixed versions selected by a
  freshly generated lockfile; no forced transitive overrides were needed
- Unit runner: Vitest `3.2.7` with jsdom `26.1.0`

Verification completed in this order:

1. Installed the exact regenerated lockfile with `npm ci`.
2. Inspected every previously affected dependency path.
3. Ran the authorized online audit and confirmed zero high/critical findings.
4. Created an isolated source-only copy and installed its dependencies and pinned
   Chromium from scratch.
5. Ran `npm run verify` successfully in that clean copy, including the complete
   60-clue game receipt.
