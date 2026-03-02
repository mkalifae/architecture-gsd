# trigger-listener — Failure Modes

**Component:** trigger-listener
**Phase:** Phase 4: Failure Modes
**Last Updated:** 2026-03-02

---

## Failure Mode Catalog

### FM-001: Invalid HMAC Signature

**Trigger:** X-Hub-Signature-256 header value does not match the expected HMAC-SHA256 computed from the raw request body bytes using the WEBHOOK_SECRET environment variable.
**Manifestation:** trigger-listener returns HTTP 401 to GitHub without parsing the payload or emitting PullRequestReceived. No PR review is initiated. GitHub logs the 401 as a failed delivery.
**Severity:** high
**Recovery:**
- Immediate: Return HTTP 401; log the mismatch event with source IP, User-Agent, and delivery_id (from X-GitHub-Delivery header if present) to the security audit log; increment invalid_signature_count metric.
- Escalation: If invalid_signature_count from the same source IP exceeds 5 in any 60-second window, emit a security_alert structured log event with source_ip and delivery_count fields for the security team to investigate.
**Detection:** HTTP 401 response in webhook access log; invalid_signature_count metric alert; security_alert log events.

---

### FM-002: Duplicate Webhook Delivery

**Trigger:** X-GitHub-Delivery header value matches a delivery_id already stored in the Redis idempotency store (key delivery:{uuid} exists with value 'processed').
**Manifestation:** trigger-listener returns HTTP 200 with body 'duplicate_skipped' without processing the event. PullRequestReceived is not emitted. diff-analyzer, style-checker, logic-reviewer, and synthesis-agent are not invoked.
**Severity:** low
**Recovery:**
- Immediate: Return HTTP 200 no-op to GitHub; increment duplicate_delivery_count metric; log delivery_id as duplicate for debugging.
- Escalation: If duplicate_delivery_count exceeds 5% of total deliveries in any 10-minute window, investigate whether GitHub is not receiving acknowledgment responses correctly and whether the pipeline's HTTP response time is exceeding GitHub's webhook delivery timeout.
**Detection:** duplicate_delivery_count metric; log entries tagged duplicate_skipped.

---

### FM-003: diff-analyzer Synchronous Call Timeout

**Trigger:** The synchronous HTTP call or in-process RPC from trigger-listener to diff-analyzer does not return a response within 30 seconds.
**Manifestation:** trigger-listener cannot confirm whether diff-analyzer received the PullRequestReceived event. The delivery_id is NOT recorded as processed. GitHub may retry the webhook delivery.
**Severity:** high
**Recovery:**
- Immediate: Return HTTP 200 to GitHub to acknowledge receipt and prevent immediate webhook retry; log the timeout with pr_number, delivery_id, and timestamp; do NOT store delivery_id in the idempotency cache.
- Escalation: If diff-analyzer timeout rate exceeds 1% of PRs in any 5-minute window, alert on-call engineer; investigate diff-analyzer health, GitHub API response times, and network connectivity.
**Detection:** sync_timeout_count metric on diff-analyzer call; log entries tagged diff_analyzer_timeout; delivery_ids absent from processed-deliveries cache for known PR numbers.

---

### FM-004: WEBHOOK_SECRET Environment Variable Missing

**Trigger:** WEBHOOK_SECRET environment variable is not set or is empty when trigger-listener starts; the variable is required for HMAC-SHA256 signature validation.
**Manifestation:** trigger-listener cannot validate any webhook signatures. All incoming requests fail signature validation and receive HTTP 401. No PRs are reviewed.
**Severity:** critical
**Recovery:**
- Immediate: At startup, check that WEBHOOK_SECRET is non-empty; if missing, log a startup failure error with the message 'WEBHOOK_SECRET environment variable required' and refuse to start the HTTP listener.
- Escalation: Deployment pipeline must configure WEBHOOK_SECRET before trigger-listener can process webhooks; DevOps team must set the secret in the deployment environment.
**Detection:** startup_config_error log entry; trigger-listener refuses to bind the HTTP port if WEBHOOK_SECRET is absent.

---

## Integration Point Failures

### INT-001: diff-analyzer Unreachable (Service Down)

**Failure Point:** Consumer side — diff-analyzer is unavailable when trigger-listener attempts the synchronous call.
**Trigger:** diff-analyzer service is down, restarting, or unreachable (e.g., deployment in progress, host failure, network partition between trigger-listener and diff-analyzer).
**Cascade:** trigger-listener receives a connection refused or connection timeout error instead of a successful response. PullRequestReceived is never processed. DiffAnalysisComplete is never emitted. style-checker, logic-reviewer, synthesis-agent, and notification-agent are all skipped for the affected PR. The PR receives no automated review.
**Recovery:** trigger-listener returns HTTP 200 to GitHub (preventing retry storm); does NOT record delivery_id as processed so the PR can be re-processed naturally on the next push to the branch. DevOps restores diff-analyzer; the next push to the PR triggers a fresh pipeline run.

---

### INT-002: Redis Idempotency Store Unavailable

**Failure Point:** Producer side — trigger-listener cannot reach the Redis idempotency store at startup or during delivery_id lookup/write.
**Trigger:** Redis connection fails at trigger-listener startup or during the idempotency check in Step 3.
**Cascade:** If idempotency store is unavailable, trigger-listener has two choices: (1) reject all webhooks (safe but causes complete service outage), or (2) process without idempotency (risks duplicate reviews). trigger-listener chooses option 1: fail closed. All incoming webhook requests return HTTP 503 until Redis is available.
**Recovery:** Trigger-listener returns HTTP 503 to GitHub; GitHub will retry the delivery. On Redis restoration, trigger-listener resumes normal operation and processes retried deliveries with full idempotency checking.

---

## Residual Risks

### RISK-001: Webhook Delivery Replay Window After Idempotency Cache Expiry

**Risk:** Delivery IDs are stored in Redis with a 24-hour TTL. If GitHub replays a webhook delivery more than 24 hours after the original delivery (GitHub retries for up to 72 hours), the delivery_id will no longer be in the cache and the PR will be reviewed twice.
**Mitigation:** 24-hour TTL covers the large majority of GitHub retry scenarios (most retries happen within hours). Extending the TTL to 72 hours increases Redis memory usage proportionally to PR volume. For the current 50 PRs/hour scale, 24-hour TTL is accepted in v1; TTL extension is a v2 consideration.
**Review Trigger:** If duplicate review complaints from developers appear in more than 0.1% of PRs, extend the delivery_id TTL to 72 hours.
