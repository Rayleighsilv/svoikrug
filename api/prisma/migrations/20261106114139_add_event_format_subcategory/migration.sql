-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('offline', 'sport', 'online');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "format" "EventFormat" NOT NULL DEFAULT 'offline',
ADD COLUMN     "subcategory" TEXT;

-- CreateIndex
CREATE INDEX "events_format_starts_at_idx" ON "events"("format", "starts_at");

-- CreateIndex
CREATE INDEX "events_subcategory_idx" ON "events"("subcategory");
