/*
  Warnings:

  - You are about to drop the column `targetSecurityUserId` on the `BroadcastMessage` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BroadcastMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "senderOfficerId" TEXT NOT NULL,
    "senderDisplayName" TEXT NOT NULL,
    "sourceReplyId" TEXT,
    "targetDisplayBoardId" TEXT,
    "displayDurationSeconds" INTEGER NOT NULL DEFAULT 10,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BroadcastMessage_senderOfficerId_fkey" FOREIGN KEY ("senderOfficerId") REFERENCES "CounterOfficer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BroadcastMessage_sourceReplyId_fkey" FOREIGN KEY ("sourceReplyId") REFERENCES "NotificationReply" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BroadcastMessage_targetDisplayBoardId_fkey" FOREIGN KEY ("targetDisplayBoardId") REFERENCES "DisplayBoard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BroadcastMessage" ("createdAt", "displayDurationSeconds", "expiresAt", "id", "isActive", "message", "senderDisplayName", "senderOfficerId", "sourceReplyId", "targetDisplayBoardId") SELECT "createdAt", "displayDurationSeconds", "expiresAt", "id", "isActive", "message", "senderDisplayName", "senderOfficerId", "sourceReplyId", "targetDisplayBoardId" FROM "BroadcastMessage";
DROP TABLE "BroadcastMessage";
ALTER TABLE "new_BroadcastMessage" RENAME TO "BroadcastMessage";
CREATE INDEX "BroadcastMessage_isActive_expiresAt_idx" ON "BroadcastMessage"("isActive", "expiresAt");
CREATE TABLE "new_DisplayBoard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "maxDisplayedTickets" INTEGER NOT NULL DEFAULT 5,
    "announcementEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bellEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ttsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ttsLanguage" TEXT NOT NULL DEFAULT 'en-US',
    "ttsRate" REAL NOT NULL DEFAULT 1.0,
    "ttsPitch" REAL NOT NULL DEFAULT 1.0,
    "ttsVolume" REAL NOT NULL DEFAULT 1.0,
    "announcementTemplate" TEXT NOT NULL DEFAULT 'Now serving ticket {number} at {counter}',
    "themeColor" TEXT,
    "logoUrl" TEXT,
    "customMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DisplayBoard" ("announcementEnabled", "announcementTemplate", "bellEnabled", "createdAt", "customMessage", "id", "isDefault", "logoUrl", "maxDisplayedTickets", "name", "themeColor", "ttsEnabled", "ttsLanguage", "ttsPitch", "ttsRate", "ttsVolume", "updatedAt") SELECT "announcementEnabled", "announcementTemplate", "bellEnabled", "createdAt", "customMessage", "id", "isDefault", "logoUrl", "maxDisplayedTickets", "name", "themeColor", "ttsEnabled", "ttsLanguage", "ttsPitch", "ttsRate", "ttsVolume", "updatedAt" FROM "DisplayBoard";
DROP TABLE "DisplayBoard";
ALTER TABLE "new_DisplayBoard" RENAME TO "DisplayBoard";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
