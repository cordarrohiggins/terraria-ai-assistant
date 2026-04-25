import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
          Terraria AI Assistant
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Ask smarter Terraria questions with wiki-grounded help.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          This project will become a free-first AI assistant that helps Terraria
          players understand items, bosses, crafting paths, progression, and
          strategy using information pulled from Terraria wiki sources.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/chat"
            className="rounded-xl bg-emerald-400 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Start Chatting
          </Link>

          <a
            href="https://terraria.wiki.gg/wiki/Terraria_Wiki"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-slate-700 px-6 py-3 text-center text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
          >
            View Terraria Wiki
          </a>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-white">Wiki-based</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Answers should be grounded in Terraria wiki information instead of
              random guesses.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-white">
              Helpful guidance
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The assistant should explain options and guide players without
              always giving only one rigid answer.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-white">Free-first</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              We will build this with free tools first, then only add paid
              services later if they become necessary.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}