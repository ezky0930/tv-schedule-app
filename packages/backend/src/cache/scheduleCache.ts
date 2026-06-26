// 편성표 파일 캐시.
// 편성표는 하루 1~2회만 갱신해도 충분하므로, 스크래핑 결과를 파일에 저장해두고 재사용한다.
// 서버 재시작 후에도 캐시가 남아 불필요한 재스크래핑을 피한다.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Program } from '@tv/shared';

/** 캐시 파일 위치 (backend 작업 디렉토리 기준 .cache/schedule.json) */
const CACHE_DIR = path.resolve(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'schedule.json');

export interface ScheduleCacheData {
  /** 수집 시각 (ISO) */
  fetchedAt: string;
  /** 전 채널의 주간 프로그램 목록 (flat) */
  programs: Program[];
  /** 채널별 스크래핑 성공 여부 (디버깅/상태 표시용) */
  channelStatus: Record<string, { count: number; ok: boolean; error?: string }>;
}

/** 파일에서 캐시를 읽는다. 없으면 null. */
export async function readScheduleCache(): Promise<ScheduleCacheData | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(raw) as ScheduleCacheData;
  } catch {
    return null;
  }
}

/** 캐시를 파일에 저장한다. */
export async function writeScheduleCache(data: ScheduleCacheData): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(data), 'utf-8');
}

/** 캐시가 maxAgeHours 시간 이내로 신선한지 */
export function isFresh(data: ScheduleCacheData | null, maxAgeHours: number): boolean {
  if (!data) return false;
  const ageMs = Date.now() - new Date(data.fetchedAt).getTime();
  return ageMs < maxAgeHours * 60 * 60 * 1000;
}
