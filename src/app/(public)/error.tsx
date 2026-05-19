"use client";

import { useEffect } from "react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO[TAMA-S0-OBS]: brancher Sentry en PR #5 (Sentry.captureException).
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[public/error]", error);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-center text-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Erreur</p>
      <h1 className="text-3xl font-semibold">Quelque chose s&apos;est mal passé</h1>
      <p className="max-w-md text-sm text-gray-600">
        Tama est désolé. L&apos;équipe a été notifiée et on regarde ça tout de suite.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
      >
        Réessayer
      </button>
    </main>
  );
}
