# Security controls
- Synthetic/de-identified data only until a formal risk assessment and contracts are complete.
- AES-256-GCM application-layer encryption for note text; use a managed KMS/HSM in production.
- TLS for all network paths.
- Short-lived access tokens and hashed refresh tokens.
- MFA implementation must be completed before real users.
- Practice isolation is enforced from authenticated token context, never client-supplied practice IDs.
- Audit event metadata must never include note text or direct identifiers.
- Configure a HIPAA-eligible hosting environment and applicable Business Associate Agreements before handling PHI.
- AI providers must be contractually approved for PHI; `ALLOW_PHI_AI_PROCESSING` defaults to false.
