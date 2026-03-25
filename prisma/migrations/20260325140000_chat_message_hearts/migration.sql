-- CreateTable
CREATE TABLE "ChatMessageHeart" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageHeart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatMessageHeart_messageId_viewerKey_key" ON "ChatMessageHeart"("messageId", "viewerKey");

CREATE INDEX "ChatMessageHeart_messageId_idx" ON "ChatMessageHeart"("messageId");

ALTER TABLE "ChatMessageHeart" ADD CONSTRAINT "ChatMessageHeart_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
