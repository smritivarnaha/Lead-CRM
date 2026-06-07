"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme="light"
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
          toast: "group toast bg-white/95 backdrop-blur-xl border border-[#F3F0FF] shadow-[0_20px_40px_-15px_rgba(124,58,237,0.15)] rounded-2xl p-4 flex items-start gap-3.5 transition-all overflow-hidden relative overflow-hidden ring-1 ring-black/5",
          title: "text-[#1A1523] font-bold text-[14px] leading-snug",
          description: "text-[#6B7280] text-[13px] mt-1 leading-snug",
          icon: "mt-0.5 shrink-0",
          success: "border-l-4 border-l-[#10B981] bg-gradient-to-r from-[#ECFDF5] to-transparent",
          error: "border-l-4 border-l-[#EF4444] bg-gradient-to-r from-[#FEF2F2] to-transparent",
          warning: "border-l-4 border-l-[#F59E0B] bg-gradient-to-r from-[#FFFBEB] to-transparent",
          info: "border-l-4 border-l-[#3B82F6] bg-gradient-to-r from-[#EFF6FF] to-transparent",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
