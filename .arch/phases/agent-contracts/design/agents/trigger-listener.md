---
name: trigger-listener
description: "Receives GitHub webhook PR events, validates HMAC-SHA256 signatures, enforces idempotency via delivery_id, and emits PullRequestReceived to diff-analyzer via sync request/response. Spawned by the webhook infrastructure on PR open, reopen, or synchronize events."
tools: Read, Write, Bash
model: sonnet
color: orange
---

# Trigger Listener — Agent Specification

## Role

Spawned by the GitHub webhook infrastructure when a PR open, reopen, or synchronize event arrives as an HTTP POST to the webhook endpoint. This agent validates the HMAC-SHA256 signature from the X-Hub-Signature-256 header using crypto.timingSafeEqual, checks the X-GitHub-Delivery header against an idempotency store to reject duplicate deliveries, and emits PullRequestReceived via synchronous call to diff-analyzer. Output is the PullRequestReceived event passed synchronously to diff-analyzer; no file artifacts are written to disk. This agent is the sole entry point for the Code Review Automation Pipeline — all PR review requests originate here.

```yaml
canonical:
  spawner: GitHub webhook infrastructure (HTTP POST handler)
  cardinality: one-instance-per-webhook-delivery
  output_domain: PullRequestReceived event (passed to diff-analyzer via sync call)
  communication_model: sync request/response to diff-analyzer (locked-decision)
  idempotency: enforced via X-GitHub-Delivery header stored in processed-deliveries cache
```

## Upstream Input

- Reads GitHub webhook payload (HTTP POST body, raw bytes) from the webhook HTTP endpoint — uses action field (filter for opened/reopened/synchronize), pull_request.number, pull_request.head.sha, pull_request.html_url, and repository.full_name to construct PullRequestReceived payload
- Reads X-Hub-Signature-256 header from HTTP request — uses HMAC-SHA256 value for signature validation against WEBHOOK_SECRET environment variable using crypto.timingSafeEqual
- Reads X-GitHub-Delivery header from HTTP request — uses delivery UUID for idempotency check against processed-deliveries store (Redis key: delivery:{uuid})
- Reads design/events/events.yaml — uses PullRequestReceived event schema (field types, required flags, constraints) for payload construction and validation before emitting

```yaml
canonical:
  required_reads:
    - source: GitHub webhook HTTP POST
      fields: [action, pull_request.number, pull_request.head.sha, pull_request.html_url, repository.full_name]
      purpose: PR event data extraction
    - source: X-Hub-Signature-256 header
      purpose: HMAC-SHA256 signature validation
    - source: X-GitHub-Delivery header
      purpose: idempotency enforcement
    - path: design/events/events.yaml
      event: PullRequestReceived
      purpose: payload schema validation
```

## Downstream Consumer

- diff-analyzer receives PullRequestReceived event synchronously via HTTP POST or in-process RPC — uses pr_number, head_sha, repository_full_name for GitHub API diff fetch, and delivery_id for correlation tracking
- monitoring/observability system receives webhook processing events via structured log output — uses pr_number, delivery_id, and action for request tracing and duplicate-delivery rate monitoring

```yaml
canonical:
  consumers:
    - agent: diff-analyzer
      receives: PullRequestReceived
      via: synchronous HTTP POST or in-process RPC (locked-decision: sync request/response)
      uses: pr_number, head_sha, repository_full_name, delivery_id
    - system: monitoring
      receives: structured log events
      uses: pr_number, delivery_id, action, duration_ms
```

## Execution Flow

Step 1: Receive HTTP POST at webhook endpoint; extract raw request body (bytes, not parsed), X-Hub-Signature-256 header, and X-GitHub-Delivery header from HTTP request context.

Step 2: Validate HMAC-SHA256 signature: compute sha256 of raw request body bytes using WEBHOOK_SECRET environment variable (crypto.createHmac('sha256', secret).update(rawBody).digest('hex')); prepend 'sha256='; compare with X-Hub-Signature-256 using crypto.timingSafeEqual. If comparison fails, return HTTP 401 and log the mismatch with source IP. Do NOT proceed.

Step 3: Check idempotency store: query Redis with key delivery:{delivery_id}; if key exists, return HTTP 200 with body 'duplicate_skipped' and increment duplicate_delivery_count metric. Do NOT process further.

Step 4: Parse webhook JSON payload; extract action field. If action is not in ['opened', 'reopened', 'synchronize'], return HTTP 200 with body 'unsupported_action'. Extract: pr_number from pull_request.number, head_sha from pull_request.head.sha, repository_full_name from repository.full_name, pr_url from pull_request.html_url.

Step 5: Construct PullRequestReceived payload per design/events/events.yaml schema: { pr_number, repository_full_name, head_sha, delivery_id, pr_url, action }. Validate all required fields are non-null and non-empty.

Step 6: Call diff-analyzer synchronously (HTTP POST to diff-analyzer service or in-process function call) passing PullRequestReceived payload; await response with 30-second timeout. If timeout: return HTTP 200 to GitHub (prevent retry storm); log timeout with pr_number and delivery_id; do NOT record delivery_id as processed.

