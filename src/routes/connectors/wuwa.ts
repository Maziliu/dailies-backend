import { FastifyInstance } from 'fastify';
import { WUWA_REGIONS } from '../../enums/wuwa_regions.js';
import { Convene, determinePlayerRegion, fetchConveneDataFromKuro, fetchPlayerDataFromKuro, RegionData } from '../../utils/kuro.js';

export async function wuwaRoutes(server: FastifyInstance) {
  interface ConnectorWaveplatePayload {
    playerId: number;
    oauthCode: string;
    userInfoURL: string;
  }

  interface ConnectorConvenePayload {
    conveneURL: string;
  }

  server.post<{ Body: ConnectorConvenePayload }>('/wuwa/sync-convene', async (request, reply) => {
    const { conveneURL } = request.body;

    if (!conveneURL) return reply.code(400).send({ error: 'Missing conveneURL' });

    const url = new URL(conveneURL);
    const parameters = new URLSearchParams(url.hash.split('?')[1] ?? '');

    const playerId = Number(parameters.get('player_id'));
    const recordId = parameters.get('record_id');
    const serverId = parameters.get('svr_id');

    const conveneHistory: Convene[] = await fetchConveneDataFromKuro(playerId, serverId, recordId);

    const inserted = await server.prisma.wuwa_convenes.createMany({
      data: conveneHistory.map((convene) => ({
        time: new Date(convene.Timestamp),
        banner_id: Number(convene.BannerTypeId),
        resource_id: convene.ResourceId,
        quality: convene.Quality,
        convene_type: convene.ConveneType,
        name: convene.Name,
        player_id: playerId
      })),
      skipDuplicates: true
    });

    return reply.code(200).send(inserted);
  });

  server.post<{ Body: ConnectorWaveplatePayload }>('/wuwa/sync-waveplates', async (request, reply) => {
    const { playerId, oauthCode, userInfoURL } = request.body;

    const region = determinePlayerRegion(playerId);

    const playerData = await fetchPlayerDataFromKuro(oauthCode, playerId, region);
    if (!playerData.Base) return reply.code(400).send({ error: 'Failed to fetch data from Kuro' });
    const {
      Base: { Energy: energy, StoreEnergy: storeEnergy, EnergyRecoverTime: energyRecoveryTimeInMS, Name: name }
    } = playerData;

    const regionId = Object.keys(WUWA_REGIONS).indexOf(region.toUpperCase()) + 1;
    if (!regionId) return reply.code(400).send({ error: `Unknown region: ${region}` });

    const internalId = new URL(userInfoURL).searchParams.get('userId');
    if (!internalId) return reply.code(400).send({ error: 'PlayerId is not sent and userId is not found in userInfoURL' });

    const kuroPlayerData = await fetch(userInfoURL);
    if (!kuroPlayerData.ok) return reply.code(400).send({ error: 'Could not retrieve player data from Kuro' });

    const { UserInfos: userInfos }: { UserInfos: RegionData[] } = await kuroPlayerData.json();
    const match = userInfos.find((data) => data.Region === region);
    if (!match) return reply.code(404).send({ error: `No level data exists for ${region}` });
    const { Level: level } = match;

    const [, inserted] = await server.prisma.$transaction([
      server.prisma.wuwa_profiles.upsert({
        where: { player_id: playerId, region_id: regionId },
        update: { level, name },
        create: { player_id: playerId, level, name, region_id: regionId, internal_id: BigInt(internalId) }
      }),
      server.prisma.wuwa_waveplates.create({
        data: {
          player_id: playerId,
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
