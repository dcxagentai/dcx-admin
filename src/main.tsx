/**
 * CONTEXT:
 * React entrypoint for the DCX admin frontend.
 * It wires the root app into the DOM and provides the minimum TanStack Query runtime
 * required by the bootstrap admin screen.
 */
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import "./index.css"
import App from "./App.tsx"

const queryClient = new QueryClient()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
