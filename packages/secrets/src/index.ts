export type SecretReference = `secret://${string}`;
export type SecretProvider = {
  put(value: string): Promise<SecretReference>;
  get(reference: SecretReference): Promise<string | null>;
  delete(reference: SecretReference): Promise<void>;
};
/** Development-only ephemeral provider. Production adapters must use a managed vault. */
export class DevelopmentSecretProvider implements SecretProvider {
  #values = new Map<SecretReference, string>();
  async put(value: string): Promise<SecretReference> {
    const ref = `secret://dev/${crypto.randomUUID()}` as SecretReference;
    this.#values.set(ref, value);
    return ref;
  }
  async get(reference: SecretReference): Promise<string | null> {
    return this.#values.get(reference) ?? null;
  }
  async delete(reference: SecretReference): Promise<void> {
    this.#values.delete(reference);
  }
}
