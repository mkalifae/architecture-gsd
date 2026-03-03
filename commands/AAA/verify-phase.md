---
description: Verify a completed design phase by orchestrating arch-verifier, arch-integrator, MANIFEST.md generation, and DIGEST.md finalization
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
argument-hint: "[phase-number]"
---

<purpose>
Verify a completed design phase of Architecture GSD. Given a phase number, orchestrate the
full verification pipeline: check prerequisites, run arch-verifier (4-level structural
verification), run arch-integrator (cross-phase consistency), generate MANIFEST.md (document
index with reading order), and write DIGEST.md as the FINAL step. Updates .arch/STATE.md with
verification completion status. This workflow is the standalone sign-off gate for each phase —
the human runs `/AAA:verify-phase N` and the pipeline validates design completeness
autonomously.

verify-phase is NOT auto-invoked from execute-phase. Verification is a phase sign-off gate
invoked manually after execute-phase completes. This matches the GSD pattern where execution
and verification are separate steps.

Context discipline: The orchestrator must stay lean. Do NOT read full design documents in the
orchestrator context. Pass file paths to subagents — they read the files in their own fresh
200K context windows. The orchestrator's context budget is ~15% maximum. Pass paths, not
content.
</purpose>

<process>

## Step 1: Parse Phase Argument and Validate

Extract the phase number from $ARGUMENTS. If $ARGUMENTS is empty, display:

  "Usage: /AAA:verify-phase [phase-number]
  Example: /AAA:verify-phase 3"

And stop.

Read .arch/STATE.md to understand current project position and accumulated decisions:

  Bash: head -30 .arch/STATE.md

Validate that the requested phase number is valid:

- If .arch/STATE.md does not exist: display "STATE.md not found. Run /AAA:new-system
  first to initialize the project." and stop.

- Derive the expected phase directory slug by matching the phase number to phases listed
  in .arch/ROADMAP.md. Read ROADMAP.md to find the phase entry:

  Bash: head -50 .arch/ROADMAP.md

  If the requested phase number is not found in ROADMAP.md:
    Display: "Phase {N} not found in ROADMAP.md. Check ROADMAP.md for valid phase numbers."
    Stop.

  Derive the phase slug from the phase name (lowercase, spaces to hyphens).
  Example: "Core Design Pipeline" → "core-design-pipeline"

## Step 2: Prerequisite Check — Phase N Design Execution Complete

Verify that Phase N design execution is complete before running verification. This prevents
verification running on an empty design directory and producing misleading all-Level-1-failure
results (Pitfall 5: verification on empty directory).

Check 1 — design/ directory exists and has content:

  Bash: ls .arch/phases/{phase-slug}/design/ 2>/dev/null | head -20

If design/ directory does not exist or is empty:
  Display:
  "Phase {N} design documents not found. Run /AAA:execute-phase {N} first.
  Expected design directory: .arch/phases/{phase-slug}/design/"
  Stop.

Check 2 — .arch/STATE.md indicates Phase N execution is complete:

  Bash: head -15 .arch/STATE.md

If STATE.md shows Phase N as not started or in-progress with no design documents:
  Display:
  "Phase {N} execution appears incomplete. Run /AAA:execute-phase {N} first to produce
  design documents before running verification."
  Stop.

If both checks pass, display:
  "Phase {N} prerequisites verified. Starting verification pipeline..."

## Step 3: Spawn arch-verifier — Levels 1-4 + Anti-Pattern Scan

Display: "Spawning arch-verifier for Phase {N}..."

Spawn arch-verifier via Task() with fresh context (do NOT read design documents in
orchestrator context first):

  Task(
    model: "sonnet",
    prompt: |
      Read agents/arch-verifier.md for your complete execution instructions.

      Verification target — Phase {N}: {phase_name}
      Phase directory: .arch/phases/{phase-slug}/
      Design directory: .arch/phases/{phase-slug}/design/
      Verification spec: references/verification-patterns.md
      State file: .arch/STATE.md
      Context file: .arch/CONTEXT.md (optional — read if exists)

      Run all 4 levels of verification plus anti-pattern scan against the design directory.
      Levels: 1 (exists), 2 (substantive), 3 (cross-referenced), 4 (internally consistent).
      Also run: node bin/arch-tools.js scan-antipatterns --dir .arch/phases/{phase-slug}/design/

      Write output to: .arch/phases/{phase-slug}/design/VERIFICATION.md
      Include frontmatter with: phase, status, levels_run, timestamp

      Return structured JSON with status field (passed | gaps_found | human_needed | failed).
  )

Wait for arch-verifier to complete. Parse the JSON return.

