/** Provisioning boundary. Private Beta connects an existing project and never
 * fabricates provisioning credentials; a real provider can implement this later. */
export interface SupabaseProvisioningProvider {
  provision(input: { projectId: string; workspaceId: string }): Promise<never>;
}

export class ExistingSupabaseProjectProvider implements SupabaseProvisioningProvider {
  async provision(): Promise<never> {
    throw new Error("SUPABASE_PROVISIONING_UNAVAILABLE");
  }
}
