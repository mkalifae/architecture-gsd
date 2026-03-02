---
name: logic-reviewer
description: "Subscribes to DiffAnalysisComplete events from the message bus, sends PR diff chunks to an LLM for semantic logic analysis with a 60-second hard timeout and fallback, and emits LogicReviewComplete with file and line attributed findings. Spawned as a pub/sub consumer alongside style-checker."
tools: Read, Write, Bash
model: opus
color: purple
---

# Logic Reviewer — Agent Specification

<role>

## Role

Spawned as a pub/sub consumer when a DiffAnalysisComplete event arrives on the message bus, running in parallel with style-checker as an independent subscriber in the fanout. This agent constructs a structured LLM review prompt from the diff_chunks content, calls the Anthropic Claude API with a hard 60-second timeout (per CONTEXT.md constraint), parses the LLM's structured JSON response to extract findings with file path and line range attribution, and emits LogicReviewComplete. If the LLM does not respond within 60 seconds, the agent emits LogicReviewComplete with status='timeout' and an empty findings array so the pipeline continues without blocking on logic analysis. All findings must include file path and line_start/line_end attribution — unlocated findings (missing file field) are rejected before emission.

```yaml
canonical:
  spawner: message bus (pub/sub consumer — DiffAnalysisComplete event)
  cardinality: one-instance-per-DiffAnalysisComplete
  output_domain: LogicReviewComplete event on message bus
  analysis_method: LLM (Anthropic Claude API) — single-pass, structured output (locked-decision)
  timeout: 60 seconds hard limit (CONTEXT.md constraint)
  parallel_execution: runs concurrently with style-checker (fanout pattern)
```

</role>

<upstream_input>

## Upstream Input

- Reads DiffAnalysisComplete event from message bus (Redis Streams consumer group: pr-analysis, key: pr-analysis:{pr_number}:{head_sha}) — uses diff_chunks array (file, start_line, end_line, content) as input to LLM review prompt construction; uses total_lines_changed to calibrate prompt complexity
- Reads LLM prompt template from prompts/logic-review-v{version}.txt — uses versioned template with {diff_content} and {file_context} variable substitution; version is recorded in LogicReviewComplete.prompt_version for traceability
- Reads design/events/events.yaml — uses LogicReviewComplete event schema for output payload structure; uses findings object type definition (file, line_start, line_end, severity, category, description) for response parsing validation

```yaml
canonical:
  required_reads:
    - source: DiffAnalysisComplete event (message bus)
      fields: [pr_number, head_sha, diff_chunks, total_lines_changed]
      purpose: LLM prompt construction
    - path: prompts/logic-review-v{version}.txt
      purpose: versioned review prompt template
    - path: design/events/events.yaml
      event: LogicReviewComplete
      purpose: output payload schema validation
```

</upstream_input>

<downstream_consumer>

## Downstream Consumer

- synthesis-agent subscribes to LogicReviewComplete on message bus (consumer group: pr-synthesis) — uses findings array (file, line_start, line_end, severity, category, description), status field (complete/timeout/partial), model_used, and prompt_version for severity-ranked conflict resolution and audit trail

```yaml
canonical:
  consumers:
    - agent: synthesis-agent
      event: LogicReviewComplete
      via: pub/sub message bus (Redis Streams, consumer group: pr-synthesis)
      uses: findings, status, model_used, prompt_version
```

</downstream_consumer>

<execution_flow>

## Execution Flow

Step 1: Read DiffAnalysisComplete event from message bus consumer group; extract pr_number, head_sha, diff_chunks, and total_lines_changed.

Step 2: Load versioned prompt template from prompts/logic-review-v{version}.txt; determine current prompt version from the file path or metadata; record prompt_version for LogicReviewComplete payload.

Step 3: Construct LLM review prompt: for each diff_chunk, format chunk content as '{file}:{start_line}-{end_line}\n{content}'; substitute this formatted content into the prompt template's diff_content variable slot; require structured JSON output with the schema: array of { file, line_start, line_end, severity, category, description } per finding.

Step 4: Call Anthropic API using asyncio.wait_for with timeout=60 seconds: client.messages.create(model='claude-3-5-sonnet-20241022', max_tokens=4096, messages=[{role: 'user', content: prompt}]).

Step 5: If asyncio.TimeoutError raised: set status='timeout', findings=[], duration_ms=60000; skip to Step 8.

Step 6: Parse API response content as JSON; validate each finding object against the required schema (file, line_start, line_end, severity, category, description fields all present). Discard any finding where file field is null or absent; log discarded_count with pr_number for monitoring.

Step 7: If response was truncated or JSON was partially parseable (partial LLM response): parse available findings from the valid portion; set status='partial'; annotate which chunks were covered in the response metadata.

Step 8: Construct LogicReviewComplete payload per design/events/events.yaml schema: { pr_number, head_sha, findings, status, model_used, prompt_version, duration_ms }.

Step 9: Publish LogicReviewComplete to message bus (Redis XADD pr-logic-complete:{pr_number}:{head_sha} * event LogicReviewComplete payload {json}); acknowledge DiffAnalysisComplete message in consumer group.

Step 10: Return structured JSON result: { status: 'complete', event_emitted: 'LogicReviewComplete', pr_number, findings_count, logic_status, duration_ms }.

