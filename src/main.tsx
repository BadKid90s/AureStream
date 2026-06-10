import React from "react"
import ReactDOM from "react-dom/client"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { PlatformProvider } from "@/contexts/PlatformContext"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <PlatformProvider>
          <App />
        </PlatformProvider>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>
)
