---
phase: agent-contracts
plan: "01"
type: execute
wave: 2
depends_on:
  - .arch/phases/context-and-schema-design/01-PLAN.md
files_modified:
  - design/agents/trigger-listener.md
  - design/agents/diff-analyzer.md
  - design/agents/style-checker.md
autonomous: true
must_haves:
  truths:
    - "trigger-listener.md has all 7 required sections and models the sync request/response boundary to diff-analyzer"
    - "diff-analyzer.md has all 7 required sections and models chunked diff parsing with GitHub API fetch"
    - "style-checker.md has all 7 required sections and explicitly uses static analysis tools (not LLM)"
    - "All three contracts reference event names from design/events/events.yaml by canonical PascalCase name"
    - "All three agent names follow kebab-case; detect-stubs and validate-names pass for all three"
  artifacts:
    - path: "design/agents/trigger-listener.md"
      provides: "Agent contract for webhook handler"
      contains: "PullRequestReceived"
    - path: "design/agents/diff-analyzer.md"
      provides: "Agent contract for diff parsing agent"
      contains: "DiffAnalysisComplete"
    - path: "design/agents/style-checker.md"
      provides: "Agent contract for static analysis agent"
      contains: "StyleCheckComplete"
  key_links:
    - from: "design/agents/trigger-listener.md"
      to: "design/events/events.yaml"
      via: "trigger-listener declared as producer of PullRequestReceived"
      pattern: "PullRequestReceived"
    - from: "design/agents/diff-analyzer.md"
      to: "design/events/events.yaml"
      via: "diff-analyzer declared as consumer of PullRequestReceived and producer of DiffAnalysisComplete"
      pattern: "DiffAnalysisComplete"
---

<objective>
Produce the first three agent contracts for the Code Review Automation Pipeline: trigger-listener (webhook handler with HMAC validation), diff-analyzer (GitHub API diff fetcher and parser), and style-checker (static analysis runner). Each contract covers the 7 required sections and explicitly references event names from design/events/events.yaml.
</objective>

<context>
@.arch/CONTEXT.md
@.arch/RESEARCH.md
@.arch/phases/context-and-schema-design/design/events/events.yaml
@references/agent-spec-format.md
@templates/agent-spec.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write trigger-listener agent contract</name>
  <files>design/agents/trigger-listener.md</files>
  <action>
Create .arch/phases/agent-contracts/design/agents/ directory and write trigger-listener.md.

Follow templates/agent-spec.md scaffold with all 7 required sections. Use agent-spec-format.md as the rubric for COMPLETE vs INCOMPLETE content.

Frontmatter:
- name: trigger-listener
- description: "Receives GitHub webhook PR events, validates HMAC-SHA256 signatures, enforces idempotency via delivery_id, and emits PullRequestReceived to diff-analyzer via sync request/response. Spawned by the webhook infrastructure on PR open, reopen, or synchronize events."
- tools: Read, Write, Bash
- model: sonnet
- color: orange

Role section (3+ sentences): Spawned by the GitHub webhook infrastructure when a PR open, reopen, or synchronize event arrives. This agent validates the HMAC-SHA256 signature from the X-Hub-Signature-256 header using crypto.timingSafeEqual, checks the X-GitHub-Delivery header against an idempotency store to reject duplicate deliveries, and emits PullRequestReceived via synchronous call to diff-analyzer. Output is the PullRequestReceived event passed to diff-analyzer; no file artifacts are written to disk.

Upstream Input section: List these specific inputs with paths and purpose:
- Reads GitHub webhook payload (HTTP POST body) — uses PR event action field (opened/reopened/synchronize), pull_request.number, pull_request.head.sha, pull_request.html_url, repository.full_name
- Reads X-Hub-Signature-256 header — uses HMAC-SHA256 value for signature validation against WEBHOOK_SECRET env var
- Reads X-GitHub-Delivery header — uses delivery UUID for idempotency check against processed-deliveries store
- Reads design/events/events.yaml — uses PullRequestReceived event schema for payload construction and field validation

Downstream Consumer section: List consumers with paths and what they use:
- diff-analyzer receives PullRequestReceived event synchronously — uses pr_number, head_sha, repository_full_name, delivery_id to fetch and parse the PR diff
- monitoring/observability consumes the emit log — uses pr_number and delivery_id for request tracing

