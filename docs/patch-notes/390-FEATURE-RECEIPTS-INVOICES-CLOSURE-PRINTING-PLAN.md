# 390 - Feature roadmap (receipts, invoices, closure bulletin printing) - Plan

## Context

Recent legal-remediation work closed most structural blockers in the fiscal journal and closure pipeline. The current gap is feature-completion quality for receipt/invoice generation, preview parity, and printing UX reliability.

The current product state is uneven:

- POS post-sale receipt preview is available but invoice labels are not backed by a dedicated invoice subsystem.
- History reprint flow is partially wired (state present, dialog missing).
- Closure bulletin print flow is partially wired (state present, no complete print UI path).
- Printer configuration exists, but operator-facing flows are still inconsistent.

This plan defines the delivery sequence and the execution workflow to complete these features safely on `development`.

## Objectives

1. Restore reliable preview and print flows for receipts and closure bulletins.
2. Ensure preview content and printed payload stay aligned for fiscal fields.
3. Prepare a compliant invoice workstream (true invoices, not relabeled receipts).
4. Keep each delivery small, reviewable, and documented with evidence.

## Delivery strategy

Work is split into independent but ordered steps. Each step follows the same workflow:

1. Create a detailed step plan document.
2. Implement code changes.
3. Create an implementation document describing what actually landed.
4. Run verification commands and manual checks.
5. Commit and push to `development`.

## Phase plan

### Step 1 - Receipt/invoice preview and print flow repair (start here)

#### Scope

- Fix POS and History preview/open flows so receipt preview is consistently reachable.
- Remove functional ambiguity between receipt and invoice actions in UI until true invoice backend exists.
- Ensure print action wiring is deterministic (loading, error, success states).

#### In scope (code areas)

- Frontend POS print dialog and action handlers.
- Frontend History print-entry path and dialog mounting.
- Shared receipt preview adapter/types if needed.
- Minimal backend adjustments only if endpoint contract mismatches are found.

#### Out of scope

- True B2B invoice numbering and lifecycle.
- PDF invoice generation and emailing.
- Print queue persistence redesign.

#### Acceptance criteria

- POS: opening preview works for supported receipt modes every time after sale.
- History: clicking print opens a working preview/print dialog instead of dead-end state.
- UI labels do not imply legal invoice support that does not exist yet.
- No TypeScript/lint regressions in touched files.

#### Verification baseline

- Targeted frontend tests for dialog state + action wiring (or add coverage where missing).
- Manual run-through: POS payment -> preview -> print request.
- Manual run-through: History order -> preview -> print request.

### Step 2 - Closure bulletin preview and print UX completion

#### Scope

- Complete frontend closure print flow (dialog + API trigger + result handling).
- Add closure bulletin preview endpoint if backend preview parity is missing.
- Ensure closure print actions are consistent with receipt print ergonomics.

#### Acceptance criteria

- Closure list "Print" action opens working preview/print flow.
- Closure print requests produce queue-able print jobs via existing printing backend.
- Error handling communicates recoverable actions to operator.

### Step 3 - Receipt preview vs thermal payload parity hardening

#### Scope

- Reconcile legal/fiscal fields between frontend preview renderer and thermal payload generator.
- Define canonical "document field contract" used by both preview and print layers.
- Add focused tests on mandatory legal fields.

#### Acceptance criteria

- Required legal markers and key fiscal fields are present in thermal output and preview.
- No known divergence for totals, VAT sections, and legal reference fields.

### Step 4 - Real invoice subsystem (B2B facture track)

#### Scope

- Introduce dedicated invoice model and generation flow.
- Separate invoice numbering/identity from receipt/ticket display logic.
- Add explicit UI boundaries: ticket vs facture.

#### Acceptance criteria

- Invoice creation is a dedicated path with clear identifiers.
- Invoice preview/export format is deterministic and test-covered.
- UI no longer maps "invoice" labels to receipt-only backend routes.

## Legal/compliance guardrails during feature work

While implementing product fixes, keep these constraints explicit:

- Do not claim NF525/LNE certification in UI or docs.
- Avoid presenting receipt variants as legal B2B invoices.
- Keep receipt legal linkage tied to journal-backed fiscal identifiers.
- Preserve auditability: no bypass around legal journal source fields.

## Execution checklist template (applies to every step)

Use this checklist before marking a step done:

1. Step plan document created.
2. Scope boundaries confirmed (in/out).
3. Implementation completed.
4. Verification executed (automated + manual).
5. Implementation document written with:
   - changed files,
   - behavior before/after,
   - verification evidence,
   - known residual risks.
6. Commit created with clear "why".
7. Branch pushed to `development`.

## Risks and mitigations

1. **Risk:** UI says "invoice" while backend serves receipt semantics.  
   **Mitigation:** relabel/disable unsupported invoice actions until Step 4.

2. **Risk:** Preview/print mismatch on legal fields.  
   **Mitigation:** Step 3 introduces contract tests and explicit field parity checks.

3. **Risk:** Regressions in POS post-sale flow.  
   **Mitigation:** keep Step 1 narrow, add targeted tests, and manual happy-path checks.

4. **Risk:** Closure print feature ships without operator clarity on failures.  
   **Mitigation:** standardized loading/error/success states and retry guidance.

## Immediate next action

Begin Step 1 with its own detailed plan document, then implement and document according to the workflow above.
