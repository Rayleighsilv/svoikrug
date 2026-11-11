-- AlterTable
ALTER TABLE "ratings" ADD COLUMN     "tag_slug" TEXT;

-- CreateTable
CREATE TABLE "moderation_signals" (
    "id" TEXT NOT NULL,
    "rating_id" TEXT NOT NULL,
    "rated_id" TEXT NOT NULL,
    "rater_id" TEXT NOT NULL,
    "tag_slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moderation_signals_rating_id_key" ON "moderation_signals"("rating_id");

-- CreateIndex
CREATE INDEX "moderation_signals_status_created_at_idx" ON "moderation_signals"("status", "created_at");

-- CreateIndex
CREATE INDEX "moderation_signals_rated_id_tag_slug_idx" ON "moderation_signals"("rated_id", "tag_slug");

-- CreateIndex
CREATE INDEX "ratings_rated_id_tag_slug_created_at_idx" ON "ratings"("rated_id", "tag_slug", "created_at");

-- AddForeignKey
ALTER TABLE "moderation_signals" ADD CONSTRAINT "moderation_signals_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "ratings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
