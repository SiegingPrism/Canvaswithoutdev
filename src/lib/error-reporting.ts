type ErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    console.error("Server Error:", error, context);
    return;
  }
  console.error("App Exception Boundary caught an error:", error, {
    source: "react_error_boundary",
    route: window.location.pathname,
    ...context,
    mechanism: "react_error_boundary",
    handled: false,
    severity: "error",
  });
}
