# Phase 3 Database Migration and Seed

## Apply from a fresh development database
```powershell
pnpm db:generate
pnpm db:migrate --name phase3-revenue-intelligence
pnpm db:seed
```

## Existing Phase 2 database
Back up the database first, review the generated SQL, and use `prisma migrate deploy` in controlled environments. Do not run development migrations directly against production.

## Seed policy
All seeded practices, providers, payers, rules, encounters, claims, findings and amounts are explicitly synthetic. They are not payer guidance and must never be treated as real coverage, authorization, coding or reimbursement rules.

## Data-governance rule
Actual payer policies must include source provenance, effective dates, expiration dates, version, reviewer approval, and a process for rapid withdrawal when payer guidance changes.
