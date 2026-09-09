/**
 * Web-build-only replacement for server authentication.
 * Server functions are not invoked while static public pages are prerendered;
 * throwing on access prevents accidental runtime-auth coupling in that phase.
 */
export const auth = {
  api: {
    async getSession() {
      return { headers: new Headers(), response: null };
    }
  }
};
