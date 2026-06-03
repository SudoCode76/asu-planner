"use client"

import { useEffect } from "react"

type AuthFeedbackProps = {
  error?: string | null
  message?: string | null
}

export function AuthFeedback({ error, message }: AuthFeedbackProps) {
  useEffect(() => {
    const url = new URL(window.location.href)

    if (!url.searchParams.has("error") && !url.searchParams.has("message")) {
      return
    }

    url.searchParams.delete("error")
    url.searchParams.delete("message")
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
  }, [])

  if (!error && !message) {
    return null
  }

  return (
    <>
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </>
  )
}
