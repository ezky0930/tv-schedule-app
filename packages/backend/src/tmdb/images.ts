// TMDB 이미지 경로 -> 전체 URL 조합 헬퍼.
// TMDB 는 poster_path 처럼 '/abc.jpg' 형태의 상대 경로만 주므로 베이스 URL + 크기를 붙여야 한다.
import { TMDB_DEFAULTS } from '@tv/shared';

/** 포스터(세로) URL. 기본 w500 */
export function posterUrl(path: string | null | undefined, size = 'w500'): string | undefined {
  if (!path) return undefined;
  return `${TMDB_DEFAULTS.imageBaseUrl}/${size}${path}`;
}

/** 배경(가로) URL. 기본 w780 */
export function backdropUrl(path: string | null | undefined, size = 'w780'): string | undefined {
  if (!path) return undefined;
  return `${TMDB_DEFAULTS.imageBaseUrl}/${size}${path}`;
}

/** 제공처/인물 로고 URL. 기본 w92 */
export function logoUrl(path: string | null | undefined, size = 'w92'): string | undefined {
  if (!path) return undefined;
  return `${TMDB_DEFAULTS.imageBaseUrl}/${size}${path}`;
}
