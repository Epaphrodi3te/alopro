-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" DATETIME,
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "report_required" BOOLEAN NOT NULL DEFAULT false,
    "completion_report" TEXT,
    "completed_at" DATETIME,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "deadline_change_status" TEXT NOT NULL DEFAULT 'none',
    "deadline_change_requested_date" DATETIME,
    "deadline_change_reason" TEXT,
    "deadline_change_reviewed_at" DATETIME,
    "deadline_change_reviewed_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "projects_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("assigned_to", "created_at", "created_by", "deadline", "description", "id", "status", "title") SELECT "assigned_to", "created_at", "created_by", "deadline", "description", "id", "status", "title" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE INDEX "projects_created_by_idx" ON "projects"("created_by");
CREATE INDEX "projects_assigned_to_idx" ON "projects"("assigned_to");
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "project_id" TEXT,
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'todo',
    "deadline" DATETIME,
    "received_at" DATETIME,
    "deadline_validated_at" DATETIME,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "report_required" BOOLEAN NOT NULL DEFAULT false,
    "completion_report" TEXT,
    "completed_at" DATETIME,
    "deadline_change_status" TEXT NOT NULL DEFAULT 'none',
    "deadline_change_requested_date" DATETIME,
    "deadline_change_reason" TEXT,
    "deadline_change_reviewed_at" DATETIME,
    "deadline_change_reviewed_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("assigned_to", "created_at", "created_by", "deadline", "deadline_validated_at", "description", "id", "priority", "progress_percent", "project_id", "received_at", "status", "title") SELECT "assigned_to", "created_at", "created_by", "deadline", "deadline_validated_at", "description", "id", "priority", "progress_percent", "project_id", "received_at", "status", "title" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");
CREATE INDEX "tasks_created_by_idx" ON "tasks"("created_by");
CREATE INDEX "tasks_assigned_to_idx" ON "tasks"("assigned_to");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
