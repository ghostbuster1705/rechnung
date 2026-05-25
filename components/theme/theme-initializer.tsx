"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  return null;
}