## Step 4: Check arch-verifier Result — Branch on Status

Parse the status field from arch-verifier's return JSON.

**If status is "failed":**
  Display:
  "Verification failed — arch-verifier could not run.
  Error: {error field from return}
  Recommended action: {recommended_action from return}

  Most likely cause: No design documents found in .arch/phases/{phase-slug}/design/
  Fix: Run /AAA:execute-phase {N} to produce design documents first."
  STOP — do not proceed to arch-integrator.

**If status is "human_needed":**
  Display:
  "Verification complete — human judgment required before proceeding.

  Findings requiring human decision:
  {For each finding with human_needed_reason:
    - File: {file}
      Check: {check}
      Issue: {detail}
      Reason human needed: {human_needed_reason}
  }

  VERIFICATION.md written to: .arch/phases/{phase-slug}/design/VERIFICATION.md

  To proceed:
    1. Review the findings above in VERIFICATION.md
    2. Make the necessary architectural decisions
    3. Update the affected design documents via /AAA:execute-phase {N} --correction
    4. Re-run /AAA:verify-phase {N}"
  STOP — do not proceed to arch-integrator.

**If status is "passed" or "gaps_found":**
  Record: arch_verifier_status = {status}
  Record: verification_md_path = ".arch/phases/{phase-slug}/design/VERIFICATION.md"
  Display: "arch-verifier complete: {status}. Proceeding to arch-integrator..."
  Continue to Step 5.

## Step 5: Spawn arch-integrator — Cross-Phase Consistency Checks

Display: "Spawning arch-integrator for Phase {N}..."

Spawn arch-integrator via Task() with fresh context:

  Task(
    model: "haiku",
    prompt: |
      Read agents/arch-integrator.md for your complete execution instructions.

      Integration target — Phase {N}: {phase_name}
      Design directory: .arch/phases/{phase-slug}/design/
      Digests directory: .arch/phases/{phase-slug}/design/digests/
      Verification report: .arch/phases/{phase-slug}/design/VERIFICATION.md
      State file: .arch/STATE.md

      Step 1: Read VERIFICATION.md status via:
        node bin/arch-tools.js frontmatter get .arch/phases/{phase-slug}/design/VERIFICATION.md --field status
      Only proceed if status is "passed" (hard gate).

      Step 2: Read ALL digest files from .arch/phases/{phase-slug}/design/digests/ for
      cross-phase orientation (digest-first context discipline — under 200 lines total).

      Step 3-6: Run cross-phase consistency checks per your execution_flow.

      Write output to: .arch/phases/{phase-slug}/design/INTEGRATION-REPORT.md
      Include frontmatter with: phase, status, phase_coverage, timestamp

      Return structured JSON with status field (passed | gaps_found | human_needed | failed).
  )

Wait for arch-integrator to complete. Parse the JSON return.

## Step 6: Check arch-integrator Result — Branch on Status

Parse the status field from arch-integrator's return JSON.

**If status is "failed":**
  Display:
  "Integration check failed — arch-integrator could not run.
  Error: {error field from return}
  Recommended action: {recommended_action from return}"
  STOP — do not proceed to MANIFEST.md generation.

**If status is "human_needed":**
  Display:
  "Integration check complete — human judgment required.

  Findings requiring human decision:
  {For each gap with circular dependency or conflicting cross-phase decision:
    - Check: {check}
      Entity: {entity}
      Issue: {detail}
      Remediation: {remediation}
  }

  INTEGRATION-REPORT.md written to: .arch/phases/{phase-slug}/design/INTEGRATION-REPORT.md

  To proceed:
    1. Review the findings above in INTEGRATION-REPORT.md
    2. Resolve the circular dependency or cross-phase conflict as directed
    3. Re-run /AAA:verify-phase {N}"
  STOP — do not proceed to MANIFEST.md generation.

**If status is "passed" or "gaps_found":**
  Record: arch_integrator_status = {status}
  Record: integration_report_path = ".arch/phases/{phase-slug}/design/INTEGRATION-REPORT.md"
  Display: "arch-integrator complete: {status}. Generating MANIFEST.md..."
  Continue to Step 7.

## Step 7: Generate MANIFEST.md — Document Index with Reading Order

The verify-phase workflow generates MANIFEST.md directly (not via a subagent) because the
orchestrator has the complete view of all documents that were verified and integrated. Read
the template to understand the structure:

  Bash: cat templates/manifest.md

Scan the design/ directory for all output documents:

  Bash: find .arch/phases/{phase-slug}/design/ -type f \( -name "*.md" -o -name "*.yaml" \) | sort

