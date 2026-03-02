---
name: synthesis-agent
description: "Implements the Aggregator pattern: subscribes to StyleCheckComplete and LogicReviewComplete events for the same PR correlated by (pr_number, head_sha), waits up to 90 seconds for both, applies severity-ranked conflict resolution, and emits ReviewSynthesized. Spawned as a pub/sub consumer on the message bus."
tools: Read, Write, Bash
model: sonnet
color: yellow
---

# Synthesis Agent — Agent Specification

## Role

Spawned as a pub/sub consumer that implements the Aggregator pattern: subscribes to both StyleCheckComplete and LogicReviewComplete events on the message bus, correlates them by (pr_number, head_sha) key, and waits up to 90 seconds for both events to arrive before synthesizing. This agent applies severity-ranked conflict resolution per the locked-decision in CONTEXT.md: when style and logic findings conflict (e.g., style check passes but logic review finds a high-severity security issue), the unified review verdict is determined by the highest severity finding across all sources using the ranking critical > high > medium > low. Output is the ReviewSynthesized event containing a merged, severity-sorted findings list with source attribution (style/logic per finding) and a GitHub review verdict (approved, changes_requested, or comment).

```yaml
canonical:
  spawner: message bus (pub/sub consumer — StyleCheckComplete and LogicReviewComplete events)
  cardinality: one-instance-per-(pr_number, head_sha) pair
  output_domain: ReviewSynthesized event on message bus
  pattern: Aggregator (waits for both input events, then synthesizes)
  conflict_resolution: severity-ranked (critical > high > medium > low) — locked-decision
  aggregation_timeout: 90 seconds
```

## Upstream Input

- Reads StyleCheckComplete event from message bus (Redis Streams consumer group: pr-synthesis, key: pr-style-complete:{pr_number}:{head_sha}) — uses findings array (file, line, rule, severity, message) and status field (passed/violations_found); correlates by (pr_number, head_sha)
- Reads LogicReviewComplete event from message bus (Redis Streams consumer group: pr-synthesis, key: pr-logic-complete:{pr_number}:{head_sha}) — uses findings array (file, line_start, line_end, severity, category, description) and status field (complete/timeout/partial); correlates by (pr_number, head_sha)
- Reads design/events/events.yaml — uses ReviewSynthesized event schema for output payload; uses StyleCheckComplete and LogicReviewComplete schemas for input validation and field mapping

```yaml
canonical:
  required_reads:
    - source: StyleCheckComplete event (message bus)
      fields: [pr_number, head_sha, findings, status, tool_name]
      purpose: style findings for aggregation
    - source: LogicReviewComplete event (message bus)
      fields: [pr_number, head_sha, findings, status, model_used]
      purpose: logic findings for aggregation
    - path: design/events/events.yaml
      events: [StyleCheckComplete, LogicReviewComplete, ReviewSynthesized]
      purpose: input validation and output schema
```

## Downstream Consumer

- notification-agent subscribes to ReviewSynthesized on message bus (consumer group: pr-delivery) — uses unified_findings array (file, line, severity, source, message), verdict field, pr_number, and head_sha for GitHub PR review submission with inline comments

```yaml
canonical:
  consumers:
    - agent: notification-agent
      event: ReviewSynthesized
      via: pub/sub message bus (Redis Streams, consumer group: pr-delivery)
      uses: unified_findings, verdict, pr_number, head_sha
```

## Execution Flow

Step 1: Subscribe to message bus consumer groups for both StyleCheckComplete (key pr-style-complete:{pr_number}:{head_sha}) and LogicReviewComplete (key pr-logic-complete:{pr_number}:{head_sha}); record correlation key as (pr_number, head_sha).

Step 2: Wait for both events using a 90-second aggregation timeout (asyncio.gather with timeout=90). Track which events have been received using a per-(pr_number, head_sha) state object in memory (or Redis hash for distributed deployment).

Step 3: Handle partial receipt: if StyleCheckComplete arrives but LogicReviewComplete does not arrive within 90 seconds, set logic_status='skipped' and proceed with style findings only. If LogicReviewComplete arrives but StyleCheckComplete does not, set style_status='skipped' and proceed with logic findings only.

Step 4: Validate correlation: confirm pr_number and head_sha from both events match the expected correlation key. If a received event has a different head_sha (new push to same PR mid-flight), discard the stale event and continue waiting for the correct head_sha events.

Step 5: Merge findings: tag each StyleCheckComplete finding with source='style' and normalize line field (use line directly); tag each LogicReviewComplete finding with source='logic' and normalize line field (use line_start as line); combine into unified_findings list.

Step 6: Apply severity-ranked conflict resolution per locked-decision: sort unified_findings by severity descending (critical=0, high=1, medium=2, low=3); within same severity level, sort by file path then line number. This ordering ensures the most critical findings are presented first in the review.

Step 7: Determine verdict using severity ranking rule: if any finding has severity 'critical' or 'high' → verdict='changes_requested'; if unified_findings is empty → verdict='approved'; if all findings are 'medium' or 'low' only → verdict='comment'.

Step 8: Construct ReviewSynthesized payload per design/events/events.yaml schema: { pr_number, head_sha, unified_findings, verdict, style_status, logic_status }.

