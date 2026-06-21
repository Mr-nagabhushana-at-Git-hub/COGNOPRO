import 'dotenv/config';
import { execSync } from 'child_process';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (dbUrl) {
  console.log("Database URL detected. Pushing schema...");
  try {
    execSync("npx drizzle-kit push", { stdio: 'inherit' });
    console.log("Schema pushed successfully!");
  } catch (err) {
    console.error("Failed to push schema:", err);
    process.exit(1);
  }
} else {
  console.log("No Database URL detected. Skipping schema push.");
}
