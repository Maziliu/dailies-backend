import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { WUWA_REGIONS } from '../../enums/wuwa_regions.js';

export async function wuwaRoutes(server: FastifyInstance) {
  interface ConnectorWaveplatePayload {
    playerId: number;
    region: string;
    energy: number;
    storeEnergy: number;
    energyRecoveryTimeInMS: number;
  }

  server.post<{ Body: ConnectorWaveplatePayload }>('/wuwa/sync-waveplates', async (request, reply) => {
    const { playerId, region, energy, storeEnergy, energyRecoveryTimeInMS } = request.body;

    await server.prisma.wuwa_waveplates.create({
      data: {
        player_id: playerId,
        region_id: WUWA_REGIONS[region.toUpperCase() as keyof typeof WUWA_REGIONS],
        energy: energy,
        store_energy: storeEnergy,
        energy_recover_time: energyRecoveryTimeInMS
      }
    });

    reply.code(200).send({ messaage: `Successfully updated waveplates for ${playerId} ${region}` });
  });

  server.get('/wuwa', (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(200).send({
      message: 'Hello'
    });
  });
}
