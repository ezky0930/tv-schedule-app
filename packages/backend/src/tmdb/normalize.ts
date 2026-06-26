// TMDB 원본 응답 -> 우리 앱 모델(OttContent, WatchProvider) 정규화.
// 프론트는 TMDB 의 raw 필드명을 몰라도 되도록 여기서 전부 우리 타입으로 변환한다.
import type { MediaType, OttContent, WatchProvider } from '@tv/shared';
import { OTT_BY_TMDB_ID, OTT_BY_ID } from '@tv/shared';
import { posterUrl, backdropUrl, logoUrl } from './images.js';
import { genreNames } from './genres.js';

// --- TMDB 원본(raw) 타입 (필요한 필드만) ---

export interface TmdbListItem {
  id: number;
  media_type?: 'tv' | 'movie' | 'person';
  // tv
  name?: string;
  original_name?: string;
  first_air_date?: string;
  // movie
  title?: string;
  original_title?: string;
  release_date?: string;
  // 공통
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  popularity?: number;
  genre_ids?: number[];
}

export interface TmdbProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

export interface TmdbWatchProvidersResult {
  results?: Record<
    string,
    {
      link?: string;
      flatrate?: TmdbProviderEntry[];
      free?: TmdbProviderEntry[];
      ads?: TmdbProviderEntry[];
      rent?: TmdbProviderEntry[];
      buy?: TmdbProviderEntry[];
    }
  >;
}

/** 내부 콘텐츠 id 생성: 'tmdb:tv:1396' */
export function makeContentId(mediaType: MediaType, tmdbId: number): string {
  return `tmdb:${mediaType}:${tmdbId}`;
}

/** 'tmdb:tv:1396' -> { mediaType, tmdbId }  (잘못된 형식이면 null) */
export function parseContentId(
  id: string,
): { mediaType: MediaType; tmdbId: number } | null {
  const m = /^tmdb:(tv|movie):(\d+)$/.exec(id);
  if (!m) return null;
  return { mediaType: m[1] as MediaType, tmdbId: Number(m[2]) };
}

/** TMDB watch/providers 의 KR.flatrate 등을 우리 WatchProvider[] 로 변환 (정액제 우선) */
export function normalizeProviders(
  raw: TmdbWatchProvidersResult | undefined,
  region = 'KR',
): WatchProvider[] {
  const kr = raw?.results?.[region];
  if (!kr) return [];

  const out: WatchProvider[] = [];
  const seen = new Set<number>();

  const pushAll = (
    entries: TmdbProviderEntry[] | undefined,
    type: WatchProvider['type'],
  ) => {
    for (const e of entries ?? []) {
      if (seen.has(e.provider_id)) continue;
      // "Netflix Standard with Ads" 같은 광고형 중복 티어는 제외(기본 구독과 중복)
      if (/standard with ads/i.test(e.provider_name)) continue;
      seen.add(e.provider_id);
      // 알려진 OTT 면 우리 내부 id 로, 아니면 TMDB 이름 사용
      const knownId = OTT_BY_TMDB_ID[e.provider_id];
      out.push({
        id: knownId ?? String(e.provider_id),
        name: knownId ? OTT_BY_ID[knownId].name : e.provider_name,
        tmdbProviderId: e.provider_id,
        logoUrl: logoUrl(e.logo_path),
        type,
      });
    }
  };

  // 정액제(flatrate)와 광고형(ads)·무료(free)를 우선 노출, 대여/구매는 그 다음
  pushAll(kr.flatrate, 'flatrate');
  pushAll(kr.free, 'free');
  pushAll(kr.ads, 'ads');
  pushAll(kr.rent, 'rent');
  pushAll(kr.buy, 'buy');

  // 우리 주요 OTT(넷플릭스·디즈니+·티빙·웨이브·쿠팡)를 앞으로 정렬
  out.sort((a, b) => {
    const ka = OTT_BY_TMDB_ID[a.tmdbProviderId ?? -1] ? 0 : 1;
    const kb = OTT_BY_TMDB_ID[b.tmdbProviderId ?? -1] ? 0 : 1;
    return ka - kb;
  });

  return out;
}

/**
 * TMDB 목록 아이템(discover/trending) 한 건을 OttContent 로 변환.
 * trending 응답은 item.media_type 로 tv/movie 가 섞여오므로 우선 그걸 본다.
 */
export async function normalizeListItem(
  raw: TmdbListItem,
  fallbackType: MediaType,
): Promise<OttContent | null> {
  // person 등은 제외
  const mt = raw.media_type;
  if (mt === 'person') return null;
  const mediaType: MediaType = mt === 'tv' || mt === 'movie' ? mt : fallbackType;

  const title = raw.name ?? raw.title ?? '(제목 없음)';
  const originalTitle = raw.original_name ?? raw.original_title;
  const releaseDate = raw.first_air_date ?? raw.release_date;

  return {
    id: makeContentId(mediaType, raw.id),
    tmdbId: raw.id,
    mediaType,
    title,
    originalTitle,
    overview: raw.overview || undefined,
    posterUrl: posterUrl(raw.poster_path),
    backdropUrl: backdropUrl(raw.backdrop_path),
    releaseDate: releaseDate || undefined,
    voteAverage: raw.vote_average,
    popularity: raw.popularity,
    genres: await genreNames(mediaType, raw.genre_ids),
  };
}
