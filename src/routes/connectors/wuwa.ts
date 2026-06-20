import { FastifyInstance } from 'fastify';
import { WUWA_REGIONS } from '../../enums/wuwa_regions.js';
import { log } from '../../utils/logger.js';

export async function wuwaRoutes(server: FastifyInstance) {
  interface ConnectorWaveplatePayload {
    playerId: number;
    level: number;
    name: string;
    region: string;
    energy: number;
    storeEnergy: number;
    energyRecoveryTimeInMS: number;
  }

  server.post<{ Body: ConnectorWaveplatePayload }>('/wuwa/sync-waveplates', async (request, reply) => {
    const { playerId, level, name, region, energy, storeEnergy, energyRecoveryTimeInMS } = request.body;

    const regionId = WUWA_REGIONS[region.toUpperCase() as keyof typeof WUWA_REGIONS];

    if (!regionId) {
      return reply.code(400).send({ error: `Unknown region: ${region}` });
    }

    const [, inserted] = await server.prisma.$transaction([
      server.prisma.wuwa_profiles.upsert({
        where: { player_id: playerId },
        update: { level: level, name: name, region_id: regionId },
        create: { player_id: playerId, level: level, name: name, region_id: regionId }
      }),
      server.prisma.wuwa_waveplates.create({
        data: {
          player_id: playerId,
          region_id: regionId,
          energy: energy,
          store_energy: storeEnergy,
          energy_recover_time: energyRecoveryTimeInMS
        }
      })
    ]);

    reply.code(200).send(inserted);
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
