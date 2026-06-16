import { FastifyInstance } from 'fastify';
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

  server.post<{ Body: { playerId: number } }>('/wuwa/waveplates', async (request, reply) => {
    const { playerId } = request.body;

    if (!playerId) {
      reply.code(400).send({
        error: 'Missing playerId'
      });
    }

    const waveplates = await server.prisma.wuwa_waveplates.findFirst({
      where: { player_id: playerId },
      orderBy: { created_at: 'desc' }
    });

    if (!waveplates) {
      reply.code(404).send({ error: `No waveplate data found for player ${playerId}` });
    }

    reply.code(200).send(waveplates);
  });
}
