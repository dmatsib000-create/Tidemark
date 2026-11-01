// The service worker's file list: run with `node --test`. One missing file
// makes the install fail, and a file left off the list is missing offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');
const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));

test('every file in the offline list exists', () => {
  for (const path of shell) {
    const file = path === './' ? 'index.html' : path.slice(2);
    assert.ok(existsSync(new URL(file, root)), `${path} is listed in sw.js but missing`);
  }
});

test('every script and font is in the offline list', () => {
  const needed = [
    ...readdirSync(new URL('js/', root)).map(f => `./js/${f}`),
    ...readdirSync(new URL('fonts/', root)).filter(f => f.endsWith('.woff2')).map(f => `./fonts/${f}`),
    './index.html', './styles.css', './manifest.webmanifest',
  ];
  for (const path of needed) assert.ok(shell.includes(path), `${path} is not cached for offline use`);
});
