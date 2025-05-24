// src/app/error.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Unhandled Runtime Error:", error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-background text-foreground">
        <div className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4">
          <Card className="w-full max-w-lg text-center shadow-xl">
            <CardHeader>
              <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
              <CardTitle className="text-2xl text-destructive">
                Oops! Something Went Wrong
              </CardTitle>
              <CardDescription>
                We encountered an unexpected error. Please try again, or contact support if the issue persists.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && error?.message && (
                <div className="mt-2 rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
                  <p className="font-semibold">Error Details (Development Mode):</p>
                  <pre className="mt-1 whitespace-pre-wrap break-all">{error.message}</pre>
                  {error.digest && <p className="mt-1">Digest: {error.digest}</p>}
                </div>
              )}
              <Button onClick={() => reset()} size="lg" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