Execution Flow section (4+ numbered steps, concrete actions):
1. Receive HTTP POST webhook payload; read X-Hub-Signature-256 and X-GitHub-Delivery headers from request
2. Validate HMAC-SHA256 signature: compute sha256 of raw payload body using WEBHOOK_SECRET; compare with crypto.timingSafeEqual; return HTTP 401 if invalid
3. Check idempotency: query processed-deliveries store for delivery_id from X-GitHub-Delivery; return HTTP 200 (no-op) if delivery_id already processed
4. Extract PR event fields: action (filter for opened, reopened, synchronize only; return HTTP 200 no-op for unsupported actions), pr_number, head_sha, repository_full_name, pr_url
5. Construct PullRequestReceived payload per design/events/events.yaml schema; validate all required fields are non-null
6. Call diff-analyzer synchronously (HTTP POST or in-process RPC) passing PullRequestReceived payload; await response
7. Record delivery_id in idempotency store with expiry 24h; return HTTP 200 to GitHub to acknowledge delivery
8. Return structured JSON result: { status: 'complete', event_emitted: 'PullRequestReceived', pr_number, delivery_id }

Structured Returns section (literal JSON):
```json
{
  "status": "complete | failed",
  "event_emitted": "PullRequestReceived",
  "pr_number": 4271,
  "delivery_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Webhook processed — PullRequestReceived emitted to diff-analyzer"
}
```

Failure Modes section (3+ named modes):
- FM-001: Invalid HMAC Signature — Trigger: X-Hub-Signature-256 header does not match HMAC-SHA256 of raw payload body. Manifestation: Agent rejects the webhook and returns HTTP 401 without emitting PullRequestReceived. Severity: high. Recovery: Immediate: return HTTP 401, log the signature mismatch with the source IP for security monitoring. Escalation: if repeated from same IP, alert security team via structured log event. Detection: HTTP 401 responses in access log; mismatch count metric exceeds threshold.
- FM-002: Duplicate Delivery (Idempotency Check) — Trigger: X-GitHub-Delivery value matches a delivery_id already in the processed-deliveries store. Manifestation: Agent returns HTTP 200 without processing, preventing duplicate review. Severity: low. Recovery: Immediate: return HTTP 200 no-op, increment duplicate_delivery_count metric. Escalation: if duplicate rate exceeds 5% of deliveries, investigate GitHub webhook retry configuration. Detection: duplicate_delivery_count metric; log entries tagged duplicate_skipped.
- FM-003: diff-analyzer Sync Call Timeout — Trigger: Synchronous call to diff-analyzer does not return within 30 seconds. Manifestation: trigger-listener cannot confirm diff-analyzer received the event; GitHub webhook delivery may time out. Severity: high. Recovery: Immediate: return HTTP 200 to GitHub to prevent webhook retry storm; log timeout with pr_number and delivery_id; do not record delivery_id as processed. Escalation: alert on-call if diff-analyzer timeout rate exceeds 1% of PRs. Detection: timeout_count metric on diff-analyzer sync call; log entries tagged sync_timeout.

Constraints section (2+ hard limits):
- Must validate HMAC-SHA256 signature on every request before any processing — no bypass for internal callers or test environments
- Must not emit PullRequestReceived without recording delivery_id in the idempotency store within the same atomic operation — partial recording causes duplicate processing

Create the design/agents/ directory:
  Bash: mkdir -p .arch/phases/agent-contracts/design/agents/

Write to: .arch/phases/agent-contracts/design/agents/trigger-listener.md
  </action>
  <verify>
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/trigger-listener.md
node bin/arch-tools.js validate-names .arch/phases/agent-contracts/design/agents/trigger-listener.md
grep -c "## " .arch/phases/agent-contracts/design/agents/trigger-listener.md
  </verify>
  <done>trigger-listener.md exists with all 7 required sections, references PullRequestReceived from events.yaml, models the HMAC validation and idempotency check pattern, passes detect-stubs and validate-names.</done>
</task>

