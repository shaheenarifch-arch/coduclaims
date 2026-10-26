# CodePilot AI Phase 1

AI-assisted ICD-10/CPT recommendation starter for physician-practice workflows with human review, tenant isolation, encrypted notes, RBAC and audit logging.

## Run locally
```powershell
Copy-Item .env.example .env
# Generate a 32-byte base64 key and add it as PHI_MASTER_KEY_BASE64.
docker compose up -d postgres
corepack enable
pnpm install
pnpm db:generate
pnpm db:migrate --name phase1
pnpm db:seed
pnpm typecheck
pnpm test
pnpm dev
```

Web: `http://localhost:3000`  
API: `http://localhost:4000`

## Important
- Use synthetic/de-identified notes only.
- Human coding review is mandatory.
- The mock engine does not assign an E/M CPT level.
- The repository is not production-certified or HIPAA compliant as delivered.
- Obtain AMA CPT licensing and current ICD-10/HCPCS datasets from authorized sources.

## Phase 2
Open `http://localhost:3000/documentation` for the dashboard foundation. Apply a new Prisma migration after upgrading from Phase 1.

## Phase 3 database
Phase 3 adds payers, versioned payer-rule metadata, claims, risk predictions, findings, authorization checks, and revenue opportunities. Seed data is synthetic only. See `docs/PHASE3_DATABASE.md`.

## Phase 4 data layer
The Prisma schema now includes FHIR connection, OAuth credential, SMART launch-state, patient mapping, provider/encounter sync, and sync-job models. Seed data is nonfunctional and synthetic.

## Phase 5
Open `http://localhost:3000/operations` after starting the monorepo. Phase 5 provides human-governed RCM work queues, denial/appeal tracking and reimbursement-event foundations.

## Phase 7
Enterprise ModelOps adds model and dataset lineage, artifacts, deployments, predictions, explainability, drift, feedback and approvals. Open `/model-registry`.
