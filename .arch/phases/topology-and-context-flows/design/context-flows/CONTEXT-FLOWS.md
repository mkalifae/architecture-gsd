---
phase: topology-and-context-flows
document_type: context-flow
agents_covered: 6
sync_boundary: "trigger-listener → diff-analyzer (sync); all downstream agents async"
---

# Context Flows: Code Review Automation Pipeline

## Per-Agent Context Table

| Agent | Reads From | Writes To | Passes Downstream |
|-------|-----------|-----------|-------------------|
| trigger-listener | GitHub webhook HTTP POST (raw payload); idempotency store (Redis key delivery:{id}); WEBHOOK_SECRET env var | Idempotency store (delivery_id record); sync call return to GitHub (HTTP 200/401) | PullRequestReceived → diff-analyzer (sync) |
| diff-analyzer | PullRequestReceived (sync from trigger-listener); GitHub REST API (PR files endpoint, paginated); GITHUB_TOKEN env var | Message bus (DiffAnalysisComplete on Redis Streams pr-analysis consumer group) | DiffAnalysisComplete → style-checker (fanout); DiffAnalysisComplete → logic-reviewer (fanout) |
| style-checker | DiffAnalysisComplete (message bus pr-analysis group); repository lint config (.eslintrc.json, pyproject.toml, etc. — read from PR repo, if present); temp files /tmp/style-check-{pr_number}-{chunk_index}.{ext} (written and deleted) | Message bus (StyleCheckComplete on Redis Streams pr-style-complete key) | StyleCheckComplete → synthesis-agent |
| logic-reviewer | DiffAnalysisComplete (message bus pr-analysis group); prompts/logic-review-v{version}.txt (versioned prompt template); Anthropic API response (LLM output) | Message bus (LogicReviewComplete on Redis Streams pr-logic-complete key) | LogicReviewComplete → synthesis-agent |
| synthesis-agent | StyleCheckComplete (message bus pr-style-complete key, correlated by pr_number+head_sha); LogicReviewComplete (message bus pr-logic-complete key, correlated by pr_number+head_sha); correlation state (per-(pr_number, head_sha) aggregation object) | Message bus (ReviewSynthesized on Redis Streams pr-review-synthesized key) | ReviewSynthesized → notification-agent |
| notification-agent | ReviewSynthesized (message bus pr-delivery group); GitHub REST API (PR review endpoints); repository full_name (from ReviewSynthesized or correlation store) | GitHub PR Review (inline comments + review submission via GitHub REST API); message bus (NotificationSent on Redis Streams key) | NotificationSent → monitoring (via structured log) |

## Sync/Async Boundary Analysis

The pipeline has one sync/async boundary: between trigger-listener and diff-analyzer.

**Synchronous segment (trigger-listener → diff-analyzer):**
- trigger-listener waits for diff-analyzer to complete before returning HTTP 200 to GitHub
- This sync boundary ensures: (1) the diff is fully parsed before any analysis begins, (2) if diff-analyzer fails, trigger-listener can return an error to GitHub for webhook retry, (3) the delivery_id is only recorded as processed after diff-analyzer confirms success
- Risk: diff-analyzer timeout (30-second limit) blocks trigger-listener's response to GitHub; mitigated by returning HTTP 200 on timeout to prevent GitHub retry storm

**Asynchronous segment (diff-analyzer → all downstream):**
- All downstream agents (style-checker, logic-reviewer, synthesis-agent, notification-agent) communicate via Redis Streams pub/sub
- Decoupled: each agent has its own consumer group; a slow style-checker does not delay logic-reviewer
- At-least-once delivery: Redis Streams consumer groups provide retry on consumer failure via XAUTOCLAIM

## Information Bottleneck Analysis

**Context-starved agents:**
- notification-agent: receives only ReviewSynthesized (no diff content) — this is by design; notification-agent's job is delivery, not analysis. It has sufficient context (file, line, severity, message, verdict) to construct GitHub review comments without reading the diff.
- synthesis-agent: receives StyleCheckComplete and LogicReviewComplete but not the raw diff — synthesis-agent cannot verify finding attributions independently; it trusts upstream agents to have validated file/line attribution before emission.

**Context-overloaded agents:**
- diff-analyzer: receives the full GitHub API PR files response (potentially hundreds of changed files) and constructs the complete diff_chunks array. For large PRs (2000+ lines), this is the highest context load in the pipeline. Mitigated by chunking at 500 lines per chunk and emitting a single DiffAnalysisComplete with the full chunks array.
- logic-reviewer: receives all diff_chunks (potentially up to 100 chunks for large PRs) as input to the LLM prompt. The LLM context window budget of 200K per agent (from CONTEXT.md scale) accommodates approximately 4000 lines of diff before exceeding capacity. For PRs near the 2000-line limit, logic-reviewer uses approximately 50% of its context budget on the diff content alone.

