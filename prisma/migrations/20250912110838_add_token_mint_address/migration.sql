-- CreateEnum
CREATE TYPE "public"."Period" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "public"."traders" (
    "id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "pnl" TEXT NOT NULL,
    "winRate" DOUBLE PRECISION,
    "avatarUrl" TEXT,
    "xUrl" TEXT,
    "tokenMintAddress" TEXT,
    "period" "public"."Period" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scraping_metadata" (
    "id" TEXT NOT NULL,
    "period" "public"."Period" NOT NULL,
    "totalTraders" INTEGER NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "scraping_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "traders_period_rank_idx" ON "public"."traders"("period", "rank");

-- CreateIndex
CREATE INDEX "traders_tokenMintAddress_idx" ON "public"."traders"("tokenMintAddress");

-- CreateIndex
CREATE UNIQUE INDEX "traders_address_period_key" ON "public"."traders"("address", "period");

-- CreateIndex
CREATE UNIQUE INDEX "scraping_metadata_period_isActive_key" ON "public"."scraping_metadata"("period", "isActive");
