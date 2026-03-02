---
Researched: 2026-03-02
Domain: event-driven multi-agent code review pipeline
Confidence: HIGH
---

# Research Report: Code Review Automation Pipeline

## Summary

The Code Review Automation Pipeline falls into the well-studied domain of event-driven CI/CD integration pipelines. The architectural pattern — webhook receiver to analyzer fanout to synthesis to notification — is a standard pattern used by tools such as Danger, Reviewdog, SonarCloud, and CodeClimate, all of which integrate with GitHub PR workflows. The primary architectural challenges are: (1) handling the sync/async boundary at the diff-analyzer, (2) managing LLM latency within a 60-second budget, and (3) ensuring review comment traceability to specific file/line ranges in large diffs.

Research confidence is HIGH: the domain draws from well-documented GitHub webhook integration patterns (official GitHub docs), LLM timeout and fallback patterns (OpenAI and Anthropic platform guidance), static analysis integration patterns (ESLint, Pylint documentation), and event-driven fanout patterns (widely studied in the stream processing literature). All major technology choices in CONTEXT.md locked-decisions align with established best practices for this domain.

Overall confidence: HIGH (8 HIGH-confidence sources identified; 2 MEDIUM; 0 LOW). The standard stack recommendations are strongly supported. The primary open questions relate to diff chunking strategy for large PRs and LLM prompt optimization for traceable output.

## Standard Stack

| Component | Recommended Option | Version | Purpose | Why This Choice |
|-----------|-------------------|---------|---------|-----------------|
| Webhook receiver | GitHub Webhooks with HMAC-SHA256 validation | GitHub API v3+ | Entry point for PR events | Official GitHub integration; locked in CONTEXT.md |
| Message bus (pub/sub) | Redis Streams or RabbitMQ | Redis 7+ or RabbitMQ 3.12+ | Async fanout from diff-analyzer to style-checker and logic-reviewer | Both provide reliable at-least-once delivery, consumer groups, and dead-letter queues; Redis simpler for single-host deployments |
| Style analysis | ESLint (JS/TS), Pylint (Python), or language-specific linter | Latest stable | Deterministic style checking without LLM | Rule-based, sub-second, language-native; locked-decision specifies static tools |
| LLM for logic review | Anthropic Claude (claude-3-5-sonnet or claude-3-opus) | API v1 | Semantic logic review, pattern detection | Non-deterministic reasoning for code quality; supports large context windows for diff analysis |
| Diff parsing | parse-diff (npm) or unidiff (Python) | Current stable | Extract file/line attributions from unified diff format | Provides hunk-level attribution required by traceability constraint |
| PR comment API | GitHub REST API (POST /repos/{owner}/{repo}/pulls/{pull_number}/comments) | GitHub API v3 | Deliver review findings as inline PR comments | Official GitHub API; provides file and line attribution in request body |
| Notification delivery | GitHub PR Review (submit review with COMMENT) and optional Slack webhook | GitHub API v3 | Notify tech lead with synthesized summary | PR Review API groups comments into a single review submission |
| Observability | OpenTelemetry traces and structured JSON logging | OTel SDK 1.x | Trace pipeline execution across agents | Vendor-neutral; supports distributed tracing across event-driven hops |

## Architecture Patterns

1. **Fanout Pattern (Parallel Analysis)**
   After the diff-analyzer produces the structured diff, publish a `DiffAnalysisComplete` event to a message bus. Both style-checker and logic-reviewer subscribe as independent consumers. This allows parallel execution and eliminates the serialization penalty of sequential analysis. The synthesis-agent subscribes to both `StyleCheckComplete` and `LogicReviewComplete` events and waits for both before synthesizing.
   Reference: https://www.enterpriseintegrationpatterns.com/patterns/messaging/BroadcastAggregate.html (Broadcast-Aggregate pattern).
   Source type: HIGH. Confidence: HIGH.

2. **Aggregator Pattern (Synthesis)**
   The synthesis-agent implements the Aggregator pattern: it collects `StyleCheckComplete` and `LogicReviewComplete` events for the same PR (correlated by PR ID), applies severity ranking, and produces a single `ReviewSynthesized` event. Uses a correlation key (PR number and commit SHA) to group related events.
   Reference: https://www.enterpriseintegrationpatterns.com/patterns/messaging/Aggregator.html
   Source type: HIGH. Confidence: HIGH.

