# Phase 5 Revenue Cycle Operations

Adds operational work queues, task assignment, denial cases, human-reviewed appeals and reimbursement events.

## Safety boundary
- No automatic appeal submission.
- No automatic claim modification or payment posting.
- Appeal drafts may contain PHI and must be encrypted before persistence.
- Evidence manifests should contain secure references, not raw clinical text.
- Denial and remittance source data must retain provenance and access controls.

## Migration
```powershell
pnpm db:generate
pnpm db:migrate --name phase5-rcm-operations
pnpm exec tsx prisma/seed-phase5.ts
```
