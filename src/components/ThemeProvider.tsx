
// src/components/ThemeProvider.tsx
"use client";

import * as React from "react";
import type { ThemeProviderProps } from "next-themes/dist/types";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props} defaultTheme="dark" attribute="class" enableSystem disableTransitionOnChange>{children}</NextThemesProvider>;
}

