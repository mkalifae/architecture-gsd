# Schema Patterns — Event and Command Schema Conventions

**Referenced by:** schema-designer (produces against), arch-verifier (validates against),
arch-executor (references when writing agent specs that dispatch/subscribe to events),
arch-checker (uses to verify schema completeness)
**Purpose:** Defines the contract for event and command schemas in Architecture GSD.
This is the typing, naming, versioning, and error case specification that all schema
documents must follow.

**Template:** See `templates/event-schema.yaml` for the scaffold that schema-designer fills in.
**Naming rules:** See `references/naming-conventions.md` for PascalCase/SCREAMING_SNAKE rules.

---

## 1. Naming Rules

Names are enforced by `arch-tools.js validate-names`. Any violation is a Level 4 failure.

| Artifact type | Convention | Pattern | Example | Counter-example |
|---------------|-----------|---------|---------|-----------------|
| Event | PascalCase | `^[A-Z][a-zA-Z0-9]*$` | `TaskAssigned` | `task_assigned`, `TASK_ASSIGNED` |
| Command | SCREAMING_SNAKE | `^[A-Z][A-Z0-9_]*$` | `ASSIGN_TASK` | `AssignTask`, `assign_task` |
| Schema file | Matches name field | `{name}.yaml` | `TaskAssigned.yaml` | `task-assigned.yaml` |

**Event naming semantics:** Events describe something that already happened — use past
tense or noun phrases: `TaskAssigned` (not `AssignTask`), `PhaseCompleted` (not
`CompletePhase`), `ContextValidated` (not `ValidateContext`).

**Command naming semantics:** Commands describe an action to take — use imperative verb
form: `ASSIGN_TASK`, `VALIDATE_CONTEXT`, `START_PHASE`.

**Disambiguation rule:** If unsure whether to use Event or Command, ask: "Did something
happen, or is something being requested?" Happened → Event (PascalCase).
Requested → Command (SCREAMING_SNAKE).

---

## 2. Required Payload Fields

Every field in a `payload:` block must have these properties:

| Property | Required | Notes |
|----------|----------|-------|
| `name` | Yes | snake_case, descriptive |
| `type` | Yes | Must be from Allowed Types list — see Section 3 |
| `required` | Yes | `true` or `false` |
| `example` | Yes | A concrete, realistic value (not `"example_value"`) |
| `constraints` | Recommended | Type-specific constraints in `[key: value]` format |
| `default` | Required if `required: false` | Default value when field is omitted |

**Completeness rule:** A payload field is incomplete if any of the 4 required properties
is missing. arch-checker flags incomplete payload fields as Level 2 failures.

---

## 3. Allowed Types

Type declarations must be from this list. BANNED types cause Level 2 verification failure.

### Allowed Types

| Type | Format | Example value |
|------|--------|---------------|
| `string` | UTF-8 text | `"arch-executor"` |
| `integer` | Whole number | `42` |
| `float` | Decimal number | `3.14` |
| `boolean` | True or false | `true` |
| `array<type>` | Typed array | `array<string>`, `array<integer>` |
| `object{field: type, ...}` | Structured object with named fields | `object{id: string, count: integer}` |
| `enum[val1, val2, ...]` | Fixed value set | `enum[pending, running, complete, failed]` |

### BANNED Types

The following types are banned from payload fields. Using them causes Level 2 failure.

| Banned type | Why it's banned | Replacement |
|-------------|-----------------|-------------|
| `any` | Too permissive — prevents type checking and cross-reference validation | Use the most specific type that fits |
| `object` | Without field specification — cannot be validated | Use `object{field: type, ...}` |
| `data` | Not a real type | Specify what the data actually is |
| `mixed` | Not a real type | Use `enum` for known values or split into typed fields |
| `unknown` | Not a real type | If the type is genuinely unknown, use `string` with a note |
| `arbitrary` | Not a real type | Same as `unknown` — always replace |

**Constraint format:** `"[rule1: value, rule2: value]"`
- Strings: `[max_length: 255]`, `[pattern: uuid-v4]`, `[min_length: 1]`
- Integers: `[min: 0, max: 1000]`
- Arrays: `[min_items: 1, max_items: 50]`
- Enums: `[must_be_one_of: listed_values]`

