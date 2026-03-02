---
phase: agent-contracts
plan: "02"
type: execute
wave: 2
depends_on:
  - .arch/phases/context-and-schema-design/01-PLAN.md
files_modified:
  - design/agents/logic-reviewer.md
  - design/agents/synthesis-agent.md
  - design/agents/notification-agent.md
autonomous: true
must_haves:
  truths:
    - "logic-reviewer.md has all 7 required sections and explicitly models LLM timeout (60s budget) and fallback behavior"
    - "synthesis-agent.md has all 7 required sections and models severity-ranked conflict resolution and aggregator timeout (90s)"
    - "notification-agent.md has all 7 required sections and models GitHub PR comment posting with inline line attribution"
    - "All three contracts reference event names from design/events/events.yaml by canonical PascalCase name"
    - "All three agent names follow kebab-case; detect-stubs and validate-names pass for all three"
  artifacts:
    - path: "design/agents/logic-reviewer.md"
      provides: "Agent contract for LLM-based logic review agent"
      contains: "LogicReviewComplete"
    - path: "design/agents/synthesis-agent.md"
      provides: "Agent contract for finding aggregation and synthesis agent"
      contains: "ReviewSynthesized"
    - path: "design/agents/notification-agent.md"
      provides: "Agent contract for PR comment and notification delivery agent"
      contains: "NotificationSent"
  key_links:
    - from: "design/agents/logic-reviewer.md"
      to: "design/events/events.yaml"
      via: "logic-reviewer declared as consumer of DiffAnalysisComplete and producer of LogicReviewComplete"
      pattern: "LogicReviewComplete"
    - from: "design/agents/synthesis-agent.md"
      to: "design/events/events.yaml"
      via: "synthesis-agent declared as consumer of StyleCheckComplete and LogicReviewComplete, producer of ReviewSynthesized"
      pattern: "ReviewSynthesized"
---

<objective>
Produce the second three agent contracts: logic-reviewer (LLM-based semantic analysis with timeout/fallback), synthesis-agent (aggregator with severity-ranked conflict resolution), and notification-agent (GitHub PR comment posting and tech lead notification). Each contract covers 7 required sections and explicitly references events from design/events/events.yaml.
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
  <name>Task 1: Write logic-reviewer agent contract</name>
  <files>design/agents/logic-reviewer.md</files>
  <action>
Write .arch/phases/agent-contracts/design/agents/logic-reviewer.md.

Follow templates/agent-spec.md scaffold with all 7 required sections. Per locked-decision in CONTEXT.md: logic review uses LLM with 60-second hard timeout and fallback behavior.

Frontmatter:
- name: logic-reviewer
- description: "Subscribes to DiffAnalysisComplete events from the message bus, sends PR diff chunks to an LLM for semantic logic analysis with a 60-second hard timeout and fallback, and emits LogicReviewComplete with file and line attributed findings. Spawned as a pub/sub consumer alongside style-checker."
- tools: Read, Write, Bash
- model: opus
- color: purple

Role section: Subscribes to DiffAnalysisComplete events from the message bus as an independent consumer in the pub/sub fanout, running in parallel with style-checker. This agent constructs a structured LLM review prompt from the diff_chunks content, calls the Anthropic API with a 60-second hard timeout (per CONTEXT.md constraint), parses the LLM's structured JSON response to extract file and line attributed findings, and emits LogicReviewComplete. If the LLM does not respond within 60 seconds, the agent emits LogicReviewComplete with status 'timeout' and empty findings rather than blocking the pipeline. All findings must include file path and line_start/line_end attribution — unlocated findings are rejected and not included in the output.

Upstream Input:
- Reads DiffAnalysisComplete event from message bus (Redis Streams key: pr-analysis:{pr_number}:{head_sha}) — uses diff_chunks array as input to LLM review prompt construction
- Reads LLM system prompt template from prompts/logic-review-v{version}.txt — uses the versioned prompt template with {diff_content} placeholder substitution; version tracked in LogicReviewComplete.prompt_version
- Reads design/events/events.yaml — uses LogicReviewComplete event schema for output payload structure and field validation

Downstream Consumer:
- synthesis-agent subscribes to LogicReviewComplete on message bus — uses findings array (file, line_start, line_end, severity, category, description), status field (complete/timeout/partial), and model_used for conflict resolution and verdict determination