<task type="auto">
  <name>Task 2: Write diff-analyzer agent contract</name>
  <files>design/agents/diff-analyzer.md</files>
  <action>
Write .arch/phases/agent-contracts/design/agents/diff-analyzer.md.

Follow templates/agent-spec.md scaffold with all 7 required sections.

Frontmatter:
- name: diff-analyzer
- description: "Receives PullRequestReceived events synchronously from trigger-listener, fetches the PR diff via GitHub REST API, parses it into file-attributed chunks, and emits DiffAnalysisComplete to style-checker and logic-reviewer via pub/sub fanout. Spawned as the sync consumer of trigger-listener."
- tools: Read, Write, Bash
- model: sonnet
- color: blue

Role section: Receives PullRequestReceived events from trigger-listener via synchronous request/response. This agent fetches the PR diff from the GitHub REST API using the pr_number and repository_full_name fields, parses the unified diff format into file-attributed chunks (respecting the 2000-line limit constraint), and emits DiffAnalysisComplete to the message bus for parallel consumption by style-checker and logic-reviewer. Output is the DiffAnalysisComplete event containing structured diff_chunks with file, line range, and content attribution.

Upstream Input:
- Reads PullRequestReceived event payload (from trigger-listener sync call) — uses pr_number, head_sha, repository_full_name to construct GitHub API diff request
- Reads GitHub REST API response (GET /repos/{owner}/{repo}/pulls/{pull_number}/files) — uses filename, additions, deletions, patch fields for diff parsing
- Reads design/events/events.yaml — uses DiffAnalysisComplete event schema for output payload structure and field validation

Downstream Consumer:
- style-checker subscribes to DiffAnalysisComplete on message bus — uses diff_chunks array for per-file static analysis input
- logic-reviewer subscribes to DiffAnalysisComplete on message bus — uses diff_chunks array as input to LLM review prompt
- Both subscribe independently (pub/sub fanout — not sequential)

Execution Flow:
1. Receive PullRequestReceived payload synchronously from trigger-listener; extract pr_number, head_sha, repository_full_name, delivery_id
2. Call GitHub REST API: GET /repos/{owner}/{repo}/pulls/{pr_number}/files with Authorization header; receive array of changed file objects with patch (unified diff)
3. Parse each file's patch field using unified diff hunk header pattern (@@ -L,N +L,N @@) to extract start_line, end_line, and content for each changed file
4. Enforce 2000-line limit: count total lines changed across all files; if total > 2000, log a warning but continue with chunking
5. Chunk diffs by file: each changed file becomes one chunk; split files with > 500 changed lines into sub-chunks of 500 lines each; set chunked=true if any file is split
6. Construct DiffAnalysisComplete payload with diff_chunks array, total_lines_changed, chunked flag, and files_changed list
7. Publish DiffAnalysisComplete to message bus (Redis Streams key: pr-analysis:{pr_number}:{head_sha})
8. Return HTTP response to trigger-listener: { status: 'complete', event_emitted: 'DiffAnalysisComplete', chunks_count: N }

Structured Returns:
```json
{
  "status": "complete | failed",
  "event_emitted": "DiffAnalysisComplete",
  "pr_number": 4271,
  "chunks_count": 7,
  "total_lines_changed": 347,
  "chunked": false,
  "message": "Diff parsed into 7 chunks — DiffAnalysisComplete published to message bus"
}
```

