"use client";

import Swal from "sweetalert2";

export async function showSuccess(title: string, text?: string) {
  await Swal.fire({
    icon: "success",
    title,
    text,
    timer: 1200,
    showConfirmButton: false,
  });
}

export async function showError(title: string, text?: string) {
  await Swal.fire({
    icon: "error",
    title,
    text,
  });
}

export async function extractApiError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? "Une erreur est survenue.";
  } catch {
    return "Une erreur est survenue.";
  }
}
