// OTT 도메인 서비스.
// 라우트는 이 서비스만 호출하고, TMDB 호출·캐싱·정규화의 세부는 여기서 담당한다.
import type { MediaType, OttContent, OttProviderId, WatchProvider } from '@tv/shared';
import { OTT_BY_ID, OTT_PROVIDERS, TMDB_DEFAULTS } from '@tv/shared';
import { tmdbGet } from '../tmdb/client.js';
import { cached, TTL } from '../cache/memoryCache.js';
import {
  normalizeListItem,
  normalizeProviders,
  makeContentId,
  type TmdbListItem,
  type TmdbWatchProvidersResult,
} from '../tmdb/normalize.js';
import { posterUrl, backdropUrl, logoUrl } from '../tmdb/images.js';
import { genreNames } from '../tmdb/genres.js';

interface TmdbPagedResult {
  results: TmdbListItem[];
}

const REGION = TMDB_DEFAULTS.region; // 'KR'

/** 우리가 다루는 OTT 의 TMDB provider id 들을 OR(|) 로 연결 — discover 의 with_watch_providers 용 */
const PROVIDER_IDS = OTT_PROVIDERS.map((p) => p.tmdbProviderId).join('|');

/** 동시 실행 수 제한 async 매핑 */
async function pMap<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

/** 콘텐츠의 KR 시청 제공처를 가져온다(콘텐츠별 캐시). discover 응답엔 제공처가 없어 별도 조회. */
async function fetchProvidersFor(mediaType: MediaType, tmdbId: number): Promise<WatchProvider[]> {
  const { value } = await cached(`providers:${mediaType}:${tmdbId}`, TTL.list, async () => {
    const d = await tmdbGet<TmdbWatchProvidersResult>(`/${mediaType}/${tmdbId}/watch/providers`);
    return normalizeProviders(d, REGION);
  });
  return value;
}

/** 목록의 각 콘텐츠에 "어디서 볼 수 있는지"(providers) 를 붙인다. (동시 8개) */
async function enrichWithProviders(items: OttContent[]): Promise<OttContent[]> {
  return pMap(items, 8, async (c) => {
    try {
      const providers = await fetchProvidersFor(c.mediaType, c.tmdbId);
      return { ...c, providers };
    } catch {
      return c;
    }
  });
}

/** 목록 응답을 normalize 하고 person/잘못된 항목을 제거 */
async function normalizeList(
  items: TmdbListItem[],
  fallbackType: MediaType,
): Promise<OttContent[]> {
  const normalized = await Promise.all(
    items.map((it) => normalizeListItem(it, fallbackType)),
  );
  return normalized.filter((x): x is OttContent => x !== null);
}

/**
 * 전체 인기작 — "한국 OTT 에서 실제로 볼 수 있는 한국 콘텐츠"를 인기순으로.
 *
 * 과거엔 /trending/all/week(전 세계 트렌딩)을 썼는데, 한국 OTT 에 없는 극장 영화·해외물까지
 * 섞여 "실제와 다르다"는 문제가 있었다. 그래서 discover 로
 *   watch_region=KR + 우리 5개 OTT 제공 + with_origin_country=KR
 * 조건을 걸어 한국 인기작만 가져오고, 각 항목에 제공처(어느 OTT인지)를 붙인다.
 */
export async function getTrending(): Promise<{ items: OttContent[]; fromCache: boolean }> {
  const { value, fromCache } = await cached('ott:trending:kr', TTL.list, async () => {
    const common = {
      watch_region: REGION,
      with_watch_providers: PROVIDER_IDS,
      with_watch_monetization_types: 'flatrate',
      with_origin_country: 'KR',
      sort_by: 'popularity.desc',
      page: 1,
    };
    const [tv, movie] = await Promise.all([
      tmdbGet<TmdbPagedResult>('/discover/tv', common),
      tmdbGet<TmdbPagedResult>('/discover/movie', common),
    ]);
    const [tvItems, movieItems] = await Promise.all([
      normalizeList(tv.results, 'tv'),
      normalizeList(movie.results, 'movie'),
    ]);
    const merged = [...tvItems, ...movieItems]
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 24);
    // 각 카드에 "어디서 볼 수 있는지" 배지를 달기 위해 제공처 부착
    return enrichWithProviders(merged);
  });
  return { items: value, fromCache };
}

/** 특정 OTT 의 인기작 — 한국 콘텐츠를 앞에, 그다음 인기 해외작.
 *
 * 글로벌 인기순만 쓰면 1999년 미드(로앤오더 등)가 위에 떠서 "한국 넷플릭스 인기작"
 * 느낌이 안 났다. 그래서 같은 OTT 안에서
 *   (1) 한국 콘텐츠(with_origin_country=KR) 인기순  →  (2) 전체 인기순
 * 을 합쳐 한국 콘텐츠가 위로 오게 한다. 각 항목엔 제공처(어느 OTT인지)도 부착.
 */
