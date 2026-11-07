-- CreateEnum
CREATE TYPE "ParticipantGeo" AS ENUM ('any', 'city');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "meeting_link" TEXT,
ADD COLUMN     "participant_geo" "ParticipantGeo" NOT NULL DEFAULT 'any';

-- Backfill: offline/sport всегда локальные, online — «любой город».
UPDATE "events" SET "participant_geo" = 'city' WHERE "format" IN ('offline', 'sport');
