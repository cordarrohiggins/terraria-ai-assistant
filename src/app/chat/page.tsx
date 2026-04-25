"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  matchedTitle?: string;
  sourceUrl?: string;
};

type ChatApiResponse = {
  role?: "assistant";
  content?: string;
  matchedTitle?: string;
  sourceUrl?: string;
  error?: string;
};

const suggestedQuestions = [
  "What should I do after defeating the Eye of Cthulhu?",
  "How do I craft the Night's Edge?",
  "What armor should I use before fighting Skeletron?",
  "How do I prepare for Hardmode?",
];

const startingMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hi! I am your Terraria AI Assistant. Ask me about bosses, crafting, progression, items, NPCs, or class builds.",
  },
  {
    role: "user",
    content: "What should I do after defeating the Eye of Cthulhu?",
  },
  {
    role: "assistant",
    content:
      "A good next step is usually preparing for the Eater of Worlds or Brain of Cthulhu, upgrading your armor, exploring deeper caves, and improving your accessories. Later, this answer will be grounded in wiki data.",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(startingMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = inputValue.trim();

    if (!trimmedInput || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmedInput,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedInput,
        }),
      });

      const data = (await response.json()) as ChatApiResponse;

      if (!response.ok) {
        throw new Error(data.error || "The chat request failed.");
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content:
          data.content ||
          "The backend responded, but it did not include a message.",
        matchedTitle: data.matchedTitle,
        sourceUrl: data.sourceUrl,
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong while contacting the backend.";

      const assistantErrorMessage: ChatMessage = {
        role: "assistant",
        content: `Sorry, something went wrong: ${errorMessage}`,
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantErrorMessage,
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <nav className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400 transition hover:text-emerald-300"
          >
            Terraria AI Assistant
          </Link>

          <div className="flex gap-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
            >
              Home
            </Link>

            <a
              href="https://terraria.wiki.gg/wiki/Terraria_Wiki"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
            >
              Terraria Wiki
            </a>
          </div>
        </nav>

        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
            Chat Interface
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Chat with your Terraria guide.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            This chat page now sends your message to a backend API route. The
            backend response is still temporary, but the app now has the basic
            frontend-to-backend flow that the real assistant will need.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => setInputValue(question)}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={index}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      isUser
                        ? "bg-emerald-500 text-slate-950"
                        : "border border-slate-700 bg-slate-800 text-slate-100"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                      {isUser ? "You" : "Assistant"}
                    </p>
                    <p>{message.content}</p>

                    {message.sourceUrl && (
                      <a
                        href={message.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
                      >
                        View source{message.matchedTitle ? `: ${message.matchedTitle}` : ""}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm leading-6 text-slate-100">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                    Assistant
                  </p>
                  <p>Checking the backend...</p>
                </div>
              </div>
            )}
          </div>

          <form className="border-t border-slate-800 p-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ask about Terraria progression, crafting, bosses, or items..."
                disabled={isLoading}
                className="min-h-12 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="min-h-12 rounded-xl bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}