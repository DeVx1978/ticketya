import type { Config } from 'drizzle-kit';

export default {
  schema: './packages/db/schema/index.ts',
  out: './packages/db/migrations',
  dialect: 'postgresql',
} satisfies Config;
