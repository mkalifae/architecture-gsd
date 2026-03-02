---
domain: "event-driven multi-agent code review pipeline"
actors:
  - "Software developers (submit PRs)"
  - "Tech leads (receive synthesized reviews)"
  - "DevOps team (maintains webhook infrastructure)"
non-goals:
  - "Code generation or auto-fix suggestions"
  - "IDE integration or real-time editing feedback"
  - "Repository management or branch operations"
  - "Human reviewer replacement — this augments, not replaces"
constraints:
  - "GitHub webhook event source (PR events only)"
  - "Must handle PRs up to 2000 changed lines"
  - "LLM-based logic review has latency budget of 60 seconds"
  - "All review comments must be traceable to a specific file and line range"
scale:
  agents: 6
  throughput: "50 PRs per hour peak"
  context_windows: "200K per agent"
locked-decisions:
  - decision: "6 agents: trigger-listener, diff-analyzer, style-checker, logic-reviewer, synthesis-agent, notification-agent"
    rationale: "Each agent handles a distinct concern; the 6-agent decomposition maps cleanly to the PR review workflow stages"
  - decision: "Mixed communication: trigger-listener to diff-analyzer is sync request/response; downstream agents use event-driven pub/sub"
    rationale: "Sync for initial diff fetch (latency-sensitive, single consumer); async pub/sub for parallel downstream analysis (multiple consumers, fanout)"
  - decision: "Style checking uses static analysis tools (not LLM) — deterministic and fast"
    rationale: "Linting and formatting checks are rule-based and benefit from determinism and sub-second latency; LLM would add cost and latency without quality benefit"
  - decision: "Logic review uses LLM — non-deterministic, needs timeout and fallback"
    rationale: "Semantic correctness, design pattern violations, and logic errors require natural language reasoning that static analysis cannot provide"
  - decision: "Synthesis agent resolves conflicting findings (style OK + logic fail) using severity ranking"
    rationale: "When style passes but logic fails, the synthesis agent must produce a coherent unified review using severity-ranked conflict resolution rather than presenting contradictory outputs"
---

## System Intent

The Code Review Automation Pipeline is an event-driven multi-agent system that automatically reviews pull requests on GitHub and delivers actionable code review feedback to developers and tech leads. When a developer opens a PR, the system receives a webhook event, analyzes the diff for both style violations (via static analysis) and logic errors (via LLM reasoning), synthesizes the findings into a coherent unified review, and delivers the result as GitHub PR comments and a notification to the tech lead. The pipeline operates autonomously within a 60-second latency budget for LLM-based analysis and handles up to 50 PRs per hour at peak load.

The system augments human code review by providing immediate automated feedback on mechanical issues (formatting, style) and common logic errors, allowing human reviewers to focus on higher-order architectural and design concerns. All review comments are traceable to specific file paths and line ranges in the diff to enable direct correlation with the PR changes.

The pipeline uses a mixed communication model: the initial diff retrieval uses synchronous request/response for reliability and simplicity, while the parallel downstream analysis stages (style check, logic review) use event-driven pub/sub to enable concurrent execution and decoupled scaling.

## Actors

**Software developers** submit pull requests on GitHub and receive automated code review feedback as PR comments. They interact with the pipeline's output but not with the pipeline directly — the GitHub webhook infrastructure mediates all interactions. Developers benefit from immediate feedback on style and logic issues before human review begins.

**Tech leads** receive synthesized review summaries via notification, allowing them to triage and prioritize their human review effort based on the automated findings. They are downstream consumers of the pipeline's output and do not initiate pipeline runs.

**DevOps team** maintains the webhook infrastructure (GitHub webhook registration, event routing, secret validation) and is responsible for pipeline operational health. They interact with the pipeline at the infrastructure level (deployment, monitoring, secret rotation) rather than through the product interface.

## Non-Goals

