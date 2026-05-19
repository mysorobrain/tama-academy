"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO[TAMA-S0-OBS]: brancher Sentry en PR #5 (Sentry.captureException avec scope global).
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[global-error]", error);
    }
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-center text-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Erreur critique
          </p>
          <h1 className="text-3xl font-semibold">Tama Academy ne répond plus</h1>
          <p className="max-w-md text-sm text-gray-600">
            Un problème grave est survenu. Rechargez la page ou réessayez dans quelques instants.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
