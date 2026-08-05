import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.jsx";
import { ToastProvider } from "./components/ui/toast/ToastProvider.jsx";

import "./styles/variables.css";
import "./styles/reset.css";
import "./styles/typography.css";
import "./styles/global.css";
import "./styles/layout.css";

import { initializeTheme } from "./utils/theme";

initializeTheme();

const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  console.error(
    "VITE_GOOGLE_CLIENT_ID is missing."
  );
}

createRoot(
  document.getElementById("root")
).render(
  <GoogleOAuthProvider
    clientId={googleClientId || ""}
  >
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>
);