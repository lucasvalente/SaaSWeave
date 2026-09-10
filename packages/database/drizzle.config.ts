import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://autuax:autuax_dev_password@localhost:5432/autuax_dev",
  },
  strict: true,
  verbose: true,
});
