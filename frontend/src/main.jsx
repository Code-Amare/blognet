import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { PageTitleProvider } from "./context/PageTitleContext.jsx";
import { SiteInfoProvider } from "./context/SiteInfoContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <SiteInfoProvider>
          <PageTitleProvider>
            <App />
          </PageTitleProvider>
        </SiteInfoProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
