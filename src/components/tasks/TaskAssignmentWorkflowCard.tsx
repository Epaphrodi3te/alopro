"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCheckCircle, FiClock, FiTrendingUp } from "react-icons/fi";

import Badge from "@/components/ui/Badge";
import { extractApiError, showError, showSuccess } from "@/components/ui/notify";

type TaskAssignmentWorkflowCardProps = {
  taskId: string;
  assignedToId: string | null;
  isAssignee: boolean;
  initialReceived: boolean;
  initialDeadlineValidated: boolean;
  initialProgressPercent: number;
  deadlineLabel: string;
};

function receiptBadge(received: boolean) {
  if (received) {
    return <Badge label="recue" variant="done" />;
  }

  return <Badge label="en attente" variant="pending" />;
}

function validationBadge(validated: boolean) {
  if (validated) {
    return <Badge label="date validee" variant="progress" />;
  }

  return <Badge label="date non validee" variant="pending" />;
}

export default function TaskAssignmentWorkflowCard({
  taskId,
  assignedToId,
  isAssignee,
  initialReceived,
  initialDeadlineValidated,
  initialProgressPercent,
  deadlineLabel,
}: TaskAssignmentWorkflowCardProps) {
  const router = useRouter();
  const [received, setReceived] = useState(initialReceived);
  const [deadlineValidated, setDeadlineValidated] = useState(initialDeadlineValidated);
  const [progressPercent, setProgressPercent] = useState(initialProgressPercent);
  const [loading, setLoading] = useState(false);

  const normalizedProgress = useMemo(
    () => Math.max(0, Math.min(100, Number.isNaN(progressPercent) ? 0 : progressPercent)),
    [progressPercent],
  );

  const handleReceivedChange = (next: boolean) => {
    setReceived(next);

    if (!next) {
      setDeadlineValidated(false);
      setProgressPercent(0);
    }
  };

  const handleDeadlineValidatedChange = (next: boolean) => {
    setDeadlineValidated(next);

    if (!next) {
      setProgressPercent(0);
    }
  };

  const submitWorkflow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignedToId) {
      await showError("Impossible", "Cette tache n'est pas assignee.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          received,
          deadlineValidated: received ? deadlineValidated : false,
          progressPercent: received && deadlineValidated ? normalizedProgress : 0,
        }),
      });

      if (!response.ok) {
        await showError("Mise a jour impossible", await extractApiError(response));
        return;
      }

      await showSuccess("Suivi de tache mis a jour");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de mettre a jour le suivi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="app-card p-5">
      <h2 className="text-lg font-semibold text-slate-900">Confirmation et progression</h2>
      <p className="mt-1 text-sm text-slate-500">Date limite proposee: {deadlineLabel}</p>

      {assignedToId ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {receiptBadge(received)}
            {validationBadge(deadlineValidated)}
            <Badge label={`${normalizedProgress}% progression`} variant="medium" />
          </div>

          {isAssignee ? (
            <form className="mt-4 space-y-4" onSubmit={submitWorkflow}>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={received}
                  onChange={(event) => handleReceivedChange(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FiCheckCircle className="text-emerald-600" />
                  J&apos;ai recu la tache
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
                <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FiClock className="text-indigo-600" />
                  La date de fin me convient
                </span>
              </label>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500">
                  <FiTrendingUp />
                  Niveau de progression
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
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
                    className="app-input w-24"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="app-btn-primary">
                {loading ? "Mise a jour..." : "Valider le suivi"}
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Seul l&apos;utilisateur assigne peut confirmer la reception, valider la date et envoyer la progression.
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Cette tache n&apos;est pas encore assignee.</p>
      )}
    </section>
  );
}
