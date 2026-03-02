<!-- GENERATION INSTRUCTIONS (for verify-phase workflow):
  - Replace [bracketed] fields with actual values from CONTEXT.md and VERIFICATION.md
  - Populate Document Index from the design/ directory scan and VERIFICATION.md findings
  - Reading Order is fixed — do not reorder
  - Total documents = count of all files in Document Index
  - Status is the overall VERIFICATION.md frontmatter status field
  - Document type classification:
      agents/*.md          → "Agent Spec"
      events/*.yaml        → "Event Schema"
      events/events.yaml   → "Event Registry"
      failure-modes/*.md   → "Failure Mode Catalog"
      topology/*.md        → "Topology"
      context-flows/*.md   → "Context Flow"
      VERIFICATION.md      → "Verification Report"
      INTEGRATION-REPORT.md → "Integration Report"
      MANIFEST.md          → "Document Index"
      digests/*.md         → "Phase Digest"
  - Verification Level: highest level passed (1=exists, 2=substantive, 3=cross-referenced, 4=consistent)
  - Status per document: passed | gaps_found | skipped (from VERIFICATION.md findings for that file)
-->
---
phase: [phase-identifier]
generated: [ISO timestamp]
total_documents: [count]
verification_status: [passed | gaps_found]
---

# Architecture Package Manifest

**Package:** [System Name — from CONTEXT.md domain field]
**Generated:** [ISO timestamp]
**Total documents:** [count]
**Verification status:** [passed | gaps_found — from VERIFICATION.md frontmatter status]

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