Execution Flow:
1. Read DiffAnalysisComplete event from message bus consumer group; extract diff_chunks, pr_number, head_sha for correlation
2. Construct LLM review prompt: substitute diff_chunks content into the versioned prompt template; require structured JSON output with file, line_start, line_end, severity, category, description per finding
3. Call Anthropic API with asyncio.wait_for timeout of 60 seconds; model: claude-3-5-sonnet-20241022; max_tokens: 4096
4. If asyncio.TimeoutError raised: set status='timeout', findings=[], and proceed to step 7
5. If API responds: parse response JSON; validate each finding has required fields (file, line_start, line_end, severity, category); discard any finding missing file field with a log warning
6. For partial LLM responses (status='partial' from API or truncated JSON): parse available findings; set status='partial' with note on how many chunks were covered
7. Construct LogicReviewComplete payload: include findings (empty array on timeout), status, model_used, prompt_version, duration_ms
8. Publish LogicReviewComplete to message bus consumer group key: pr-logic-complete:{pr_number}:{head_sha}
9. Acknowledge DiffAnalysisComplete in consumer group; return structured JSON result

Structured Returns:
```json
{
  "status": "complete | failed",
  "event_emitted": "LogicReviewComplete",
  "pr_number": 4271,
  "findings_count": 2,
  "logic_status": "complete",
  "model_used": "claude-3-5-sonnet-20241022",
  "duration_ms": 34521,
  "message": "Logic review complete — 2 findings with file/line attribution"
}
```

Failure Modes:
- FM-001: LLM API Timeout (60-Second Budget Exceeded) — Trigger: Anthropic API does not return within 60 seconds (asyncio.TimeoutError). Manifestation: Agent emits LogicReviewComplete with status='timeout', empty findings array, and duration_ms=60000. Pipeline continues with only style-checker findings. Severity: medium. Recovery: Immediate: emit LogicReviewComplete with status='timeout' and empty findings so synthesis-agent is not blocked; increment llm_timeout_count metric. Escalation: if timeout rate exceeds 10% of PRs in a 5-minute window, check Anthropic API status page and alert on-call if service is degraded. Detection: asyncio.TimeoutError in step 3; logic_status='timeout' in emitted LogicReviewComplete events.
- FM-002: LLM Returns Unattributed Findings — Trigger: LLM response contains findings without file field or with line_start=null (LLM failed to follow attribution schema in prompt). Manifestation: Logic findings cannot be posted as inline PR comments; unattributed findings are discarded and not included in LogicReviewComplete. Severity: medium. Recovery: Immediate: filter out findings missing file field; log count of discarded findings with pr_number; retry once with an explicit prompt instruction enforcing attribution (append 'EVERY finding MUST include file, line_start, line_end — findings without file attribution will be rejected'). Escalation: if more than 50% of findings are discarded across 10 consecutive PRs, update prompt template to add stronger attribution requirement. Detection: discarded_findings_count metric; prompt version field in LogicReviewComplete for correlation.
- FM-003: Anthropic API 429 Rate Limit — Trigger: Anthropic API returns 429 Too Many Requests during step 3. Manifestation: LLM call fails immediately; no retry within current execution (rate limit resets in future). Severity: high. Recovery: Immediate: catch 429 response; set status='failed'; emit LogicReviewComplete with status='timeout' and empty findings so pipeline continues; log pr_number and retry-after header value. Escalation: implement queue-based retry with exponential backoff for rate-limited PRs; alert on-call if rate limit hits more than 5 times in 10 minutes. Detection: Anthropic API 429 response in step 3; rate_limit_hit_count metric.

Constraints:
- Must enforce 60-second hard timeout on all Anthropic API calls — no exceptions for large diffs or complex PRs; the 60-second budget is a non-negotiable constraint from CONTEXT.md
- Must discard any LLM finding that lacks a file field — emitting unattributed findings violates the traceability constraint in CONTEXT.md and would produce PR-level comments rather than inline comments
  </action>
  <verify>
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/logic-reviewer.md
node bin/arch-tools.js validate-names .arch/phases/agent-contracts/design/agents/logic-reviewer.md
  </verify>
  <done>logic-reviewer.md exists with all 7 required sections, explicitly models 60-second LLM timeout with fallback, references LogicReviewComplete from events.yaml, passes detect-stubs and validate-names.</done>
</task>

<task type="auto">
  <name>Task 2: Write synthesis-agent agent contract</name>
  <files>design/agents/synthesis-agent.md</files>
  <action>
