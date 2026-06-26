// 편성표 프로그램 제목 → TMDB 매칭.
// 네이버 편성표에는 인기/평점이 없으므로, 제목으로 TMDB 를 검색해 평점·인기도를 붙인다.
// 제목은 반복 등장(재방송·여러 회차)하므로 정제한 제목 기준으로 캐시해서 호출을 최소화한다.
import { tmdbGet } from './client.js';
import { cacheGet, cacheSet, TTL } from '../cache/memoryCache.js';
import { makeContentId } from './normalize.js';
import type { MediaType } from '@tv/shared';

interface SearchMultiResponse {
  results: Array<{
    id: number;
    media_type?: string;
    name?: string;
    title?: string;
    popularity?: number;
    vote_average?: number;
    vote_count?: number;
  }>;
}

export interface TitleMatch {
  rating?: number;
  popularity?: number;
  voteCount?: number;
  tmdbId?: string; // 'tmdb:tv:1396'
}

/**
 * 편성표 제목을 검색용으로 정제한다.
 * - "(12회)" 회차, "[TV 최초!]"·"<제목>" 같은 머리표, "스페셜/특별판/특집" 등 군더더기 제거
 */
export function cleanTitle(raw: string): string {
  let t = raw;
  t = t.replace(/\(\s*\d+\s*회\s*\)/g, ' '); // 회차
  t = t.replace(/\[[^\]]*\]/g, ' '); // [ ... ]
  t = t.replace(/<[^>]*>/g, ' '); // < ... >
  t = t.replace(/\b(스페셜|특별판|특집|앙코르|재방송|본방사수|몰아보기)\b/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/** "매칭 결과 없음"을 캐시에 표시하기 위한 sentinel */
const NO_MATCH: TitleMatch = {};

/**
 * 정제한 제목으로 TMDB(검색 multi)를 조회해 가장 인기 있는 tv/movie 매칭을 반환한다.
 * 결과(매칭 실패 포함)를 캐시해서 같은 제목 재조회를 막는다.
 */
export async function matchTitle(rawTitle: string): Promise<TitleMatch> {
  const q = cleanTitle(rawTitle);
  if (q.length < 2) return NO_MATCH;

  const cacheKey = `tvmatch:${q}`;
  const hit = cacheGet<TitleMatch>(cacheKey);
  if (hit !== undefined) return hit;

  let result: TitleMatch = NO_MATCH;
  try {
    const data = await tmdbGet<SearchMultiResponse>('/search/multi', { query: q, page: 1 });
    // tv/movie 중 인기도(popularity) 가 가장 높은 항목 채택
    const candidates = (data.results || []).filter(
      (r) => r.media_type === 'tv' || r.media_type === 'movie',
    );
    candidates.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    const best = candidates[0];
    if (best) {
      result = {
        rating: best.vote_average,
        popularity: best.popularity,
        voteCount: best.vote_count,
        tmdbId: makeContentId(best.media_type as MediaType, best.id),
      };
    }
  } catch {
    // 검색 실패는 무매칭으로 처리(편성표 자체는 계속 동작)
    result = NO_MATCH;
  }

  cacheSet(cacheKey, result, TTL.genres); // 24시간 캐시
  return result;
}
