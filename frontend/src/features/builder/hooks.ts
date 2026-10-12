import { useQuery } from "@tanstack/react-query";

import { fetchCatalog } from "@/features/builder/api";

// ponytail: whole catalog (~4.4k rows) in one go, filtered in the browser. Move search to the
// API if the dataset grows past what a phone wants to download up front.
export function useCatalog() {
  return useQuery({ queryKey: ["catalog"], queryFn: fetchCatalog, staleTime: Infinity });
}
