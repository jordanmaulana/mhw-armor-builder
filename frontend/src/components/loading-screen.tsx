import type { ReactNode } from "react";

// The one loading screen, for three waits in a row: index.html draws it in inline styles (its
// #boot) until the script has run, the router shows it while a route's chunk loads, and the
// builder while the catalog does. One picture, so nothing flashes between them: change the
// look here and in index.html together.
export function LoadingScreen({ children = "Loading…" }: { children?: ReactNode }) {
  return (
    <main className="smithy grid min-h-screen place-items-center px-4 text-moss">
      <p role="status">{children}</p>
    </main>
  );
}
