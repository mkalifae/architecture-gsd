# synthesis-agent — Failure Modes

**Component:** synthesis-agent
**Phase:** Phase 4: Failure Modes
**Last Updated:** 2026-03-02

---

## Failure Mode Catalog

### FM-001: Both Upstream Events Missing (Complete Analysis Failure)

**Trigger:** Neither StyleCheckComplete nor LogicReviewComplete arrives for a given (pr_number, head_sha) key within the 90-second aggregation timeout — both style-checker and logic-reviewer have failed, are unresponsive, or are processing a different head_sha.
**Manifestation:** synthesis-agent times out waiting for both input events. ReviewSynthesized is emitted with unified_findings=[], verdict='comment', style_status='skipped', and logic_status='skipped'. notification-agent posts a top-level PR comment informing the developer that automated analysis is unavailable for this PR.
**Severity:** high
**Recovery:**
- Immediate: Emit ReviewSynthesized with empty findings and include an annotation in the review body: 'Automated analysis unavailable — please request manual review'; increment analysis_unavailable_count metric.
- Escalation: If analysis_unavailable_count exceeds 1% of PRs in a 5-minute window, alert on-call engineer — simultaneous failure of both style-checker and logic-reviewer indicates a systemic issue (message bus failure, DiffAnalysisComplete never published, or fanout consumer group misconfiguration).
**Detection:** ReviewSynthesized events with both style_status='skipped' and logic_status='skipped'; analysis_unavailable_count metric; 1% threshold alert in 5-minute rolling window.

---

### FM-002: Stale Correlation (PR Updated Mid-Flight)

**Trigger:** A developer pushes a new commit to the PR while synthesis-agent is waiting for StyleCheckComplete and LogicReviewComplete from the previous head_sha. A new pipeline run begins for the updated head_sha, producing new StyleCheckComplete and LogicReviewComplete events while the first run's events are still in flight.
**Manifestation:** If synthesis-agent correlates by pr_number alone, it may receive StyleCheckComplete from run 1 (old head_sha) and LogicReviewComplete from run 2 (new head_sha), producing a mixed review that combines style findings from an outdated commit with logic findings from the current commit — incoherent and potentially misleading.
**Severity:** high
**Recovery:**
- Immediate: Enforce strict correlation by (pr_number, head_sha) pair — validate that head_sha in each incoming event exactly matches the expected correlation key; discard events whose head_sha does not match; log stale_correlation_count with both the expected and received head_sha for debugging.
- Escalation: If stale correlations exceed 5% of PRs in any 10-minute window, investigate whether the 90-second aggregation window is too long relative to the team's push frequency; consider reducing the aggregation timeout.
**Detection:** head_sha mismatch between incoming events for the same pr_number; stale_correlation_count metric; log entries tagged stale_event_discarded.

---

### FM-003: Severity Normalization Failure (Unknown Severity Value)

**Trigger:** An upstream agent (style-checker or logic-reviewer) emits a finding with a severity value outside the defined enum (critical, high, medium, low) — for example 'warning', 'error', 'info', 'ERROR', '2', or null.
**Manifestation:** The severity ranking comparator encounters an unknown value during sorting. Sort order becomes non-deterministic for findings containing the unknown value. The verdict determination step may produce an incorrect result (e.g., treating an effectively 'high' finding as 'comment'-level).
**Severity:** medium
**Recovery:**
- Immediate: Normalize any unrecognized severity value to 'medium' before sorting and verdict determination; log the non-conforming severity value, the source agent (style-checker or logic-reviewer), pr_number, and prompt_version (for logic-reviewer findings) for compliance review.
- Escalation: If a specific source agent produces non-conforming severity values across 3 or more consecutive PRs, flag the agent contract for compliance review and update its severity enum constraint in the agent specification.
**Detection:** severity_normalization_count metric per source agent; log entries tagged unknown_severity_value; 3-consecutive-PR threshold trigger per agent.

---

## Integration Point Failures

### INT-001: In-Memory Correlation State Loss (Process Restart)

**Failure Point:** Producer side — synthesis-agent maintains per-(pr_number, head_sha) aggregation state in memory. If the synthesis-agent process restarts or crashes between receiving StyleCheckComplete and LogicReviewComplete, the partial aggregation state is lost.
**Trigger:** synthesis-agent process crash, OOM kill, or deployment restart while one of the two required events has been received but not yet acknowledged in the consumer group.
**Cascade:** On restart, synthesis-agent re-reads the unacknowledged StyleCheckComplete from the pending-entries list (XAUTOCLAIM) and begins waiting for LogicReviewComplete again. If LogicReviewComplete has already been acknowledged and removed from the stream, the correlation window times out and synthesis-agent emits ReviewSynthesized with style_status='violations_found' and logic_status='skipped'.
**Recovery:** For distributed deployments, use Redis hash for correlation state (keyed by pr_number:head_sha) rather than in-memory state; this survives process restarts. For single-instance deployments, the partial result is accepted: a review without logic analysis is better than no review.

---

### INT-002: ReviewSynthesized Publish Failure

**Failure Point:** Producer side — synthesis-agent constructs the ReviewSynthesized payload but cannot publish it to Redis Streams.
**Trigger:** Redis connection failure, stream max-length enforcement, or out-of-memory condition occurs during XADD for the pr-review-synthesized stream.
**Cascade:** ReviewSynthesized is never consumed by notification-agent. The PR receives no automated review. Both StyleCheckComplete and LogicReviewComplete remain acknowledged in their consumer groups (already XACK'd before the publish failure), meaning their work is lost and cannot be re-triggered by XAUTOCLAIM.
**Recovery:** Attempt the Redis XADD up to 3 times with 1-second backoff before declaring failure. If all retries fail, log the full ReviewSynthesized payload to a dead-letter log so the content is preserved for manual review posting. Alert on-call if Redis publish failure rate exceeds 0.1%.

---

## Residual Risks

### RISK-001: Verdict Upgrade Asymmetry (One Late Critical Finding)

**Risk:** verdict determination uses the highest-severity finding in unified_findings. A single critical finding from logic-reviewer in an otherwise clean PR (no style violations, no other logic findings) produces verdict='changes_requested'. If the logic-reviewer finding turns out to be a false positive, the developer must dismiss the review manually. There is no mechanism in the current design for auto-escalation thresholds (e.g., require 2+ critical findings for changes_requested).
**Mitigation:** Single-finding escalation to changes_requested is the intended behavior per CONTEXT.md locked-decision: severity-ranked conflict resolution with critical > high > medium > low is the sole algorithm; no per-finding count threshold is applied. This is accepted in v1.
**Review Trigger:** If developer false-positive complaints about changes_requested verdicts from single critical findings exceed 10% of all changes_requested reviews, consider adding a minimum finding count threshold (e.g., 2+ findings at a severity level) as a locked-decision amendment in v2.
