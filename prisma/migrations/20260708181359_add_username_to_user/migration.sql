/*
  Warnings:

  - Added the required column `username` to the `User` table.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL DEFAULT '',
    "email" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "createdAt", "email", "id", "name", "password", "status", "updatedAt") SELECT "avatar", "createdAt", "email", "id", "name", "password", "status", "updatedAt" FROM "User";
-- Derive usernames from email prefixes (lowercase, no special chars)
UPDATE "new_User" SET "username" = lower(replace(substr("email", 1, instr("email", '@') - 1), '.', '')) WHERE "username" = '';
-- For admin user, set a known username
UPDATE "new_User" SET "username" = 'admin' WHERE "email" = 'admin@example.com';
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_username_idx" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
