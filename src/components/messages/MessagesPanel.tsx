"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiSend } from "react-icons/fi";

import DataTable from "@/components/tables/DataTable";
import Badge from "@/components/ui/Badge";
import { extractApiError, showError, showSuccess } from "@/components/ui/notify";
import { MessageItem, UserLight } from "@/lib/types";

type MessagesPanelProps = {
  messages: MessageItem[];
  users: UserLight[];
  currentUserId: string;
  view?: "all" | "list" | "create";
  redirectAfterCreate?: string;
};

export default function MessagesPanel({
  messages,
  users,
  currentUserId,
  view = "all",
  redirectAfterCreate,
}: MessagesPanelProps) {
  const router = useRouter();

  const [receiverId, setReceiverId] = useState(users[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const showCreate = view !== "list";
  const showList = view !== "create";

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))),
    [messages],
  );

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId, content }),
      });

      if (!response.ok) {
        await showError("Envoi impossible", await extractApiError(response));
        return;
      }

      setContent("");
      await showSuccess("Message envoye");

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
        <section className="app-card p-5">
          <h2 className="text-lg font-bold text-slate-900">Nouveau message</h2>

          <form className="form-grid mt-4 md:grid-cols-2" onSubmit={sendMessage}>
            <div className="form-field">
              <label htmlFor="message-receiver" className="field-label">Destinataire</label>
              <select
                id="message-receiver"
                required
                value={receiverId}
                onChange={(event) => setReceiverId(event.target.value)}
                className="app-select"
              >
                {users.length === 0 && <option value="">Aucun destinataire</option>}
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || users.length === 0}
              className="app-btn-primary w-full md:w-fit"
            >
              <FiSend className="text-sm" />
              {loading ? "Envoi..." : "Envoyer"}
            </button>

            <div className="form-field md:col-span-2">
              <label htmlFor="message-content" className="field-label">Message</label>
              <textarea
                id="message-content"
                required
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Ecrivez votre message..."
                className="app-textarea"
                rows={4}
              />
            </div>
          </form>
        </section>
      )}

      {showList && (
        <section>
          <DataTable
            columns={["Type", "De", "A", "Message", "Date"]}
            emptyLabel="Aucun message."
            hasRows={sortedMessages.length > 0}
          >
            {sortedMessages.map((message) => {
              const outgoing = message.sender.id === currentUserId;

              return (
                <tr key={message.id} className="border-t border-slate-200">
                  <td data-label="Type" className="px-4 py-3">
                    {outgoing ? <Badge label="envoye" variant="progress" /> : <Badge label="recu" variant="pending" />}
                  </td>
                  <td data-label="De" className="px-4 py-3">
                    {message.sender.firstName} {message.sender.lastName}
                  </td>
                  <td data-label="A" className="px-4 py-3">
                    {message.receiver.firstName} {message.receiver.lastName}
                  </td>
                  <td data-label="Message" className="px-4 py-3">
                    <p className="max-w-xl text-sm text-slate-700">{message.content}</p>
                  </td>
                  <td data-label="Date" className="px-4 py-3">{new Date(message.createdAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </DataTable>
        </section>
      )}
    </div>
  );
}
