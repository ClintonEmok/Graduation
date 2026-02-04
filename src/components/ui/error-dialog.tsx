import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

interface ErrorDialogProps {
  isOpen: boolean
  onClose: () => void
  onRetry?: () => void
  title?: string
  error?: Error | string | null
}

export function ErrorDialog({
  isOpen,
  onClose,
  onRetry,
  title = "An error occurred",
  error,
}: ErrorDialogProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  // Extract message and stack safely
  const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : "An unknown error occurred")
  const errorStack = error instanceof Error ? error.stack : null

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="flex flex-col gap-2">
            <span>{errorMessage}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorStack && (
          <div className="my-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-xs text-muted-foreground hover:text-foreground outline-none"
              type="button"
            >
              {showDetails ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronRight className="mr-1 h-3 w-3" />}
              {showDetails ? "Hide" : "Show"} Technical Details
            </button>
            {showDetails && (
              <div className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs font-mono whitespace-pre-wrap break-all">
                {errorStack}
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
          {onRetry && (
            <AlertDialogAction onClick={onRetry}>Retry</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
