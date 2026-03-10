import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const PROJECT_FILE_STORAGE_DIR = path.join(process.cwd(), "uploads", "project-files");

function normalizeBaseName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeExtension(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!ext || ext === ".") {
    return ".bin";
  }

  return ext.slice(0, 12);
}

export async function ensureProjectFileStorageDir() {
  await mkdir(PROJECT_FILE_STORAGE_DIR, { recursive: true });
}

export function buildProjectFileNames(projectTitle: string, originalName: string) {
  const base = normalizeBaseName(projectTitle) || "projet";
  const ext = normalizeExtension(originalName);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomSuffix = Math.random().toString(36).slice(2, 8);

  return {
    displayName: `${base}-${stamp}${ext}`,
    storedName: `${base}-${stamp}-${randomSuffix}${ext}`,
  };
}

export async function writeProjectFile(storedName: string, bytes: Uint8Array) {
  await ensureProjectFileStorageDir();
  const absolutePath = path.join(PROJECT_FILE_STORAGE_DIR, storedName);
  await writeFile(absolutePath, bytes);
  return absolutePath;
}

export async function deleteProjectFile(storedName: string) {
  const absolutePath = path.join(PROJECT_FILE_STORAGE_DIR, storedName);

  try {
    await unlink(absolutePath);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

export function getProjectFileAbsolutePath(storedName: string) {
  return path.join(PROJECT_FILE_STORAGE_DIR, storedName);
}
