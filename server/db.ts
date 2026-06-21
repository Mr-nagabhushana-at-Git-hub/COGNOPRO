import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = dbUrl ? neon(dbUrl) : null;
export const db = sql ? drizzle(sql, { schema }) : null;
