import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl || "",
  },
});
