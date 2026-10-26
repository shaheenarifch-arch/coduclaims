CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT','ANALYZING','NEEDS_REVIEW','READY','HOLD','SUBMITTED','ACCEPTED','PARTIALLY_PAID','PAID','DENIED','VOID');
CREATE TYPE "ClaimRiskLevel" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "FindingSeverity" AS ENUM ('INFO','LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "AuthorizationStatus" AS ENUM ('NOT_CHECKED','NOT_REQUIRED','REQUIRED_MISSING','PRESENT_UNVERIFIED','VERIFIED','EXPIRED','INVALID');
CREATE TYPE "RevenueOpportunityStatus" AS ENUM ('OPEN','REVIEWED','ACCEPTED','DISMISSED','RESOLVED');
CREATE TYPE "PayerRuleType" AS ENUM ('AUTHORIZATION','COVERAGE','MODIFIER','FREQUENCY','DOCUMENTATION','DUPLICATE','MEDICAL_NECESSITY','OTHER');

CREATE TABLE "Payer" (
  "id" TEXT NOT NULL,
  "practiceId" TEXT,
  "name" TEXT NOT NULL,
  "payerType" TEXT NOT NULL,
  "externalPayerId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PayerRule" (
  "id" TEXT NOT NULL,
  "payerId" TEXT NOT NULL,
  "ruleType" "PayerRuleType" NOT NULL,
  "codeSystem" TEXT,
  "codePattern" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "configuration" JSONB NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "expirationDate" TIMESTAMP(3),
  "version" TEXT NOT NULL,
  "sourceReference" TEXT,
  "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayerRule_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Claim" (
  "id" TEXT NOT NULL,
  "practiceId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "payerId" TEXT,
  "claimReference" TEXT NOT NULL,
  "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
  "billedAmount" DECIMAL(12,2) NOT NULL,
  "expectedAmount" DECIMAL(12,2),
  "diagnosisCodes" JSONB NOT NULL,
  "procedureCodes" JSONB NOT NULL,
  "modifiers" JSONB NOT NULL DEFAULT '[]',
  "placeOfService" TEXT,
  "serviceDate" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "latestRiskPredictionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClaimRiskPrediction" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "riskScore" INTEGER NOT NULL,
  "riskLevel" "ClaimRiskLevel" NOT NULL,
  "denialProbability" DOUBLE PRECISION NOT NULL,
  "modelType" TEXT NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "featureSnapshot" JSONB NOT NULL,
  "explanation" JSONB NOT NULL,
  "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClaimRiskPrediction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClaimFinding" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "findingType" TEXT NOT NULL,
  "severity" "FindingSeverity" NOT NULL,
  "ruleId" TEXT NOT NULL,
  "ruleVersion" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ClaimFinding_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuthorizationCheck" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "authorizationRequired" BOOLEAN NOT NULL,
  "authorizationPresent" BOOLEAN NOT NULL,
  "authorizationNumberEncrypted" TEXT,
  "status" "AuthorizationStatus" NOT NULL DEFAULT 'NOT_CHECKED',
  "payerRuleId" TEXT,
  "evidence" JSONB NOT NULL,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthorizationCheck_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RevenueOpportunity" (
  "id" TEXT NOT NULL,
  "practiceId" TEXT NOT NULL,
  "claimId" TEXT,
  "encounterId" TEXT,
  "opportunityType" TEXT NOT NULL,
  "estimatedRevenue" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "message" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "status" "RevenueOpportunityStatus" NOT NULL DEFAULT 'OPEN',
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "RevenueOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payer_practiceId_name_key" ON "Payer"("practiceId","name");
CREATE INDEX "Payer_active_payerType_idx" ON "Payer"("active","payerType");
CREATE INDEX "PayerRule_payerId_ruleType_active_effectiveDate_idx" ON "PayerRule"("payerId","ruleType","active","effectiveDate");
CREATE UNIQUE INDEX "Claim_practiceId_claimReference_key" ON "Claim"("practiceId","claimReference");
CREATE INDEX "Claim_practiceId_status_serviceDate_idx" ON "Claim"("practiceId","status","serviceDate");
CREATE INDEX "Claim_payerId_status_idx" ON "Claim"("payerId","status");
CREATE INDEX "ClaimRiskPrediction_claimId_predictedAt_idx" ON "ClaimRiskPrediction"("claimId","predictedAt");
CREATE INDEX "ClaimRiskPrediction_riskLevel_predictedAt_idx" ON "ClaimRiskPrediction"("riskLevel","predictedAt");
CREATE INDEX "ClaimFinding_claimId_severity_status_idx" ON "ClaimFinding"("claimId","severity","status");
CREATE INDEX "AuthorizationCheck_claimId_status_checkedAt_idx" ON "AuthorizationCheck"("claimId","status","checkedAt");
CREATE INDEX "RevenueOpportunity_practiceId_status_detectedAt_idx" ON "RevenueOpportunity"("practiceId","status","detectedAt");

ALTER TABLE "Payer" ADD CONSTRAINT "Payer_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayerRule" ADD CONSTRAINT "PayerRule_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClaimRiskPrediction" ADD CONSTRAINT "ClaimRiskPrediction_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClaimFinding" ADD CONSTRAINT "ClaimFinding_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorizationCheck" ADD CONSTRAINT "AuthorizationCheck_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueOpportunity" ADD CONSTRAINT "RevenueOpportunity_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueOpportunity" ADD CONSTRAINT "RevenueOpportunity_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueOpportunity" ADD CONSTRAINT "RevenueOpportunity_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderQualityMetric" ADD CONSTRAINT "ProviderQualityMetric_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