Write .arch/phases/agent-contracts/design/agents/synthesis-agent.md.

Follow templates/agent-spec.md scaffold with all 7 required sections. Per locked-decision in CONTEXT.md: synthesis-agent resolves conflicting findings using severity ranking (critical > high > medium > low).

Frontmatter:
- name: synthesis-agent
- description: "Implements the Aggregator pattern: subscribes to StyleCheckComplete and LogicReviewComplete events for the same PR, waits up to 90 seconds for both, applies severity-ranked conflict resolution, and emits ReviewSynthesized with a unified findings list. Spawned as a pub/sub consumer on the message bus."
- tools: Read, Write, Bash
- model: sonnet
- color: yellow

Role section: Implements the Aggregator pattern by subscribing to both StyleCheckComplete and LogicReviewComplete events on the message bus, correlating them by (pr_number, head_sha) key, and waiting up to 90 seconds for both events to arrive before synthesizing. This agent applies severity-ranked conflict resolution per the locked-decision in CONTEXT.md: when style and logic findings conflict (e.g., style passes but logic fails at high severity), the unified review verdict is determined by the highest severity finding across all sources. Output is the ReviewSynthesized event containing a merged, severity-sorted findings list and a GitHub review verdict (approved, changes_requested, or comment).

Upstream Input:
- Reads StyleCheckComplete event from message bus (key: pr-style-complete:{pr_number}:{head_sha}) — uses findings array, status, and tool_name for style-based contribution to unified findings
- Reads LogicReviewComplete event from message bus (key: pr-logic-complete:{pr_number}:{head_sha}) — uses findings array, status (complete/timeout/partial), model_used for logic-based contribution to unified findings
- Reads design/events/events.yaml — uses ReviewSynthesized event schema for output payload structure; uses StyleCheckComplete and LogicReviewComplete schemas for input validation

Downstream Consumer:
- notification-agent subscribes to ReviewSynthesized on message bus — uses unified_findings array (file, line, severity, source, message), verdict field, and head_sha for GitHub review posting

Execution Flow:
1. Subscribe to message bus consumer group for both StyleCheckComplete and LogicReviewComplete; correlate by (pr_number, head_sha) key
2. Wait for both events with 90-second aggregation timeout; if StyleCheckComplete arrives but LogicReviewComplete does not arrive within 90 seconds, set logic_status='skipped' and proceed with style findings only
3. Merge findings: combine StyleCheckComplete.findings (tagged source='style') and LogicReviewComplete.findings (tagged source='logic') into a unified list
4. Apply severity-ranked conflict resolution per CONTEXT.md locked-decision: sort unified findings by severity descending (critical > high > medium > low); within same severity, sort by file path then line number
5. Determine verdict: if any finding has severity 'critical' or 'high' → verdict='changes_requested'; if no findings → verdict='approved'; if only 'medium' or 'low' findings → verdict='comment'
6. Construct ReviewSynthesized payload: include unified_findings (sorted), verdict, style_status (from StyleCheckComplete.status), logic_status (from LogicReviewComplete.status or 'skipped' if timeout)
7. Publish ReviewSynthesized to message bus consumer group key: pr-review-synthesized:{pr_number}:{head_sha}
8. Acknowledge both StyleCheckComplete and LogicReviewComplete messages in consumer group; return structured JSON result

Structured Returns:
```json
{
  "status": "complete | failed",
  "event_emitted": "ReviewSynthesized",
  "pr_number": 4271,
  "unified_findings_count": 5,
  "verdict": "changes_requested",
  "style_status": "violations_found",
  "logic_status": "complete",
  "message": "Review synthesized — 5 findings, verdict: changes_requested"
}
```

