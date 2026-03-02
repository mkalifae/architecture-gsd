---
phase: context-and-schema-design
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - design/events/events.yaml
autonomous: true
must_haves:
  truths:
    - "events.yaml contains entries for all 6 events: PullRequestReceived, DiffAnalysisComplete, StyleCheckComplete, LogicReviewComplete, ReviewSynthesized, NotificationSent"
    - "Every event has typed payload fields — no banned types (any, object without fields, mixed, unknown, arbitrary)"
    - "Every event has at least one producer and at least one consumer using kebab-case agent names"
    - "All event names are PascalCase and pass validate-names check"
    - "events.yaml passes detect-stubs check (zero stubs)"
  artifacts:
    - path: "design/events/events.yaml"
      provides: "Canonical event registry for all 6 pipeline events"
      contains: "PullRequestReceived"
  key_links:
    - from: "design/events/events.yaml"
      to: "design/agents/trigger-listener.md"
      via: "trigger-listener declared as producer of PullRequestReceived"
      pattern: "producers:"
    - from: "design/events/events.yaml"
      to: "design/agents/synthesis-agent.md"
      via: "synthesis-agent declared as consumer of StyleCheckComplete and LogicReviewComplete"
      pattern: "consumers:"
---

<objective>
Produce the canonical event registry (events.yaml) for the Code Review Automation Pipeline. This document defines all 6 events that flow between the 6 agents — PullRequestReceived, DiffAnalysisComplete, StyleCheckComplete, LogicReviewComplete, ReviewSynthesized, NotificationSent — with fully typed payloads and explicit producer/consumer declarations. Every downstream agent contract will reference event names from this file.
</objective>

<context>
@.arch/CONTEXT.md
@.arch/RESEARCH.md
@templates/event-schema.yaml
@references/naming-conventions.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write events.yaml — canonical event registry for all 6 pipeline events</name>
  <files>design/events/events.yaml</files>
  <action>
Create .arch/phases/context-and-schema-design/design/events/ directory and write events.yaml.

The events.yaml file must contain YAML entries for all 6 events in the Code Review Automation Pipeline. Follow the structure from templates/event-schema.yaml exactly.

Events to include (in order):
1. PullRequestReceived — emitted by trigger-listener when a GitHub webhook PR event is validated; consumed by diff-analyzer
2. DiffAnalysisComplete — emitted by diff-analyzer after parsing the PR diff; consumed by style-checker and logic-reviewer (fanout)
3. StyleCheckComplete — emitted by style-checker after static analysis completes; consumed by synthesis-agent
4. LogicReviewComplete — emitted by logic-reviewer after LLM analysis completes; consumed by synthesis-agent
5. ReviewSynthesized — emitted by synthesis-agent after severity-ranked conflict resolution; consumed by notification-agent
6. NotificationSent — emitted by notification-agent after PR comments posted; consumed by monitoring/observability (external)

For each event, include:
- name: PascalCase event name
- type: "event"
- version: "1.0"
- description: one concrete sentence describing what this event represents
- payload: typed fields with name, type (from allowed types only), constraints, example, required
- producers: array of kebab-case agent names
- consumers: array of kebab-case agent names
- error_cases: at least one concrete error case per event

CRITICAL payload field requirements per the template:
- Use only allowed types: string, integer, float, boolean, array<type>, object{field: type}, enum[val1, val2]
- BANNED types: any, object (without fields), data, mixed, unknown, arbitrary
- Every required field must have: name, type, constraints, example, required: true
- Every optional field must also have: default

PullRequestReceived payload MUST include:
- pr_number (integer) — GitHub PR number
- repository_full_name (string) — e.g., "org/repo"
- head_sha (string) — commit SHA of the PR head
- delivery_id (string) — X-GitHub-Delivery header value (for idempotency)
- pr_url (string) — GitHub PR URL for comment posting

DiffAnalysisComplete payload MUST include:
- pr_number (integer)
- head_sha (string)
- diff_chunks (array<object{file: string, start_line: integer, end_line: integer, content: string}>) — chunked diff for downstream analysis
- total_lines_changed (integer)
- chunked (boolean) — true if diff was split into chunks

StyleCheckComplete payload MUST include:
- pr_number (integer)
- head_sha (string)
- findings (array<object{file: string, line: integer, rule: string, severity: enum[critical,high,medium,low], message: string}>) — empty array if no violations
- tool_name (string) — e.g., "eslint", "pylint"
- status (enum[passed, violations_found]) — passed if findings is empty

LogicReviewComplete payload MUST include:
- pr_number (integer)
- head_sha (string)
- findings (array<object{file: string, line_range: object{start: integer, end: integer}, severity: enum[critical,high,medium,low], description: string}>) — empty array if no findings
- status (enum[complete, timeout, partial]) — timeout if LLM exceeded 60s budget
- model_used (string) — LLM model identifier
- prompt_version (string) — version tag for prompt traceability

ReviewSynthesized payload MUST include:
- pr_number (integer)
- head_sha (string)
- unified_findings (array<object{file: string, line: integer, severity: enum[critical,high,medium,low], source: enum[style,logic], message: string}>) — merged findings ranked by severity
- verdict (enum[approved, changes_requested, comment]) — GitHub review verdict

NotificationSent payload MUST include:
- pr_number (integer)
- head_sha (string)
- comments_posted (integer) — count of PR comments posted
- review_id (string) — GitHub review ID
- status (enum[complete, partial, failed])

Do NOT include placeholder values like "[placeholder]" in the output — all fields must be concrete values specific to the Code Review Automation Pipeline.

Create the design/events/ directory before writing:
  Bash: mkdir -p .arch/phases/context-and-schema-design/design/events/

Write the file to: .arch/phases/context-and-schema-design/design/events/events.yaml
  </action>
  <verify>
Verify events.yaml is non-stub:
  node bin/arch-tools.js detect-stubs .arch/phases/context-and-schema-design/design/events/events.yaml

Verify event names follow PascalCase:
  node bin/arch-tools.js validate-names .arch/phases/context-and-schema-design/design/events/events.yaml

Verify the file contains all 6 required events:
  grep -c "^name:" .arch/phases/context-and-schema-design/design/events/events.yaml

Verify no banned types present:
  grep -E "type: \"(any|mixed|unknown|arbitrary|data)\"" .arch/phases/context-and-schema-design/design/events/events.yaml | wc -l
  </verify>
  <done>events.yaml exists at .arch/phases/context-and-schema-design/design/events/events.yaml, contains 6 events with PascalCase names, fully typed payloads (no banned types), and explicit producer/consumer declarations. detect-stubs returns clean: true. validate-names passes.</done>
</task>

</tasks>

<verification>
node bin/arch-tools.js detect-stubs .arch/phases/context-and-schema-design/design/events/events.yaml
node bin/arch-tools.js validate-names .arch/phases/context-and-schema-design/design/events/events.yaml
grep -c "^name:" .arch/phases/context-and-schema-design/design/events/events.yaml
</verification>

<success_criteria>
events.yaml contains all 6 pipeline events with typed payloads, PascalCase names, and explicit producer/consumer declarations. detect-stubs and validate-names both pass.
</success_criteria>

<output>
After completion, create .arch/phases/context-and-schema-design/SUMMARY.md
</output>
