import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App";

import PwaUpdatePrompt from "./components/PwaUpdatePrompt";
import PwaStartRedirect from "./components/PwaStartRedirect";


ReactDOM
    .createRoot(document.getElementById("root"))
    .render(
        <React.StrictMode>

            <PwaStartRedirect />

            <App />

            <PwaUpdatePrompt />

        </React.StrictMode>
    );