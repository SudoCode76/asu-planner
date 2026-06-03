"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
})

function resolveTheme(theme: Theme) {
  if (theme !== "system") return theme

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system"

    const storedTheme = window.localStorage.getItem("theme")

    return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : "system"
  })

  const applyTheme = useCallback((nextTheme: Theme) => {
    const resolvedTheme = resolveTheme(nextTheme)

    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    document.documentElement.style.colorScheme = resolvedTheme
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [applyTheme, theme])

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      if (theme === "system") {
        applyTheme("system")
      }
    }

    media.addEventListener("change", onChange)

    return () => media.removeEventListener("change", onChange)
  }, [applyTheme, theme])

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      window.localStorage.setItem("theme", nextTheme)
      setThemeState(nextTheme)
      applyTheme(nextTheme)
    },
    [applyTheme]
  )

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