Step 9: Publish ReviewSynthesized to message bus (Redis XADD pr-review-synthesized:{pr_number}:{head_sha} * event ReviewSynthesized payload {json}); acknowledge StyleCheckComplete and LogicReviewComplete messages in consumer groups.

Step 10: Return structured JSON result: { status: 'complete', event_emitted: 'ReviewSynthesized', pr_number, unified_findings_count, verdict, style_status, logic_status }.

```yaml
canonical:
  execution_flow:
    steps: 10
    entry: StyleCheckComplete + LogicReviewComplete events (message bus, aggregated)
    exit: ReviewSynthesized event on message bus
    aggregation_timeout: 90 seconds
    conflict_resolution: severity_ranked (critical > high > medium > low)
    correlation_key: (pr_number, head_sha)
```

## Structured Returns

```json
{
  "status": "complete",
  "event_emitted": "ReviewSynthesized",
  "pr_number": 4271,
  "unified_findings_count": 5,
  "verdict": "changes_requested",
  "style_status": "violations_found",
  "logic_status": "complete",
  "message": "Review synthesized — 5 findings, verdict: changes_requested"
}
```

```json
{
  "status": "complete",
  "event_emitted": "ReviewSynthesized",
  "pr_number": 4272,
  "unified_findings_count": 2,
  "verdict": "comment",
  "style_status": "violations_found",
  "logic_status": "skipped",
  "message": "Review synthesized with style findings only — logic review timed out after 90s"
}
```

```yaml
canonical:
  structured_returns:
    status_values: [complete, failed]
    always_present: [status, event_emitted, pr_number, unified_findings_count, verdict, style_status, logic_status, message]
```

## Failure Modes

### FM-001: Both Upstream Events Missing (Complete Analysis Failure)

**Trigger:** Neither StyleCheckComplete nor LogicReviewComplete arrives within the 90-second aggregation timeout for a given (pr_number, head_sha) key (both style-checker and logic-reviewer have failed or become unresponsive).
**Manifestation:** synthesis-agent emits ReviewSynthesized with empty unified_findings, verdict='comment', style_status='skipped', and logic_status='skipped'; notification-agent posts a PR comment informing the developer that automated analysis is unavailable.
**Severity:** high
**Recovery:**
- Immediate: Emit ReviewSynthesized with empty findings and a human-readable body annotation: 'Automated analysis unavailable — please request manual review'; increment analysis_unavailable_count metric.
- Escalation: If analysis_unavailable_count exceeds 1% of PRs in a 5-minute window, alert on-call engineer — simultaneous failure of both style-checker and logic-reviewer indicates a systemic issue.
**Detection:** ReviewSynthesized events with both style_status='skipped' and logic_status='skipped'; analysis_unavailable_count metric.

### FM-002: Stale Correlation (PR Updated Mid-Flight)

**Trigger:** A new DiffAnalysisComplete event arrives for the same pr_number but a different head_sha while synthesis-agent is waiting for StyleCheckComplete and LogicReviewComplete from the previous head_sha (developer pushed a new commit to the PR during analysis).
**Manifestation:** synthesis-agent may receive a mix of events from two different pipeline runs for the same PR if correlation is on pr_number alone; merged findings from different commits produce an incoherent review.
**Severity:** high
**Recovery:**
- Immediate: Enforce strict correlation by (pr_number, head_sha) pair — discard all events with a head_sha that does not match the expected correlation key; log stale_correlation_count with both pr_number values.
- Escalation: If stale correlations exceed 5% of PRs, investigate whether the 90-second aggregation window is too long relative to the team's PR push frequency.
**Detection:** head_sha mismatch between incoming events for the same pr_number; stale_correlation_count metric.

### FM-003: Severity Normalization Failure (Unknown Severity Value)

**Trigger:** An upstream agent emits a finding with a severity value outside the defined enum (critical, high, medium, low) — e.g., 'warning', 'error', 'info', or a numeric value.
**Manifestation:** Severity ranking comparator cannot sort findings containing the unknown value; sort order is non-deterministic; verdict determination may produce incorrect result.
**Severity:** medium
**Recovery:**
- Immediate: Normalize any unrecognized severity to 'medium' before sorting; log the non-conforming value, the source agent (style-checker or logic-reviewer), and the affected pr_number.
- Escalation: If a specific source agent produces non-conforming severity values in 3 or more consecutive PRs, flag the agent contract for compliance review and update its severity enum constraint.
**Detection:** severity_normalization_count metric per source agent; log entries tagged unknown_severity_value.

```yaml
canonical:
  failure_modes:
    - id: FM-001
      name: Both Upstream Events Missing
      severity: high
      event_emitted: true
      verdict: comment
      unified_findings: empty
    - id: FM-002
      name: Stale Correlation (PR Updated Mid-Flight)
      severity: high
      prevention: strict (pr_number, head_sha) correlation key
    - id: FM-003
      name: Unknown Severity Value from Upstream Agent
      severity: medium
      normalization: map to medium
```

## Constraints

- Must use severity ranking (critical > high > medium > low) as the sole conflict resolution algorithm per locked-decision in CONTEXT.md — no weighted scoring, no source preference (style vs logic), no operator-configurable override; the ranking algorithm is non-negotiable
- Must correlate StyleCheckComplete and LogicReviewComplete by (pr_number, head_sha) pair rather than pr_number alone — using pr_number alone as the correlation key produces mixed reviews when developers push multiple commits to the same PR within the aggregation window