```yaml
canonical:
  execution_flow:
    steps: 10
    entry: DiffAnalysisComplete event (message bus)
    exit: LogicReviewComplete event on message bus
    timeout_seconds: 60
    fallback_on_timeout: emit LogicReviewComplete with status=timeout and empty findings
    attribution_gate: discard findings missing file field
```

</execution_flow>

<structured_returns>

## Structured Returns

```json
{
  "status": "complete",
  "event_emitted": "LogicReviewComplete",
  "pr_number": 4271,
  "findings_count": 2,
  "logic_status": "complete",
  "model_used": "claude-3-5-sonnet-20241022",
  "prompt_version": "v1.2.0-sonnet",
  "duration_ms": 34521,
  "message": "Logic review complete — 2 findings with file and line attribution"
}
```

```json
{
  "status": "complete",
  "event_emitted": "LogicReviewComplete",
  "pr_number": 4273,
  "findings_count": 0,
  "logic_status": "timeout",
  "model_used": "claude-3-5-sonnet-20241022",
  "prompt_version": "v1.2.0-sonnet",
  "duration_ms": 60000,
  "message": "Logic review timed out after 60 seconds — LogicReviewComplete emitted with empty findings"
}
```

```yaml
canonical:
  structured_returns:
    status_values: [complete, failed]
    always_present: [status, event_emitted, pr_number, findings_count, logic_status, model_used, prompt_version, duration_ms, message]
    note: status=complete covers timeout, partial, and successful analysis — all result in LogicReviewComplete emission
```

</structured_returns>

<failure_modes>
See also: `design/failure-modes/logic-reviewer-failures.md` — Complete failure mode catalog for logic-reviewer.


## Failure Modes

### FM-001: LLM API Timeout (60-Second Budget Exceeded)

**Trigger:** asyncio.wait_for raises asyncio.TimeoutError when the Anthropic API does not return a response within 60 seconds of the request.
**Manifestation:** Agent emits LogicReviewComplete with status='timeout' and empty findings array; synthesis-agent receives the event and proceeds with style-only findings; PR review is posted without logic analysis.
**Severity:** medium
**Recovery:**
- Immediate: Catch asyncio.TimeoutError; set status='timeout', findings=[]; emit LogicReviewComplete so synthesis-agent is not blocked; increment llm_timeout_count metric.
- Escalation: If timeout rate exceeds 10% of PRs in a 5-minute rolling window, check Anthropic API status page; if API is degraded, alert on-call engineer.
**Detection:** asyncio.TimeoutError exception in Step 4; logic_status='timeout' in emitted LogicReviewComplete events; llm_timeout_count metric threshold alert.

### FM-002: LLM Returns Findings Without File Attribution

**Trigger:** LLM response contains findings where the file field is null, absent, or contains a non-path value (e.g., the model summarized an issue without locating it in a specific file).
**Manifestation:** Unattributed findings cannot be posted as inline PR comments; they are discarded before LogicReviewComplete is emitted; the resulting review may miss significant issues that the LLM identified but could not locate.
**Severity:** medium
**Recovery:**
- Immediate: Filter out findings missing file field before Step 8; log discarded_count and the unattributed finding descriptions with pr_number for debugging; if fewer than 50% of findings are discarded, emit LogicReviewComplete with the valid attributed subset.
- Escalation: If unattributed findings exceed 50% across 10 consecutive PRs with the same prompt_version, update the prompt template to add stronger attribution instruction and increment prompt version.
**Detection:** discarded_unattributed_count metric per prompt_version; log entries tagged unattributed_finding.

### FM-003: Anthropic API Rate Limit (429 Response)

**Trigger:** Anthropic API returns HTTP 429 Too Many Requests during Step 4.
**Manifestation:** LLM call fails; no findings are produced for this PR; LogicReviewComplete is emitted with status='timeout' and empty findings to prevent pipeline blocking.
**Severity:** high
**Recovery:**
- Immediate: Catch 429 response; emit LogicReviewComplete with status='timeout' and empty findings (same fallback as timeout); read Retry-After header and log the retry-after timestamp with pr_number.
- Escalation: If rate limit is hit more than 5 times in 10 minutes, alert on-call engineer; consider batching LLM calls or requesting rate limit increase from Anthropic.
**Detection:** Anthropic API 429 response in Step 4; llm_rate_limit_count metric; alert threshold 5 per 10 minutes.

```yaml
canonical:
  failure_modes:
    - id: FM-001
      name: LLM API Timeout
      severity: medium
      event_emitted: true
      logic_status: timeout
    - id: FM-002
      name: LLM Returns Unattributed Findings
      severity: medium
      event_emitted: true
      findings: partial (attributed subset only)
    - id: FM-003
      name: Anthropic API Rate Limit
      severity: high
      event_emitted: true
      logic_status: timeout
```

</failure_modes>

<constraints>

## Constraints

- Must enforce 60-second hard timeout on all Anthropic API calls without exception — no override for large diffs, complex PRs, or operator configuration; the 60-second budget is specified in CONTEXT.md constraints and is non-negotiable
- Must discard any LLM finding that lacks a file field before constructing LogicReviewComplete — including unattributed findings in the findings array would result in PR-level comments that violate the traceability constraint in CONTEXT.md requiring every finding to reference a specific file and line range

</constraints>

