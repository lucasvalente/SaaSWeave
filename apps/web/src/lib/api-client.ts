import { TypedApiClient } from "@autuax/contracts";

const getBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }
  if (window.location.port === "3000") {
    return "http://localhost:4000";
  }
  return `${window.location.origin}/api`;
};

export const apiClient = new TypedApiClient({
  baseUrl: getBaseUrl(),
  timeoutMs: 8000,
});
