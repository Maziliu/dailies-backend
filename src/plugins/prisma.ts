import { PrismaPg } from '@prisma/adapter-pg';
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '../generated/prisma/client.js';
import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp(async (server: FastifyInstance) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  attachDatabasePool(pool);

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();
  server.decorate('prisma', prisma);

  server.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });
});
