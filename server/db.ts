import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
export const db = sql ? drizzle(sql, { schema }) : null;
