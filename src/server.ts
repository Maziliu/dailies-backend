import Fastify, { FastifyError, FastifyRequest } from 'fastify';
import 'dotenv/config';
import { connectorRoutes } from './routes/connectors/connectors.js';
import { log, LOG_LEVEL } from './utils/logger.js';
import { prismaPlugin } from './plugins/prisma.js';

const fastify = Fastify({ logger: true });

fastify.addHook('onError', async (request: FastifyRequest, _, error: FastifyError) => {
  await log(`${request.method} ${request.url} - ${error.message}`, LOG_LEVEL.ERROR);
});

fastify.register(prismaPlugin);

for (const connector of connectorRoutes) {
  await fastify.register(connector);
}

fastify.listen({ port: 3000 });
