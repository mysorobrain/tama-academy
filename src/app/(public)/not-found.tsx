import Link from "next/link";

export default function PublicNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-center text-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">404</p>
      <h1 className="text-3xl font-semibold">Cette page est introuvable</h1>
      <p className="max-w-md text-sm text-gray-600">
        Tama a cherché partout dans le Soroban Royaume, mais cette page n&apos;existe pas (encore).
      </p>
      <Link
        href="/"
        className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
      >
        Revenir à l&apos;accueil
      </Link>
    </main>
  );
}
