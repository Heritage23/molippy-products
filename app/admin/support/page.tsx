
"use client";

import { useCallback, useEffect, useState } from "react";

type SupportMessage = {
  id: string;
  ticketId: string;
  senderId: string | null;
  senderRole: "CUSTOMER" | "ADMIN";
  senderName: string | null;
  message: string;
  createdAt: string;
};

type SupportTicket = {
  id: string;
  userId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  subject: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH";
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
};

const statusOptions = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusStyle(status: SupportTicket["status"]) {
  switch (status) {
    case "OPEN":
      return "bg-rose-400/10 text-rose-300 border-rose-400/20";
    case "IN_PROGRESS":
      return "bg-amber-400/10 text-amber-300 border-amber-400/20";
    case "RESOLVED":
      return "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
    case "CLOSED":
      return "bg-white/5 text-white/50 border-white/10";
  }
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTickets = useCallback(async (preferredId?: string) => {
    setError("");

    try {
      const response = await fetch("/api/admin/support", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load support tickets."
        );
      }

      const loadedTickets: SupportTicket[] = data.tickets ?? [];
      setTickets(loadedTickets);

      setSelectedId((currentId) => {
        const desiredId = preferredId || currentId;

        if (loadedTickets.some((ticket) => ticket.id === desiredId)) {
          return desiredId;
        }

        return loadedTickets[0]?.id ?? "";
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load support tickets."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedId) ?? null;

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus =
      filter === "ALL" || ticket.status === filter;

    const searchText = search.trim().toLowerCase();
    const matchesSearch =
      !searchText ||
      ticket.subject.toLowerCase().includes(searchText) ||
      (ticket.customerName ?? "").toLowerCase().includes(searchText) ||
      (ticket.customerEmail ?? "").toLowerCase().includes(searchText) ||
      ticket.id.toLowerCase().includes(searchText);

    return matchesStatus && matchesSearch;
  });

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTicket || !reply.trim() || sending) return;

    setSending(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/admin/support/${encodeURIComponent(selectedTicket.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: reply.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send reply.");
      }

      setReply("");
      setNotice("Your reply has been saved.");
      await loadTickets(selectedTicket.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send reply."
      );
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: string) {
    if (!selectedTicket || updatingStatus) return;

    setUpdatingStatus(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/admin/support/${encodeURIComponent(selectedTicket.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update status.");
      }

      setNotice("Ticket status updated.");
      await loadTickets(selectedTicket.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update ticket status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  const openCount = tickets.filter(
    (ticket) => ticket.status === "OPEN"
  ).length;

  const inProgressCount = tickets.filter(
    (ticket) => ticket.status === "IN_PROGRESS"
  ).length;

  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "RESOLVED"
  ).length;

  return (
    <div className="min-h-screen bg-[#100a10] text-[#f8edf4]">
      <header className="border-b border-white/[0.08] bg-[#170e17]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-7 lg:px-10">
          <div>
            <a
              href="/admin"
              className="text-xs text-[#c49aaf] transition hover:text-white"
            >
              ← Back to dashboard
            </a>

            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#ff80b6]">
              MOLIPPY PRODUCTS
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Customer support
            </h1>

            <p className="mt-2 text-sm text-[#a88d9f]">
              Manage complaints, respond to customers, and track resolutions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadTickets(selectedId)}
            disabled={loading}
            className="rounded-xl border border-[#ff80b6]/25 bg-[#ff80b6]/10 px-4 py-3 text-sm font-semibold text-[#ffb5d3] transition hover:bg-[#ff80b6]/20 disabled:opacity-50"
          >
            {loading ? "Loading..." : "↻ Refresh tickets"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Open tickets", value: openCount },
            { label: "In progress", value: inProgressCount },
            { label: "Resolved", value: resolvedCount },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.08] bg-[#1a111b] p-5"
            >
              <p className="text-sm text-[#a88d9f]">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200"
          >
            {error}
          </div>
        )}

        {notice && !error && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"
          >
            {notice}
          </div>
        )}

        <div className="mt-6 grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a111b]">
            <div className="border-b border-white/[0.07] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Tickets</h2>
                <span className="rounded-full bg-[#ff80b6]/10 px-3 py-1 text-xs text-[#ffb5d3]">
                  {filteredTickets.length}
                </span>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, subject or ID"
                className="mt-4 w-full rounded-xl border border-white/10 bg-[#100a10] px-3 py-3 text-sm text-white outline-none placeholder:text-[#806a79] focus:border-[#ff80b6]/50"
              />

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#100a10] px-3 py-3 text-sm text-white outline-none focus:border-[#ff80b6]/50"
              >
                <option value="ALL">All tickets</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-[650px] overflow-y-auto">
              {loading ? (
                <p className="p-6 text-sm text-[#a88d9f]">
                  Loading tickets...
                </p>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-2xl text-[#ff80b6]">♡</p>
                  <p className="mt-2 text-sm font-semibold">
                    No tickets found
                  </p>
                  <p className="mt-1 text-xs text-[#a88d9f]">
                    New customer complaints will appear here.
                  </p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <button
                    type="button"
                    key={ticket.id}
                    onClick={() => {
                      setSelectedId(ticket.id);
                      setError("");
                      setNotice("");
                    }}
                    className={`block w-full border-b border-white/[0.06] p-4 text-left transition hover:bg-white/[0.04] ${
                      selectedId === ticket.id
                        ? "border-l-2 border-l-[#ff80b6] bg-[#ff80b6]/[0.07]"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-semibold">
                        {ticket.subject}
                      </p>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold ${statusStyle(ticket.status)}`}
                      >
                        {ticket.status.replace("_", " ")}
                      </span>
                    </div>

                    <p className="mt-2 truncate text-xs text-[#c49aaf]">
                      {ticket.customerName || "Guest customer"}
                    </p>

                    <p className="mt-1 text-[11px] text-[#806a79]">
                      {formatDate(ticket.updatedAt)}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-[#c49aaf]">
                        {ticket.priority} priority
                      </span>

                      <span className="text-[10px] text-[#806a79]">
                        {ticket.messages.length} replies
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a111b]">
            {!selectedTicket ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
                <span className="text-4xl text-[#ff80b6]">♡</span>
                <h2 className="mt-4 text-lg font-semibold">
                  Select a support ticket
                </h2>
                <p className="mt-2 max-w-sm text-sm text-[#a88d9f]">
                  Choose a complaint from the list to read the details and manage the conversation.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-white/[0.07] p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff80b6]">
                        Support ticket
                      </p>

                      <h2 className="mt-2 break-words text-xl font-semibold">
                        {selectedTicket.subject}
                      </h2>

                      <p className="mt-2 break-all text-xs text-[#a88d9f]">
                        Ticket ID: {selectedTicket.id}
                      </p>
                    </div>

                    <div className="min-w-0 sm:max-w-[230px]">
                      <label
                        htmlFor="ticket-status"
                        className="mb-2 block text-xs text-[#a88d9f]"
                      >
                        Ticket status
                      </label>

                      <select
                        id="ticket-status"
                        value={selectedTicket.status}
                        disabled={updatingStatus}
                        onChange={(event) =>
                          void changeStatus(event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#100a10] px-3 py-3 text-sm text-white outline-none focus:border-[#ff80b6]/50 disabled:opacity-50"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-[#100a10] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#806a79]">
                        Customer
                      </p>
                      <p className="mt-1 break-words text-sm font-medium">
                        {selectedTicket.customerName || "Guest customer"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#100a10] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#806a79]">
                        Email
                      </p>
                      <p className="mt-1 break-all text-sm font-medium">
                        {selectedTicket.customerEmail || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-white/[0.07] bg-[#ff80b6]/[0.03] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      Original complaint
                    </h3>
                    <span className="text-[10px] text-[#806a79]">
                      {formatDate(selectedTicket.createdAt)}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#e5d3df]">
                    {selectedTicket.message}
                  </p>
                </div>

                <div className="flex-1 p-5 sm:p-6">
                  <h3 className="text-sm font-semibold">
                    Conversation
                  </h3>

                  {selectedTicket.messages.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-sm text-[#a88d9f]">
                      No saved replies yet. The original complaint is shown above.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {selectedTicket.messages.map((item) => (
                        <div
                          key={item.id}
                          className={`flex ${
                            item.senderRole === "ADMIN"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[95%] rounded-2xl p-4 sm:max-w-[85%] ${
                              item.senderRole === "ADMIN"
                                ? "border border-[#ff80b6]/20 bg-[#ff80b6]/[0.09]"
                                : "border border-white/[0.08] bg-[#100a10]"
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold">
                                {item.senderName ||
                                  (item.senderRole === "ADMIN"
                                    ? "Molippy Support"
                                    : "Customer")}
                              </p>

                              <span className="text-[9px] uppercase tracking-wider text-[#ff80b6]">
                                {item.senderRole}
                              </span>
                            </div>

                            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#e5d3df]">
                              {item.message}
                            </p>

                            <p className="mt-3 text-[10px] text-[#806a79]">
                              {formatDate(item.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={sendReply}
                  className="border-t border-white/[0.07] bg-[#160e17] p-5 sm:p-6"
                >
                  <label
                    htmlFor="support-reply"
                    className="block text-sm font-semibold"
                  >
                    Write a reply
                  </label>

                  <p className="mt-1 text-xs text-[#a88d9f]">
                    Your reply will be saved to this ticket.
                  </p>

                  <textarea
                    id="support-reply"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Hi! Thank you for contacting Molippy Products..."
                    className="mt-4 w-full resize-y rounded-xl border border-white/10 bg-[#100a10] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-[#806a79] focus:border-[#ff80b6]/50"
                  />

                  <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="text-[10px] text-[#806a79]">
                      {reply.length}/2000 characters
                    </p>

                    <button
                      type="submit"
                      disabled={!reply.trim() || sending}
                      className="rounded-xl bg-[#ff80b6] px-5 py-3 text-sm font-bold text-[#260e1b] transition hover:bg-[#ffa3cb] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? "Saving reply..." : "Send reply ↗"}
                    </button>
                  </div>

                  <p className="mt-3 text-[10px] leading-5 text-[#806a79]">
                    Email notifications are not configured yet. Replies are saved in your database, but this page does not email the customer.
                  </p>
                </form>
              </>
            )}
          </section>
        </div>

        <footer className="mt-8 border-t border-white/[0.07] py-5 text-center text-[10px] text-[#806a79]">
          © {new Date().getFullYear()} Molippy Products · Beauty meets confidence.
        </footer>
      </main>
    </div>
  );
}