Failure Modes:
- FM-001: GitHub API 404 (PR Deleted Mid-Flight) — Trigger: GitHub API returns 404 for GET /repos/.../pulls/{pr_number}/files (PR closed or deleted after PullRequestReceived emitted). Manifestation: diff-analyzer cannot fetch diff; DiffAnalysisComplete is not emitted; pipeline stops for this PR. Severity: medium. Recovery: Immediate: return { status: 'failed', reason: 'pr_not_found', pr_number } to trigger-listener; trigger-listener logs the stale reference without retry. Escalation: if 404 rate exceeds 2% of PRs, investigate webhook delivery timing vs PR lifecycle. Detection: GitHub API 404 response; pr_not_found_count metric.
- FM-002: Diff Exceeds 2000-Line Limit — Trigger: PR diff total_lines_changed exceeds 2000 across all changed files (oversized PR beyond design constraint). Manifestation: diff-analyzer applies 500-line chunking, processes all available lines but sets chunked=true and logs warning that analysis may be incomplete for very large PRs. Severity: medium. Recovery: Immediate: continue processing with chunked=true and 500-line sub-chunks; log pr_number and total_lines_changed for monitoring. Escalation: if total_lines_changed > 5000, emit DiffAnalysisComplete with a warning annotation in the summary field. Detection: total_lines_changed field in DiffAnalysisComplete > 2000; chunked=true in emitted event.
- FM-003: GitHub API Rate Limit Exceeded — Trigger: GitHub REST API returns 403 with X-RateLimit-Remaining: 0 header during diff fetch. Manifestation: diff-analyzer cannot fetch diff; DiffAnalysisComplete is not emitted; PR is not reviewed until rate limit resets. Severity: high. Recovery: Immediate: read X-RateLimit-Reset header for reset timestamp; return { status: 'rate_limited', retry_after: N } to trigger-listener; do NOT retry immediately. Escalation: trigger-listener requeues the PullRequestReceived event with a delay matching X-RateLimit-Reset. Detection: GitHub API 403 with X-RateLimit-Remaining: 0; rate_limit_hit metric.

Constraints:
- Must not exceed 2000 lines in a single DiffAnalysisComplete emission — apply chunking at 500 lines per chunk for files exceeding this threshold
- Must publish DiffAnalysisComplete to the message bus and return success response to trigger-listener atomically — if publishing fails, the sync response to trigger-listener must indicate failure so trigger-listener can retry
  </action>
  <verify>
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/diff-analyzer.md
node bin/arch-tools.js validate-names .arch/phases/agent-contracts/design/agents/diff-analyzer.md
  </verify>
  <done>diff-analyzer.md exists with all 7 required sections, references DiffAnalysisComplete from events.yaml, models the GitHub API fetch and chunked diff parsing pattern, passes detect-stubs and validate-names.</done>
</task>

<task type="auto">
  <name>Task 3: Write style-checker agent contract</name>
  <files>design/agents/style-checker.md</files>
  <action>
Write .arch/phases/agent-contracts/design/agents/style-checker.md.

Follow templates/agent-spec.md scaffold with all 7 required sections. Per locked-decision in CONTEXT.md: style checking uses static analysis tools (not LLM) — deterministic and fast.

Frontmatter:
- name: style-checker
- description: "Subscribes to DiffAnalysisComplete events from the message bus, runs language-appropriate static analysis linting tools against PR diff chunks, and emits StyleCheckComplete with file and line attributed findings. Spawned as a pub/sub consumer by the message bus."
- tools: Read, Write, Bash
- model: haiku
- color: green

Role section: Subscribes to DiffAnalysisComplete events from the message bus as an independent consumer in the pub/sub fanout downstream of diff-analyzer. This agent invokes language-appropriate static analysis tools (ESLint for TypeScript/JavaScript, Pylint for Python, or equivalent linters) against the diff_chunks received in DiffAnalysisComplete, maps linting findings to the specific file and line numbers in the diff, and emits StyleCheckComplete with a structured findings list. Output is the StyleCheckComplete event containing an array of file-attributed style violations. Per locked-decision in CONTEXT.md, this agent uses static analysis tools only — no LLM calls are made during style checking.

Upstream Input:
- Reads DiffAnalysisComplete event from message bus (Redis Streams key: pr-analysis:{pr_number}:{head_sha}) — uses diff_chunks array (file, content, start_line) as input to linting tools
- Reads repository lint configuration from .eslintrc, pyproject.toml, or equivalent config file in PR repository — uses rule configuration to run the correct linter with project-specific rules
- Reads design/events/events.yaml — uses StyleCheckComplete event schema for output payload construction

Downstream Consumer:
- synthesis-agent subscribes to StyleCheckComplete on message bus — uses findings array (file, line, rule, severity, message) and status field for conflict resolution and severity ranking

