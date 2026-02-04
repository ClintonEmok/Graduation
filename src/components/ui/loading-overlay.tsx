import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading: boolean
  message?: string
}

export function LoadingOverlay({ isLoading, message, className, ...props }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      {message && <p className="mt-4 text-sm font-medium text-muted-foreground">{message}</p>}
    </div>
  )
}
