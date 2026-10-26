import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App";

import PwaUpdatePrompt from "./components/PwaUpdatePrompt";
import PwaStartRedirect from "./components/PwaStartRedirect";

console.log("MODE VITE :", import.meta.env.MODE);
console.log("SUPABASE :", import.meta.env.VITE_SUPABASE_URL);
ReactDOM
    .createRoot(document.getElementById("root"))
    .render(
        <React.StrictMode>

            <PwaStartRedirect />

            <App />

            <PwaUpdatePrompt />

        </React.StrictMode>
    );