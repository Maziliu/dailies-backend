import Fastify, { FastifyError, FastifyRequest } from 'fastify';
import 'dotenv/config';
import { connectorRoutes } from './routes/connectors/connectors.js';
import { log, LOG_LEVEL } from './utils/logger.js';
import { prismaPlugin } from './plugins/prisma.js';

const fastify = Fastify({ logger: true });

fastify.addHook('onRequest', async (request, reply) => {
  if (request.headers['x-api-key'] !== process.env.CONNECTOR_API_KEY) {
    log(`Rejected backend hit from [${request.host}] due to no api key`, LOG_LEVEL.ERROR);
    reply.code(401).send({ message: 'UNAUTHORIZED' });
  }
});

fastify.addHook('onError', async (request: FastifyRequest, _, error: FastifyError) => {
  log(`${request.method} ${request.url} - ${error.message}`, LOG_LEVEL.ERROR);
});

fastify.addHook('preSerialization', async (request, reply, payload) => {
  return JSON.parse(JSON.stringify(payload, (_, value) => (typeof value === 'bigint' ? value.toString() : value)));
});

fastify.register(prismaPlugin);

for (const connector of connectorRoutes) {
  await fastify.register(connector);
}

fastify.listen({ port: 3000 });
