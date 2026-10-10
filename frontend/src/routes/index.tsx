import { createFileRoute } from "@tanstack/react-router";

import { BuilderPage } from "@/features/builder/components/builder-page";

export const Route = createFileRoute("/")({
  component: BuilderPage,
});
