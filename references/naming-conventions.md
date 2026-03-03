# Naming Conventions — AAA

**Status:** Locked (Phase 1)
**Enforced by:** `arch-tools.js validate-names`
**Version:** 1.0

This document is the canonical naming contract for all AAA artifacts. It is a machine-checkable specification, not a style guide suggestion. Every regex pattern in this document is used directly by `arch-tools.js validate-names`.

---

## Naming Categories

### 1. Events — PascalCase

| Property | Value |
|----------|-------|
| Convention | PascalCase |
| Regex Pattern | `^[A-Z][a-zA-Z0-9]*$` |
| Applies to | Event names in event-schema.yaml files (`type: event`), event references in agent specs |

| Valid Names | Invalid Names | Why Invalid |
|-------------|---------------|-------------|
| `TaskAssigned` | `task_assigned` | underscore separators not allowed |
| `PhaseComplete` | `TASK_ASSIGNED` | all-caps is SCREAMING_SNAKE, not PascalCase |
| `ContextValidated` | `task-assigned` | hyphen separators not allowed |
| `ArchitecturePackageReady` | `taskAssigned` | must start with uppercase letter |
| `DesignPhaseStarted` | `Task_Assigned` | mixed case with underscore not allowed |

**Rule:** An event name starts with an uppercase letter and contains only letters and digits — no separators of any kind.

---

### 2. Commands — SCREAMING_SNAKE_CASE

| Property | Value |
|----------|-------|
| Convention | SCREAMING_SNAKE_CASE |
| Regex Pattern | `^[A-Z][A-Z0-9_]*$` |
| Applies to | Command names in event-schema.yaml files (`type: command`), command references in orchestration docs |

| Valid Names | Invalid Names | Why Invalid |
|-------------|---------------|-------------|
| `ASSIGN_TASK` | `AssignTask` | PascalCase is for events, not commands |
| `VALIDATE_CONTEXT` | `assign_task` | lowercase not allowed in commands |
| `START_PHASE` | `assign-task` | hyphens not allowed |
| `TRIGGER_DESIGN_PIPELINE` | `Assign_Task` | must start with uppercase, all uppercase required |
| `RESET_AGENT_STATE` | `ASSIGN task` | spaces not allowed |

**Rule:** A command name starts with an uppercase letter and contains only uppercase letters, digits, and underscores. The leading character MUST be an uppercase letter (not `_`).

**Rationale:** SCREAMING_SNAKE visually signals imperative intent. `ASSIGN_TASK` reads as "do this", while `TaskAssigned` reads as "this happened". The convention distinction prevents mixing commands and events in event routing logic.

---

### 3. Agent Names — kebab-case

| Property | Value |
|----------|-------|
| Convention | kebab-case |
| Regex Pattern | `^[a-z][a-z0-9-]*$` |
| Applies to | `name:` field in agent spec frontmatter, agent references in workflow documents, keys in config.json `model_profiles` |

| Valid Names | Invalid Names | Why Invalid |
|-------------|---------------|-------------|
| `arch-executor` | `ArchExecutor` | PascalCase not allowed for agent names |
| `discuss-system` | `arch_executor` | underscores not allowed |
| `failure-analyst` | `ARCH_EXECUTOR` | all-caps not allowed |
| `schema-designer` | `Arch-Executor` | mixed case not allowed |
| `arch-integrator` | `-arch-executor` | must start with lowercase letter |

**Rule:** An agent name starts with a lowercase letter and contains only lowercase letters, digits, and hyphens.

**Rationale:** kebab-case matches Claude Code's convention for agent file names (`discuss-system.md`). It is URL-safe and naturally maps the `name:` frontmatter field to the file name without transformation. The 11 AAA agents follow this convention:

```
discuss-system
arch-researcher
arch-roadmapper
arch-planner
arch-checker
arch-executor
arch-verifier
arch-integrator
context-engineer
schema-designer
failure-analyst
```

---

## Scope Rules

Naming conventions apply in specific contexts. Applying them outside their scope (e.g., PascalCase in a file name) is not an error, but applying the wrong convention inside the defined scope is a validation failure.

### Agent Name Scope

The kebab-case convention applies in these exact locations:

1. **Agent spec frontmatter** — the `name:` field in every `agents/*.md` file
   ```yaml
   ---
   name: arch-executor
   description: "..."
   ---
   ```

2. **Workflow document references** — any agent name cited in `workflows/*.md` files
   ```markdown
   Spawn: arch-executor
   ```

3. **config.json model_profiles keys** — every key inside each profile object
   ```json
   {
     "model_profiles": {
       "balanced": {
         "arch-executor": "sonnet"
       }
     }
   }
   ```

### Event Name Scope

The PascalCase convention applies in these exact locations:

1. **Event schema files** — the `name:` field where `type: event`
   ```yaml
   name: TaskAssigned
   type: event
   ```

2. **Agent spec dispatches sections** — event names in YAML blocks
   ```yaml
   dispatches:
     - event: TaskAssigned
   ```

