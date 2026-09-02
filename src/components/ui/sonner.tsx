"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme="light"
      position="bottom-right"
      visibleToasts={3}
      expand={false}
      gap={10}
      duration={4500}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5 text-[#10B981]" />,
        info: <InfoIcon className="size-5 text-[#3B82F6]" />,
        warning: <TriangleAlertIcon className="size-5 text-[#F59E0B]" />,
        error: <OctagonXIcon className="size-5 text-[#EF4444]" />,
        loading: <Loader2Icon className="size-5 animate-spin text-[#7C3AED]" />,
      }}
      toastOptions={{
        classNames: {
          toast: "group toast bg-white/95 backdrop-blur-xl border border-[#E8E4F3] shadow-[0_20px_45px_-12px_rgba(124,58,237,0.18)] rounded-2xl p-4 flex items-start gap-3.5 transition-all overflow-hidden relative ring-1 ring-black/5",
          title: "text-[#1A1523] font-bold text-[13.5px] leading-snug",
          description: "text-[#6B7280] text-[12.5px] mt-1 leading-snug",
          icon: "mt-0.5 shrink-0",
          success: "border-l-4 border-l-[#10B981]",
          error: "border-l-4 border-l-[#EF4444]",
          warning: "border-l-4 border-l-[#F59E0B]",
          info: "border-l-4 border-l-[#3B82F6]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
