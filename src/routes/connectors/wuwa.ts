import { FastifyInstance } from 'fastify';
import { WUWA_REGIONS } from '../../enums/wuwa_regions.js';

export async function wuwaRoutes(server: FastifyInstance) {
  interface ConnectorWaveplatePayload {
    playerId?: number;
    level: number;
    name: string;
    region: string;
    energy: number;
    storeEnergy: number;
    energyRecoveryTimeInMS: number;
    userInfoURL: string;
  }

  server.post<{ Body: ConnectorWaveplatePayload }>('/wuwa/sync-waveplates', async (request, reply) => {
    const { playerId, level, name, region, energy, storeEnergy, energyRecoveryTimeInMS, userInfoURL } = request.body;

    const regionId = WUWA_REGIONS[region.toUpperCase() as keyof typeof WUWA_REGIONS];
    if (!regionId) reply.code(400).send({ error: `Unknown region: ${region}` });

    let resolvedPlayerId: bigint | null = playerId ? BigInt(playerId) : null;
    if (!resolvedPlayerId) {
      const internalId = new URL(userInfoURL).searchParams.get('userId');
      if (!internalId) reply.code(400).send({ error: 'PlayerId is not sent and userId is not found in userInfoURL' });

      const profile = await server.prisma.wuwa_profiles.findUnique({
        where: { internal_id: BigInt(internalId) }
      });

      if (!profile) reply.code(404).send({ error: 'PlayerId not sent and not found in database' });
      resolvedPlayerId = profile.player_id;
    }

    const [, inserted] = await server.prisma.$transaction([
      server.prisma.wuwa_profiles.upsert({
        where: { player_id: resolvedPlayerId },
        update: { level, name, region_id: regionId },
        create: { player_id: resolvedPlayerId, level, name, region_id: regionId }
      }),
      server.prisma.wuwa_waveplates.create({
        data: {
          player_id: resolvedPlayerId,
          region_id: regionId,
          energy,
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
