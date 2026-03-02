---
name: arch-researcher-failures
agent: arch-researcher
document_type: failure-catalog
version: "1.0"
---

# arch-researcher — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: WebFetch Returns Insufficient HIGH-Confidence Sources

**Trigger:** All research queries from Step 3 return either HTTP errors, paywall-blocked content, or responses with fewer than 3 HIGH-confidence sources (official documentation, RFC, or direct library source). The domain may be novel, niche, or the query terms may be too specific for available public documentation.

**Manifestation:** RESEARCH.md is written with overall confidence: LOW. The "Standard Stack" table contains fewer than 4 rows with generic entries. "Architecture Patterns" section lists only abstract principles without domain-specific citations. arch-roadmapper uses a conservative generic phase template.

**Severity:** medium

**Recovery:**
- Immediate: 1. Fall back to Context7 library lookups for every technology in CONTEXT.md constraints and locked-decisions (resolve-library-id then query-docs). 2. Write RESEARCH.md with confidence: LOW in the metadata header. 3. Add an explicit Open Question entry: "Research gap: insufficient HIGH-confidence domain sources found — Standard Stack recommendations are based on general principles and require domain-expert review before roadmapping." 4. Return status: "gaps_found" so arch-roadmapper uses conservative templates.
- Escalation: Orchestrator surfaces the gaps_found status to the human. Human provides additional context about domain-specific constraints or technology choices to add to CONTEXT.md locked-decisions before arch-researcher re-runs.

**Detection:** HIGH-confidence source count < 3 after all Step 4 queries complete.

---

### FM-002: Context Window Exhaustion Before All Sections Written

**Trigger:** Raw research content from multiple WebFetch responses and Context7 documentation pages exceeds the sonnet model's context budget before all 8 required RESEARCH.md sections are written. Detectable when the "Standard Stack" table has fewer than 4 rows for a non-trivial domain (scale.agents > 5, constraints list has 3+ items).

**Manifestation:** Later sections (Code Examples, State of the Art, Sources) are truncated or contain skeleton text. The RESEARCH.md fails detect-stubs if the truncated sections contain placeholder phrases.

**Severity:** high

**Recovery:**
- Immediate: 1. Prioritize sections in this order: Summary, Standard Stack, Architecture Patterns, Open Questions (must complete). 2. Write stubs only for Code Examples and State of the Art if context runs out: "Research truncated — context limit reached. Confidence: LOW for this section." 3. Run detect-stubs after writing. 4. Return status: "gaps_found" with gaps listing the truncated sections.
- Escalation: Orchestrator may re-run arch-researcher with a narrowed CONTEXT.md domain scope (more specific constraints added to locked-decisions to reduce query breadth).

**Detection:** After writing Standard Stack, if that section has fewer than 4 rows, treat as early context pressure warning and skip detailed Code Examples to preserve budget for Open Questions.

---

### FM-003: CONTEXT.md Domain Field Unusable

**Trigger:** .arch/CONTEXT.md exists but the domain field contains circular self-reference for the Architecture GSD self-design run (domain: "Architecture GSD — Multi-Agent Architecture Design System" is unusual — the system designing itself may cause research queries to return the system's own documentation rather than external architecture patterns).

**Manifestation:** WebFetch queries for "Architecture GSD architecture patterns" return no relevant external results (the system is unique). Research relies entirely on first-party knowledge rather than cited external sources.

**Severity:** medium

**Recovery:**
- Immediate: 1. Decompose the domain into constituent patterns: "multi-agent system design", "LLM orchestration patterns", "disk-as-shared-memory architecture", "adversarial review pipeline". 2. Research each constituent pattern separately. 3. Synthesize findings into domain-specific recommendations. 4. Note in RESEARCH.md Summary: "Self-design run — external research on constituent patterns applied to Architecture GSD context."
- Escalation: If constituent pattern research also fails to produce HIGH-confidence sources, write a RESEARCH.md from first-party system knowledge and return gaps_found.

**Detection:** CONTEXT.md domain field contains "Architecture GSD" (self-reference indicator).

## Integration Point Failures

### INT-001: RESEARCH.md Not Found by arch-roadmapper

**Trigger:** arch-researcher writes RESEARCH.md but the path it returns in the structured JSON result does not match where arch-roadmapper looks for it (.arch/RESEARCH.md). Path mismatch causes arch-roadmapper to proceed with no research guidance.

**Recovery:**
- Immediate: arch-roadmapper uses a fallback path check: try .arch/RESEARCH.md, then RESEARCH.md, then research/RESEARCH.md. If none found, arch-roadmapper returns gaps_found.

### INT-002: Research Confidence Too Low for Roadmapping

**Trigger:** RESEARCH.md is written with confidence: LOW. arch-roadmapper detects this and must decide whether to proceed with conservative templates or escalate.

**Recovery:**
- Immediate: arch-roadmapper proceeds with a standard 5-phase template and returns gaps_found with advisory: "Research confidence is LOW — standard template applied; recommend human review of ROADMAP.md."

## Residual Risks

### RISK-001: Research Quality Cap from First-Party Knowledge

For Architecture GSD self-design, all research is effectively first-party (the system researching itself). External validation is unavailable. The RESEARCH.md confidence ceiling is MEDIUM regardless of source count, because the "sources" are the system's own documentation rather than independent external validation.
