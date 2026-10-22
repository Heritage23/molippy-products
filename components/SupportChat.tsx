
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};

type SupportReply = {
  id: string;
  ticketId: string;
  subject: string;
  message: string;
  senderName: string | null;
  createdAt: string;
};

type RepliesResponse = {
  replies?: SupportReply[];
  unreadCount?: number;
  message?: string;
};

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, Molippy girl! 💗 I'm here to help with products, orders, and any concerns you have. How can I help?",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const refreshInProgressRef = useRef(false);
  const isOpenRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const refreshSupportReplies = useCallback(async () => {
    // Avoid overlapping requests from the timer and chat actions.
    if (refreshInProgressRef.current) return;

    refreshInProgressRef.current = true;

    try {
      const response = await fetch("/api/support/replies", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      // Guests can use the AI chatbot without signing in.
      // Support-ticket replies require an authenticated session.
      if (response.status === 401 || response.status === 403) {
        if (mountedRef.current) {
          setUnreadCount(0);
        }
        return;
      }

      if (!response.ok) {
        // Keep a temporary API issue from breaking the chat.
        return;
      }

      const data = (await response.json()) as RepliesResponse;
      const replies = Array.isArray(data.replies) ? data.replies : [];

      if (!mountedRef.current) return;

      setUnreadCount(
        typeof data.unreadCount === "number" ? data.unreadCount : 0
      );

      if (replies.length > 0) {
        setMessages((previous) => {
          const existingIds = new Set(
            previous
              .map((item) => item.id)
              .filter((id): id is string => Boolean(id))
          );

          const newMessages: Message[] = replies
            .filter((reply) => !existingIds.has(reply.id))
            .map((reply) => ({
              id: reply.id,
              role: "assistant",
              content:
                `💗 ${reply.senderName || "Molippy Support"} replied to your support ticket:\n` +
                `${reply.subject}\n\n${reply.message}`,
            }));

          return newMessages.length
            ? [...previous, ...newMessages]
            : previous;
        });
      }

      // Mark replies as read only when the chat is open.
      if (isOpenRef.current && data.unreadCount && data.unreadCount > 0) {
        const readResponse = await fetch("/api/support/replies", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (readResponse.ok && mountedRef.current) {
          setUnreadCount(0);
        }
      }
    } catch {
      // A temporary network failure should not interrupt the AI chat.
      // The next scheduled refresh will try again.
    } finally {
      refreshInProgressRef.current = false;
    }
  }, []);

  useEffect(() => {
    void refreshSupportReplies();

    const interval = window.setInterval(() => {
      void refreshSupportReplies();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshSupportReplies]);

  async function sendMessage(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const text = input.trim();

    if (!text || loading) return;

    const history = messages.slice(-8).map((item) => ({
      role: item.role,
      content: item.content,
    }));

    setMessages((previous) => [
      ...previous,
      { role: "user", content: text },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: text,
          history,
        }),
      });

      const responseText = await response.text();

      let data: {
        reply?: string;
        message?: string;
        ticketId?: string;
      };

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("The server returned an unexpected response.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply || "Sorry, I couldn't prepare an answer.",
        },
      ]);

      void refreshSupportReplies();
    } catch (error) {
      console.error("Support chat error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't connect just now. Please try again in a moment. 💗",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleChat() {
    setIsOpen((open) => !open);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end font-sans sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          className="mb-3 flex h-[min(520px,calc(100dvh-100px))] min-h-[280px] w-[min(370px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-[0_20px_70px_rgba(157,23,77,0.18)]"
          aria-label="Molippy customer support chat"
        >
          <header className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-pink-600 to-rose-500 px-4 py-4 text-white">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 text-xl">
              💗
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold tracking-wide">
                Molippy Support
              </h2>
              <p className="mt-0.5 text-xs text-pink-100">
                Here for your soft lip era
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close customer support chat"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-2xl transition hover:bg-white/20"
            >
              ×
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-x-hidden overflow-y-auto bg-[#fffafd] p-4">
            <p className="text-center text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400">
              Molippy · Beauty meets confidence
            </p>

            {messages.map((message, index) => (
              <div
                key={message.id || `${index}-${message.role}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs">
                    💗
                  </div>
                )}

                <p
                  className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 ${
                    message.role === "user"
                      ? "rounded-br-md bg-pink-600 text-white"
                      : "rounded-bl-md border border-pink-100 bg-white text-gray-700 shadow-sm"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}

            {loading && (
              <div
                className="flex items-center gap-2"
                role="status"
                aria-label="Molippy Support is responding"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs">
                  💗
                </div>

                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-pink-100 bg-white px-4 py-3 shadow-sm">
                  <span className="typing-dot h-2 w-2 rounded-full bg-pink-400" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-pink-400" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-pink-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={sendMessage}
            className="flex shrink-0 items-center gap-2 border-t border-pink-100 bg-white p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask us anything..."
              aria-label="Your support message"
              maxLength={2000}
              className="min-w-0 flex-1 rounded-full border border-pink-100 bg-[#fffafd] px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-600 text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M22 2 11 13" />
                <path d="m22 2-7 20-4-9-9-4Z" />
              </svg>
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={toggleChat}
        aria-label={
          isOpen
            ? "Close support chat"
            : unreadCount > 0
              ? `Open support chat, ${unreadCount} unread replies`
              : "Open support chat"
        }
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-2xl text-white shadow-lg shadow-pink-300/40 transition duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-pink-200"
      >
        {isOpen ? (
          <span className="text-3xl leading-none">×</span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z" />
          </svg>
        )}

        {!isOpen && unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread replies`}
            className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-xs font-bold leading-none text-white shadow"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <style jsx>{`
        .typing-dot {
          animation: typingBounce 1.2s infinite ease-in-out;
        }

        .typing-dot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing-dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes typingBounce {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.45;
          }

          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .typing-dot {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
