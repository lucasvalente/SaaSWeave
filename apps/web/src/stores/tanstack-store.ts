import { Store } from "@tanstack/store";

export interface SessionUiState {
  lastActiveRoute: string;
}

export const sessionUiStore = new Store<SessionUiState>({
  lastActiveRoute: "/",
});
