import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import AppErrorBoundary from "./components/common/AppErrorBoundary.jsx";
import { LanguageProvider } from "./localization/i18n.jsx";
import "./styles/base/global.css";
import "./styles/base/v3.css";
import "./styles/base/eternalPlatformV400.css";
import "./styles/theme/interfaceTokens.css";
import "./styles/pages/gameFlowV351.css";
import "./styles/base/securityV450.css";
import "./styles/base/cursorsV450.css";
import "./styles/base/responsiveV450.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
