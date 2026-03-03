# Verification Patterns — Architecture Domain Reference

**Referenced by:** arch-verifier (implements), arch-checker (applies Level 1-2),
arch-integrator (applies Level 3-4), all agents (understand what "verified" means)
**Purpose:** Defines the 4-level verification stack for architecture documents.
This is the AAA adaptation of verification for the design domain —
no test execution, no build commands, verification is structural and referential.

**Key difference from code verification:** Code verification runs tests and checks
behavior. Architecture verification checks structural completeness (are all required
sections present?), cross-referential integrity (do all references resolve?), and
internal consistency (do all names match their declarations?). No runtime execution.

---

## The 4-Level Verification Stack

Levels are cumulative — a document must pass Level N before Level N+1 is applied.
A document at Level 3 has implicitly passed Levels 1 and 2.

---

### Level 1: Exists

**What it checks:** The artifact file exists on disk at the expected path.
**When applied:** First check in any verification run, before opening any file.
**Implementation:** `fs.existsSync(path)` — boolean, no content inspection.
**Result:** Pass (file exists) or Fail (file missing).
**Failure action:** Stop verification chain. Return `{ status: "failed",
level: 1, finding: "file_not_found", path: "{expected_path}" }`.

**Expected paths by document type:**
- Agent specs: `agents/{agent-name}.md` (kebab-case name)
- Event schemas: `design/schemas/{EventName}.yaml` (PascalCase name)
- Failure modes: `design/failure-modes/{component-name}.md` (kebab-case)
- Orchestration docs: `design/orchestration/{document-name}.md`
- Phase state: `.planning/STATE.md`
- Context: `.arch/CONTEXT.md`

---

### Level 2: Substantive

**What it checks:** The document meets the minimum quality bar — it is not a stub.
**When applied:** After Level 1 passes. Full content inspection.
**Implementation:** `arch-tools.js` commands + section scanning.

**Checks (all must pass for Level 2):**

**2a. Line count >= minimum by document type:**
| Document type | Minimum lines |
|---------------|---------------|
| Agent spec | 50 |
| Event schema (YAML) | 20 |
| Failure modes | 40 |
| Orchestration/topology doc | 30 |
| Context (CONTEXT.md) | 25 |

Check implementation: `wc -l {file}` — compare to threshold.

**2b. All required sections present:**
- Agent specs: 7 XML sections (`<role>`, `<upstream_input>`, `<downstream_consumer>`,
  `<execution_flow>`, `<structured_returns>`, `<failure_modes>`, `<constraints>`)
- Failure modes: 3 sections (`## Failure Mode Catalog`, `## Integration Point Failures`,
  `## Residual Risks`)
- Event schemas: 5 top-level keys (`name`, `type`, `version`, `payload`, `error_cases`)

Check implementation: Scan for XML opening tags with regex `<tag_name>` (agent specs)
or section headers with regex `^## Section Name` (failure modes) or key presence check (YAML).

**2c. No stub phrases detected:**
Run `node bin/arch-tools.js detect-stubs {file}` — must return `"clean": true`.
Banned phrases are those signaling incomplete or deferred content: three-letter acronyms
meaning "not yet written", vague completion claims without specifics, or explicit deferral
markers. See `bin/arch-tools.js` STUB_PATTERNS constant for the authoritative list.

**2d. Frontmatter has all required fields:**
- Agent specs: `name`, `description`, `tools`, `model`, `color` (5 fields)
- CONTEXT.md: `domain`, `actors`, `non-goals`, `constraints`, `scale`,
  `locked-decisions` (6 fields)

Check implementation: `node bin/arch-tools.js frontmatter get {file}` — verify
all required keys are present and non-empty.

**Level 2 result format:**
```json
{
  "status": "passed | gaps_found",
  "level": 2,
  "findings": [
    {
      "check": "line_count | required_sections | stub_phrases | frontmatter_fields",
      "result": "pass | fail",
      "detail": "Human-readable explanation of what was found"
    }
  ],
  "file": "{path}"
}
```

---

### Level 3: Cross-Referenced

**What it checks:** The document is referenced by its dependent documents — it is
not an orphan in the architecture graph.
**When applied:** After Level 2 passes. Requires reading multiple files.
**Implementation:** Graph traversal across the design/ directory.

**Checks by document type:**

**3a. Agent specs — referenced in workflow or orchestration docs:**
Every agent spec in `agents/` must appear in at least one workflow file in
`workflows/` or in an orchestration document in `design/orchestration/`.
Check: grep for `{agent-name}` across workflow and orchestration documents.

**3b. Events — referenced by at least one producer AND one consumer:**
Every event schema in `design/schemas/` must have its `name:` field appear
in at least one agent spec as a producer AND at least one as a consumer.
Check: grep for event name in agent spec dispatches/subscribes YAML blocks.

