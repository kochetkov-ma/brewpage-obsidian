import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { clientLabel, type Http, type HttpRequest, prepareMarkdown, publishMarkdown } from '../src/api.ts';

test('GIVEN Obsidian-specific syntax WHEN prepareMarkdown THEN it becomes portable Markdown', () => {
  const source = '---\ntags: [secret]\n---\n# Title\nSee [[Other note]] and [[Other#Part|alias]].\n![[image.png]]\n%%hidden%%Done';
  assert.equal(prepareMarkdown(source), '# Title\nSee Other note and alias.\n\nDone', 'prepared markdown');
});

function fakeHttp(responses: Array<{ status: number; json: unknown }>) {
  const calls: HttpRequest[] = [];
  const http: Http = async (request) => {
    calls.push(request);
    const next = responses.shift();
    assert.ok(next, `unexpected request ${request.method} ${request.url}`);
    return next;
  };
  return { calls, http };
}

const page = { namespace: 'my', id: 'abc', link: 'https://brewpage.app/my/abc' };
const anonymous = { 'Content-Type': 'application/json', 'X-BrewPage-Client': 'obsidian/1.0.1' };
const owned = { ...anonymous, 'X-Owner-Token': 'tok' };
const cases = [
  {
    name: 'first publish creates the page',
    token: '',
    existing: undefined,
    responses: [{ status: 201, json: { ...page, ownerToken: 'tok' } }],
    expected: { ...page, ownerToken: 'tok' },
    requests: [{ method: 'POST', url: 'https://brewpage.app/api/html?ns=my', headers: anonymous }],
  },
  {
    name: 'republish updates the same page',
    token: 'tok',
    existing: page,
    responses: [{ status: 200, json: { id: 'abc', link: page.link, namespace: 'my' } }],
    expected: { ...page, ownerToken: '' },
    requests: [{ method: 'PUT', url: 'https://brewpage.app/api/html/my/abc', headers: owned }],
  },
  {
    name: 'expired page is created again',
    token: 'tok',
    existing: page,
    responses: [
      { status: 404, json: { message: 'Not found' } },
      { status: 201, json: { namespace: 'my', id: 'new', link: 'https://brewpage.app/my/new' } },
    ],
    expected: { namespace: 'my', id: 'new', link: 'https://brewpage.app/my/new', ownerToken: '' },
    requests: [
      { method: 'PUT', url: 'https://brewpage.app/api/html/my/abc', headers: owned },
      { method: 'POST', url: 'https://brewpage.app/api/html?ns=my', headers: owned },
    ],
  },
];

for (const c of cases) {
  test(`GIVEN ${c.name} WHEN publishMarkdown THEN requests and result match`, async () => {
    const input = { content: '# Hi', filename: 'Note.md', namespace: 'my', ownerToken: c.token, clientVersion: '1.0.1', existing: c.existing };
    const fake = fakeHttp([...c.responses]);
    const result = await publishMarkdown(input, fake.http);
    assert.deepEqual(result, c.expected, `${c.name}: result`);
    assert.deepEqual(fake.calls.map(({ method, url, headers }) => ({ method, url, headers })), c.requests, `${c.name}: requests`);
  });
}

for (const [version, expected] of [['1.0.1', 'obsidian/1.0.1'], ['', 'obsidian/0']]) {
  test(`GIVEN plugin version "${version}" WHEN clientLabel THEN it is ${expected}`, () => {
    assert.equal(clientLabel(version), expected, `client label for "${version}"`);
  });
}

test('GIVEN the release files WHEN versions are read THEN all carry the manifest version', () => {
  const read = (name: string) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
  const manifest = read('manifest.json');
  const lock = read('package-lock.json');
  const actual = {
    package: read('package.json').version,
    lock: lock.version,
    lockRoot: lock.packages[''].version,
    minAppVersion: read('versions.json')[manifest.version],
  };
  const expected = { package: manifest.version, lock: manifest.version, lockRoot: manifest.version, minAppVersion: manifest.minAppVersion };
  assert.deepEqual(actual, expected, `release files for ${manifest.version}`);
});
