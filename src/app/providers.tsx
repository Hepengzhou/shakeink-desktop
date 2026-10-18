"use client"

import { useEffect, useState } from "react"
import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { installTextPreviewSelection } from "@/lib/desktop/text-selection"

export function Providers({ children }: { children: React.ReactNode }) {
  // All business reads/writes use the local IPC transport. Browser network
  // availability must not pause them before they can reach the local service.
  const [queryClient] = useState(() => new QueryClient({defaultOptions:{
    queries:{networkMode:"always",refetchOnReconnect:true},
    mutations:{networkMode:"always"},
  }}))
  useEffect(() => installTextPreviewSelection(document), [])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="paper"
      themes={["paper", "ink"]}
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
