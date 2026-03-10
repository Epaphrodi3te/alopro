-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "received_at" DATETIME;
ALTER TABLE "tasks" ADD COLUMN "deadline_validated_at" DATETIME;
ALTER TABLE "tasks" ADD COLUMN "progress_percent" INTEGER NOT NULL DEFAULT 0;