Failure Modes:
- FM-001: Both Events Missing (Complete Analysis Failure) — Trigger: Neither StyleCheckComplete nor LogicReviewComplete arrives within 90-second aggregation timeout (both style-checker and logic-reviewer have failed). Manifestation: synthesis-agent emits ReviewSynthesized with empty unified_findings, verdict='comment', and a human-readable summary noting that automated analysis is unavailable for this PR. Severity: high. Recovery: Immediate: emit ReviewSynthesized with empty findings and a 'analysis_unavailable' annotation; notification-agent posts a PR comment informing the developer to request manual review. Escalation: alert on-call if analysis_unavailable rate exceeds 1% of PRs in a 5-minute window. Detection: analysis_unavailable_count metric; ReviewSynthesized events with both style_status and logic_status set to 'skipped'.
- FM-002: Aggregator Stale Correlation (PR Updated Mid-Flight) — Trigger: A new DiffAnalysisComplete event arrives for the same pr_number but a different head_sha while synthesis-agent is waiting for StyleCheckComplete and LogicReviewComplete from the previous head_sha. Manifestation: synthesis-agent may attempt to correlate events from two different PR pushes, producing a mixed review. Severity: high. Recovery: Immediate: key all correlation by (pr_number, head_sha) pair — events with different head_sha are treated as separate pipelines and never correlated; discard pending events for old head_sha when a new DiffAnalysisComplete arrives for the same pr_number. Escalation: log stale correlation events for monitoring. Detection: head_sha mismatch between incoming events for the same pr_number; stale_correlation_count metric.
- FM-003: Severity Ranking Logic Error — Trigger: Findings contain unexpected severity values outside the defined enum (critical, high, medium, low) due to upstream agent producing non-conforming output. Manifestation: Severity ranking comparator throws an exception or produces incorrect sort order. Severity: medium. Recovery: Immediate: validate each finding's severity field on receipt; map any unrecognized severity to 'medium'; log the non-conforming value with its source agent for debugging. Escalation: if unrecognized severity values appear more than 3 times, flag the source agent (style-checker or logic-reviewer) for contract compliance review. Detection: severity_normalization_count metric; log entries tagged unknown_severity_value.

Constraints:
- Must use severity ranking (critical > high > medium > low) as the sole conflict resolution algorithm per locked-decision in CONTEXT.md — no weighted scoring, no source preference (style vs logic), no human-override mechanism
- Must correlate StyleCheckComplete and LogicReviewComplete by (pr_number, head_sha) pair — pr_number alone is insufficient for correlation when PRs receive multiple pushes
  </action>
  <verify>
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/synthesis-agent.md
node bin/arch-tools.js validate-names .arch/phases/agent-contracts/design/agents/synthesis-agent.md
  </verify>
  <done>synthesis-agent.md exists with all 7 required sections, models severity-ranked aggregation with 90-second timeout, references ReviewSynthesized from events.yaml, passes detect-stubs and validate-names.</done>
</task>

<task type="auto">
  <name>Task 3: Write notification-agent agent contract</name>
  <files>design/agents/notification-agent.md</files>
  <action>
Write .arch/phases/agent-contracts/design/agents/notification-agent.md.

Follow templates/agent-spec.md scaffold with all 7 required sections.

Frontmatter:
- name: notification-agent
- description: "Subscribes to ReviewSynthesized events from the message bus, posts all review findings as inline GitHub PR comments using the GitHub Review API, submits the review with the synthesized verdict, and emits NotificationSent. Spawned as a pub/sub consumer on the message bus."
- tools: Read, Write, Bash
- model: haiku
- color: cyan

Role section: Subscribes to ReviewSynthesized events from the message bus and delivers the unified review to GitHub. This agent posts each finding in the unified_findings array as an inline PR comment using the GitHub REST API (POST /repos/{owner}/{repo}/pulls/{pr_number}/comments) with the specific file path and line number provided, groups all comments into a single review submission, and submits the review with the verdict from ReviewSynthesized (approved, changes_requested, or comment). Output is the NotificationSent event recording the GitHub review_id and the count of comments successfully posted.

Upstream Input:
- Reads ReviewSynthesized event from message bus (key: pr-review-synthesized:{pr_number}:{head_sha}) — uses unified_findings array (file, line, severity, source, message) for inline comment construction and verdict for GitHub review submission
- Reads GitHub REST API (POST /repos/{owner}/{repo}/pulls/comments and POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews) — writes inline comments per finding and submits the grouped review with verdict
- Reads design/events/events.yaml — uses NotificationSent event schema for output payload structure

Downstream Consumer:
- monitoring consumes NotificationSent — uses comments_posted, review_id, status, and verdict_posted for SLA tracking and alerting on failed review submissions

