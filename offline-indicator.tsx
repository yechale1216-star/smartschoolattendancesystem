"use client"

import { useOnline } from "@/hooks/use-online"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WifiOff, Wifi, Cloud } from "lucide-react"
import { useEffect, useState } from "react"

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnline()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShow(true)
    } else if (wasOffline) {
      setShow(true)
      // Hide the "back online" message after 5 seconds
      const timer = setTimeout(() => setShow(false), 5000)
      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [isOnline, wasOffline])

  if (!show) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-2">
      {!isOnline ? (
        <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800">
          <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200 font-medium">
            You're offline. Changes will sync when you're back online.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
            Back online! Syncing your changes...
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export function ConnectionStatus() {
  const { isOnline } = useOnline()

  return (
    <div className="flex items-center gap-2 text-sm">
      {isOnline ? (
        <>
          <Cloud className="h-4 w-4 text-green-600" />
          <span className="text-muted-foreground">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-orange-600" />
          <span className="text-muted-foreground">Offline</span>
        </>
      )}
    </div>
  )
}