Read VERIFICATION.md frontmatter to get overall status for the header:

  Bash: node bin/arch-tools.js frontmatter get .arch/phases/{phase-slug}/design/VERIFICATION.md

Read INTEGRATION-REPORT.md frontmatter for phase coverage:

  Bash: node bin/arch-tools.js frontmatter get .arch/phases/{phase-slug}/design/INTEGRATION-REPORT.md

Build the Document Index table from the scan results. For each document found:
- Type: classify based on directory (agents → "Agent Spec", events → "Event Schema",
  failure-modes → "Failure Mode Catalog", topology → "Topology", context-flows → "Context Flow",
  VERIFICATION.md → "Verification Report", INTEGRATION-REPORT.md → "Integration Report",
  MANIFEST.md → "Document Index", DIGEST.md → "Phase Digest")
- Verification Level: the highest level passed (from VERIFICATION.md findings — Level 1 pass
  = exists, Level 2 pass = substantive, Level 3 pass = cross-referenced, Level 4 pass = consistent)
- Status: passed | gaps_found | skipped (from VERIFICATION.md findings for that file)

Determine reading order (fixed — do not reorder):
1. .arch/CONTEXT.md — System intent, constraints, locked decisions
2. design/events/events.yaml — Canonical event and command registry
3. design/topology/TOPOLOGY.md — Agent dependency graph and communication channels
4. design/agents/*.md — Agent contracts (one per agent, alphabetical order)
5. design/context-flows/CONTEXT-FLOWS.md — Data flow maps between agents
6. design/failure-modes/*.md — Failure mode catalogs per component (alphabetical)
7. design/VERIFICATION.md — Verification results for this phase
8. design/INTEGRATION-REPORT.md — Cross-phase consistency report

Write design/MANIFEST.md using the template structure:

  ---
  phase: {phase-identifier}
  generated: {ISO timestamp}
  total_documents: {count}
  verification_status: {passed | gaps_found — from VERIFICATION.md frontmatter}
  ---

  # Architecture Package Manifest

  **Package:** {domain field from CONTEXT.md}
  **Generated:** {ISO timestamp}
  **Total documents:** {count}
  **Verification status:** {passed | gaps_found}

  ## Reading Order

  Read in this order for complete understanding:

  1. `.arch/CONTEXT.md` — System intent, constraints, locked decisions
  2. `design/events/events.yaml` — Canonical event and command registry
  3. `design/topology/TOPOLOGY.md` — Agent dependency graph and communication channels
  4. `design/agents/*.md` — Agent contracts (one per agent, alphabetical)
  5. `design/context-flows/CONTEXT-FLOWS.md` — Data flow maps between agents
  6. `design/failure-modes/*.md` — Failure mode catalogs per component
  7. `design/VERIFICATION.md` — Verification results for this phase
  8. `design/INTEGRATION-REPORT.md` — Cross-phase consistency report

  ## Document Index

  | Document | Type | Verification Level | Status |
  |----------|------|--------------------|--------|
  {one row per document found in design/ directory}

Display: "MANIFEST.md generated with {total_documents} documents indexed."

## Step 8: Write DIGEST.md — Phase-Boundary Digest (FINAL Step)

Write DIGEST.md as the FINAL step after all other verification output is complete. DIGEST.md
is a reader tool for the NEXT session — it orients quickly at the start of the next phase.
Writing it mid-analysis would produce an incomplete digest (Pitfall 3: digest written before
all documents scanned misses late-phase decisions and newly verified documents).

Call write-digest as the very last action:

  Bash: node bin/arch-tools.js write-digest --phase {N} --design-dir .arch/phases/{phase-slug}/design/

write-digest generates .arch/phases/{phase-slug}/design/digests/phase-{NN}-DIGEST.md with a
hard 50-line limit (STAT-04). The digest includes:
- Decisions made this phase (from .arch/STATE.md decisions section)
- Agents defined (from design/agents/*.md frontmatter name fields)
- Events registered (from design/events/events.yaml keys)
- Cross-phase references identified during integration

Record: digest_path = output from write-digest command.

Display: "DIGEST.md written to: {digest_path} (50-line limit enforced)"

## Step 9: Report Results and Update STATE.md

Compose the completion report:

```
Phase {N}: {phase_name} — Verification Complete

Verification pipeline results:
  arch-verifier:   {arch_verifier_status}    ({findings_count} findings)
  arch-integrator: {arch_integrator_status}  ({gaps_count} gaps)

Artifacts produced:
  VERIFICATION.md:      .arch/phases/{phase-slug}/design/VERIFICATION.md
  INTEGRATION-REPORT.md: .arch/phases/{phase-slug}/design/INTEGRATION-REPORT.md
  MANIFEST.md:          .arch/phases/{phase-slug}/design/MANIFEST.md
  DIGEST.md:            {digest_path}

{If arch_verifier_status is "gaps_found":}
Verification gaps detected ({findings_count}):
  {list gap summaries from VERIFICATION.md}
  Recommended: Run /AAA:execute-phase {N} in correction mode to close gaps,
  then re-run /AAA:verify-phase {N}

{If arch_integrator_status is "gaps_found":}
Integration gaps detected ({gaps_count}):
  {list gap summaries from INTEGRATION-REPORT.md}
  Recommended: Resolve cross-phase reference issues, then re-run /AAA:verify-phase {N}

{If both are "passed":}
Phase {N} verification complete. All checks passed.
Next: /AAA:plan-phase {N+1} (after /clear for fresh context)
```

Update .arch/STATE.md with verification completion:

Read current .arch/STATE.md using the Read tool. Update these sections:

**Current Position:**
  Phase: {N} ({phase_name})
  Status: "Phase {N} verified" (if both passed) or "Phase {N} verification: gaps_found"
  Last activity: {YYYY-MM-DD} — "Phase {N} verified: arch-verifier {status}, arch-integrator {status}"

**Session Continuity:**
  Last session: {YYYY-MM-DD}
  Stopped at: Phase {N} verification complete
  Resume with: /AAA:plan-phase {N+1} (after /clear for fresh context)

Write the updated .arch/STATE.md using the Write tool.

Commit all verification artifacts:

  Bash: git add .arch/phases/{phase-slug}/design/VERIFICATION.md
        .arch/phases/{phase-slug}/design/INTEGRATION-REPORT.md
        .arch/phases/{phase-slug}/design/MANIFEST.md
        {digest_path}
        .arch/STATE.md &&
        git commit -m "docs: Phase {N} verification complete — arch-verifier {status}, arch-integrator {status}"

Display the completion report assembled above.

</process>

---

## Pipeline Summary

```
/AAA:verify-phase N
        |
        v
Step 1: Parse argument — validate phase number exists in ROADMAP.md
        |
        v
Step 2: Prerequisites — design/ directory exists, execute-phase was run
        |
        v
Step 3: arch-verifier (Task, sonnet) — Levels 1-4 + anti-patterns → VERIFICATION.md
        |
        v
Step 4: Check arch-verifier status
        ├─ failed → display error, STOP
        ├─ human_needed → display findings, STOP
        └─ passed | gaps_found → continue
        |
        v
Step 5: arch-integrator (Task, haiku) — cross-phase consistency → INTEGRATION-REPORT.md
        |
        v
Step 6: Check arch-integrator status
        ├─ failed → display error, STOP
        ├─ human_needed → display findings, STOP
        └─ passed | gaps_found → continue
        |
        v
Step 7: Generate MANIFEST.md — document index with reading order (orchestrator direct)
        |
        v
Step 8: write-digest — FINAL step: phase-boundary DIGEST.md (50-line limit)
        |
        v
Step 9: Report results + update .arch/STATE.md + commit artifacts
```

## Context Discipline

This orchestrator keeps its context at ~15%:
- Passes paths to arch-verifier and arch-integrator, not content
- Subagents (arch-verifier, arch-integrator) get fresh 200K windows via Task()
- Orchestrator reads only: argument, ROADMAP.md head (prerequisite check), STATE.md head
- MANIFEST.md generation reads only directory listings and frontmatter fields (not full bodies)
- DIGEST.md is written by bin/arch-tools.js (not read by orchestrator)

## Standalone Invocation

verify-phase is invoked MANUALLY by the human after execute-phase completes. It is NOT
automatically triggered by execute-phase. This separation ensures:
1. The human has a chance to inspect design documents before committing to verification
2. Verification gaps are reported at a natural phase boundary, not buried in execution output
3. The human can choose to skip verification for a phase if working iteratively

## Error Recovery

If arch-verifier returns "gaps_found": verify-phase does NOT stop. It continues to
arch-integrator, generates MANIFEST.md, and writes DIGEST.md. The gaps are reported at
Step 9 with recommended actions. Both "passed" and "gaps_found" allow the full pipeline
to complete — only "failed" and "human_needed" stop the pipeline.

If arch-integrator returns "gaps_found": same behavior — pipeline continues to MANIFEST.md
and DIGEST.md. Gaps are reported at Step 9.

The rationale: partial verification results are more useful than no artifacts. A MANIFEST.md
showing which documents have gaps is more actionable than stopping before MANIFEST.md is
produced.
