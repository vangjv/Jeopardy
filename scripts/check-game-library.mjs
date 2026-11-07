import { readFile, readdir } from 'node:fs/promises';

const gamesDirectory = new URL('../games/', import.meta.url);
const libraryModule = new URL(
  '../src/app/host/components/game-import/built-in-game-library.ts',
  import.meta.url,
);
const gameFiles = (await readdir(gamesDirectory))
  .filter(name => name.endsWith('.json'))
  .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
const source = await readFile(libraryModule, 'utf8');
const registeredFiles = [...source.matchAll(/from '(?:\.\.\/)+games\/([^']+\.json)'/g)]
  .map(match => match[1])
  .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

if (gameFiles.length !== registeredFiles.length) {
  throw new Error(
    `Library includes ${registeredFiles.length} root game JSON files, but games/ contains ${gameFiles.length}.`,
  );
}
for (const [index, name] of gameFiles.entries()) {
  if (registeredFiles[index] !== name) {
    throw new Error(`Missing or unexpected library entry at ${name}; registered ${registeredFiles[index] ?? 'nothing'}.`);
  }
  const game = JSON.parse(await readFile(new URL(name, gamesDirectory), 'utf8'));
  if (typeof game.id !== 'string' || typeof game.title !== 'string') {
    throw new Error(`${name} is missing its game identity or title.`);
  }
}
if (!source.includes("import sampleGame from '../../../../assets/game-sets/sample-game.json'")) {
  throw new Error('The standalone sample questions are no longer statically included in the library.');
}

console.log(`Verified all ${gameFiles.length} games/*.json files and the separate sample library entry.`);
