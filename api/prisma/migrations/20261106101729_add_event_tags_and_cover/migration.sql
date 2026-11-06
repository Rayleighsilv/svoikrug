-- CreateEnum
CREATE TYPE "TagCategory" AS ENUM ('atmosphere', 'format', 'interest');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "cover_image_url" TEXT;

-- CreateTable
CREATE TABLE "tags" (
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "TagCategory" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "event_tags" (
    "event_id" TEXT NOT NULL,
    "tag_slug" TEXT NOT NULL,

    CONSTRAINT "event_tags_pkey" PRIMARY KEY ("event_id","tag_slug")
);

-- CreateIndex
CREATE INDEX "tags_category_sort_order_idx" ON "tags"("category", "sort_order");

-- CreateIndex
CREATE INDEX "event_tags_tag_slug_idx" ON "event_tags"("tag_slug");

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tags" ADD CONSTRAINT "event_tags_tag_slug_fkey" FOREIGN KEY ("tag_slug") REFERENCES "tags"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: справочник вайб-тегов. Категории в UI не показываются — это
-- внутренняя типизация для фильтрации и аналитики.
INSERT INTO "tags" ("slug", "label", "category", "sort_order") VALUES
    ('introvert-friendly', 'интроверт-френдли', 'atmosphere', 10),
    ('deep-talks', 'глубокие разговоры', 'atmosphere', 20),
    ('loud-and-fun', 'шумно и весело', 'atmosphere', 30),
    ('phone-free', 'без телефонов', 'atmosphere', 40),
    ('cozy', 'лампово / уют', 'atmosphere', 50),
    ('creative-mess', 'творческий бардак', 'atmosphere', 60),
    ('networking', 'нетворкинг', 'format', 70),
    ('dating', 'дейтинг / знакомства', 'format', 80),
    ('byob', 'со своим алкоголем', 'format', 90),
    ('vegan-friendly', 'веган-френдли', 'format', 100),
    ('kids-welcome', 'можно с детьми', 'format', 110),
    ('fashionably-late', 'можно опаздывать', 'format', 120),
    ('geeky', 'гиковская тусовка', 'interest', 130),
    ('esoteric', 'эзотерика / Таро', 'interest', 140),
    ('crypto-investing', 'криптовалюта / инвестиции', 'interest', 150),
    ('psych-games', 'психологические игры', 'interest', 160),
    ('standup-improv', 'стендап / импровизация', 'interest', 170)
ON CONFLICT ("slug") DO NOTHING;