Execution Flow:
1. Read ReviewSynthesized event from message bus; extract unified_findings, verdict, pr_number, head_sha
2. For each finding in unified_findings, construct an inline comment request: file=finding.file, position=finding.line, body=formatted message including severity badge and source label (style/logic)
3. Create a GitHub Pull Request Review via POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews with event='COMMENT' (do not submit yet); this creates a pending review
4. Add each inline comment to the pending review using PUT /repos/{owner}/{repo}/pulls/{pr_number}/reviews/{review_id}/comments; if a comment's line no longer exists in the diff (GitHub API 422), post it as a top-level PR comment instead with a note that the line reference is outdated
5. Submit the pending review with the verdict: event='APPROVE' if verdict='approved', event='REQUEST_CHANGES' if verdict='changes_requested', event='COMMENT' if verdict='comment'
6. Record comments_posted count, review_id, and verdict_posted
7. Construct NotificationSent payload: pr_number, head_sha, comments_posted, review_id, status, verdict_posted
8. Publish NotificationSent to message bus key: pr-notification-sent:{pr_number}:{head_sha}
9. Acknowledge ReviewSynthesized message in consumer group; return structured JSON result

Structured Returns:
```json
{
  "status": "complete | failed",
  "event_emitted": "NotificationSent",
  "pr_number": 4271,
  "comments_posted": 5,
  "review_id": "1847293041",
  "verdict_posted": "changes_requested",
  "message": "GitHub review submitted with 5 inline comments — verdict: changes_requested"
}
```

Failure Modes:
- FM-001: GitHub API 403 Insufficient Permissions — Trigger: GitHub REST API returns 403 with message about insufficient scopes when attempting to post review (token missing write:pull_requests or pull_requests:write scope). Manifestation: notification-agent cannot post any comments; review is never submitted to GitHub; developer receives no automated feedback. Severity: critical. Recovery: Immediate: set status='failed', emit NotificationSent with status='failed' and 0 comments_posted; log the permission error with token scope claim and repository name for DevOps investigation. Escalation: DevOps team rotates or re-configures the GitHub token with the required scopes. Detection: GitHub API 403 in step 3; permission_error_count metric; alert if permissions_error occurs on any PR (zero tolerance).
- FM-002: Stale Diff Line Reference (422 on Inline Comment) — Trigger: GitHub API returns 422 for a specific inline comment because the line referenced in unified_findings no longer exists in the PR diff (PR was updated with a new push after ReviewSynthesized was emitted). Manifestation: Affected inline comment cannot be posted at the specified line; review is partially posted. Severity: low. Recovery: Immediate: catch 422 response; post the finding as a top-level PR comment with text 'Note: this finding originally referenced {file}:{line} which is no longer in the diff'; increment comments_posted; continue with remaining comments. Escalation: if more than 30% of inline comments in a single review require fallback to top-level, log a warning that review synthesis is significantly delayed relative to PR activity. Detection: 422 response count per review submission; top_level_fallback_count metric.
- FM-003: GitHub API Rate Limit on Review Submission — Trigger: GitHub REST API returns 429 or 403 with rate limit header during review comment posting (secondary rate limit from too-rapid sequential API calls). Manifestation: Some comments are posted; subsequent comments in the same review fail with rate limit response. Severity: medium. Recovery: Immediate: pause for the duration specified in Retry-After header (typically 60 seconds); resume posting remaining comments from where the rate limit hit. Escalation: if rate limit hits consistently on reviews with more than 10 comments, switch to batching comments in groups of 5 with 2-second delays between batches. Detection: 429 or 403 with Retry-After header in GitHub API response; rate_limit_during_review metric.

Constraints:
- Must post all inline comments under a single GitHub Pull Request Review (not as individual comment API calls) — using the review API ensures atomic verdict submission and proper display in the GitHub UI
- Must not post findings without file and line attribution as inline comments — findings missing file or line must be posted as top-level PR comments with an explanation of why inline posting is unavailable
  </action>
  <verify>
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/notification-agent.md
node bin/arch-tools.js validate-names .arch/phases/agent-contracts/design/agents/notification-agent.md
  </verify>
  <done>notification-agent.md exists with all 7 required sections, models GitHub Review API posting with inline attribution and fallback, references NotificationSent from events.yaml, passes detect-stubs and validate-names.</done>
</task>

</tasks>

<verification>
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/logic-reviewer.md
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/synthesis-agent.md
node bin/arch-tools.js detect-stubs .arch/phases/agent-contracts/design/agents/notification-agent.md
find .arch/phases/agent-contracts/design/agents/ -name "*.md" | wc -l
</verification>

<success_criteria>
Three agent contracts exist: logic-reviewer.md, synthesis-agent.md, notification-agent.md. All pass detect-stubs and validate-names. Each references event names from design/events/events.yaml.
</success_criteria>

<output>
After completion, create .arch/phases/agent-contracts/SUMMARY.md
</output>
