-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "allowed_formats" "EventFormat"[] DEFAULT ARRAY['offline', 'sport', 'online']::"EventFormat"[],
ADD COLUMN     "group_label" TEXT;

-- CreateIndex
CREATE INDEX "tags_sort_order_idx" ON "tags"("sort_order");
