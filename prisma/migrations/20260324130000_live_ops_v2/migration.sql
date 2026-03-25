-- AlterTable ChatMessage: add type, replyToContent, replyToAuthor
ALTER TABLE "ChatMessage" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "ChatMessage" ADD COLUMN "replyToContent" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "replyToAuthor" TEXT;

-- AlterTable Webinar: add liveViewerCount
ALTER TABLE "Webinar" ADD COLUMN "liveViewerCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Lead: add lastSeenAt
ALTER TABLE "Lead" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