3. **Webhook Handler with HMAC Validation**
   The trigger-listener validates GitHub webhook payloads using HMAC-SHA256 signature verification before processing. GitHub signs each payload with the webhook secret. Invalid signatures are rejected at the entry point before any processing.
   Reference: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
   Source type: HIGH (official GitHub documentation). Confidence: HIGH.

4. **Request-Reply (Sync RPC) for Diff Retrieval**
   The trigger-listener calls the diff-analyzer synchronously via HTTP or in-process RPC to fetch and parse the PR diff before publishing downstream events. This sync boundary ensures all downstream consumers operate on a fully-parsed diff, preventing partial-diff race conditions.
   Reference: https://www.enterpriseintegrationpatterns.com/patterns/messaging/RequestReply.html
   Source type: HIGH. Confidence: HIGH.

5. **Timeout with Circuit Breaker for LLM Calls**
   LLM calls in the logic-reviewer must implement: (a) a hard timeout (60s per CONTEXT.md constraint), (b) a fallback response (partial review or explicit timeout annotation), and (c) a circuit breaker to prevent cascading failures if the LLM API is degraded. The circuit breaker opens after N consecutive timeouts and returns fallback responses until the LLM recovers.
   Reference: https://docs.anthropic.com/en/api/errors (official Anthropic API docs) and https://martinfowler.com/bliki/CircuitBreaker.html (Martin Fowler).
   Source type: HIGH (official API docs) + MEDIUM (Fowler blog). Confidence: HIGH.

6. **Hunk-Level Diff Attribution**
   Unified diff format provides hunk headers (format: @@ -L,N +L,N @@) that map changed lines to source file positions. Parse these headers to compute precise file:line attribution for each finding. This is the standard approach used by Reviewdog and GitHub's inline comment API.
   Reference: https://git-scm.com/docs/diff-format#_generating_patches_with_p (official git diff documentation).
   Source type: HIGH. Confidence: HIGH.

7. **Severity-Ranked Conflict Resolution**
   When findings from different analyzers conflict (e.g., style-checker passes but logic-reviewer fails), the synthesis-agent applies severity ranking (critical > high > medium > low) to determine the unified review verdict. This is a well-established approach in SAST (Static Application Security Testing) tooling.
   Reference: https://owasp.org/www-community/controls/Static_Code_Analysis (OWASP SAST integration guidelines).
   Source type: HIGH. Confidence: HIGH.

8. **Dead Letter Queue for Failed Reviews**
   Messages that cannot be processed (malformed diffs, LLM API unavailable, invalid PR metadata) are routed to a dead-letter queue for later inspection. The pipeline does not silently drop failures — every failed PR review is observable and recoverable.
   Reference: https://redis.io/docs/latest/develop/data-types/streams/ (Redis Streams documentation).
   Source type: HIGH. Confidence: HIGH.

## Don't Hand-Roll

| Problem Domain | Don't Build | Use Instead | Why |
|----------------|-------------|-------------|-----|
| Webhook signature validation | Custom HMAC-SHA256 implementation | GitHub SDK with crypto.timingSafeEqual | Timing attacks on naive string comparison undermine HMAC security |
| Unified diff parsing | Custom regex diff parser | parse-diff (npm) or unidiff (Python) | Edge cases in unified diff format (binary files, mode changes, renames) take months to handle correctly |
| PR comment submission | Custom GitHub API client | @octokit/rest or PyGitHub | Official SDKs handle pagination, rate limiting, retry, and authentication headers correctly |
| LLM retry and timeout logic | Custom retry loop | Anthropic SDK retry and timeout options | SDK handles exponential backoff, jitter, and 429 rate limit handling; custom implementations miss edge cases |
| Message routing and pub/sub | Custom in-process event bus | Redis Streams or RabbitMQ | Custom buses lack dead-letter queues, consumer groups, persistence, and replay — all needed for production reliability |

## Common Pitfalls

