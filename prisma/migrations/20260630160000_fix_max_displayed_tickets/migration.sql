-- Update existing rows that still have the old default value
UPDATE "DisplayBoard" SET "maxDisplayedTickets" = 5 WHERE "maxDisplayedTickets" = 10;
