# diff-analyzer — Failure Modes

**Component:** diff-analyzer
**Phase:** Phase 4: Failure Modes
**Last Updated:** 2026-03-02

---

## Failure Mode Catalog

### FM-001: GitHub API 404 (PR Deleted Mid-Flight)

**Trigger:** GitHub REST API returns HTTP 404 for GET /repos/{owner}/{repo}/pulls/{pr_number}/files — the PR was closed, merged, or deleted after trigger-listener received the webhook but before diff-analyzer fetched the diff.
**Manifestation:** diff-analyzer cannot fetch the diff. DiffAnalysisComplete is never published to the message bus. style-checker and logic-reviewer never receive input. The pipeline ends silently for this PR with no automated review.
**Severity:** medium
**Recovery:**
- Immediate: Return { status: 'failed', reason: 'pr_not_found', pr_number, head_sha } to trigger-listener; trigger-listener logs the stale reference and does NOT record the delivery_id as processed.
- Escalation: If pr_not_found rate exceeds 2% of PRs in a 10-minute window, investigate whether webhook delivery latency has increased or whether the team is closing PRs very rapidly after opening them.
**Detection:** GitHub API 404 response in Step 2; pr_not_found_count metric; pipeline traces showing no DiffAnalysisComplete event for the pr_number.

---

### FM-002: PR Diff Exceeds 2000-Line Maximum

**Trigger:** The sum of additions across all changed files in the PR diff exceeds 2000 lines — the maximum supported PR size per CONTEXT.md constraints.
**Manifestation:** diff-analyzer continues processing the oversized PR using 500-line chunking (splitting large files into sub-chunks). DiffAnalysisComplete is emitted with chunked=true and a total_lines_changed value exceeding 2000. Downstream analysis may be incomplete for files that were chunked.
**Severity:** medium
**Recovery:**
- Immediate: Log pr_number and total_lines_changed as a warning; apply 500-line chunking for all files exceeding 500 lines; set chunked=true in DiffAnalysisComplete; emit the event with all available chunks.
- Escalation: If total_lines_changed exceeds 5000, add a large_pr annotation to the DiffAnalysisComplete payload so synthesis-agent can include a note in the review that analysis may be incomplete for the oversized PR.
**Detection:** total_lines_changed > 2000 in DiffAnalysisComplete; chunked=true metric rate; large_pr_count metric.

---

### FM-003: GitHub API Rate Limit Exceeded

**Trigger:** GitHub REST API returns HTTP 403 with X-RateLimit-Remaining: 0 header during the diff fetch call (primary rate limit exhausted for the GitHub App installation token).
**Manifestation:** diff-analyzer cannot fetch the diff. DiffAnalysisComplete is never published. The PR waits unreviewed until the rate limit resets (typically 1 hour for installation tokens).
**Severity:** high
**Recovery:**
- Immediate: Read X-RateLimit-Reset header (Unix timestamp); return { status: 'failed', reason: 'rate_limited', retry_after_epoch: N } to trigger-listener; trigger-listener does NOT record delivery_id as processed and schedules a requeue of PullRequestReceived after the reset timestamp.
- Escalation: If rate limit is hit more than 3 times per hour, investigate token rotation strategy; consider using GitHub App installation tokens with per-repository scope rather than a shared token across all repositories.
**Detection:** GitHub API 403 with X-RateLimit-Remaining: 0; rate_limit_hit_count metric; X-RateLimit-Reset header in response for retry scheduling.

---

### FM-004: Message Bus Publish Failure

**Trigger:** Redis XADD command for publishing DiffAnalysisComplete to the pr-analysis stream fails due to Redis connection loss, out-of-memory condition, or stream max-length enforcement.
**Manifestation:** diff-analyzer successfully parsed the diff but cannot deliver it to style-checker and logic-reviewer. DiffAnalysisComplete is never consumed. The PR proceeds without style or logic analysis.
**Severity:** critical
**Recovery:**
- Immediate: Catch Redis publish error; return { status: 'failed', reason: 'message_bus_unavailable' } to trigger-listener; trigger-listener does NOT record delivery_id as processed.
- Escalation: Alert on-call engineer if message bus publish failure rate exceeds 0.1% of PRs; investigate Redis health, memory usage, and stream max-length configuration.
**Detection:** Redis XADD error exception; message_bus_publish_failure_count metric; DiffAnalysisComplete absent from Redis stream for expected pr_number/head_sha.

---

## Integration Point Failures

### INT-001: trigger-listener Sync Call Timeout Recovery

**Failure Point:** Producer side — diff-analyzer receives the sync call but takes longer than 30 seconds to process.
**Trigger:** diff-analyzer's GitHub API pagination takes more than 30 seconds (large PR with many changed files requiring multiple API pages), causing trigger-listener to time out and not record the delivery_id.
**Cascade:** trigger-listener returns HTTP 200 to GitHub (without delivery_id recorded); GitHub may retry the webhook. If diff-analyzer eventually succeeds, it publishes DiffAnalysisComplete, but trigger-listener has already returned. On webhook retry, trigger-listener calls diff-analyzer again — diff-analyzer may process the same PR twice unless it checks for an existing DiffAnalysisComplete stream entry.
**Recovery:** diff-analyzer must check if DiffAnalysisComplete already exists in the Redis stream for this (pr_number, head_sha) before re-processing on retry; if a stream entry exists, return success without re-fetching the diff.

---

### INT-002: Redis Stream Consumer Group Backlog

**Failure Point:** Consumer side — style-checker and logic-reviewer fall behind processing DiffAnalysisComplete events and the Redis stream backlog grows.
**Trigger:** Sustained PR volume exceeds the processing capacity of style-checker or logic-reviewer (e.g., logic-reviewer LLM calls taking 60 seconds while PRs arrive every 72 seconds).
**Cascade:** DiffAnalysisComplete events accumulate in the Redis stream pending-entries list; synthesis-agent receives late StyleCheckComplete and LogicReviewComplete events, potentially hitting its 90-second aggregation timeout; PRs may receive partial reviews or 'analysis unavailable' notifications.
**Recovery:** Scale style-checker and logic-reviewer to additional instances (consumer group supports multiple concurrent consumers); monitor pending-entries list length and alert when it exceeds 10 unprocessed events.

---

## Residual Risks

### RISK-001: Binary Files and Rename Diffs Not Linted

**Risk:** GitHub API pr/files endpoint returns binary files (images, compiled artifacts) and rename-only diffs with no patch content. diff-analyzer's chunking logic skips files with empty patch fields. Binary files are never analyzed by style-checker or logic-reviewer.
**Mitigation:** Binary files are appropriately excluded from style and logic analysis — analyzing binary content is not meaningful. Rename-only diffs (no content changes) are correctly treated as zero changed lines. This behavior is accepted as correct.
**Review Trigger:** If developers report that generated code files (e.g., proto-generated .go files with non-trivial logic) are not reviewed, consider adding a file_type filter configuration to control which binary/generated file types are excluded.
