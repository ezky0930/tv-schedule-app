// TV 편성표 도메인 서비스.
// 스크래핑 오케스트레이션 + 파일 캐시 + 요일/채널 필터 + "지금 방영 중" 계산을 담당한다.
import {
  CHANNELS,
  CHANNEL_BY_ID,
  dayOfWeekFromDate,
  type Program,
  type DayOfWeek,
} from '@tv/shared';
import { scrapeChannelSchedule } from '../scrapers/naverSchedule.js';
import { matchTitle, cleanTitle } from '../tmdb/match.js';
import {
  readScheduleCache,
  writeScheduleCache,
  isFresh,
  type ScheduleCacheData,
} from '../cache/scheduleCache.js';

/** 편성표 캐시 신선도 기준(시간). 이 시간보다 오래되면 재스크래핑. */
const MAX_AGE_HOURS = 12;
/** 채널 간 요청 간격(ms) — 차단 위험을 줄이기 위한 예의상 딜레이 */
const REQUEST_DELAY_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 동시 다발적 재스크래핑을 막기 위한 in-flight 플래그 */
let refreshing: Promise<ScheduleCacheData> | null = null;
/** 메모리에 들고 있는 최신 캐시(파일 IO 절약) */
let memoryCache: ScheduleCacheData | null = null;

/**
 * 모든 채널의 주간 편성표를 새로 스크래핑한다.
 * 채널별로 에러를 격리해, 일부가 실패해도 나머지는 살린다(폴백/내결함성).
 */
