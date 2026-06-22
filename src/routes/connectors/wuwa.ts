import { FastifyInstance } from 'fastify';
import { WUWA_REGIONS } from '../../enums/wuwa_regions.js';
import { fetchPlayerDataFromKuro } from '../../utils/kuro.js';

export async function wuwaRoutes(server: FastifyInstance) {
  interface ConnectorWaveplatePayload {
    playerId?: number;
    oauthCode: string;
    userInfoURL: string;
  }

  server.post<{ Body: ConnectorWaveplatePayload }>('/wuwa/sync-waveplates', async (request, reply) => {
    const { playerId, oauthCode, userInfoURL } = request.body;

    const kuroPlayerData = await fetch(userInfoURL);
    if (!kuroPlayerData) return reply.code(400).send({ error: 'Could not retrieve player data from Kuro' });

    const {
      UserInfos: [{ Region: region, Level: level }]
    } = await kuroPlayerData.json();

    const playerData = await fetchPlayerDataFromKuro(oauthCode, playerId, region);

    if (!playerData) return reply.code(400).send({ error: 'Failed to fetch data from Kuro' });

    const {
      Base: { Energy: energy, StoreEnergy: storeEnergy, EnergyRecoverTime: energyRecoveryTimeInMS, Name: name }
    } = playerData;

    const regionId = WUWA_REGIONS[region.toUpperCase() as keyof typeof WUWA_REGIONS];
    if (!regionId) return reply.code(400).send({ error: `Unknown region: ${region}` });

    const internalId = new URL(userInfoURL).searchParams.get('userId');
    if (!internalId) return reply.code(400).send({ error: 'PlayerId is not sent and userId is not found in userInfoURL' });

    let resolvedPlayerId: bigint | null = playerId ? BigInt(playerId) : null;
    if (!resolvedPlayerId) {
      const profile = await server.prisma.wuwa_profiles.findUnique({
        where: { internal_id: BigInt(internalId) }
      });

      if (!profile) return reply.code(404).send({ error: 'PlayerId not sent and not found in database' });
      resolvedPlayerId = profile.player_id;
    }

    const [, inserted] = await server.prisma.$transaction([
      server.prisma.wuwa_profiles.upsert({
        where: { player_id: resolvedPlayerId, region_id: regionId },
        update: { level, name },
        create: { player_id: resolvedPlayerId, level, name, region_id: regionId, internal_id: BigInt(internalId) }
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

    return reply.code(200).send(inserted);
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