3. **Agent spec subscribes sections** — event names in YAML blocks
   ```yaml
   subscribes:
     - event: PhaseComplete
   ```

### Command Name Scope

The SCREAMING_SNAKE_CASE convention applies in these exact locations:

1. **Event schema files** — the `name:` field where `type: command`
   ```yaml
   name: ASSIGN_TASK
   type: command
   ```

2. **Orchestration documents** — command references in workflow specs
   ```yaml
   commands:
     - VALIDATE_CONTEXT
     - START_PHASE
   ```

---

## Compound Naming Rules

These rules govern file and directory names, which follow different conventions than the in-file names above.

| Artifact | Convention | Pattern | Examples |
|----------|-----------|---------|---------|
| Agent spec files | `{agent-name}.md` | kebab-case `.md` | `arch-executor.md`, `discuss-system.md` |
| Event schema files | `{EventName}.yaml` or `events.yaml` | PascalCase `.yaml` or collective | `TaskAssigned.yaml` or `events.yaml` |
| Phase directories | `{NN}-{slug}` | padded number + kebab-case | `01-foundation-tooling-and-agent-scaffold` |
| Design document files | `{kebab-slug}.md` or `.yaml` | kebab-case with extension | `context-flow.md`, `topology.yaml` |
| Template files | `{artifact-type}.md` or `.yaml` | kebab-case with extension | `agent-spec.md`, `event-schema.yaml` |
| Reference files | `{topic}.md` | kebab-case `.md` | `naming-conventions.md`, `context-schema.md` |

**Phase directory format:** `{NN}` is zero-padded to 2 digits (e.g., `01`, `02`, `10`). The slug is derived from the phase name by lowercasing and replacing spaces and non-alphanumeric characters with hyphens.

---

## Programmatic Enforcement

`arch-tools.js validate-names <file>` enforces these conventions by scanning:

1. **Frontmatter `name:` fields** — checked against the kebab-case pattern `^[a-z][a-z0-9-]*$`
2. **YAML `- event:` references** — checked against PascalCase `^[A-Z][a-zA-Z0-9]*$`
3. **YAML `- command:` references** — checked against SCREAMING_SNAKE `^[A-Z][A-Z0-9_]*$`
4. **Event schema `name:` fields with `type: event`** — checked against PascalCase
5. **Event schema `name:` fields with `type: command`** — checked against SCREAMING_SNAKE

The exact regex patterns used by `validate-names` are:

```javascript
const NAMING_RULES = {
  event:   { pattern: /^[A-Z][a-zA-Z0-9]*$/, convention: 'PascalCase' },
  agent:   { pattern: /^[a-z][a-z0-9-]*$/,   convention: 'kebab-case' },
  command: { pattern: /^[A-Z][A-Z0-9_]*$/,   convention: 'SCREAMING_SNAKE_CASE' },
};
```

`validate-names` returns JSON:
```json
{
  "file": "design/agents/coordinator.md",
  "violations": [
    {
      "type": "agent",
      "name": "ArchCoordinator",
      "rule": "kebab-case",
      "example": "arch-coordinator",
      "location": "frontmatter name:"
    }
  ],
  "valid": false
}
```

On success (`valid: true`), the `violations` array is empty.

---

## Rationale

### Why PascalCase for events?

PascalCase matches industry standard usage for domain events (Domain-Driven Design, CloudEvents specification, CQRS event sourcing). Event names are noun phrases describing things that happened: `TaskAssigned`, `PhaseComplete`, `ContextValidated`. PascalCase is visually distinct from both agent names (kebab-case) and commands (SCREAMING_SNAKE), making the type of a reference immediately apparent when reading any document.

### Why SCREAMING_SNAKE_CASE for commands?

Commands are imperative actions: `ASSIGN_TASK`, `VALIDATE_CONTEXT`, `RESET_STATE`. The all-caps convention signals this imperative intent. SCREAMING_SNAKE is visually distinct from PascalCase events — when you see `TaskAssigned`, it's an event (past tense, something happened); when you see `ASSIGN_TASK`, it's a command (imperative, do this now). This visual distinction reduces routing errors in orchestration logic.

### Why kebab-case for agent names?

kebab-case matches Claude Code's native convention for agent file names. An agent named `arch-executor` lives at `agents/arch-executor.md` with no case transformation. This makes agent name resolution trivial: `name:` field → append `.md` → file path. kebab-case is also URL-safe and human-readable in file system listings.

---

## Cross-References

- Enforced by: `bin/arch-tools.js` via the `validate-names` command
- PascalCase events used in: `templates/event-schema.yaml`, `references/schema-patterns.md`
- kebab-case agents used in: `templates/agent-spec.md`, `config.json` model_profiles
- SCREAMING_SNAKE commands used in: `templates/event-schema.yaml`
- Scope rules inform: `arch-verifier` Level 4 verification (name resolution against canonical registry)
