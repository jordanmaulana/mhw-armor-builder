import { useEffect, useRef } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { AppShell } from "@/components/layout/app-shell";
import { ApiError } from "@/lib/api";
import { me } from "@/features/auth/api";
import { tokenAtom, userAtom } from "@/features/auth/state";

const PUBLIC_PATHS = new Set(["/", "/login"]);
const FULL_BLEED_PATHS = new Set([...PUBLIC_PATHS, "/onboarding"]);

export function AuthGate() {
  const [token, setToken] = useAtom(tokenAtom);
  const [user, setUser] = useAtom(userAtom);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // An address no route answers. It is nobody's private page, so it is never sent to /login:
  // the root route's not-found page is drawn for it, signed in or not.
  const notFound = useRouterState({ select: (s) => s.matches.some((m) => m.globalNotFound) });
  const sessionExpiredFiredRef = useRef(false);

  // index.html's loading screen covers the page until the router has drawn something of its
  // own, and this component mounting is that moment
  useEffect(() => {
    document.getElementById("boot")?.remove();
  }, []);

  useEffect(() => {
    if (!token || user) return;
    let cancelled = false;
    me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setToken(null);
          setUser(null);
          sessionExpiredFiredRef.current = true;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, user, setToken, setUser]);

  useEffect(() => {
    if (notFound) return;
    if (!token) {
      if (!PUBLIC_PATHS.has(pathname)) navigate({ to: "/login" });
      return;
    }
    if (!user) return;
    // Opt-in onboarding gate: dormant while the backend reports onboarded=true
    // (template default). Activates once get_onboarded can return false. See CLAUDE.md.
    if (!user.onboarded && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
      return;
    }
    // "/" is the public armor builder: signed-in users may stay on it.
    if (user.onboarded && (pathname === "/login" || pathname === "/onboarding")) {
      navigate({ to: "/dashboard" });
    }
  }, [notFound, token, user, pathname, navigate]);

  if (notFound || !token || !user || FULL_BLEED_PATHS.has(pathname)) {
    return <Outlet />;
  }
  return <AppShell />;
}
