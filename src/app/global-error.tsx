"use client";

import { useEffect } from "react";

/**
 * Top-level fallback — rendered only when the root layout itself crashes.
 * No Providers / layout chrome is available here, so this page must be
 * self-contained and style itself inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          background: "#fafafa",
          color: "#0a0a0a",
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: "28rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            The dashboard failed to load
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#52525b", margin: 0 }}>
            A fatal error occurred. Please refresh the page. If the problem persists,
            contact your admin.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.75rem",
                color: "#71717a",
                margin: 0,
              }}
            >
              Error ID: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              alignSelf: "center",
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "white",
              backgroundColor: "#0d4a1e",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
