// Run: node --test skills/metrics/metrics.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRows, claudeUsage, codexMeta, codexTokens, inRepo, repoOfUrl, toCsv } from './metrics.mjs';

test('inRepo matches the checkout and its worktrees, not sibling repos', () => {
  assert.ok(inRepo('/src/github.com/carina-rs/carina', 'carina-rs/carina'));
  assert.ok(inRepo('/src/github.com/carina-rs/carina/.worktrees/issue-1', 'carina-rs/carina'));
  assert.ok(!inRepo('/src/github.com/carina-rs/carina-provider-aws', 'carina-rs/carina'));
});

test('repoOfUrl handles .git suffix and dotted names', () => {
  assert.equal(repoOfUrl('https://github.com/carina-rs/carina.git'), 'carina-rs/carina');
  assert.equal(repoOfUrl('git@github.com:carina-rs/carina-rs.github.io.git'), 'carina-rs/carina-rs.github.io');
});

test('claudeUsage counts uncached tokens for the repo only', () => {
  const line = (cwd) => JSON.stringify({
    type: 'assistant', cwd, gitBranch: 'issue-1', requestId: 'r1',
    message: { id: 'm1', usage: { input_tokens: 2, cache_creation_input_tokens: 10, cache_read_input_tokens: 999, output_tokens: 5 } },
  });
  assert.deepEqual(claudeUsage(line('/x/carina-rs/carina/.worktrees/issue-1'), 'carina-rs/carina'),
    { key: 'm1:r1', branch: 'issue-1', tokens: 17 });
  assert.equal(claudeUsage(line('/x/other/repo'), 'carina-rs/carina'), null);
});

test('codex meta and cumulative uncached tokens', () => {
  const meta = JSON.stringify({ type: 'session_meta', payload: { id: 's1', git: { branch: 'issue-1', repository_url: 'https://github.com/carina-rs/carina.git' } } });
  assert.deepEqual(codexMeta(meta), { id: 's1', repo: 'carina-rs/carina', branch: 'issue-1' });
  const tc = JSON.stringify({ type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 100, cached_input_tokens: 80, output_tokens: 7 } } } });
  assert.equal(codexTokens(tc), 27);
});

test('buildRows joins GitHub data and tokens by branch', () => {
  const rows = buildRows({
    prs: [{
      number: 7, title: 'fix, "x"', headRefName: 'issue-1', createdAt: '2026-11-01T00:00:00Z', mergedAt: '2026-11-01T12:00:00Z',
      commits: [{ committedDate: '2026-10-31T23:00:00Z' }, { committedDate: '2026-11-01T01:00:00Z' }],
    }],
    runs: [{ headBranch: 'issue-1', headSha: 'a' }, { headBranch: 'issue-1', headSha: 'a' }, { headBranch: 'issue-1', headSha: 'b' }, { headBranch: 'main', headSha: 'c' }],
    regressionBodies: ['Regressed by #7', 'regressed by #8', null],
    claude: new Map([['issue-1', 100]]),
    codex: new Map([['issue-1', 50]]),
  });
  assert.deepEqual(rows[0], {
    pr: 7, branch: 'issue-1', title: 'fix, "x"', merged_at: '2026-11-01T12:00:00Z', hours_to_merge: 12,
    commits_after_open: 1, ci_rounds: 2, claude_tokens: 100, codex_tokens: 50, regressions: 1,
  });
  assert.match(toCsv(rows), /"fix, ""x"""/);
});
