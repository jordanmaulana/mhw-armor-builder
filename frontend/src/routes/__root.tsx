import { createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { NotFoundPage } from "@/components/not-found";
import { AuthGate } from "@/features/auth/components/auth-gate";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => <AuthGate />,
  // drawn by AuthGate's <Outlet /> when the address matches no route
  notFoundComponent: NotFoundPage,
});
