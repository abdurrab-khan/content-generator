import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from './generated/prisma/client.js';

/**
 * Better Auth instance.
 *
 * Mounted by @thallesp/nestjs-better-auth at basePath "/api/auth" (default),
 * which the library automatically excludes from the Nest global prefix —
 * so auth routes live at /api/auth/* and everything else at /api/*.
 *
 * This instance owns its own Prisma client because it is created at module
 * load time, before the Nest DI container exists.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? '',
  }),
});

export const auth = betterAuth({
  appName: 'content-generator',
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:5173', // future frontend (vite)
  ],
  plugins: [bearer()],
});

export type Auth = typeof auth;
