---
name: schema-designer-failures
agent: schema-designer
document_type: failure-catalog
version: "1.0"
---

# schema-designer — Failure Mode Catalog

## Failure Mode Catalog

### FM-001: Banned Event Payload Type Cannot Be Replaced

**Trigger:** A payload field requires a generic container type because the domain does not constrain it further — example: an event payload field that carries "arbitrary agent-specific data" per the system spec. schema-designer cannot determine a concrete type and is tempted to use `any` or `object` (without field definitions).

**Manifestation:** events.yaml contains a payload field with type: any or type: object (without fields). arch-verifier Level 4 flags this as a type violation. arch-executor cannot validate cross-references against a field with an undetermined type.

**Severity:** high

**Recovery:**
- Immediate: 1. Default to type: string with a constraints field documenting the expected structure: "JSON-encoded {specific-schema} — see {document} for field definitions." 2. If the field carries structured data with known sub-fields, use type: object with an explicit fields definition. 3. Return { "status": "gaps_found", "gaps": ["Field {name} in event {event_name} replaced with string — actual type requires domain clarification; constraints field documents expected structure."] }.
- Escalation: Human reviews the gaps_found and either confirms the string-with-constraints approach or provides the concrete field definitions to replace it.

**Detection:** Step 4 type safety check finds any, object (without fields), data, mixed, unknown, or arbitrary in a payload field.

---

### FM-002: Events Have No Identifiable Producers or Consumers

**Trigger:** The PLAN.md task action specifies a list of events to define but the CONTEXT.md actors list does not make clear which actor produces or consumes each event. Example: a "TaskAssigned" event could be produced by 3 different agents depending on the system topology, which is not yet defined at Wave 1 when schema-designer runs.

**Manifestation:** events.yaml entries have empty producers or consumers arrays. arch-verifier Level 3 flags events without producers (event_has_producer: false) and arch-integrator detects orphaned events.

**Severity:** medium

**Recovery:**
- Immediate: 1. For each event, infer producers and consumers from the event naming pattern: "Complete" suffix events (ResearchComplete) are produced by the agent that performs the research (arch-researcher). "Received" suffix events (SystemIntakeReceived) are consumed by the first agent in the pipeline. 2. If inference is uncertain, use a provisional producer/consumer and note it: "producers: [inferred: arch-researcher] — verify against Phase 2 agent contracts." 3. Return status: "complete" (not gaps_found) if provisional inference is documented.
- Escalation: arch-executor Wave 3 agent contracts will cross-reference events.yaml and correct any producer/consumer mismatches found during Level 3 cross-reference validation.

**Detection:** Step 3 producer/consumer derivation produces empty arrays for at least one event after trying name-pattern inference.

---

### FM-003: events.yaml Path Discovery Failure in Level 4

**Trigger:** schema-designer writes design/events/events.yaml (with subdirectory) but arch-tools.js Level 4 checks look for design/events.yaml (without subdirectory). This causes Level 4 event resolution checks to be skipped for the entire design package.

**Manifestation:** Level 4 event checks are silently skipped. Agent contracts that reference events by name cannot be validated against the schema programmatically. The gap is documented in VERIFICATION.md as "Level 4 partial."

**Severity:** medium

**Recovery:**
- Immediate: schema-designer cannot resolve this issue — it produces design/events/events.yaml as specified by the PLAN.md task files field. The recovery must happen in arch-verifier (FAILURE-02 in arch-verifier-failures.md) or by updating arch-tools.js.
- Escalation: Document in INTEGRATION-REPORT.md: "Level 4 event checks require arch-tools.js to check design/events/events.yaml — current tool checks design/events.yaml only. This is a tooling limitation, not an architecture gap."

**Detection:** verify-phase Level 4 output shows event_checks_skipped: true.

## Integration Point Failures

### INT-001: events.yaml Not Available When arch-executor Starts Wave 3

**Trigger:** schema-designer runs in Wave 1 but is delayed or fails. arch-executor is scheduled in Wave 3 and depends on events.yaml for cross-references. If Wave 1 is not complete before Wave 3 starts, events.yaml may not exist.

**Recovery:**
- Immediate: execute-phase wave barrier synchronization prevents Wave 3 from starting until Wave 1 completes. If schema-designer returned failed, the orchestrator must either re-run it or proceed to Wave 3 with arch-executor configured to produce agent contracts without event cross-references (gaps_found status).

### INT-002: Frontmatter name Field Parsed as Event Name by Level 3

**Trigger:** events.yaml has a YAML frontmatter with name: events. Level 3 tool parses this name field as an event name and checks whether "events" is referenced in any agent contract as a producer or consumer. No agent contract references an event named "events."

**Recovery:**
- Immediate: This is a false positive. arch-verifier documents it in VERIFICATION.md findings with result: "info": "events.yaml frontmatter name field 'events' parsed as event name — confirmed false positive; all actual PascalCase events verified separately."

## Residual Risks

### RISK-001: Wave 1 Schema Design Without Full Agent Knowledge

schema-designer runs in Wave 1 before any agent contracts are written. The events it defines reflect the intake-level understanding of inter-agent communication, not the detailed execution flow of each agent. Some events may be missing (because they are discovered during Phase 2 agent contract writing) or some events may be over-specified (because the agent implementation turns out to not need them). This mismatch is expected and is resolved by arch-executor adding cross-references in Wave 3 and arch-verifier flagging missing events as Level 3 gaps.
