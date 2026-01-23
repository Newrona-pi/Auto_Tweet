-- CreateEnum
CREATE TYPE "DraftState" AS ENUM ('NEW', 'LEASED', 'RESERVED', 'ACKED', 'SNOOZED', 'NACKED', 'FAILED', 'QUARANTINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DraftMode" AS ENUM ('DIRECT', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "AckKind" AS ENUM ('PUBLISHED', 'SCHEDULED');

-- DropIndex
DROP INDEX "DraftPost_summaryId_idx";

-- AlterTable
ALTER TABLE "DraftPost" ADD COLUMN     "ackKind" "AckKind",
ADD COLUMN     "executeAt" TIMESTAMP(3),
ADD COLUMN     "impactScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastErrorAt" TIMESTAMP(3),
ADD COLUMN     "lastErrorCode" TEXT,
ADD COLUMN     "leaseOwner" TEXT,
ADD COLUMN     "leaseUntil" TIMESTAMP(3),
ADD COLUMN     "mode" "DraftMode",
ADD COLUMN     "notAfter" TIMESTAMP(3),
ADD COLUMN     "publishAt" TIMESTAMP(3),
ADD COLUMN     "reserveUntil" TIMESTAMP(3),
ADD COLUMN     "reservedBy" TEXT,
ADD COLUMN     "resultRef" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "snoozeUntil" TIMESTAMP(3),
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "state" "DraftState" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ApiClient" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "lastFeedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiClient_clientId_key" ON "ApiClient"("clientId");

-- CreateIndex
CREATE INDEX "ApiClient_lastFeedAt_idx" ON "ApiClient"("lastFeedAt");

-- CreateIndex
CREATE INDEX "DraftPost_state_idx" ON "DraftPost"("state");

-- CreateIndex
CREATE INDEX "DraftPost_createdAt_idx" ON "DraftPost"("createdAt");

-- CreateIndex
CREATE INDEX "DraftPost_notAfter_idx" ON "DraftPost"("notAfter");

-- CreateIndex
CREATE INDEX "DraftPost_leaseUntil_idx" ON "DraftPost"("leaseUntil");

-- CreateIndex
CREATE INDEX "DraftPost_reserveUntil_idx" ON "DraftPost"("reserveUntil");

-- CreateIndex
CREATE INDEX "DraftPost_snoozeUntil_idx" ON "DraftPost"("snoozeUntil");
