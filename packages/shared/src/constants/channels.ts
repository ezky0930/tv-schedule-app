// 우리가 다루는 TV 채널 목록 (지상파/종편/케이블)
// 편성표 스크래핑 대상이자 프론트 필터의 기준이 된다.
import type { Channel } from '../types/channel.js';

export const CHANNELS: Channel[] = [
  // 지상파
  { id: 'kbs1', name: 'KBS1', category: 'terrestrial', order: 1 },
  { id: 'kbs2', name: 'KBS2', category: 'terrestrial', order: 2 },
  { id: 'mbc', name: 'MBC', category: 'terrestrial', order: 3 },
  { id: 'sbs', name: 'SBS', category: 'terrestrial', order: 4 },
  { id: 'ebs', name: 'EBS', category: 'terrestrial', order: 5 },

  // 종합편성채널
  { id: 'jtbc', name: 'JTBC', category: 'general', order: 11 },
  { id: 'channela', name: '채널A', category: 'general', order: 12 },
  { id: 'mbn', name: 'MBN', category: 'general', order: 13 },
  { id: 'tvchosun', name: 'TV조선', category: 'general', order: 14 },

  // 케이블/PP
  { id: 'tvn', name: 'tvN', category: 'cable', order: 21 },
  { id: 'ena', name: 'ENA', category: 'cable', order: 22 },
];

/** id로 채널을 빠르게 찾기 위한 맵 */
export const CHANNEL_BY_ID: Record<string, Channel> = Object.fromEntries(
  CHANNELS.map((c) => [c.id, c]),
);

/** 채널 이름 -> 채널 (스크래핑 결과 매칭용) */
export const CHANNEL_BY_NAME: Record<string, Channel> = Object.fromEntries(
  CHANNELS.map((c) => [c.name, c]),
);
