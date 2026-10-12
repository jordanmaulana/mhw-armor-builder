import { Link } from "@tanstack/react-router";

import { PageTitle } from "@/components/page-title";

// What the root route draws for an address no route answers. nginx cannot know the router's
// routes, so it still sends index.html with a 200: the noindex is what keeps such an address
// out of a search engine. React lifts the tag into <head> and takes it out on the way back.
export function NotFoundPage() {
  return (
    <main className="smithy grid min-h-screen place-items-center px-4 text-bone">
      <PageTitle>Page not found</PageTitle>
      <meta name="robots" content="noindex" />
      <section
        aria-labelledby="not-found-title"
        className="frame relative w-full max-w-md px-6 pt-9 pb-10 text-center"
      >
        <h1 id="not-found-title" className="font-serif text-3xl text-aqua text-shadow-glow">
          Page not found
        </h1>
        <p className="pt-3 text-moss">There is nothing at this address.</p>
        <Link
          to="/"
          className="mt-7 inline-block rounded-sm border border-seam bg-hide px-4 py-2.5 hover:border-hunt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt"
        >
          Back to the armor set builder
        </Link>
      </section>
    </main>
  );
}
