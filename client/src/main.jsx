import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.jsx";

import {
  ToastProvider,
} from "./components/ui/toast/ToastProvider.jsx";

import {
  initializeTheme,
} from "./utils/theme";

import "./styles/global.css";

initializeTheme();

const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  console.error(
    "VITE_GOOGLE_CLIENT_ID is missing."
  );
}

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element was not found."
  );
}

createRoot(rootElement).render(
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