Step 7: If diff-analyzer returns success: store delivery_id in Redis with 24-hour expiry (SET delivery:{delivery_id} processed EX 86400); return HTTP 200 to GitHub; log pr_number, delivery_id, duration_ms.

Step 8: Return structured JSON result: { status: 'complete', event_emitted: 'PullRequestReceived', pr_number, delivery_id, duration_ms }.

```yaml
canonical:
  execution_flow:
    steps: 8
    entry: GitHub webhook HTTP POST
    exit: structured JSON to webhook runtime + HTTP 200/401 response to GitHub
    key_decisions:
      - validate_signature_before_any_parsing: true
      - idempotency_check_before_github_parse: true
      - record_delivery_id_only_after_diff_analyzer_success: true
```

## Structured Returns

```json
{
  "status": "complete",
  "event_emitted": "PullRequestReceived",
  "pr_number": 4271,
  "delivery_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_ms": 287,
  "message": "Webhook processed — PullRequestReceived emitted to diff-analyzer"
}
```

```json
{
  "status": "failed",
  "event_emitted": null,
  "pr_number": 4271,
  "delivery_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_ms": 30000,
  "error": "diff_analyzer_timeout",
  "message": "diff-analyzer did not respond within 30 seconds — delivery_id not recorded; PR will be re-processed on next push"
}
```

```yaml
canonical:
  structured_returns:
    status_values: [complete, failed]
    always_present: [status, event_emitted, pr_number, delivery_id, duration_ms, message]
    http_responses:
      - code: 200
        condition: all success paths including duplicate_skipped and unsupported_action
      - code: 401
        condition: HMAC signature validation fails
```

## Failure Modes

### FM-001: Invalid HMAC Signature

**Trigger:** X-Hub-Signature-256 header does not match the HMAC-SHA256 of the raw request body computed using WEBHOOK_SECRET.
**Manifestation:** Agent returns HTTP 401 without parsing payload or emitting PullRequestReceived. Processing stops immediately after signature check.
**Severity:** high
**Recovery:**
- Immediate: Return HTTP 401; log the mismatch with source IP address and delivery_id (if header present) for security monitoring. Do not log the raw payload.
- Escalation: If invalid signature rate from the same IP exceeds 5 per minute, alert security team via structured log event tagged security_alert.
**Detection:** HTTP 401 response in webhook access log; invalid_signature_count metric.

### FM-002: Duplicate Delivery (Idempotency Hit)

**Trigger:** X-GitHub-Delivery value matches a delivery_id already stored in Redis processed-deliveries cache.
**Manifestation:** Agent returns HTTP 200 with body 'duplicate_skipped'; no PullRequestReceived event is emitted; PR is not re-reviewed.
**Severity:** low
**Recovery:**
- Immediate: Return HTTP 200 no-op; increment duplicate_delivery_count metric; log delivery_id as duplicate for debugging.
- Escalation: If duplicate_delivery_count exceeds 5% of total deliveries in a 10-minute window, investigate GitHub webhook retry configuration — high duplicate rate indicates delivery confirmations are not reaching GitHub reliably.
**Detection:** duplicate_delivery_count metric; log entries tagged duplicate_skipped.

### FM-003: diff-analyzer Sync Call Timeout

**Trigger:** Synchronous HTTP call to diff-analyzer does not return within 30 seconds.
**Manifestation:** Trigger-listener cannot confirm diff-analyzer received PullRequestReceived; delivery_id is NOT recorded as processed; GitHub may retry the webhook.
**Severity:** high
**Recovery:**
- Immediate: Return HTTP 200 to GitHub (preventing webhook retry storm that would compound the problem); log timeout with pr_number and delivery_id; do NOT store delivery_id in idempotency cache.
- Escalation: If diff-analyzer timeout rate exceeds 1% of PRs in any 5-minute window, alert on-call engineer; check diff-analyzer health and GitHub API response times.
**Detection:** sync_timeout_count metric on diff-analyzer call; log entries tagged diff_analyzer_timeout; delivery_ids that never appear in processed-deliveries cache.

```yaml
canonical:
  failure_modes:
    - id: FM-001
      name: Invalid HMAC Signature
      severity: high
      http_response: 401
      event_emitted: false
    - id: FM-002
      name: Duplicate Delivery
      severity: low
      http_response: 200
      event_emitted: false
    - id: FM-003
      name: diff-analyzer Sync Call Timeout
      severity: high
      http_response: 200
      event_emitted: false
      note: delivery_id NOT recorded to allow natural retry via next PR push
```

## Constraints

- Must validate HMAC-SHA256 signature on every request before any other processing — no bypass for internal callers, health check endpoints, or test environments; signature validation is mandatory without exception
- Must not emit PullRequestReceived and record delivery_id as two separate operations — recording must occur only after diff-analyzer confirms receipt; a partially recorded delivery allows duplicate processing if the agent restarts between emit and record
- Must use crypto.timingSafeEqual for signature comparison — naive string equality is vulnerable to timing attacks that reveal the correct signature byte-by-byte
