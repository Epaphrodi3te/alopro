export const TOKEN_COOKIE_NAME = "alopro_token";
export const JWT_SECRET_FALLBACK = "change-this-super-secret-jwt-key";

export const ROLE_OPTIONS = ["admin", "manager", "agent"] as const;
export const PROJECT_STATUS_OPTIONS = ["pending", "in_progress", "completed"] as const;
export const TASK_PRIORITY_OPTIONS = ["low", "medium", "high"] as const;
export const TASK_STATUS_OPTIONS = ["todo", "in_progress", "done"] as const;
