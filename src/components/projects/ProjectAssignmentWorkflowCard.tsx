"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiAlertTriangle, FiCalendar, FiCheckCircle, FiClock, FiTarget, FiTrendingUp } from "react-icons/fi";

import { extractApiError, showError, showSuccess } from "@/components/ui/notify";

type DeadlineChangeStatus = "none" | "pending" | "approved" | "rejected";

type ProjectAssignmentWorkflowCardProps = {
  projectId: string;
  assignedToId: string | null;
  isAssignee: boolean;
  canReviewDeadlineChange: boolean;
  reportRequired: boolean;
  initialProgressPercent: number;
  initialCompletionReport: string | null;
  initialCompletedAtLabel: string;
  initialDeadlineChangeStatus: DeadlineChangeStatus;
  initialDeadlineChangeRequestedDateLabel: string;
  initialDeadlineChangeReason: string | null;
  initialReceived: boolean;
  initialDeadlineValidated: boolean;
  deadlineLabel: string;
  progressDerivedFromTasks: boolean;
  linkedTasksCount: number;
};

export default function ProjectAssignmentWorkflowCard({
  projectId,
  assignedToId,
  isAssignee,
  canReviewDeadlineChange,
  reportRequired,
  initialProgressPercent,
  initialCompletionReport,
  initialCompletedAtLabel,
  initialDeadlineChangeStatus,
  initialDeadlineChangeRequestedDateLabel,
  initialDeadlineChangeReason,
  initialReceived,
  initialDeadlineValidated,
  deadlineLabel,
  progressDerivedFromTasks,
  linkedTasksCount,
}: ProjectAssignmentWorkflowCardProps) {
  const router = useRouter();
  const [received, setReceived] = useState(initialReceived);
  const [deadlineValidated, setDeadlineValidated] = useState(initialDeadlineValidated);
  const [progressPercent, setProgressPercent] = useState(initialProgressPercent);
  const [completionReport, setCompletionReport] = useState(initialCompletionReport ?? "");
  const [completedAtLabel, setCompletedAtLabel] = useState(initialCompletedAtLabel);
  const [deadlineChangeStatus, setDeadlineChangeStatus] = useState<DeadlineChangeStatus>(initialDeadlineChangeStatus);
  const [deadlineChangeRequestedDateLabel, setDeadlineChangeRequestedDateLabel] = useState(initialDeadlineChangeRequestedDateLabel);
  const [deadlineChangeReason, setDeadlineChangeReason] = useState(initialDeadlineChangeReason ?? "");
  const [requestDate, setRequestDate] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedProgress = useMemo(
    () => Math.max(0, Math.min(100, Number.isNaN(progressPercent) ? 0 : progressPercent)),
    [progressPercent],
  );

  const handleReceivedChange = (next: boolean) => {
    setReceived(next);

    if (!next) {
      setDeadlineValidated(false);
      if (!progressDerivedFromTasks) {
        setProgressPercent(0);
      }
    }
  };

  const handleDeadlineValidatedChange = (next: boolean) => {
    setDeadlineValidated(next);

    if (!next && !progressDerivedFromTasks) {
      setProgressPercent(0);
    }
  };

  const submitWorkflow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignedToId) {
      await showError("Impossible", "Ce projet n&apos;est pas assigne.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          progressDerivedFromTasks
            ? {
                received,
                deadlineValidated: received ? deadlineValidated : false,
              }
            : {
                received,
                deadlineValidated: received ? deadlineValidated : false,
                progressPercent: received && deadlineValidated ? normalizedProgress : 0,
              },
        ),
      });

      if (!response.ok) {
        await showError("Mise a jour impossible", await extractApiError(response));
        return;
      }

      await showSuccess("Suivi de projet mis a jour");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de mettre a jour le suivi du projet.");
    } finally {
      setLoading(false);
    }
  };

  const submitCompletionReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignedToId) {
      await showError("Impossible", "Ce projet n&apos;est pas assigne.");
      return;
    }

    if (normalizedProgress < 100) {
      await showError("Progression insuffisante", "La progression doit atteindre 100% avant de finaliser.");
      return;
    }

    if (reportRequired && !completionReport.trim()) {
      await showError("Compte rendu requis", "Veuillez saisir le compte rendu avant de marquer termine.");
      return;
    }

    setLoading(true);

    try {
      const payload = progressDerivedFromTasks
        ? {
            markCompleted: true,
            completionReport: completionReport.trim(),
          }
        : {
            progressPercent: 100,
            markCompleted: true,
            completionReport: completionReport.trim(),
          };

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        await showError("Finalisation impossible", await extractApiError(response));
        return;
      }

      setProgressPercent(100);
      setCompletedAtLabel(new Date().toLocaleDateString());
      await showSuccess("Projet marque comme termine");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de finaliser le projet.");
    } finally {
      setLoading(false);
    }
  };

  const submitDeadlineRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignedToId) {
      await showError("Impossible", "Ce projet n&apos;est pas assigne.");
      return;
    }

    if (!requestDate || !requestReason.trim()) {
      await showError("Informations manquantes", "Nouvelle date et raison sont obligatoires.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestDeadlineDate: requestDate,
          requestDeadlineReason: requestReason.trim(),
        }),
      });

      if (!response.ok) {
        await showError("Demande impossible", await extractApiError(response));
        return;
      }

      setDeadlineChangeStatus("pending");
      setDeadlineChangeReason(requestReason.trim());
      setDeadlineChangeRequestedDateLabel(new Date(requestDate).toLocaleDateString());
      setRequestDate("");
      setRequestReason("");
      await showSuccess("Demande de nouvelle date envoyee");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible d'envoyer la demande de date.");
    } finally {
      setLoading(false);
    }
  };

  const reviewDeadlineRequest = async (decision: "approved" | "rejected") => {
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewDeadlineChange: decision,
        }),
      });

      if (!response.ok) {
        await showError("Reponse impossible", await extractApiError(response));
        return;
      }

      setDeadlineChangeStatus(decision);
      await showSuccess(decision === "approved" ? "Nouvelle date approuvee" : "Nouvelle date refusee");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de repondre a la demande.");
    } finally {
      setLoading(false);
    }
  };

  const showCompletionAlert = reportRequired && normalizedProgress >= 100 && !completedAtLabel;
  const hasCompletionReport = Boolean(completionReport.trim()) || Boolean(completedAtLabel);
  const workflowConfirmed = received && deadlineValidated;

  // Non-assignee: only show completion report if it has content, and deadline review buttons
  if (!isAssignee) {
    const hasDeadlineReview = canReviewDeadlineChange && deadlineChangeStatus === "pending";
    const hasContent = hasCompletionReport || hasDeadlineReview;

    if (!hasContent) return null;

    return (
      <section className="space-y-3">
        {hasDeadlineReview && (
          <div className="app-card p-4">
            <p className="text-sm font-semibold text-slate-900">Demande de report de deadline</p>
            <p className="mt-1 text-sm text-slate-600">
              Nouvelle date: {deadlineChangeRequestedDateLabel} — {deadlineChangeReason || "Aucune raison"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => reviewDeadlineRequest("approved")} disabled={loading} className="app-btn-primary text-sm">
                Approuver
              </button>
              <button type="button" onClick={() => reviewDeadlineRequest("rejected")} disabled={loading} className="app-btn-danger text-sm">
                Refuser
              </button>
            </div>
          </div>
        )}

        {hasCompletionReport && completionReport.trim() && (
          <div className="app-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Compte rendu</p>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{completionReport}</p>
            {completedAtLabel && <p className="mt-2 text-xs text-emerald-600">Termine le {completedAtLabel}</p>}
          </div>
        )}
      </section>
    );
  }

  // Not assigned at all
  if (!assignedToId) return null;

  return (
    <section className="app-card p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <FiTarget size={16} className="text-slate-400" />
        Suivi du projet
      </h2>
      <p className="mt-1 text-xs text-slate-500">Deadline: {deadlineLabel}</p>

      <div className="mt-4 space-y-4">
        <form className="space-y-3" onSubmit={submitWorkflow}>
          {!workflowConfirmed && (
            <>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={received}
                  onChange={(event) => handleReceivedChange(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <FiCheckCircle size={14} className="text-emerald-600" />
                  J&apos;ai recu ce projet
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={deadlineValidated}
                  disabled={!received}
                  onChange={(event) => handleDeadlineValidatedChange(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <FiClock size={14} className="text-indigo-600" />
                  La date de fin me convient
                </span>
              </label>
            </>
          )}

          {progressDerivedFromTasks ? (
            <p className="text-xs text-slate-500">
              Progression calculee depuis {linkedTasksCount} tache{linkedTasksCount > 1 ? "s" : ""}.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <FiTrendingUp size={12} />
                Progression
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={normalizedProgress}
                disabled={!received || !deadlineValidated}
                onChange={(event) => setProgressPercent(Number(event.target.value))}
                className="h-2 w-full max-w-xs accent-indigo-600"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={normalizedProgress}
                disabled={!received || !deadlineValidated}
                onChange={(event) => setProgressPercent(Number(event.target.value))}
                className="app-input w-20 text-sm"
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="app-btn-primary text-sm">
            {loading ? "Mise a jour..." : "Valider"}
          </button>
        </form>

        {!workflowConfirmed && (
          <form className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3" onSubmit={submitDeadlineRequest}>
            <p className="inline-flex items-center gap-2 text-xs text-slate-500">
              <FiCalendar size={12} />
              Demander un report de deadline
            </p>
            <input
              type="date"
              value={requestDate}
              onChange={(event) => setRequestDate(event.target.value)}
              className="app-input"
            />
            <textarea
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              placeholder="Raison..."
              className="app-textarea"
              rows={2}
            />
            <button type="submit" disabled={loading} className="app-btn-outline text-sm">
              Envoyer
            </button>
          </form>
        )}

        {showCompletionAlert && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="inline-flex items-center gap-2 font-medium">
              <FiAlertTriangle size={14} />
              100% atteint — finalisez le projet.
            </p>
          </div>
        )}

        {(showCompletionAlert || hasCompletionReport || reportRequired) && (
          <form className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3" onSubmit={submitCompletionReport}>
            <p className="text-sm font-medium text-slate-700">Compte rendu</p>
            <textarea
              value={completionReport}
              onChange={(event) => setCompletionReport(event.target.value)}
              placeholder="Resultat final du projet..."
              className="app-textarea"
              rows={3}
            />
            <button type="submit" disabled={loading || normalizedProgress < 100} className="app-btn-primary text-sm">
              Marquer termine
            </button>
          </form>
        )}

        {hasCompletionReport && completedAtLabel && (
          <p className="text-xs text-emerald-600">Termine le {completedAtLabel}</p>
        )}
      </div>

      {deadlineChangeStatus !== "none" && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-700">
            Report deadline: {deadlineChangeStatus === "pending" ? "en attente" : deadlineChangeStatus === "approved" ? "approuve" : "refuse"}
          </p>
          {deadlineChangeRequestedDateLabel && <p className="text-xs text-slate-500">Date demandee: {deadlineChangeRequestedDateLabel}</p>}
          {deadlineChangeReason && <p className="mt-1 text-xs text-slate-500">{deadlineChangeReason}</p>}
        </div>
      )}
    </section>
  );
}
