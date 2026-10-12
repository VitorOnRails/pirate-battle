import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./ui/App";
import { queryClient } from "./data/queries";
import { startMockNetwork } from "./mocks/browser";
import { initUiClickSound } from "./audio/sounds";

async function main() {
  try {
    await startMockNetwork();
  } catch (err) {
    console.error("[mock] failed to start", err);
  }
  initUiClickSound();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void main();
