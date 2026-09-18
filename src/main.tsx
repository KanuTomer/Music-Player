import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Application root element is missing");

const maintenance = import.meta.env["VITE_CUTOVER_MAINTENANCE"] === "true";

createRoot(root).render(
  <StrictMode>
    {maintenance ? (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground">
        <div>
          <h1 className="text-xl font-semibold">We’ll be back shortly</h1>
          <p className="mt-2 text-sm text-muted-foreground">A scheduled update is in progress.</p>
        </div>
      </main>
    ) : (
      <RouterProvider router={router} />
    )}
  </StrictMode>,
);