**Critical path:**
The end-to-end latency is dominated by logic-reviewer (up to 60 seconds for LLM call). Style-checker (sub-second linting) completes first and waits at synthesis-agent for up to 90 seconds for LogicReviewComplete. The critical path is: trigger-listener (< 1s) + diff-analyzer (1-3s) + logic-reviewer (up to 60s) + synthesis-agent (< 1s) + notification-agent (1-5s) = up to 69 seconds end-to-end per PR.

## Context Flow YAML Canonical Block

```yaml
context_flows:
  sync_boundary:
    between: [trigger-listener, diff-analyzer]
    type: sync-request-response
    timeout_seconds: 30
    note: only sync hop in the pipeline
  agents:
    - name: trigger-listener
      reads:
        - source: github-webhook-http-post
          fields: [action, pr_number, head_sha, repository_full_name, pr_url]
          purpose: event extraction
        - source: redis-idempotency-store
          key_pattern: "delivery:{delivery_id}"
          purpose: duplicate webhook detection
      writes:
        - destination: redis-idempotency-store
          key_pattern: "delivery:{delivery_id}"
          ttl_hours: 24
          purpose: idempotency record
      passes:
        - downstream: diff-analyzer
          event: PullRequestReceived
          via: sync-rpc
    - name: diff-analyzer
      reads:
        - source: PullRequestReceived
          via: sync-rpc from trigger-listener
          fields: [pr_number, head_sha, repository_full_name]
        - source: github-api
          endpoint: "GET /repos/{owner}/{repo}/pulls/{pr_number}/files"
          fields: [filename, additions, deletions, patch]
          paginated: true
      writes:
        - destination: redis-streams
          key: "pr-analysis:{pr_number}:{head_sha}"
          event: DiffAnalysisComplete
      passes:
        - downstream: style-checker
          event: DiffAnalysisComplete
          via: pub/sub fanout
        - downstream: logic-reviewer
          event: DiffAnalysisComplete
          via: pub/sub fanout
    - name: style-checker
      reads:
        - source: redis-streams
          consumer_group: pr-analysis
          event: DiffAnalysisComplete
          fields: [diff_chunks, files_changed]
        - source: repository-config
          files: [.eslintrc.json, pyproject.toml, .rubocop.yml, .golangci.yml]
          required: false
          fallback: default linter rules
      writes:
        - destination: redis-streams
          key: "pr-style-complete:{pr_number}:{head_sha}"
          event: StyleCheckComplete
      passes:
        - downstream: synthesis-agent
          event: StyleCheckComplete
          via: pub/sub
    - name: logic-reviewer
      reads:
        - source: redis-streams
          consumer_group: pr-analysis
          event: DiffAnalysisComplete
          fields: [diff_chunks, total_lines_changed]
        - source: prompt-template
          path: "prompts/logic-review-v{version}.txt"
          purpose: LLM review prompt
        - source: anthropic-api
          model: claude-3-5-sonnet-20241022
          timeout_seconds: 60
          purpose: semantic logic analysis
      writes:
        - destination: redis-streams
          key: "pr-logic-complete:{pr_number}:{head_sha}"
          event: LogicReviewComplete
      passes:
        - downstream: synthesis-agent
          event: LogicReviewComplete
          via: pub/sub
    - name: synthesis-agent
      reads:
        - source: redis-streams
          consumer_group: pr-synthesis
          events: [StyleCheckComplete, LogicReviewComplete]
          correlation_key: "(pr_number, head_sha)"
          aggregation_timeout_seconds: 90
      writes:
        - destination: redis-streams
          key: "pr-review-synthesized:{pr_number}:{head_sha}"
          event: ReviewSynthesized
      passes:
        - downstream: notification-agent
          event: ReviewSynthesized
          via: pub/sub
    - name: notification-agent
      reads:
        - source: redis-streams
          consumer_group: pr-delivery
          event: ReviewSynthesized
          fields: [pr_number, head_sha, unified_findings, verdict]
        - source: github-api
          endpoints:
            - "POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews"
            - "PUT /repos/{owner}/{repo}/pulls/{pr_number}/reviews/{review_id}/comments"
            - "POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews/{review_id}/events"
          purpose: PR review submission
      writes:
        - destination: github-pr-review
          type: inline-review-comments
          verdict: from ReviewSynthesized
        - destination: redis-streams
          key: "pr-notification-sent:{pr_number}:{head_sha}"
          event: NotificationSent
      passes:
        - downstream: monitoring
          event: NotificationSent
          via: structured-log
```