Execution Flow:
1. Read DiffAnalysisComplete event from message bus consumer group; extract diff_chunks array and pr_number, head_sha for correlation
2. Detect repository language from file extensions in files_changed: .ts/.js → ESLint, .py → Pylint, .rb → RuboCop, .go → golint; if multiple languages, run appropriate linter per language subset
3. For each diff_chunk, write chunk content to a temporary file; run linter binary (e.g., eslint --format json) on the temporary file; capture structured JSON output
4. Parse linter output: map each finding to file path and absolute line number by adding chunk.start_line offset to relative line number from linter output
5. Filter findings to only include lines within the diff (changed lines only — not pre-existing violations in unchanged context lines)
6. Construct StyleCheckComplete payload: set status to 'violations_found' if findings.length > 0, otherwise 'passed'; include tool_name, duration_ms
7. Publish StyleCheckComplete to message bus consumer group key: pr-style-complete:{pr_number}:{head_sha}
8. Acknowledge DiffAnalysisComplete message in consumer group; return structured JSON result

Structured Returns:
```json
{
  "status": "complete | failed",
  "event_emitted": "StyleCheckComplete",
  "pr_number": 4271,
  "findings_count": 3,
  "style_status": "violations_found",
  "tool_name": "eslint",
  "duration_ms": 847,
  "message": "Style check complete — 3 violations found across 2 files"
}
```

Failure Modes:
- FM-001: Language Detection Failure — Trigger: PR contains files with unrecognized or mixed extensions that do not map to any supported linter (e.g., .rs Rust files, .java Java files). Manifestation: style-checker cannot determine which linter to run; emits StyleCheckComplete with empty findings array and status 'passed' with a warning annotation. Severity: low. Recovery: Immediate: log unsupported language with file extension list; emit StyleCheckComplete with status 'passed', empty findings, and tool_name 'unsupported-language'. Escalation: add the detected extension to monitoring for future linter support consideration. Detection: language_detection_failure metric; StyleCheckComplete events with tool_name 'unsupported-language'.
- FM-002: Lint Configuration Error — Trigger: Repository lint config file (.eslintrc, pyproject.toml) is malformed or references plugins that are not installed in the style-checker environment. Manifestation: linter binary exits with a configuration error code; no findings are produced; StyleCheckComplete is not emitted. Severity: medium. Recovery: Immediate: catch linter exit code != 0; emit StyleCheckComplete with status 'passed', empty findings, and a warning message that lint config failed; log the linter stderr for debugging. Escalation: if config errors persist for 3+ consecutive PRs in the same repository, page the DevOps team with the linter error details. Detection: linter exit code != 0 in step 3; config_error_count metric per repository.
- FM-003: Temporary File Write Failure — Trigger: Filesystem write fails when writing diff chunk content to a temporary file (e.g., disk full, permission error). Manifestation: style-checker cannot pass chunk content to the linter binary; affected chunk is not linted. Severity: medium. Recovery: Immediate: skip the failing chunk, log the write error with chunk index and pr_number; continue with remaining chunks. Escalation: if more than 50% of chunks fail to write, emit StyleCheckComplete with status 'failed' rather than producing a partial result. Detection: write error exception in step 3; failed_chunk_count metric.

Constraints:
- Must not make LLM API calls — style checking is exclusively via static analysis linter binaries per locked-decision in CONTEXT.md
- Must map all findings to specific file path and absolute line number before emitting StyleCheckComplete — unlocated findings (no file or line attribution) must be discarded, not included in the findings array
  </action>
  <verify>
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/style-checker.md
node bin/arch-tools.js validate-names .arch/phases/agent-contracts/design/agents/style-checker.md
  </verify>
  <done>style-checker.md exists with all 7 required sections, explicitly models static analysis (not LLM), references StyleCheckComplete from events.yaml, passes detect-stubs and validate-names.</done>
</task>

</tasks>

<verification>
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/trigger-listener.md
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/diff-analyzer.md
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/style-checker.md
find .arch/phases/agent-contracts/design/agents/ -name "*.md" | wc -l
</verification>

<success_criteria>
Three agent contracts exist: trigger-listener.md, diff-analyzer.md, style-checker.md. All pass detect-stubs and validate-names. Each references event names from design/events/events.yaml.
</success_criteria>

<output>
After completion, create .arch/phases/agent-contracts/SUMMARY.md
</output>
