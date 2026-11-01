// Every product's guides, as islandflow.ai/guides and the other product sites read them
// (gtsbahamas/fleet#6233). The Launchpad commits here straight to main, so a broken index,
// a guide with no file or a file with no index row fails this check instead of a live page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const products = readdirSync(root).filter((d) => !d.startsWith('.') && existsSync(join(root, d, 'guides', 'index.json')));

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, 'the guide starts with frontmatter');
  const fields = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].startsWith('"') || kv[2].startsWith('[') ? JSON.parse(kv[2]) : kv[2];
  }
  return { fields, body: text.slice(m[0].length) };
}

test('at least one product publishes guides', () => {
  assert.ok(products.length > 0);
});

for (const product of products) {
  const dir = join(root, product, 'guides');
  const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));

  test(`${product}: every index row is complete and unique`, () => {
    assert.ok(Array.isArray(index.guides) && index.guides.length > 0);
    const slugs = index.guides.map((g) => g.slug);
    assert.equal(new Set(slugs).size, slugs.length, 'no slug listed twice');
    for (const g of index.guides) {
      assert.match(g.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `slug ${g.slug}`);
      for (const key of ['title', 'description']) assert.ok(typeof g[key] === 'string' && g[key].trim(), `${g.slug} ${key}`);
      assert.match(g.date, /^\d{4}-\d{2}-\d{2}$/, `${g.slug} date`);
      assert.ok(!Number.isNaN(Date.parse(g.date)), `${g.slug} date is a real day`);
      assert.ok(Array.isArray(g.tags) && g.tags.every((t) => typeof t === 'string' && t), `${g.slug} tags`);
    }
  });

  test(`${product}: each listed guide has its file, and the file agrees with the index`, () => {
    for (const g of index.guides) {
      const file = join(dir, `${g.slug}.md`);
      assert.ok(existsSync(file), `${g.slug}.md exists`);
      const { fields, body } = frontmatter(readFileSync(file, 'utf8'));
      for (const key of ['slug', 'title', 'description', 'date']) assert.equal(fields[key], g[key], `${g.slug} ${key}`);
      assert.deepEqual(fields.tags, g.tags, `${g.slug} tags`);
      assert.ok(body.trim().split(/\s+/).length >= 300, `${g.slug} has a real body`);
    }
  });

  test(`${product}: no guide file is missing from the index`, () => {
    const listed = new Set(index.guides.map((g) => `${g.slug}.md`));
    const files = readdirSync(dir).filter((f) => f.endsWith('.md') && statSync(join(dir, f)).isFile());
    assert.deepEqual(files.filter((f) => !listed.has(f)), []);
  });

  test(`${product}: guides carry no email addresses (marketing copy only)`, () => {
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      assert.doesNotMatch(readFileSync(join(dir, f), 'utf8'), /[\w.%+-]+@[\w-]+(\.[\w-]+)+/, f);
    }
  });
}
