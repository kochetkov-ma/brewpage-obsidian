import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Http, type HttpRequest, prepareMarkdown, publishMarkdown } from '../src/api.ts';

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
const cases = [
  {
    name: 'first publish creates the page',
    token: '',
    existing: undefined,
    responses: [{ status: 201, json: { ...page, ownerToken: 'tok' } }],
    expected: { ...page, ownerToken: 'tok' },
    requests: [{ method: 'POST', url: 'https://brewpage.app/api/html?ns=my', headers: { 'Content-Type': 'application/json' } }],
  },
  {
    name: 'republish updates the same page',
    token: 'tok',
    existing: page,
    responses: [{ status: 200, json: { id: 'abc', link: page.link, namespace: 'my' } }],
    expected: { ...page, ownerToken: '' },
    requests: [{ method: 'PUT', url: 'https://brewpage.app/api/html/my/abc', headers: { 'Content-Type': 'application/json', 'X-Owner-Token': 'tok' } }],
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
      { method: 'PUT', url: 'https://brewpage.app/api/html/my/abc', headers: { 'Content-Type': 'application/json', 'X-Owner-Token': 'tok' } },
      { method: 'POST', url: 'https://brewpage.app/api/html?ns=my', headers: { 'Content-Type': 'application/json', 'X-Owner-Token': 'tok' } },
    ],
  },
];

for (const c of cases) {
  test(`GIVEN ${c.name} WHEN publishMarkdown THEN requests and result match`, async () => {
    const fake = fakeHttp([...c.responses]);
    const result = await publishMarkdown({ content: '# Hi', filename: 'Note.md', namespace: 'my', ownerToken: c.token, existing: c.existing }, fake.http);
    assert.deepEqual(result, c.expected, `${c.name}: result`);
    assert.deepEqual(fake.calls.map(({ method, url, headers }) => ({ method, url, headers })), c.requests, `${c.name}: requests`);
  });
}
