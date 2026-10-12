import { createFileRoute } from "@tanstack/react-router";

import { PageTitle } from "@/components/page-title";
import { LoginCard } from "@/features/auth/components/login-card";

export const Route = createFileRoute("/login")({
  component: () => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <PageTitle>Sign in</PageTitle>
      <LoginCard />
    </div>
  ),
});
