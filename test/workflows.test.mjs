// Seatrial scans this repository daily for Launchpad's security light (gtsbahamas/fleet#8204).
// Its zizmor pass (artipacked) reports a checkout that leaves the GitHub login on disk for later
// steps, and its version check needs the Node runtime pinned, so both are held here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, '.github', 'workflows');
const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));

test('reads the checks workflow', () => {
  assert.ok(files.includes('checks.yml'));
});

for (const file of files) {
  test(`${file}: every actions/checkout step sets persist-credentials: false`, () => {
    const lines = readFileSync(join(dir, file), 'utf8').split('\n');
    const starts = lines.flatMap((line, i) => (/^\s*-?\s*uses:\s*actions\/checkout@/.test(line) ? [i] : []));
    for (const start of starts) {
      // The step runs until the next line indented at or above its own "- ".
      const indent = lines[start].search(/-/);
      let end = start + 1;
      while (end < lines.length && !(lines[end].trim() && lines[end].search(/\S/) <= indent)) end += 1;
      assert.match(lines.slice(start, end).join('\n'), /^\s+persist-credentials:\s*false\s*$/m, `${file} line ${start + 1}`);
    }
  });
}

test('the Node runtime the checks use is pinned in .nvmrc', () => {
  assert.match(readFileSync(join(root, '.nvmrc'), 'utf8'), /^\d+(\.\d+){0,2}\n?$/);
});
