import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider } from "jotai";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { routeTree } from "./routeTree.gen";
import { queryClient } from "@/app/query-client";
import { LoadingScreen } from "@/components/loading-screen";
import "./styles.css";

const router = createRouter({
  routeTree,
  context: { queryClient },
  // What stands in while a route's chunk loads. At once, not after the router's default
  // second: until it shows the page is blank, 0.6s of white on a slow connection.
  defaultPendingComponent: LoadingScreen,
  defaultPendingMs: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <RouterProvider router={router} />
        <ToastContainer position="top-right" autoClose={4000} newestOnTop closeOnClick pauseOnHover />
      </JotaiProvider>
    </QueryClientProvider>
  </StrictMode>,
);
