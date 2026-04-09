
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { projectId, publicAnonKey } from './utils/supabase/info';

// Expose supabase keys for client-side convenience in dev (only if window is available)
if (typeof window !== 'undefined') {
  (window as any).__SUPABASE_PROJECT_ID__ = projectId;
  (window as any).__SUPABASE_ANON_KEY__ = publicAnonKey;
}

if (import.meta.env.PROD && typeof window !== "undefined" && "serviceWorker" in navigator) {
  let isReloadingForUpdate = false;

  const reloadForUpdate = () => {
    if (isReloadingForUpdate) return;
    isReloadingForUpdate = true;
    window.location.reload();
  };

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (isReloadingForUpdate) return;
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      void registration.update();

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          void registration.update();
        }
      });

      window.setInterval(() => {
        void registration.update();
      }, 60_000);
    },
    onRegisterError(error) {
      console.error("Service worker registration failed", error);
    },
  });

  navigator.serviceWorker.addEventListener("controllerchange", reloadForUpdate);
}

createRoot(document.getElementById("root")!).render(<App />);
