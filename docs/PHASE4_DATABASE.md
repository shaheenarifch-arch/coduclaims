# Phase 4 FHIR Database Layer

Adds EHR connection configuration, encrypted OAuth-token placeholders, one-time SMART launch state, hashed external patient mappings, provider/encounter synchronization, and sync-job telemetry.

## Security decisions
- Never store plaintext OAuth tokens or PKCE verifiers.
- Do not seed usable credentials.
- External patient identifiers are represented as hashes in the local mapping table.
- FHIR error messages must be redacted before persistence.
- Start with read-only least-privilege scopes.
- The synthetic connection uses `example.invalid` and cannot contact a real EHR.

## Apply
```powershell
pnpm db:generate
pnpm db:migrate --name phase4-fhir
pnpm db:seed
```

Review migration SQL and back up any existing database before applying changes. Production SMART-on-FHIR configuration must follow the selected EHR vendor's current registration and security requirements.
