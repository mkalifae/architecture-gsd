# style-checker — Failure Modes

**Component:** style-checker
**Phase:** Phase 4: Failure Modes
**Last Updated:** 2026-03-02

---

## Failure Mode Catalog

### FM-001: Language Detection Failure (Unsupported File Types)

**Trigger:** All file extensions in files_changed do not match any supported linter (e.g., PR contains only .rs, .java, .swift, or .cpp files not covered by ESLint, Pylint, RuboCop, or golint).
**Manifestation:** style-checker cannot select a linter for the PR's files. StyleCheckComplete is emitted with an empty findings array, status='passed', and tool_name='unsupported-language'. synthesis-agent treats the empty result as a passed style check — the PR is not reviewed for style violations in its primary language.
**Severity:** low
**Recovery:**
- Immediate: Log the unsupported file extensions and pr_number; emit StyleCheckComplete with findings=[], status='passed', tool_name='unsupported-language'; continue pipeline.
- Escalation: Record the unsupported extension in a language_coverage_gap log. If a single extension appears in more than 5% of all PRs processed in a week, add it to the linter roadmap for the next sprint.
**Detection:** StyleCheckComplete events with tool_name='unsupported-language'; unsupported_language_count metric per file extension; weekly coverage gap report.

---

### FM-002: Lint Configuration Error

**Trigger:** Repository's lint config file (.eslintrc.json, pyproject.toml, .rubocop.yml, .golangci.yml) is malformed, references plugins not installed in the style-checker environment, or uses a schema version not supported by the bundled linter binary.
**Manifestation:** Linter binary exits with a non-zero exit code and a configuration error on stderr. No findings are produced for the affected language. StyleCheckComplete is emitted with empty findings and a lint_config_error metadata flag.
**Severity:** medium
**Recovery:**
- Immediate: Catch linter exit code != 0; log full stderr with linter name, repository name, and pr_number; emit StyleCheckComplete with findings=[], status='passed', tool_name identifying the failed linter, and lint_config_error=true in response metadata.
- Escalation: If lint_config_error_count exceeds 3 consecutive PRs for the same repository, send a structured DevOps alert with linter name, error message, and repository; the team must fix the lint configuration before linting resumes for that repo.
**Detection:** linter_exit_code != 0 in Step 4; lint_config_error_count metric per repository; alert threshold of 3 consecutive failures per repo.

---

### FM-003: Temporary File Write Failure

**Trigger:** Filesystem write to /tmp/style-check-{pr_number}-{chunk_index}.{ext} fails due to disk space exhaustion, permission error, or filesystem quota exceeded.
**Manifestation:** The affected diff chunk cannot be linted because the temp file could not be written. style-checker skips the failing chunk, continues linting the remaining chunks, and emits StyleCheckComplete with findings from successfully linted chunks only.
**Severity:** medium
**Recovery:**
- Immediate: Log the write failure with errno, chunk_index, and pr_number; skip the failing chunk; continue with remaining chunks. If more than 50% of chunks fail to write, emit StyleCheckComplete with status='failed' to signal infrastructure-level failure rather than an incomplete partial result.
- Escalation: If temp file write failures persist across 10 or more consecutive PRs, alert the infrastructure team — disk space exhaustion or permission regression likely affects the entire style-checker host.
**Detection:** IOException or ENOSPC error in Step 3; failed_chunk_write_count metric; disk space alert threshold on the style-checker host.

---

## Integration Point Failures

### INT-001: Redis Stream Consumer Group Stale Message (Pending Entry Timeout)

**Failure Point:** Consumer side — style-checker processes a DiffAnalysisComplete message but fails before acknowledging it, leaving it in the pending-entries list.
**Trigger:** style-checker process crashes or is killed mid-processing (e.g., OOM kill, host shutdown), leaving the DiffAnalysisComplete message unacknowledged in the pr-analysis consumer group.
**Cascade:** Redis XAUTOCLAIM transfers the unacknowledged message to another style-checker consumer after the visibility timeout (default: 30 seconds). If no other consumer is available, the message remains in the pending-entries list and the PR's style check is delayed until the consumer comes back up or XAUTOCLAIM fires.
**Recovery:** XAUTOCLAIM automatically reclaims the message after 30 seconds and reassigns it to an available consumer. Operators can manually inspect the pending-entries list with XPENDING and force-claim stale messages with XCLAIM if the auto-claim delay is unacceptable.

---

### INT-002: Linter Binary Not Found (Missing Environment Dependency)

**Failure Point:** Runtime — a required linter binary (eslint, pylint, rubocop, golangci-lint) is not installed in the style-checker execution environment.
**Trigger:** Deployment of a new style-checker image or host that omits one or more linter binaries; or a language detected in files_changed has no installed linter.
**Cascade:** style-checker reaches Step 4 and receives a command-not-found error when trying to run the missing binary. The affected language's files go unlinted for all PRs until the missing binary is installed.
**Recovery:** style-checker treats command-not-found the same as lint_config_error (emit StyleCheckComplete with empty findings and lint_config_error=true in metadata); alert DevOps team to restore the missing binary. Pre-flight startup check should verify all four linter binaries are accessible at startup.

---

## Residual Risks

### RISK-001: Linting Temp Files Against Chunks (Not Full File Context)

**Risk:** Static linters are run against PR diff chunks written to temp files rather than the full file. Linters that require cross-file imports or full module context (e.g., Pylint's type inference, ESLint's import resolution) may produce false positives (errors that would not appear in the full file) or miss errors that depend on module structure outside the changed chunk.
**Mitigation:** False positive rate from chunked linting is accepted in v1 — the alternative (cloning the full repository for each PR) would increase style-checker latency significantly. Findings flagged as false positives by developers are addressed by prompt template feedback loops in logic-reviewer, not by style-checker. This limitation is documented in the agent contract.
**Review Trigger:** If developer false positive complaints from style-checker findings exceed 5% of PRs in a given week, evaluate whether full-file context linting is feasible for the top PR languages, or add a false-positive reporting mechanism that suppresses recurring rule violations.