---

## 4. Versioning Convention

Schema versions follow semantic versioning principles adapted for data schemas.

| Version change | When | Example |
|----------------|------|---------|
| Major (X.0) | Breaking payload changes — removed fields, changed field types, renamed fields | `"1.0"` → `"2.0"` |
| Minor (X.Y) | Additive changes — new optional fields, new enum values | `"1.0"` → `"1.1"` |
| No change | Non-structural changes — description updates, constraint clarifications | Keep same version |

**Breaking changes (require major version bump):**
- Removing a required field
- Changing a field's type (e.g., `string` → `integer`)
- Renaming a field
- Adding a new required field (existing producers won't include it)
- Changing a field from optional to required

**Non-breaking changes (minor version or no change):**
- Adding a new optional field with a default value
- Adding new values to an `enum` type
- Updating description or constraints without changing the field type
- Adding new error cases

**Backward compatibility rule:** Consumers must handle receiving a schema version
higher than they were built against (they may ignore new optional fields). Consumers
must NOT receive a schema lower than their minimum supported version without explicit
migration handling.

---

## 5. Event vs Command Distinction

Events and commands are fundamentally different despite sharing the YAML structure.

| Dimension | Event | Command |
|-----------|-------|---------|
| Naming | PascalCase (`TaskAssigned`) | SCREAMING_SNAKE (`ASSIGN_TASK`) |
| Semantics | Something that happened (past tense) | Something that should happen (imperative) |
| Initiator | Producer (emits because something occurred) | Sender (requests an action) |
| Handler | Consumer (reacts to what happened) | Handler (executes the requested action) |
| Schema key | `producers` / `consumers` | `producers` (sender) / `consumers` (handler) |
| Multiplicity | Multiple consumers allowed (fan-out) | Typically one handler (point-to-point) |
| Failure semantics | Consumers react to event independently | Handler failure is a command failure |

**Practical rule:** If the schema represents a notification about state change, it's
an Event. If it represents a directive to take action, it's a Command.

---

## 6. Error Case Requirements

Every event or command schema MUST declare at least one error case. An event with no
error cases is an incomplete schema (Level 2 failure).

**Error case structure:**
```yaml
error_cases:
  - condition: "[Specific condition when this event signals an error]"
    payload_field: "[Which field in the payload signals or describes the error]"
    recovery: "[Concrete action the consumer should take]"
```

**BANNED in `condition`:** `"if something goes wrong"`, `"on error"`, `"in case
of failure"`, any vague condition that doesn't specify what goes wrong.

**BANNED in `recovery`:** `"handle gracefully"`, `"retry as needed"`, `"escalate
appropriately"`, any vague recovery that doesn't specify a concrete action.

**Good error case example:**
```yaml
error_cases:
  - condition: "task_id field references a task ID that no longer exists in
    the current phase plan (task was removed between event creation and delivery)"
    payload_field: "task_id"
    recovery: "Consumer logs the stale reference with full event payload, returns
    { status: 'failed', reason: 'stale_task_reference', event_id: '{id}' } to
    orchestrator, and does not proceed with the task."
```

**Bad error case example:**
```yaml
error_cases:
  - condition: "if there is a problem"
    payload_field: "error"
    recovery: "handle gracefully"
```

---

## 7. Example: Complete Event Schema

```yaml
name: "PhaseCompleted"
type: "event"
version: "1.0"
description: "Emitted when all tasks in a design phase have been executed and their
outputs verified. Signals the orchestrator to proceed to the next phase."

payload:
  - name: "phase_id"
    type: "string"
    constraints: "[pattern: ^[0-9]{2}-[a-z-]+$, example: 01-foundation-tooling]"
    example: "01-foundation-tooling-and-agent-scaffold"
    required: true

  - name: "phase_number"
    type: "integer"
    constraints: "[min: 1, max: 5]"
    example: 1
    required: true

  - name: "tasks_completed"
    type: "integer"
    constraints: "[min: 0]"
    example: 4
    required: true

  - name: "output_paths"
    type: "array<string>"
    constraints: "[min_items: 1, each: starts_with design/]"
    example: '["design/agents/arch-executor.md", "design/schemas/TaskAssigned.yaml"]'
    required: true

  - name: "verification_status"
    type: "enum[passed, gaps_found]"
    constraints: "[must_be_one_of: passed, gaps_found]"
    example: "passed"
    required: true

  - name: "gap_count"
    type: "integer"
    constraints: "[min: 0]"
    example: 0
    required: false
    default: 0

producers:
  - "arch-verifier"

consumers:
  - "arch-integrator"

error_cases:
  - condition: "verification_status is 'gaps_found' — one or more output documents
    failed Level 2 or higher verification checks before this event was emitted"
    payload_field: "gap_count"
    recovery: "arch-integrator reads gap_count, does NOT advance to next phase,
    spawns arch-checker to review failed documents and return findings to orchestrator
    for human review before retrying phase execution."
```

---

## 8. Example: Complete Command Schema

```yaml
name: "ASSIGN_TASK"
type: "command"
version: "1.0"
description: "Instructs arch-executor to execute a specific task from the current phase plan."

payload:
  - name: "phase_plan_path"
    type: "string"
    constraints: "[pattern: .planning/phases/.+/.+-PLAN.md$]"
    example: ".planning/phases/01-foundation-tooling/01-02-PLAN.md"
    required: true

  - name: "task_index"
    type: "integer"
    constraints: "[min: 1]"
    example: 2
    required: true

  - name: "task_name"
    type: "string"
    constraints: "[max_length: 200, min_length: 1]"
    example: "Implement frontmatter CRUD commands"
    required: true

  - name: "priority"
    type: "enum[critical, high, normal, low]"
    constraints: "[must_be_one_of: critical, high, normal, low]"
    example: "normal"
    required: false
    default: "normal"

producers:
  - "arch-planner"

consumers:
  - "arch-executor"

error_cases:
  - condition: "phase_plan_path points to a file that does not exist at the time
    arch-executor receives the command"
    payload_field: "phase_plan_path"
    recovery: "arch-executor returns { status: 'failed', error: 'plan_not_found',
    path: '{phase_plan_path}' }. arch-planner receives the failure and logs the
    stale path reference, then re-reads STATE.md to find the correct plan path
    before retrying."

  - condition: "task_index is higher than the number of tasks in the plan
    (e.g., plan has 3 tasks but task_index is 5)"
    payload_field: "task_index"
    recovery: "arch-executor returns { status: 'failed', error: 'task_index_out_of_range',
    task_count: '{actual_count}', requested_index: '{task_index}' }. Orchestrator
    halts phase execution and surfaces the mismatch to the human operator."
```

---

## 9. Anti-Patterns

These patterns appear frequently in incomplete or incorrect schemas. All cause verification failures.

1. **Untyped payload fields** — `type: any` or `type: object` without fields. Replace
   with the most specific type that applies.

2. **Missing required field properties** — Payload fields without `name`, `type`,
   `required`, or `example`. All four are required.

3. **Events without consumers** — An event with `consumers: []` or no `consumers:` key
   is an orphaned event. Level 3 verification failure.

4. **Commands without handlers** — A command with no consumers means no agent will
   act on it. Level 3 verification failure.

5. **Missing error cases** — Every schema must have at least one error case. An event
   with no error cases is a Level 2 failure.

6. **Vague recovery descriptions** — `"handle gracefully"`, `"retry as needed"` in
   error_cases recovery field. Replace with the specific action the consumer takes.

7. **Vague condition descriptions** — `"if something goes wrong"` in error_cases
   condition field. Replace with the specific triggering condition.

8. **Version not declared** — Missing `version:` field. Required for schema evolution
   tracking.

9. **Mixed event/command semantics** — An event named in imperative form (`DoSomething`)
   or a command named in past tense (`SomethingDone`). Use naming to signal semantics.

10. **Missing producers or consumers** — `producers:` or `consumers:` key missing or
    empty. Both are required with at least one entry each.
