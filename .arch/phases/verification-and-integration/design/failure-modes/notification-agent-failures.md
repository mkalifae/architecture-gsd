# notification-agent — Failure Modes

**Component:** notification-agent
**Phase:** Phase 4: Failure Modes
**Last Updated:** 2026-03-02

---

## Failure Mode Catalog

### FM-001: GitHub API 403 Insufficient Permissions

**Trigger:** GitHub REST API returns HTTP 403 when notification-agent attempts to create the pending Pull Request Review (POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews) — the GitHub App token lacks the required write:pull_requests scope.
**Manifestation:** No review is created on GitHub. No inline comments are posted. The developer receives no automated feedback for their PR. NotificationSent is emitted with status='failed', comments_posted=0, and review_id=null so monitoring can detect and alert on the delivery failure.
**Severity:** critical
**Recovery:**
- Immediate: Catch 403 response; set status='failed', comments_posted=0, review_id=null; emit NotificationSent with status='failed'; log the permission error with token scope claims, repository name, and pr_number.
- Escalation: Alert the DevOps team immediately — zero tolerance for permission failures on the delivery path. DevOps must rotate or reconfigure the GitHub App token with write:pull_requests and pull_requests:write scopes within one hour of the alert.
**Detection:** GitHub API 403 in Step 2; permission_denied_count metric; monitoring alert fires on any single occurrence (not threshold-based — any 403 on the delivery path is a critical infrastructure failure).

---

### FM-002: Stale Diff Line Reference (422 on Inline Comment)

**Trigger:** GitHub REST API returns HTTP 422 for a specific inline comment because the line number in unified_findings.line no longer exists in the current PR diff — the developer pushed a new commit to the PR after ReviewSynthesized was emitted, making the original line references stale.
**Manifestation:** Individual inline comment fails. notification-agent falls back to posting the finding as a top-level PR comment (POST /repos/{owner}/{repo}/issues/{pr_number}/comments) with the same finding content plus a note explaining the stale line reference. Review submission continues for remaining comments.
**Severity:** low
**Recovery:**
- Immediate: Catch 422 response per comment; post the finding as a top-level PR comment with body: '[{severity} - {source}] {message} (Note: originally referenced {file}:{line} which is no longer in the current diff)'; increment comments_posted after successful top-level post; continue the comment posting loop.
- Escalation: If more than 30% of inline comments in a single review require top-level fallback, log a warning that review synthesis latency is high relative to PR push frequency; investigate whether the pipeline end-to-end latency can be reduced to lower the stale-reference rate.
**Detection:** 422 response count per review submission; top_level_fallback_rate metric per PR; warning threshold at 30% fallback rate for a single review.

---

### FM-003: GitHub API Secondary Rate Limit (429 on Comment Posting)

**Trigger:** GitHub REST API returns HTTP 429 with a Retry-After header during the inline comment posting loop (Step 4) — GitHub's secondary rate limit is triggered by too-rapid sequential API calls to the same repository.
**Manifestation:** Comment posting loop pauses for the duration specified in the Retry-After header (typically 60 seconds). Remaining comments in the unified_findings iteration are delayed. The complete review submission may take significantly longer than the normal 1-5 second window, but all comments are eventually posted.
**Severity:** medium
**Recovery:**
- Immediate: Read Retry-After header value; pause the comment posting loop for the specified duration; resume from the next un-posted comment; do not retry already-posted comments; log the rate limit hit with pr_number and total comment count.
- Escalation: If secondary rate limit is hit consistently on reviews with more than 10 comments, switch to batching inline comments in groups of 5 with a 2-second inter-batch delay to prevent hitting the secondary limit in the first place.
**Detection:** 429 response with Retry-After header in Step 4; secondary_rate_limit_count metric; total review posting duration exceeding 2 minutes as an anomaly indicator.

---

## Integration Point Failures

### INT-001: GitHub API PR Deleted Between ReviewSynthesized and Review Submission

**Failure Point:** Consumer side — the PR is merged, closed, or deleted in the time between synthesis-agent emitting ReviewSynthesized and notification-agent attempting to post the review.
**Trigger:** Developer merges or closes the PR very quickly after the last push (within the pipeline's end-to-end latency window of up to 69 seconds). notification-agent attempts to post comments to a PR that no longer accepts review submissions.
**Cascade:** GitHub API returns HTTP 404 on the review creation call. No review is posted. notification-agent emits NotificationSent with status='failed', comments_posted=0, and error='pr_not_found'.
**Recovery:** Treat GitHub 404 on review creation as a terminal non-retryable failure — the PR is no longer reviewable; emit NotificationSent with status='failed' and error='pr_not_found'; log the pr_number for monitoring. This is acceptable: if the PR is already merged, the automated review was no longer needed.

---

### INT-002: Redis Stream Consumer Group Failure After Partial Review Submission

**Failure Point:** Producer side — notification-agent has posted some inline comments and created the pending review, but crashes before calling the review submission endpoint (Step 5) or before publishing NotificationSent (Step 8).
**Trigger:** Process crash, OOM kill, or host failure after the GitHub pending review is created (review_id exists) but before the review is submitted with the verdict event.
**Cascade:** On XAUTOCLAIM re-delivery, notification-agent re-reads ReviewSynthesized and attempts to create a new pending review. This creates a second review on the same PR. If the process re-runs through comment posting and submission, the PR receives duplicate reviews.
**Recovery:** Before creating a new pending review (Step 2), notification-agent should check for an existing pending review for the same (pr_number, head_sha) combination using GET /repos/{owner}/{repo}/pulls/{pr_number}/reviews and check for the review in PENDING state; if found, resume from Step 3 using the existing review_id rather than creating a duplicate.

---

## Residual Risks

### RISK-001: GitHub App Token Expiry Mid-Review

**Risk:** GitHub App installation tokens have a 1-hour expiry. If a token expires between review creation (Step 2) and review submission (Step 5) — unlikely but possible for large reviews with many comments hitting secondary rate limits — subsequent API calls will fail with HTTP 401.
**Mitigation:** notification-agent should check token expiry before each GitHub API call and refresh the installation token if it expires within 5 minutes. If token refresh fails, the partial review (pending review already created) should be documented in a dead-letter log so it can be submitted manually. In practice, notification-agent's 1-5 second normal execution window means this risk is extremely low.
**Review Trigger:** If HTTP 401 responses appear during review submission in production logs, implement proactive token refresh logic with a 5-minute pre-expiry buffer and retry the failing API call with the fresh token.
