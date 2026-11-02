-- AlterTable
ALTER TABLE "events" ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "city" TEXT;

-- CreateIndex
CREATE INDEX "events_city_idx" ON "events"("city");
