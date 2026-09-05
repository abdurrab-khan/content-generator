/**
 * Seed: dev user (via better-auth so password hashing is correct) +
 * the default "podcast-clips" application.
 *
 *   pnpm db:seed
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { auth } from '../src/auth.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

const DEFAULT_APPLICATION_NAME = 'podcast-clips';

async function main(): Promise<void> {
  const email = process.env.DEV_USER_EMAIL ?? 'dev@example.com';
  const password = process.env.DEV_USER_PASSWORD ?? 'password123';
  const name = process.env.DEV_USER_NAME ?? 'Dev User';

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const result = await auth.api.signUpEmail({
      body: { email, password, name },
    });
    user = await prisma.user.findUniqueOrThrow({ where: { email } });
    console.log(`Created user ${result.user.email} (${user.id})`);
  } else {
    console.log(`User ${email} already exists (${user.id})`);
  }

  const application = await prisma.application.findFirst({
    where: { userId: user.id, name: DEFAULT_APPLICATION_NAME },
  });
  if (!application) {
    const created = await prisma.application.create({
      data: {
        userId: user.id,
        name: DEFAULT_APPLICATION_NAME,
        description:
          'Generate viral short clips from long-form podcast videos.',
        language: 'ENGLISH',
      },
    });
    console.log(`Created application "${created.name}" (${created.id})`);
  } else {
    console.log(
      `Application "${DEFAULT_APPLICATION_NAME}" already exists (${application.id})`,
    );
  }

  console.log('\nSeed complete. Sign in with:');
  console.log(
    `  POST /api/auth/sign-in/email  { "email": "${email}", "password": "<DEV_USER_PASSWORD>" }`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
