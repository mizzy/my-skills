// Run: node --test skills/metrics/metrics.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRows, claudeUsage, codexDeltas, codexMeta, codexTokens, inRepo, repoOfUrl, summarize, toCsv } from './metrics.mjs';

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
    type: 'assistant', cwd, gitBranch: 'issue-1', requestId: 'r1', timestamp: '2026-11-01T00:00:00Z',
    message: { id: 'm1', usage: { input_tokens: 2, cache_creation_input_tokens: 10, cache_read_input_tokens: 999, output_tokens: 5 } },
  });
  assert.deepEqual(claudeUsage(line('/x/carina-rs/carina/.worktrees/issue-1'), 'carina-rs/carina'),
    { key: 'm1:r1', branch: 'issue-1', ts: Date.parse('2026-11-01T00:00:00Z'), tokens: 17 });
  assert.equal(claudeUsage(line('/x/other/repo'), 'carina-rs/carina'), null);
});

test('codex meta and cumulative uncached tokens', () => {
  const meta = JSON.stringify({ type: 'session_meta', payload: { id: 's1', git: { branch: 'issue-1', repository_url: 'https://github.com/carina-rs/carina.git' } } });
  assert.deepEqual(codexMeta(meta), { id: 's1', repo: 'carina-rs/carina', branch: 'issue-1' });
  const tc = JSON.stringify({ timestamp: '2026-11-01T00:00:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 100, cached_input_tokens: 80, output_tokens: 7 } } } });
  assert.deepEqual(codexTokens(tc), { ts: Date.parse('2026-11-01T00:00:00Z'), tokens: 27 });
});

test('codexDeltas turns overlapping cumulative samples into increments', () => {
  // A resumed session repeats earlier samples in a second file.
  assert.deepEqual(codexDeltas([{ ts: 3, tokens: 50 }, { ts: 1, tokens: 10 }, { ts: 2, tokens: 30 }, { ts: 2, tokens: 30 }]),
    [{ ts: 1, tokens: 10 }, { ts: 2, tokens: 20 }, { ts: 3, tokens: 20 }]);
});

test('buildRows joins GitHub data and tokens by branch', () => {
  const rows = buildRows({
    prs: [{
      number: 7, title: 'fix, "x"', headRefName: 'issue-1', createdAt: '2026-11-01T00:00:00Z', mergedAt: '2026-11-01T12:00:00Z',
      commits: [{ committedDate: '2026-10-31T23:00:00Z' }, { committedDate: '2026-11-01T01:00:00Z' }],
    }],
    runs: [
      { databaseId: 1, headBranch: 'issue-1', headSha: 'a', conclusion: 'failure' },
      { databaseId: 2, headBranch: 'issue-1', headSha: 'a', conclusion: 'failure' },
      { databaseId: 3, headBranch: 'issue-1', headSha: 'b', conclusion: 'cancelled' },
      { databaseId: 4, headBranch: 'issue-1', headSha: 'c', conclusion: 'success' },
      { databaseId: 5, headBranch: 'main', headSha: 'd', conclusion: 'failure' },
    ],
    // Two runs on one commit, shards of one job: each kind counts that commit once.
    failedJobs: new Map([[1, ['Workspace tests (1/6)', 'Workspace tests (4/6)', 'Test']], [2, ['Feature Isolation']]]),
    regressionBodies: ['Regressed by #7', 'regressed by #8', null],
    claude: new Map([['issue-1', [{ ts: Date.parse('2026-10-31T23:00:00Z'), tokens: 60 }, { ts: Date.parse('2026-11-01T02:00:00Z'), tokens: 40 }]]]),
    codex: new Map([['issue-1', [{ ts: Date.parse('2026-11-01T00:00:00Z'), tokens: 50 }]]]),
  });
  assert.deepEqual(rows[0], {
    pr: 7, branch: 'issue-1', title: 'fix, "x"', merged_at: '2026-11-01T12:00:00Z', hours_to_merge: 12,
    ci_failed_rounds: 1, ci_failed_kinds: 'Feature Isolation:1;Test:1;Workspace tests:1', ci_rounds: 3,
    claude_tokens: 100, codex_tokens: 50, tokens_before_open: 110, tokens_after_open: 40, regressions: 1, commits_after_open: 1,
  });
  assert.match(toCsv(rows), /"fix, ""x"""/);
  assert.match(summarize(rows), /failed CI rounds by job: Feature Isolation 1, Test 1, Workspace tests 1/);
  assert.match(summarize(rows), /before \/ after open: 110 \/ 40/);
});
