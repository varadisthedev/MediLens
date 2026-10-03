import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/** null when DATABASE_URL is unset: the app then runs from browser storage only. */
export const db = process.env.DATABASE_URL ? drizzle(neon(process.env.DATABASE_URL), { schema }) : null;
export { schema };