export async function getByProvider(
  provider: OttProviderId,
): Promise<{ items: OttContent[]; fromCache: boolean }> {
  const tmdbProviderId = OTT_BY_ID[provider].tmdbProviderId;

  const { value, fromCache } = await cached(`ott:provider:${provider}`, TTL.list, async () => {
    const base = {
      watch_region: REGION,
      with_watch_providers: tmdbProviderId,
      with_watch_monetization_types: 'flatrate',
      sort_by: 'popularity.desc',
      page: 1,
    };
    const krParams = { ...base, with_origin_country: 'KR' };

    // 한국 콘텐츠(tv/movie) + 전체(tv/movie) 동시 조회
    const [krTv, krMv, genTv, genMv] = await Promise.all([
      tmdbGet<TmdbPagedResult>('/discover/tv', krParams),
      tmdbGet<TmdbPagedResult>('/discover/movie', krParams),
      tmdbGet<TmdbPagedResult>('/discover/tv', base),
      tmdbGet<TmdbPagedResult>('/discover/movie', base),
    ]);
    const [krTvN, krMvN, genTvN, genMvN] = await Promise.all([
      normalizeList(krTv.results, 'tv'),
      normalizeList(krMv.results, 'movie'),
      normalizeList(genTv.results, 'tv'),
      normalizeList(genMv.results, 'movie'),
    ]);

    const byPop = (a: OttContent, b: OttContent) => (b.popularity ?? 0) - (a.popularity ?? 0);
    const krItems = [...krTvN, ...krMvN].sort(byPop);
    const genItems = [...genTvN, ...genMvN].sort(byPop);

    // 한국 콘텐츠 먼저, 그다음 중복 제외한 전체 인기작
    const seen = new Set(krItems.map((c) => c.id));
    const merged = [...krItems, ...genItems.filter((c) => !seen.has(c.id))].slice(0, 24);

    return enrichWithProviders(merged);
  });
  return { items: value, fromCache };
}

/** OTT 콘텐츠 검색 — TMDB search/multi 결과를 정규화하고 상위 항목에 제공처를 붙인다. */
export async function searchOtt(query: string): Promise<OttContent[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const { value } = await cached(`ott:search:${q}`, TTL.list, async () => {
    const data = await tmdbGet<TmdbPagedResult>('/search/multi', { query: q, page: 1 });
    const items = await normalizeList(data.results, 'movie');
    // 인기순 상위 12개만, 그 중 상위에 제공처(어디서 볼 수 있는지) 부착
    const top = items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).slice(0, 12);
    return enrichWithProviders(top);
  });
  return value;
}

/** 오늘 'YYYY-MM-DD' (로컬) */
function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * 공개/방영 예정작 — "곧 공개되는 한국 콘텐츠".
 *
 * 과거엔 극장 개봉 예정작(movie/upcoming)을 썼는데 OTT 와 안 맞았다.
 * 이제 discover 로 with_origin_country=KR + (first_air_date/primary_release_date >= 오늘)
 * 조건의 한국 콘텐츠를 공개일 빠른 순으로 가져온다.
 * (예정작은 아직 시청 제공처가 없을 수 있으므로 제공처 필터는 걸지 않는다.)
 */
export async function getUpcoming(): Promise<{ items: OttContent[]; fromCache: boolean }> {
  const today = todayString();
  const { value, fromCache } = await cached(`ott:upcoming:${today}`, TTL.list, async () => {
    const [tv, movies] = await Promise.all([
      tmdbGet<TmdbPagedResult>('/discover/tv', {
        with_origin_country: 'KR',
        'first_air_date.gte': today,
        sort_by: 'first_air_date.asc',
        page: 1,
      }),
      tmdbGet<TmdbPagedResult>('/discover/movie', {
        with_origin_country: 'KR',
        'primary_release_date.gte': today,
        sort_by: 'primary_release_date.asc',
        page: 1,
      }),
    ]);
    const [tvItems, movieItems] = await Promise.all([
      normalizeList(tv.results, 'tv'),
      normalizeList(movies.results, 'movie'),
    ]);
    // 공개일이 빠른 순으로 정렬
    return [...tvItems, ...movieItems]
      .map((c) => ({ ...c, isUpcoming: true }))
      .filter((c) => c.releaseDate && c.releaseDate >= today)
      .sort((a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? ''))
      .slice(0, 24);
  });
  return { items: value, fromCache };
}

// --- 상세 ---

interface TmdbDetail extends TmdbListItem {
  genres?: Array<{ id: number; name: string }>;
  tagline?: string;
  credits?: {
    cast?: Array<{ name: string; character?: string; profile_path?: string | null }>;
  };
  'watch/providers'?: TmdbWatchProvidersResult;
}

/** 콘텐츠 상세 — 줄거리·출연진·평점·watch providers 포함 */
export async function getContentDetail(
  mediaType: MediaType,
  tmdbId: number,
): Promise<{ content: OttContent; fromCache: boolean }> {
  const { value, fromCache } = await cached(
    `ott:detail:${mediaType}:${tmdbId}`,
    TTL.detail,
    async () => {
      const d = await tmdbGet<TmdbDetail>(`/${mediaType}/${tmdbId}`, {
        append_to_response: 'credits,watch/providers',
      });

      const title = d.name ?? d.title ?? '(제목 없음)';
      const genres =
        d.genres && d.genres.length > 0
          ? d.genres.map((g) => g.name)
          : await genreNames(mediaType, d.genre_ids);

      const content: OttContent = {
        id: makeContentId(mediaType, tmdbId),
        tmdbId,
        mediaType,
        title,
        originalTitle: d.original_name ?? d.original_title,
        overview: d.overview || undefined,
        posterUrl: posterUrl(d.poster_path),
        backdropUrl: backdropUrl(d.backdrop_path),
        releaseDate: (d.first_air_date ?? d.release_date) || undefined,
        voteAverage: d.vote_average,
        popularity: d.popularity,
        genres,
        tagline: d.tagline || undefined,
        cast: (d.credits?.cast ?? []).slice(0, 12).map((c) => ({
          name: c.name,
          character: c.character || undefined,
          profileUrl: logoUrl(c.profile_path, 'w185'),
        })),
        providers: normalizeProviders(d['watch/providers'], REGION),
      };
      return content;
    },
  );
  return { content: value, fromCache };
}
