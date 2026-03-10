"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import Swal from "sweetalert2";
import {
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiAtSign,
  FiClock,
  FiEye,
  FiInbox,
  FiMail,
  FiSearch,
  FiSend,
} from "react-icons/fi";

import Badge from "@/components/ui/Badge";
import {
  extractApiError,
  showError,
  showSuccess,
} from "@/components/ui/notify";
import { canSendDirectEmail } from "@/lib/permissions";
import { MessageItem, UserLight } from "@/lib/types";

type MessagesPanelProps = {
  messages: MessageItem[];
  users: UserLight[];
  view?: "all" | "list" | "create";
  redirectAfterCreate?: string;
  currentUserId: string;
  currentUserRole: Role;
};

export default function MessagesPanel({
  messages,
  users,
  view = "all",
  redirectAfterCreate,
  currentUserId,
  currentUserRole,
}: MessagesPanelProps) {
  const router = useRouter();
  const itemsPerPage = 6;
  const canCompose = canSendDirectEmail(currentUserRole);

  const [receiverIds, setReceiverIds] = useState<string[]>([]);
  const [receiverQuery, setReceiverQuery] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const showCreate = view !== "list" && canCompose;
  const showList = view !== "create";

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)),
      ),
    [messages],
  );
  const selectedRecipients = useMemo(
    () => users.filter((user) => receiverIds.includes(user.id)),
    [receiverIds, users],
  );
  const filteredUsers = useMemo(() => {
    const normalizedQuery = receiverQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      return (
        fullName.includes(normalizedQuery) ||
        user.role.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [receiverQuery, users]);
  const totalPages = Math.max(
    1,
    Math.ceil(sortedMessages.length / itemsPerPage),
  );
  const paginatedMessages = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedMessages.slice(start, start + itemsPerPage);
  }, [currentPage, sortedMessages]);
  const isAgent = currentUserRole === "agent";

  const openMessagePreview = async (message: MessageItem) => {
    const safeContent = message.content
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
    const directionLabel =
      message.sender.id === currentUserId
        ? `Envoye a ${message.receiver.firstName} ${message.receiver.lastName}`
        : `Recu de ${message.sender.firstName} ${message.sender.lastName}`;

    await Swal.fire({
      title: "Message",
      html: `
        <div class="swal-pro-form">
          <div class="swal-user-shell">
            <div class="swal-user-head">
              <span class="swal-user-avatar">${message.sender.id === currentUserId ? `${message.receiver.firstName.charAt(0)}${message.receiver.lastName.charAt(0)}` : `${message.sender.firstName.charAt(0)}${message.sender.lastName.charAt(0)}`}</span>
              <div class="swal-user-meta">
                <p class="swal-user-name">${directionLabel}</p>
                <p class="swal-user-role">${new Date(message.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div class="swal-pro-field">
            <label class="swal-pro-label">Message</label>
            <div style="padding:14px;border:1px solid #dbe4f0;border-radius:14px;background:linear-gradient(180deg,#f8fbff,#f3f8ff);font-size:14px;line-height:1.7;color:#0f172a;white-space:pre-wrap;">${safeContent}</div>
          </div>
        </div>
      `,
      confirmButtonText: "Fermer",
      buttonsStyling: false,
      customClass: {
        popup: "swal-pro-modal",
        title: "swal-pro-title",
        htmlContainer: "swal-pro-html",
        confirmButton: "swal-pro-confirm",
      },
    });
  };

  const toggleRecipient = (userId: string) => {
    setReceiverIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverIds, content }),
      });

      if (!response.ok) {
        await showError("Envoi impossible", await extractApiError(response));
        return;
      }

      const data = (await response.json()) as {
        emailNotificationSent?: boolean;
        sentCount?: number;
      };
      setContent("");
      setReceiverQuery("");
      setReceiverIds([]);
      await showSuccess(
        data.sentCount && data.sentCount > 1 ? "Messages envoyes" : "Email envoye",
        data.emailNotificationSent
          ? data.sentCount && data.sentCount > 1
            ? `${data.sentCount} emails ont ete envoyes et journalises dans l'historique.`
            : "L'email a ete envoye et journalise dans l'historique."
          : "L'envoi n'a pas pu etre confirme.",
      );

      if (redirectAfterCreate) {
        router.push(redirectAfterCreate);
      }

      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible d'envoyer le message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {showCreate && (
        <section className="message-compose-shell overflow-hidden p-5 md:p-6">
          <div className="message-compose-grid">
            <div>
              <span className="message-kicker">
                <FiMail className="text-[0.8rem]" />
                Envoi email direct
              </span>
              <h2 className="mt-3 text-[clamp(1.25rem,1rem+0.8vw,1.95rem)] font-extrabold tracking-tight text-slate-950">
                Envoyez des emails professionnels depuis AloPro.
              </h2>
              <p className="mt-3 max-w-[48ch] text-sm leading-6 text-slate-600">
                L&apos;email part directement au destinataire. AloPro conserve
                seulement un journal des envois effectues par les responsables.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="message-stat-card">
                  <span className="message-stat-icon bg-emerald-100 text-emerald-700">
                    <FiInbox />
                  </span>
                  <div>
                    <p className="message-stat-value">{selectedRecipients.length}</p>
                    <p className="message-stat-label">destinataires selectionnes</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-100 p-5 rounded-2xl border border-green-100">
              <p className="text-sm font-semibold text-slate-600">
                Aperçu des destinataires
              </p>
              {selectedRecipients.length > 0 ? (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    {selectedRecipients.slice(0, 4).map((recipient) => (
                      <div key={recipient.id} className="flex items-center gap-3">
                        <span className="message-preview-avatar">
                          {recipient.firstName.charAt(0)}
                          {recipient.lastName.charAt(0)}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {recipient.firstName} {recipient.lastName}
                          </p>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {recipient.role}
                          </p>
                        </div>
                      </div>
                    ))}
                    {selectedRecipients.length > 4 && (
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        +{selectedRecipients.length - 4} autres destinataires
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 p-3 text-xs text-slate-600">
                    L&apos;email sera envoye a chaque destinataire selectionne et
                    enregistre dans votre historique d&apos;envoi.
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Selectionnez un ou plusieurs destinataires pour preparer l&apos;envoi.
                </p>
              )}
            </div>
          </div>

          <form
            className="form-grid mt-6 md:grid-cols-2"
            onSubmit={sendMessage}
          >
            <div className="form-field">
              <label htmlFor="message-receiver" className="field-label">
                Destinataires
              </label>
              <div className="message-input-shell mb-3">
                <FiSearch className="message-input-icon" />
                <input
                  id="message-search"
                  value={receiverQuery}
                  onChange={(event) => setReceiverQuery(event.target.value)}
                  placeholder="Rechercher par nom ou role..."
                  className="app-input pl-10"
                />
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                {filteredUsers.length === 0 && (
                  <p className="text-sm text-slate-500">Aucun destinataire disponible.</p>
                )}
                {filteredUsers.map((user) => {
                  const checked = receiverIds.includes(user.id);

                  return (
                    <label
                      key={user.id}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 transition ${
                        checked
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="message-preview-avatar">
                          {user.firstName.charAt(0)}
                          {user.lastName.charAt(0)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            {user.role}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${checked ? "border-sky-400 bg-sky-500 text-white" : "border-slate-300 bg-white text-transparent"}`}>
                        <FiCheckSquare className="text-sm" />
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleRecipient(user.id)}
                      />
                    </label>
                  );
                })}
              </div>
              <p className="field-help">
                Choisissez un ou plusieurs collaborateurs concernes par l&apos;échange.
              </p>
            </div>

            <div className="form-field">
              <label htmlFor="message-meta" className="field-label">
                Canal
              </label>
              <div id="message-meta" className="message-meta-card">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <FiAtSign className="text-[0.8rem]" />
                  envoi SMTP immediat
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <FiClock className="text-[0.8rem]" />
                  historisation automatique
                </span>
              </div>
            </div>

            <div className="form-field md:col-span-2">
              <label htmlFor="message-content" className="field-label">
                Message
              </label>
              <div className="message-textarea-shell">
                <textarea
                  id="message-content"
                  required
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Décrivez le besoin, le contexte ou l'information à transmettre..."
                  className="app-textarea min-h-45 border-0 bg-transparent shadow-none"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Allez droit au but: objet clair, contexte utile, ton
                  professionnel.
                </span>
                <span>{content.trim().length}/1200</span>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Seuls les administrateurs et managers peuvent emettre ces emails
                depuis la plateforme.
              </p>
              <button
                type="submit"
                disabled={loading || users.length === 0 || receiverIds.length === 0 || !content.trim()}
                className="app-btn-primary min-w-[180px]"
              >
                <FiSend className="text-sm" />
                {loading ? "Envoi..." : receiverIds.length > 1 ? "Envoyer les emails" : "Envoyer l'email"}
              </button>
            </div>
          </form>
        </section>
      )}

      {showList && (
        <section className="space-y-4">
          {sortedMessages.length === 0 ? (
            <div className="app-card p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FiInbox className="text-xl" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {isAgent ? "Aucun message recu pour le moment" : "Aucun message pour le moment"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {isAgent
                  ? "Les messages qui vous sont envoyes apparaitront ici. Les agents peuvent les consulter sans y repondre."
                  : "Commencez par envoyer un email pour alimenter l&apos;historique des communications."}
              </p>
            </div>
          ) : (
            <>
              {paginatedMessages.map((message) => (
                (() => {
                  const isOutgoing = message.sender.id === currentUserId;
                  const counterpart = isOutgoing ? message.receiver : message.sender;

                  return (
                <article
                  key={message.id}
                  className={`message-thread-card ${isOutgoing ? "message-thread-card-out" : "message-thread-card-in"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`message-thread-avatar ${isOutgoing ? "message-thread-avatar-out" : "message-thread-avatar-in"}`}>
                        {counterpart.firstName.charAt(0)}
                        {counterpart.lastName.charAt(0)}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {counterpart.firstName} {counterpart.lastName}
                          </p>
                          <Badge label={isOutgoing ? "email envoye" : "message recu"} variant={isOutgoing ? "progress" : "pending"} />
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {isOutgoing
                            ? `De ${message.sender.firstName} ${message.sender.lastName} a ${message.receiver.firstName} ${message.receiver.lastName}`
                            : `De ${message.sender.firstName} ${message.sender.lastName} vers vous`}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      Le contenu est masque ici pour garder un historique plus
                      propre.
                    </p>
                    <button
                      type="button"
                      onClick={() => openMessagePreview(message)}
                      className="border border-gray-200 hover:bg-slate-200 inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium"
                    >
                      <FiEye className="text-sm" />
                      Voir le message
                    </button>
                  </div>
                </article>
                  );
                })()
              ))}

              <div className="message-pagination">
                <p className="text-sm text-slate-500">
                  Page {currentPage} sur {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="app-btn-soft"
                  >
                    <FiChevronLeft className="text-sm" />
                    Precedent
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="app-btn-soft"
                  >
                    Suivant
                    <FiChevronRight className="text-sm" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
