-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CAMPAIGN_COMPLETED', 'CAMPAIGN_FAILED', 'WEBHOOK_FAILED', 'POST_PUBLISHED', 'POST_FAILED', 'SOCIAL_CONNECTED', 'SOCIAL_DISCONNECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationsMuted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
