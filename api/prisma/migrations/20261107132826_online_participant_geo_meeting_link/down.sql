-- Откат миграции online_participant_geo_meeting_link.
ALTER TABLE "events" DROP COLUMN IF EXISTS "meeting_link";
ALTER TABLE "events" DROP COLUMN IF EXISTS "participant_geo";
DROP TYPE IF EXISTS "ParticipantGeo";
