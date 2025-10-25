
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { projectId, publicAnonKey } from './utils/supabase/info';

// Expose supabase keys for client-side convenience in dev (only if window is available)
if (typeof window !== 'undefined') {
  (window as any).__SUPABASE_PROJECT_ID__ = projectId;
  (window as any).__SUPABASE_ANON_KEY__ = publicAnonKey;
}

createRoot(document.getElementById("root")!).render(<App />);
