"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DataTable from "@/components/tables/DataTable";
import Badge from "@/components/ui/Badge";
import { extractApiError, showError, showSuccess } from "@/components/ui/notify";
import { MessageItem, UserLight } from "@/lib/types";

type MessagesPanelProps = {
  messages: MessageItem[];
  users: UserLight[];
  currentUserId: string;
};

export default function MessagesPanel({ messages, users, currentUserId }: MessagesPanelProps) {
  const router = useRouter();

  const [receiverId, setReceiverId] = useState(users[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

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
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible d'envoyer le message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Nouveau message</h2>

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={sendMessage}>
          <select
            required
            value={receiverId}
            onChange={(event) => setReceiverId(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {users.length === 0 && <option value="">Aucun destinataire</option>}
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName} ({user.role})
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loading || users.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {loading ? "Envoi..." : "Envoyer"}
          </button>

          <textarea
            required
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Votre message"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            rows={4}
          />
        </form>
      </section>

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
                <td className="px-4 py-3">
                  {outgoing ? <Badge label="envoye" variant="progress" /> : <Badge label="recu" variant="pending" />}
                </td>
                <td className="px-4 py-3">
                  {message.sender.firstName} {message.sender.lastName}
                </td>
                <td className="px-4 py-3">
                  {message.receiver.firstName} {message.receiver.lastName}
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-xl text-sm text-slate-700">{message.content}</p>
                </td>
                <td className="px-4 py-3">{new Date(message.createdAt).toLocaleString()}</td>
              </tr>
            );
          })}
        </DataTable>
      </section>
    </div>
  );
}
