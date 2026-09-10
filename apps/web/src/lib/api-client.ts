import { TypedApiClient } from "@autuax/contracts";

export const apiClient = new TypedApiClient({
  baseUrl:
    typeof window !== "undefined" && window.location.origin.includes("3000")
      ? "http://localhost:4000"
      : "http://localhost:4000",
  timeoutMs: 8000,
});
