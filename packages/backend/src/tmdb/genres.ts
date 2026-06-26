// TMDB 장르 id -> 한글 이름 매핑.
// discover/trending 응답은 genre_ids(숫자 배열)만 주므로, 장르 목록을 받아 이름으로 바꾼다.
import type { MediaType } from '@tv/shared';
import { tmdbGet } from './client.js';
import { cached, TTL } from '../cache/memoryCache.js';

interface GenreListResponse {
  genres: Array<{ id: number; name: string }>;
}

/** 특정 매체(tv/movie)의 장르 id->이름 맵을 반환 (24시간 캐시) */
async function getGenreMap(type: MediaType): Promise<Record<number, string>> {
  const { value } = await cached(`genres:${type}`, TTL.genres, async () => {
    const data = await tmdbGet<GenreListResponse>(`/genre/${type}/list`);
    const map: Record<number, string> = {};
    for (const g of data.genres) map[g.id] = g.name;
    return map;
  });
  return value;
}

/** genre_ids 배열을 한글 장르 이름 배열로 변환 (모르는 id 는 제외) */
export async function genreNames(type: MediaType, ids: number[] | undefined): Promise<string[]> {
  if (!ids || ids.length === 0) return [];
  const map = await getGenreMap(type);
  return ids.map((id) => map[id]).filter((name): name is string => Boolean(name));
}
