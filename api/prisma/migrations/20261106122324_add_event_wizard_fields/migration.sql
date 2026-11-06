-- CreateEnum
CREATE TYPE "SportLevel" AS ENUM ('beginner', 'amateur', 'pro');

-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('free', 'split');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "application_question" TEXT,
ADD COLUMN     "budget_amount" INTEGER,
ADD COLUMN     "budget_note" TEXT,
ADD COLUMN     "budget_type" "BudgetType" NOT NULL DEFAULT 'free',
ADD COLUMN     "duration_minutes" INTEGER,
ADD COLUMN     "house_rules" TEXT,
ADD COLUMN     "house_rules_chips" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "plus_one_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sport_level" "SportLevel",
ADD COLUMN     "venue_type" TEXT,
ADD COLUMN     "waitlist_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weather_dependent" BOOLEAN NOT NULL DEFAULT false;
