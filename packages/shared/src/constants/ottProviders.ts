// OTT 제공처 상수 + TMDB watch provider ID (KR 기준)
//
// ⚠️ 아래 tmdbProviderId 는 KR 기준 추정값이다.
//    개발 중 실제 TMDB API(`/watch/providers/tv?watch_region=KR`)로 반드시 검증할 것.
//    (백엔드에 검증 스크립트를 두고 불일치 시 이 상수를 갱신한다.)
import type { OttProviderId, WatchProvider } from '../types/ott.js';

/** 우리가 1차로 노출하는 OTT 목록 + TMDB provider id */
export const OTT_PROVIDERS: Array<
  Required<Pick<WatchProvider, 'id' | 'name' | 'tmdbProviderId'>> & {
    id: OttProviderId;
  }
> = [
  { id: 'netflix', name: 'Netflix', tmdbProviderId: 8 },
  { id: 'disney', name: 'Disney+', tmdbProviderId: 337 },
  { id: 'tving', name: '티빙', tmdbProviderId: 1883 },
  { id: 'wavve', name: '웨이브', tmdbProviderId: 356 },
  { id: 'coupang', name: '쿠팡플레이', tmdbProviderId: 1881 },
];

/** 내부 OTT id -> 정보 */
export const OTT_BY_ID: Record<OttProviderId, (typeof OTT_PROVIDERS)[number]> =
  Object.fromEntries(OTT_PROVIDERS.map((p) => [p.id, p])) as Record<
    OttProviderId,
    (typeof OTT_PROVIDERS)[number]
  >;

/** TMDB provider id -> 내부 OTT id (TMDB 응답을 우리 모델로 매핑할 때 사용) */
export const OTT_BY_TMDB_ID: Record<number, OttProviderId> = Object.fromEntries(
  OTT_PROVIDERS.map((p) => [p.tmdbProviderId, p.id]),
);

/** TMDB discover 호출 시 region/language 기본값 */
export const TMDB_DEFAULTS = {
  region: 'KR',
  language: 'ko-KR',
  /** TMDB 이미지 베이스 URL (포스터/배경 조합용) */
  imageBaseUrl: 'https://image.tmdb.org/t/p',
} as const;
