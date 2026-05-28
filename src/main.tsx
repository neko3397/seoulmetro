
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import "./styles/globals.css";
import { projectId, publicAnonKey } from './utils/supabase/info';

// Expose supabase keys for client-side convenience in dev (only if window is available)
if (typeof window !== 'undefined') {
  (window as any).__SUPABASE_PROJECT_ID__ = projectId;
  (window as any).__SUPABASE_ANON_KEY__ = publicAnonKey;
}

if (import.meta.env.PROD && typeof window !== "undefined" && "serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.info("A new app version is available and will be used on the next visit.");
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
}

createRoot(document.getElementById("root")!).render(<App />);