**3c. Failure modes — linked from the agent spec they describe:**
Every `design/failure-modes/{name}.md` must be referenced in the corresponding
`agents/{name}.md` spec (either in ## Failure Modes section or in upstream/downstream).
Check: grep for failure modes document path in agent spec body.

**3d. CONTEXT.md — referenced in phase STATE.md:**
CONTEXT.md path must appear in `.planning/STATE.md` under the active project context.
Check: grep for CONTEXT.md path in STATE.md.

**Level 3 result format:**
```json
{
  "status": "passed | gaps_found",
  "level": 3,
  "findings": [
    {
      "check": "agent_referenced | event_has_producer | event_has_consumer | failure_modes_linked",
      "result": "pass | fail",
      "detail": "'{name}' is not referenced in any workflow or orchestration document",
      "file": "{path}"
    }
  ]
}
```

---

### Level 4: Internally Consistent

**What it checks:** All names resolve against canonical registries. No orphans,
no cycles, no name mismatches.
**When applied:** After Level 3 passes. Requires full graph traversal.
**Implementation:** `arch-tools.js` with `js-yaml` and `toposort` (Phase 4+).

**Checks:**

**4a. Every event name in any document matches events.yaml:**
All event references (in agent specs, workflow files, orchestration docs) must
match an entry in `design/events.yaml`. Unresolved event references are orphan errors.
Check: Extract all event name references across all design/ docs → compare to events.yaml keys.

**4b. Every agent name in any document matches an agent spec file:**
All agent references (in workflow docs, orchestration docs, other agent specs)
must match a file in `agents/{name}.md`. Unresolved agent references are orphan errors.
Check: Extract all agent name references → compare to `ls agents/`.

**4c. No circular agent dependencies:**
If Agent A spawns Agent B, and Agent B spawns Agent C, Agent C must not spawn
Agent A. Circular spawning creates infinite loops.
Check: Build adjacency graph from "spawns" references → run topological sort →
if cycle detected, report the cycle path.

**4d. No orphaned events or agents:**
Events defined in events.yaml but not referenced in any agent spec (no producer,
no consumer) are orphaned. Agent specs in agents/ that appear in no workflow are
orphaned. Both indicate incomplete architecture.
Check: Cross-reference events.yaml against all agent specs; cross-reference
agents/ against all workflow files.

**4e. Agent name matches filename:**
Frontmatter `name:` field must exactly match the file name without `.md` extension.
`agents/arch-executor.md` must have `name: arch-executor` in frontmatter.
Check: `node bin/arch-tools.js frontmatter get agents/{file}.md --field name` →
compare to filename.

**Level 4 result format:**
```json
{
  "status": "passed | gaps_found",
  "level": 4,
  "findings": [
    {
      "check": "event_resolves | agent_resolves | no_cycles | no_orphans | name_matches_file",
      "result": "pass | fail",
      "detail": "Event 'TaskAssigned' referenced in arch-executor.md but not in events.yaml",
      "file": "{referencing_file}",
      "unresolved": "{unresolved_name}"
    }
  ]
}
```

---

## Architecture Domain vs Code Domain Differences

| Aspect | Code Domain (GSD) | Architecture Domain (Architecture GSD) |
|--------|-------------------|----------------------------------------|
| Level 1 | Source file exists | Design document exists |
| Level 2 | Tests pass, no lint errors | Min lines met, required sections present, no stub phrases |
| Level 3 | Imports resolve, dependencies used | Documents cross-referenced in graph |
| Level 4 | No unused exports, type consistency | Names resolve in canonical registry, no cycles |
| Verification tool | Test runner (jest, pytest, etc.) | arch-tools.js + arch-verifier |
| Behavioral verification | Test execution confirms behavior | Not applicable — design domain |
| Completeness check | Code coverage | Required sections present + no stub phrases |

**Key principle:** Architecture verification is structural, not behavioral. We check
that the design is complete and self-consistent, not that it will work at runtime.
Runtime validation is a future concern after implementation.

---

## Verification Output — Master Format

The arch-verifier returns a single JSON object summarizing all checks across all levels.

```json
{
  "status": "passed | gaps_found | human_needed | failed",
  "phase": "{phase-name}",
  "timestamp": "ISO-8601 timestamp",
  "levels_run": [1, 2, 3, 4],
  "summary": {
    "level_1": { "passed": 12, "failed": 0 },
    "level_2": { "passed": 10, "failed": 2 },
    "level_3": { "passed": 8, "failed": 2 },
    "level_4": { "passed": 7, "failed": 1 }
  },
  "findings": [
    {
      "level": 2,
      "check": "required_sections",
      "result": "fail",
      "file": "agents/arch-executor.md",
      "detail": "Missing section: <structured_returns>"
    }
  ],
  "recommended_action": "Fix 3 Level 2 gaps in agents/ before running Level 3"
}
```

**Status rules:**
- `passed`: All levels run, all checks passed (zero findings with result=fail)
- `gaps_found`: One or more findings with result=fail, all automatically diagnosable
- `human_needed`: Findings that require human judgment to resolve (ambiguous references, design intent questions)
- `failed`: Verification could not complete (missing prerequisites, file system errors, unrecoverable state)

---

## Incremental Verification Runs

Verification does not have to run all 4 levels every time.

| Scenario | Levels to run | Rationale |
|----------|---------------|-----------|
| During arch-executor task (writing a single agent spec) | Level 1 + 2 only | Cross-references won't be wired until all agents are written |
| After arch-executor completes a full phase | Level 1 + 2 + 3 | All agents exist; cross-references should be wired |
| Before phase sign-off (arch-verifier final check) | All 4 levels | Full consistency check before declaring phase complete |
| After a targeted edit (single file change) | Level 2 on changed file + Level 4 for names | Faster than full run |
