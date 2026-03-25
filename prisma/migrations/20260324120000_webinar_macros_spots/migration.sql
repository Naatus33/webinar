-- AlterTable
ALTER TABLE "Webinar" ADD COLUMN "macros" JSONB;

-- AlterTable
ALTER TABLE "Webinar" ADD COLUMN "spotsCount" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "Webinar" ADD COLUMN "spotsTotal" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "Webinar" ADD COLUMN "showSpots" BOOLEAN NOT NULL DEFAULT false;
