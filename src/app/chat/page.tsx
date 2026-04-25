const exampleMessages = [
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
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
            Terraria AI Assistant
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Chat with your Terraria guide.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            This is the first version of the chat interface. The messages below
            are temporary examples. Later, this page will connect to real wiki
            search and AI responses.
          </p>
        </div>

        <div className="flex flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {exampleMessages.map((message, index) => {
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
                  </div>
                </div>
              );
            })}
          </div>

          <form className="border-t border-slate-800 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Ask about Terraria progression, crafting, bosses, or items..."
                className="min-h-12 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400"
              />

              <button
                type="submit"
                className="min-h-12 rounded-xl bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}