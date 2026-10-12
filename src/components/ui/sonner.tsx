"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

const Toaster = ({ theme: explicitTheme, className, style, icons, toastOptions, position, offset, mobileOffset, ...props }: ToasterProps) => {
  const { theme, resolvedTheme } = useTheme()
  const sonnerTheme = explicitTheme ?? (theme === "ink" || theme === "dark" || theme === "system" && resolvedTheme === "dark" ? "dark" : "light")

  return (
    <Sonner
      {...props}
      theme={sonnerTheme}
      className={cn("toaster group desktop-toaster", className)}
      position={position}
      offset={offset}
      mobileOffset={mobileOffset}
      icons={{
        success: <CircleCheckIcon size={20} />,
        info: <InfoIcon size={20} />,
        warning: <TriangleAlertIcon size={20} />,
        error: <OctagonXIcon size={20} />,
        loading: <Loader2Icon size={20} className="desktop-toast-spin" />,
        ...icons,
      }}
      style={
        {
          "--width": "420px",
          "--normal-bg": "var(--desktop-toast-surface)",
          "--normal-text": "var(--desktop-toast-text)",
          "--normal-border": "var(--desktop-toast-border)",
          "--border-radius": "12px",
          "--desktop-toast-top": offset === undefined ? "calc(44px / var(--desktop-caption-zoom, 1) + 16px)" : "var(--offset-top)",
          "--desktop-toast-mobile-top": mobileOffset === undefined ? "calc(44px / var(--desktop-caption-zoom, 1) + 16px)" : "var(--mobile-offset-top)",
          "--desktop-toast-left": offset === undefined ? "16px" : "var(--offset-left)",
          "--desktop-toast-right": offset === undefined ? "16px" : "var(--offset-right)",
          "--desktop-toast-mobile-left": mobileOffset === undefined ? "16px" : "var(--mobile-offset-left)",
          "--desktop-toast-mobile-right": mobileOffset === undefined ? "16px" : "var(--mobile-offset-right)",
          ...style,
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: cn("cn-toast", toastOptions?.classNames?.toast),
        },
      }}
    />
  )
}

export { Toaster }