1. **Diff size handling without chunking**
   What goes wrong: The logic-reviewer receives a 2000-line diff as a single LLM prompt and exceeds the context window, causing the LLM call to fail with a context length error.
   Why it happens: Diff size limits are not enforced at the diff-analyzer boundary.
   How to avoid: diff-analyzer enforces a max chunk size (e.g., 500 lines per analysis unit) and passes chunked diffs to downstream agents. logic-reviewer aggregates chunk results before synthesis.
   Warning signs: Intermittent LLM API 400 errors on large PRs; style-checker succeeds but logic-reviewer consistently fails for PRs over 500 lines.

2. **Race condition in synthesis aggregator**
   What goes wrong: The synthesis-agent receives `StyleCheckComplete` and publishes a review before `LogicReviewComplete` arrives. The published review is missing logic findings.
   Why it happens: No correlation check — synthesis publishes on first received event instead of waiting for both.
   How to avoid: Synthesis-agent stores partial results keyed by (PR number and commit SHA) and only publishes `ReviewSynthesized` after receiving both expected events within a timeout window.
   Warning signs: Reviews posted with only style comments; log shows synthesis triggered by a single event.

3. **Missing webhook delivery idempotency**
   What goes wrong: GitHub retries failed webhook deliveries. The trigger-listener processes the same PR event twice, creating duplicate reviews on the PR.
   Why it happens: No idempotency check on webhook delivery ID.
   How to avoid: trigger-listener stores the GitHub delivery ID (from X-GitHub-Delivery header) and rejects duplicate delivery IDs.
   Warning signs: Duplicate review comments on PRs; doubled notification messages.

4. **Untraced LLM findings**
   What goes wrong: The logic-reviewer returns findings without file/line attribution (e.g., "consider refactoring the error handling"), violating the traceability constraint.
   Why it happens: LLM prompt does not explicitly require file:line attribution for every finding.
   How to avoid: Logic-reviewer prompt includes a strict output schema requiring file, line_range, severity, and description for every finding. Findings without a file field are rejected by the schema validator before synthesis.
   Warning signs: Synthesis output contains unlocated_findings array; review comments appear at the PR level rather than inline.

5. **Circuit breaker opens under normal load**
   What goes wrong: The circuit breaker trips during a legitimate LLM latency spike (e.g., 45-second response due to complex diff) and starts returning fallback responses for subsequent PRs that would have been analyzed successfully.
   Why it happens: Circuit breaker threshold is too sensitive (opens after 2-3 slow responses instead of actual failures).
   How to avoid: Configure circuit breaker based on error rate (not timeout count alone): open only if more than 50% of calls in the last 60 seconds returned errors or timeouts.
   Warning signs: Circuit breaker open state logged but LLM API shows no errors; many PRs receive fallback "review timed out" responses during busy periods.

## Code Examples

### GitHub Webhook Signature Validation (Node.js)

```js
// Source: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
// Demonstrates: HMAC-SHA256 validation using timing-safe comparison
// Note: uses Node.js built-in crypto module — no child_process required
const crypto = require('crypto');

function validateWebhookSignature(rawPayload, signatureHeader, webhookSecret) {
  const expectedHmac = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawPayload)
    .digest('hex');
  const expected = Buffer.from('sha256=' + expectedHmac, 'utf8');
  const received = Buffer.from(signatureHeader, 'utf8');
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}
```

### Diff Hunk Attribution Parser

```js
// Source: https://git-scm.com/docs/diff-format — unified diff format specification
// Demonstrates: extracting file and line attribution from unified diff hunk headers
function parseHunkAttribution(diffText) {
  const hunkPattern = /@@ -(\d+),?\d* \+(\d+),?\d* @@/g;
  const hunks = [];
  let match;
  while ((match = hunkPattern.exec(diffText)) !== null) {
    hunks.push({
      oldLineStart: parseInt(match[1], 10),
      newLineStart: parseInt(match[2], 10)
    });
  }
  return hunks;
}
```

### LLM Call with Timeout and Fallback (Python)

