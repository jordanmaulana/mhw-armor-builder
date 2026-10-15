import { useEffect, useMemo, useRef, useState } from "react";

import type { Message, Query, Reply } from "./recommend.worker.ts";
import type { Build, Catalog } from "./types.ts";

export interface Answer {
  query: Query; // the one these sets answer, which is not the one asked while the next is out
  sets: Build[];
  leftOut: number;
}

// The recommended sets for `query`, searched in a worker so that the page never waits on a
// search. Null until the first answer. A new query while a search is still out ends that search:
// its worker goes, and a new one is handed the catalog again (some 15 ms on an M1). `query` is
// asked again only when its identity changes, so the caller memoizes it.
export function useSets(catalog: Catalog, query: Query): Answer | null {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const worker = useRef<Worker | null>(null);
  const busy = useRef(false); // a search is out and its answer has not come back
  const sent = useRef({ id: 0, query }); // the last search sent: only its answer is taken

  // one worker for one catalog, ended with the panel
  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
      busy.current = false;
    },
    [catalog],
  );

  useEffect(() => {
    sent.current = { id: sent.current.id + 1, query };
    if (busy.current) {
      worker.current?.terminate();
      worker.current = null;
      busy.current = false;
    }
    if (query.wanted.length === 0) return; // answered below, without a search
    if (!worker.current) {
      const fresh = new Worker(new URL("./recommend.worker.ts", import.meta.url), {
        type: "module",
      });
      fresh.onmessage = ({ data }: MessageEvent<Reply>) => {
        if (data.id !== sent.current.id) return;
        busy.current = false;
        setAnswer({ query: sent.current.query, sets: data.sets, leftOut: data.leftOut });
      };
      // no sets rather than "Searching…" for good
      fresh.onerror = (event) => {
        console.error("set search failed", event);
        busy.current = false;
        setAnswer({ query: sent.current.query, sets: [], leftOut: 0 });
      };
      fresh.postMessage({ catalog } satisfies Message);
      worker.current = fresh;
    }
    worker.current.postMessage({ id: sent.current.id, query } satisfies Message);
    busy.current = true;
  }, [catalog, query]);

  const none = useMemo(() => ({ query, sets: [], leftOut: 0 }), [query]);
  return query.wanted.length === 0 ? none : answer;
}
