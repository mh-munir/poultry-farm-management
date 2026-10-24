-- Add the soft-archive flag used by product and stock queries.
ALTER TABLE "Product"
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
