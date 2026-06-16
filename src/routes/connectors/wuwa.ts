import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function wuwaRoutes(server: FastifyInstance) {
  server.get('/wuwa', (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(200).send({
      message: 'Hello'
    });
  });
}