**Code generation or auto-fix suggestions** are excluded because automatically applying code changes to a PR introduces risk of introducing new bugs or violating developer intent. The pipeline produces review comments for human action, not automated patches.

**IDE integration or real-time editing feedback** is excluded because the pipeline is designed for PR-level review (post-commit), not pre-commit editor feedback. Real-time IDE integration would require a different latency profile (sub-100ms vs 60s budget) and a completely different event source.

**Repository management or branch operations** are excluded because the pipeline is read-only with respect to the repository. It reads diffs via the GitHub API but never pushes commits, creates branches, merges PRs, or modifies repository state.

**Human reviewer replacement** is explicitly excluded. The system augments human reviewers by handling the mechanical and routine checks, but architectural decisions, design pattern choices, and business logic correctness that require domain expertise remain the responsibility of human reviewers.

## Constraints

**GitHub webhook event source** constrains the entry point to PR events only (opened, reopened, synchronize). The pipeline does not support other event types (push events, issue events, deployment events) or other Git hosting platforms (GitLab, Bitbucket). This rules out any architecture that requires polling or direct repository access.

**PRs up to 2000 changed lines** constrains the diff-analyzer's context window usage and the style-checker's processing capacity. Diffs larger than 2000 lines will be chunked or truncated per agent-specific handling rules — the architecture must accommodate large diffs without failing silently.

**LLM latency budget of 60 seconds** for logic review constrains the logic-reviewer agent to complete its LLM call within 60 seconds. This rules out multi-turn LLM conversations for analysis and requires a single-pass review prompt with timeout and fallback behavior (partial review or skip notification on timeout).

**Review comment traceability** requires that every review finding reference a specific file path and line range from the PR diff. This constrains the output schema: unlocated findings (e.g., "this PR has quality issues") are not valid outputs — every finding must have a file and line attribution.

## Scale

The system targets 50 PRs per hour at peak throughput, corresponding to a team of approximately 50-100 developers with active PR activity. At this rate, a new PR arrives roughly every 72 seconds on average. The per-agent context window budget of 200K tokens accommodates diffs up to approximately 2000 lines (at ~50 tokens per line of diff including context).

The 60-second LLM latency budget for logic review is the primary bottleneck. At 50 PRs/hour, the logic-reviewer must complete each analysis within 60 seconds to avoid backlog accumulation. This drives the event-driven architecture: style checking (deterministic, sub-second) and logic review (LLM, 10-60 seconds) run in parallel rather than sequentially to minimize total pipeline latency.

## Locked Decisions

**6-agent decomposition** (trigger-listener, diff-analyzer, style-checker, logic-reviewer, synthesis-agent, notification-agent) was decided before design begins. Each agent handles one pipeline stage. The decomposition maps to PR review workflow stages: event reception → diff extraction → parallel analysis → result synthesis → notification delivery.

**Mixed communication model**: trigger-listener to diff-analyzer uses synchronous request/response; all downstream agents use event-driven pub/sub. The sync boundary at diff-analyzer ensures the diff is fully available before any analysis begins. The pub/sub boundary after diff-analyzer enables parallel execution of style-checker and logic-reviewer without coupling them.

**Style checking uses static analysis tools (not LLM)**: Deterministic, sub-second linting tools handle style and formatting checks. This rules out any design that sends style check requests to an LLM — the decision is locked for cost and latency reasons.

**Logic review uses LLM with timeout and fallback**: The logic-reviewer agent sends a single-pass prompt to the LLM with a 60-second hard timeout. If the LLM does not respond within the budget, the agent returns a partial review (or an explicit "review timed out" annotation) rather than blocking the pipeline.

**Severity-ranked synthesis**: The synthesis-agent resolves conflicting findings using severity ranking (critical > high > medium > low). When style passes but logic fails at high severity, the unified review leads with the logic failure. This conflict resolution algorithm is locked — alternatives (simple concatenation, weighted scoring) are excluded.
