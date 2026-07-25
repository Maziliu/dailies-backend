import { WUWA_REGIONS } from '../enums/wuwa_regions.js';

const MAX_RETRIES = 5;

export interface KuroPlayerData {
  MotorData: MotorData;
  MusicData: MusicData;
  Base: Base;
  BattlePass: BattlePass;
  DecorationData: DecorationData;
}

interface MotorData {
  Level: number;
  Exp: number;
  NextExp: number;
  Skins: Skin[];
  Stickers: Sticker[];
  Decorations: unknown[];
  Frames: Frame[];
  EquipSkin: Skin;
}

interface Skin {
  SkinId: number;
  Quality: number;
}

interface Sticker {
  Id: number;
  Quality: number;
  PartId: number;
}

interface Frame {
  Id: number;
  Quality: number;
}

interface MusicData {
  Albums: Album[];
}

interface Album {
  Id: number;
  Count: number;
  TotalCount: number;
}

interface Base {
  Name: string;
  Id: number;
  CreatTime: number;
  ActiveDays: number;
  Level: number;
  WorldLevel: number;
  RoleNum: number;
  SoundBox: number;
  Energy: number;
  MaxEnergy: number;
  StoreEnergy: number;
  StoreEnergyRecoverTime: number;
  MaxStoreEnergy: number;
  EnergyRecoverTime: number;
  Liveness: number;
  LivenessMaxCount: number;
  LivenessUnlock: boolean;
  ChapterId: number;
  WeeklyInstCount: number;
  Boxes: Record<string, number>;
  BasicBoxes: Record<string, number>;
  PhantomBoxes: Record<string, number>;
  BirthMon: number;
  BirthDay: number;
  serverTimezone: number;
}

interface BattlePass {
  Level: number;
  WeekExp: number;
  WeekMaxExp: number;
  IsUnlock: boolean;
  IsOpen: boolean;
  Exp: number;
  ExpLimit: number;
}

interface DecorationData {
  Datas: Decoration[];
}

interface Decoration {
  Id: number;
  Quality: number;
  SkinOwner: number[];
  OrGroupId: number;
}

export async function fetchPlayerDataFromKuro(oauthCode: string, playerId: number, region: string): Promise<KuroPlayerData | undefined> {
  for (let attempts = 0; attempts < MAX_RETRIES; attempts++) {
    const response = await fetch('https://pc-launcher-sdk-api.kurogame.net/game/queryRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oauthCode, playerId, region })
    });

    if (!response.ok) throw new Error(`Kuro HTTP error: ${response.status}`);

    const data = await response.json();
    if (data.code === 0) return JSON.parse(data.data[region]);
    if (data.code !== 1005) throw new Error(`Kuro Unexpected code: ${data.code}`);

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

export function determinePlayerRegion(playerId: number): WUWA_REGIONS | null {
  const firstDigit = playerId.toString()[0];

  switch (firstDigit) {
    case '5':
      return WUWA_REGIONS.AMERICA;
    case '6':
      return WUWA_REGIONS.EUROPE;
    case '7':
      return WUWA_REGIONS.ASIA;
    case '8':
      return WUWA_REGIONS.HMT;
    case '9':
      return WUWA_REGIONS.SEA;

    default:
      return null;
  }
}

export interface RegionData {
  Region: string;
  Level: number;
  LastOnlineTime: number;
}
