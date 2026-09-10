export const tokens = {
  colors: {
    primary: {
      DEFAULT: "#0284c7",
      hover: "#0369a1",
      foreground: "#ffffff",
    },
    background: {
      DEFAULT: "#0f172a",
      card: "#1e293b",
      muted: "#334155",
    },
    text: {
      DEFAULT: "#f8fafc",
      muted: "#94a3b8",
    },
    status: {
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
      info: "#3b82f6",
    },
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  radius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
  },
} as const;

export type Tokens = typeof tokens;