async function refreshSchedules(): Promise<ScheduleCacheData> {
  const programs: Program[] = [];
  const channelStatus: ScheduleCacheData['channelStatus'] = {};

  for (const channel of CHANNELS) {
    try {
      const list = await scrapeChannelSchedule(channel);
      programs.push(...list);
      channelStatus[channel.id] = { count: list.length, ok: list.length > 0 };
      if (list.length === 0) {
        channelStatus[channel.id].error = '편성 데이터를 찾지 못함(구조 변경 가능성)';
      }
    } catch (err) {
      // 한 채널이 막혀도 전체는 계속 진행
      channelStatus[channel.id] = {
        count: 0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
      console.warn(`[scrape] ${channel.name} 실패:`, channelStatus[channel.id].error);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const data: ScheduleCacheData = {
    fetchedAt: new Date().toISOString(),
    programs,
    channelStatus,
  };
  memoryCache = data;
  await writeScheduleCache(data);
  console.log(
    `[scrape] 편성표 갱신 완료 — ${programs.length}개 프로그램, 성공 채널 ${
      Object.values(channelStatus).filter((s) => s.ok).length
    }/${CHANNELS.length}`,
  );
  return data;
}

/**
 * 신선한 편성표 데이터를 보장해서 반환한다.
 * - 메모리/파일 캐시가 신선하면 그대로.
 * - 오래됐거나 없으면 재스크래핑(동시 호출은 하나로 합침).
 */
export async function getScheduleData(): Promise<ScheduleCacheData> {
  // 1) 메모리 캐시
  if (isFresh(memoryCache, MAX_AGE_HOURS)) return memoryCache!;

  // 2) 파일 캐시
  if (!memoryCache) {
    const fromFile = await readScheduleCache();
    if (fromFile) memoryCache = fromFile;
    if (isFresh(memoryCache, MAX_AGE_HOURS)) return memoryCache!;
  }

  // 3) 재스크래핑 (in-flight 합치기)
  if (!refreshing) {
    refreshing = refreshSchedules().finally(() => {
      refreshing = null;
    });
  }
  try {
    return await refreshing;
  } catch (err) {
    // 스크래핑이 통째로 실패해도, 오래된 캐시라도 있으면 그걸 준다(graceful degradation).
    if (memoryCache) {
      console.warn('[scrape] 갱신 실패 — 오래된 캐시로 응답:', err);
      return memoryCache;
    }
    throw err;
  }
}

/** 동시 실행 수를 제한해 async 매핑 (TMDB rate limit·과부하 방지) */
async function pMap<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * 프로그램 목록을 TMDB 매칭으로 보강한다(평점·인기도·tmdbId).
 * 정제 제목 기준으로 유니크하게 모아 한 번씩만 조회하고(캐시), 결과를 전체에 매핑한다.
 */
async function enrichWithPopularity(programs: Program[]): Promise<Program[]> {
  const uniqueTitles = [...new Set(programs.map((p) => cleanTitle(p.title)).filter((t) => t.length >= 2))];
  const matches = await pMap(uniqueTitles, 6, async (t) => [t, await matchTitle(t)] as const);
  const matchMap = new Map(matches);

  return programs.map((p) => {
    const m = matchMap.get(cleanTitle(p.title));
    if (!m) return p;
    return {
      ...p,
      tmdbRating: m.rating,
      tmdbPopularity: m.popularity,
      tmdbVoteCount: m.voteCount,
      tmdbId: m.tmdbId,
    };
  });
}

/**
 * 베이지안 가중 평점(IMDb Top 방식).
 * 투표 수가 적은 항목의 평점을 평균(C)쪽으로 끌어내려, ★10.0(투표 1개) 같은 노이즈를 누른다.
 *   WR = v/(v+m)·R + m/(v+m)·C
 */
function weightedRating(rating = 0, votes = 0): number {
  const m = 100; // 신뢰를 위한 최소 투표 수
  const C = 6.5; // 전체 평균 평점(사전값)
  return (votes / (votes + m)) * rating + (m / (votes + m)) * C;
}

/**
 * 특정 요일(+선택 채널)의 편성표를 반환.
 * @param sort 'time'(기본, 채널·시간순) | 'popular'(TMDB 인기도순 — 매칭된 항목만)
 */
export async function getSchedule(
  day?: DayOfWeek,
  channelId?: string,
  sort: 'time' | 'popular' = 'time',
): Promise<{ programs: Program[]; fetchedAt: string }> {
  const data = await getScheduleData();
  let list = data.programs;
  if (day) list = list.filter((p) => p.day === day);
  if (channelId) list = list.filter((p) => p.channelId === channelId);

  if (sort === 'popular') {
    // TMDB 매칭 후 가중 평점 내림차순. (사용자 선택: "TMDB 평점으로 인기순")
    // 투표 수를 반영해 무명·소수투표의 ★10.0 노이즈를 누르고, 화제작이 위로 오게 한다.
    const enriched = await enrichWithPopularity(list);
    const matched = enriched
      // 평점이 있고, 최소 투표 수(5표) 이상 — 투표 1~2개짜리 오매칭/노이즈 제외
      .filter((p) => (p.tmdbRating ?? 0) > 0 && (p.tmdbVoteCount ?? 0) >= 5)
      .sort(
        (a, b) =>
          weightedRating(b.tmdbRating, b.tmdbVoteCount) -
          weightedRating(a.tmdbRating, a.tmdbVoteCount),
      );
    return { programs: matched, fetchedAt: data.fetchedAt };
  }

  // 기본: 채널 order → 시작시간 순 정렬
  list = [...list].sort((a, b) => {
    const ca = CHANNEL_BY_ID[a.channelId]?.order ?? 999;
    const cb = CHANNEL_BY_ID[b.channelId]?.order ?? 999;
    if (ca !== cb) return ca - cb;
    return a.startTime.localeCompare(b.startTime);
  });
  return { programs: list, fetchedAt: data.fetchedAt };
}

/** 로컬 기준 'YYYY-MM-DD' */
function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * 지금 방영 중인 프로그램(채널별 1개)을 반환한다.
 * 오늘 날짜 + 현재 시각이 [startTime, endTime) 에 드는 프로그램을 채널별로 고른다.
 */
export async function getNowPlaying(): Promise<{ programs: Program[]; fetchedAt: string }> {
  const data = await getScheduleData();
  const now = new Date();
  const todayStr = localDateString(now);
  const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0',
  )}`;
  const todayKey: DayOfWeek = dayOfWeekFromDate(now);

  // 채널별로 현재 시각에 방영 중인 프로그램을 찾는다.
  const byChannel = new Map<string, Program>();
  for (const p of data.programs) {
    // 오늘 날짜 우선, 날짜 정보가 없으면 요일로 보조 매칭
    const matchesToday = p.date ? p.date === todayStr : p.day === todayKey;
    if (!matchesToday) continue;
    if (p.startTime > nowHHMM) continue; // 아직 시작 안 함
    if (p.endTime && p.endTime <= nowHHMM) continue; // 이미 끝남
    // 같은 채널에서 더 늦게 시작한(=더 현재에 가까운) 프로그램을 채택
    const prev = byChannel.get(p.channelId);
    if (!prev || p.startTime > prev.startTime) byChannel.set(p.channelId, p);
  }

  const programs = [...byChannel.values()].sort(
    (a, b) =>
      (CHANNEL_BY_ID[a.channelId]?.order ?? 999) - (CHANNEL_BY_ID[b.channelId]?.order ?? 999),
  );
  return { programs, fetchedAt: data.fetchedAt };
}

/**
 * 편성표에서 제목으로 프로그램을 검색한다(통합 검색용).
 * 같은 (채널,제목) 은 1건으로 묶고, 오늘 이후 가장 빠른 방영을 대표로 고른다.
 */
export async function searchTvPrograms(query: string): Promise<Program[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const data = await getScheduleData();
  const todayStr = localDateString(new Date());

  // (채널|제목) → 대표 프로그램
  const best = new Map<string, Program>();
  for (const p of data.programs) {
    if (!p.title.toLowerCase().includes(q)) continue;
    const key = `${p.channelId}|${p.title}`;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, p);
      continue;
    }
    // 대표 선정: 오늘 이후(앞으로 방영)를 우선, 그 안에서 가장 빠른 날짜·시간
    const score = (x: Program) =>
      `${(x.date ?? '') >= todayStr ? '0' : '1'}${x.date ?? ''}${x.startTime}`;
    if (score(p) < score(prev)) best.set(key, p);
  }

  return [...best.values()].sort((a, b) => {
    const ca = CHANNEL_BY_ID[a.channelId]?.order ?? 999;
    const cb = CHANNEL_BY_ID[b.channelId]?.order ?? 999;
    if (ca !== cb) return ca - cb;
    return a.title.localeCompare(b.title);
  });
}

/** 현재 캐시 상태(채널별 성공/실패) — 디버깅·상태 표시용 */
export async function getScheduleStatus(): Promise<{
  fetchedAt: string | null;
  channelStatus: ScheduleCacheData['channelStatus'];
  total: number;
}> {
  const data = memoryCache ?? (await readScheduleCache());
  return {
    fetchedAt: data?.fetchedAt ?? null,
    channelStatus: data?.channelStatus ?? {},
    total: data?.programs.length ?? 0,
  };
}

/** 백그라운드 주기 갱신 스케줄러 (기본 12시간마다). 서버 기동 시 1회 호출. */
export function startScheduleScheduler(): void {
  const intervalMs = MAX_AGE_HOURS * 60 * 60 * 1000;
  setInterval(() => {
    refreshSchedules().catch((err) => console.warn('[scheduler] 주기 갱신 실패:', err));
  }, intervalMs).unref(); // 프로세스 종료를 막지 않도록 unref
}
