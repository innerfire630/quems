-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KioskConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "welcomeMessage" TEXT,
    "footerMessage" TEXT,
    "printerName" TEXT,
    "autoResetSeconds" INTEGER NOT NULL DEFAULT 30,
    "showEstimatedWait" BOOLEAN NOT NULL DEFAULT true,
    "restrictedServiceIds" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_KioskConfig" ("autoResetSeconds", "createdAt", "footerMessage", "id", "isActive", "name", "printerName", "restrictedServiceIds", "showEstimatedWait", "updatedAt", "welcomeMessage") SELECT "autoResetSeconds", "createdAt", "footerMessage", "id", "isActive", "name", "printerName", "restrictedServiceIds", "showEstimatedWait", "updatedAt", "welcomeMessage" FROM "KioskConfig";
DROP TABLE "KioskConfig";
ALTER TABLE "new_KioskConfig" RENAME TO "KioskConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
