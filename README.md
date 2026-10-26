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