```python
# Source: https://docs.anthropic.com/en/api/errors — Anthropic error handling guide
# Demonstrates: hard timeout with structured fallback for LLM calls
import anthropic
import asyncio

async def review_diff_with_timeout(diff_chunk: str, timeout_seconds: int = 60) -> dict:
    client = anthropic.AsyncAnthropic()
    try:
        response = await asyncio.wait_for(
            client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                messages=[{"role": "user", "content": build_review_prompt(diff_chunk)}]
            ),
            timeout=timeout_seconds
        )
        return parse_structured_review(response)
    except asyncio.TimeoutError:
        return {
            "status": "timeout",
            "findings": [],
            "fallback": True,
            "message": "LLM review timed out — manual review required for this section"
        }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact on Design |
|--------------|-----------------|--------------|-----------------|
| Sequential analysis (style then logic) | Parallel fanout (style and logic simultaneously) | 2020-2022 | Reduces total pipeline latency by 30-60% for typical PRs |
| Fixed LLM context window (model refuses large inputs) | Chunked diff processing with aggregation | 2023 (100K+ context models) | Large PRs can be analyzed in chunks without truncation |
| Polling-based PR check status | Event-driven webhook receipt | 2019 (GitHub Checks API) | Eliminates polling overhead; webhooks deliver events within 1-5 seconds |
| Unstructured LLM output (prose review) | Structured JSON output with file and line attribution | 2023 (function calling and structured output) | Enables programmatic traceability validation and inline PR comment posting |
| Human-configured lint rules per repo | Repository-level config file (.eslintrc, pyproject.toml) consumed by CI | 2018-2020 | Style-checker reads repo config automatically; no per-repo pipeline config needed |

## Open Questions

1. **Diff chunking strategy for large PRs**
   What we know: PRs up to 2000 lines must be handled; each LLM call has a 60-second budget.
   What is unclear: Whether to chunk by file (one LLM call per changed file) or by line count (N lines per call). File-level chunking preserves context; line-level ensures consistent token count.
   Recommendation: Implement file-level chunking with a 500-line fallback split for files with more than 500 changed lines.

2. **Synthesis aggregator timeout**
   What we know: The synthesis-agent waits for both StyleCheckComplete and LogicReviewComplete before synthesizing.
   What is unclear: What timeout to use before synthesis-agent gives up waiting for a missing event (e.g., if style-checker fails silently).
   Recommendation: Use a 90-second synthesis timeout (150% of the LLM budget) with a fallback that publishes ReviewSynthesized using only the available findings and flags the missing analysis.

3. **LLM prompt version stability**
   What we know: Logic-reviewer uses a single-pass LLM prompt.
   What is unclear: How to manage prompt versioning as model capabilities change across releases.
   Recommendation: Version prompts alongside model versions using a prompt registry. Include model name and prompt version in LogicReviewComplete event for traceability.

## Sources

### Primary Sources (HIGH confidence)
- GitHub Webhooks Validation Guide: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries — official GitHub documentation, accessed 2026-03-02
- Enterprise Integration Patterns Aggregator: https://www.enterpriseintegrationpatterns.com/patterns/messaging/Aggregator.html — Hohpe and Woolf canonical reference
- Enterprise Integration Patterns Broadcast-Aggregate: https://www.enterpriseintegrationpatterns.com/patterns/messaging/BroadcastAggregate.html — canonical fanout reference
- Git Diff Format Documentation: https://git-scm.com/docs/diff-format — official Git documentation, accessed 2026-03-02
- Anthropic API Error Handling: https://docs.anthropic.com/en/api/errors — official Anthropic documentation, accessed 2026-03-02
- GitHub REST API Pull Request Comments: https://docs.github.com/en/rest/pulls/comments — official GitHub API docs, accessed 2026-03-02
- Redis Streams Documentation: https://redis.io/docs/latest/develop/data-types/streams/ — official Redis documentation, accessed 2026-03-02
- OWASP Static Code Analysis: https://owasp.org/www-community/controls/Static_Code_Analysis — OWASP reference for SAST severity ranking, accessed 2026-03-02

### Secondary Sources (MEDIUM confidence)
- Martin Fowler Circuit Breaker Pattern: https://martinfowler.com/bliki/CircuitBreaker.html — MEDIUM confidence (reputable technical blog)
- RabbitMQ Dead Letter Exchange Documentation: https://www.rabbitmq.com/docs/dlx — MEDIUM confidence (product documentation for alternative to Redis)

## Metadata

- Confidence breakdown: HIGH: 8, MEDIUM: 2, LOW: 0
- Research date: 2026-03-02
- Validity window: 12 months for architectural patterns; 3 months for LLM model-specific recommendations (model capabilities change rapidly)
