# Requirements: AAA v1.1 GSD Tool Parity

**Defined:** 2026-03-03
**Core Value:** Agent tool assignments follow principled permission boundaries

## v1.1 Requirements

Requirements for GSD tool parity. Each maps to roadmap phases.

### Internet Access

- [ ] **INET-01**: arch-researcher can search the web via WebSearch for architecture patterns and case studies
- [ ] **INET-02**: arch-researcher can query Context7 for framework and library documentation
- [ ] **INET-03**: arch-planner can fetch documentation via WebFetch when decomposing phases into tasks
- [ ] **INET-04**: arch-planner can query Context7 for library-specific documentation during planning

### Permission Boundaries

- [ ] **PERM-01**: discuss-system uses Write without Edit (creates CONTEXT.md, does not modify existing files)
- [ ] **PERM-02**: arch-roadmapper uses Write without Edit (creates ROADMAP.md, does not modify existing files)
- [ ] **PERM-03**: arch-planner uses Write without Edit (creates PLAN.md, does not modify existing files)
- [ ] **PERM-04**: arch-verifier has Write without Edit (produces VERIFICATION.md directly)
- [ ] **PERM-05**: arch-researcher has Write without Edit (produces RESEARCH.md directly)

### Workflow

- [ ] **WKFL-01**: `/AAA:new-system` spawns arch-researcher after intake to produce RESEARCH.md
- [ ] **WKFL-02**: `/AAA:new-system` spawns arch-roadmapper after research to produce ROADMAP.md
- [ ] **WKFL-03**: `/AAA:plan-phase N` assumes RESEARCH.md and ROADMAP.md exist (removes fallback spawning logic)

### New Agents

- [ ] **AGNT-01**: arch-debugger agent spec with tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch
- [ ] **AGNT-02**: system-analyzer agent spec with tools: Read, Write, Bash, Grep, Glob

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-CLI Support

- **MCLI-01**: Support OpenCode runtime installation
- **MCLI-02**: Support Gemini CLI runtime installation

### Lifecycle Commands

- **LIFE-01**: `/AAA:complete-system` archives completed architecture projects
- **LIFE-02**: `/AAA:quick` mode for small architecture design tasks

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-CLI support (OpenCode, Gemini, Codex) | AAA is Claude Code only; domain specialization over runtime breadth |
| Quick mode | Architecture design is deliberate; ad-hoc mode contradicts the workflow |
| Milestone lifecycle (complete, audit) | Premature; AAA projects are shorter than GSD software projects |
| Phase insertion/removal | Premature; AAA typically has 5 fixed phases |
| Model profile changes | Current opus/sonnet/haiku assignments are correct for v1.1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INET-01 | Phase 2 | Pending |
| INET-02 | Phase 2 | Pending |
| INET-03 | Phase 2 | Pending |
| INET-04 | Phase 2 | Pending |
| PERM-01 | Phase 1 | Pending |
| PERM-02 | Phase 1 | Pending |
| PERM-03 | Phase 1 | Pending |
| PERM-04 | Phase 1 | Pending |
| PERM-05 | Phase 1 | Pending |
| WKFL-01 | Phase 3 | Pending |
| WKFL-02 | Phase 3 | Pending |
| WKFL-03 | Phase 3 | Pending |
| AGNT-01 | Phase 4 | Pending |
| AGNT-02 | Phase 4 | Pending |

**Coverage:**
- v1.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-02 after roadmap creation*
