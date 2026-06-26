// OTT 콘텐츠·시청 제공처(WatchProvider) 모델
import type { MediaType } from './common.js';

/** 우리가 1차로 다루는 OTT 식별자 */
export type OttProviderId =
  | 'netflix'
  | 'disney'
  | 'tving'
  | 'wavve'
  | 'coupang';

/** 시청 방식 (TMDB watch/providers 기준) */
export type WatchMonetizationType = 'flatrate' | 'free' | 'ads' | 'rent' | 'buy';

/**
 * "이 콘텐츠를 어디서 볼 수 있는지" 한 줄.
 * TMDB watch/providers 응답을 우리 모델로 정규화한 형태.
 */
export interface WatchProvider {
  /** 내부 식별자 (알려진 OTT면 OttProviderId, 아니면 TMDB 이름 슬러그) */
  id: OttProviderId | string;
  /** 표시 이름 (예: 'Netflix', '티빙') */
  name: string;
  /** TMDB provider id (KR 기준, 예: 넷플릭스=8) */
  tmdbProviderId?: number;
  /** 제공처 로고 URL */
  logoUrl?: string;
  /** 정액제/대여/구매 등 시청 방식 */
  type?: WatchMonetizationType;
}

/** 출연진 1명 (상세 화면용) */
export interface CastMember {
  /** 배우 이름 */
  name: string;
  /** 배역 이름 */
  character?: string;
  /** 프로필 사진 URL */
  profileUrl?: string;
}

/**
 * OTT 콘텐츠(영화 또는 시리즈) 1건.
 * TMDB 데이터를 우리 앱 모델로 정규화한 형태이며,
 * 추후 뉴스/보도자료 기반 독점 신작 정보로 보강할 수 있게 필드를 넉넉히 열어둔다.
 */
export interface OttContent {
  /** 내부 고유 id (예: 'tmdb:tv:12345') */
  id: string;
  /** TMDB 원본 id */
  tmdbId: number;
  /** 영화/시리즈 구분 */
  mediaType: MediaType;
  /** 제목 (ko-KR) */
  title: string;
  /** 원제 (선택) */
  originalTitle?: string;
  /** 줄거리 */
  overview?: string;
  /** 포스터 이미지 전체 URL */
  posterUrl?: string;
  /** 배경(가로) 이미지 전체 URL */
  backdropUrl?: string;
  /** 개봉/공개일 'YYYY-MM-DD' */
  releaseDate?: string;
  /** 평점 (0~10) */
  voteAverage?: number;
  /** 인기도 점수 (TMDB popularity) */
  popularity?: number;
  /** 장르 이름 목록 (예: ['드라마', '스릴러']) */
  genres?: string[];
  /** 어디서 볼 수 있는지 — 정액제 제공처 위주 */
  providers?: WatchProvider[];
  /** 한 줄 태그라인 (상세에서 제공되면 채워짐) */
  tagline?: string;
  /** 주요 출연진 (상세 화면용, 목록에서는 비어 있음) */
  cast?: CastMember[];
  /**
   * 공개 예정 여부.
   * releaseDate 가 오늘 이후이거나 upcoming 엔드포인트에서 가져온 경우 true.
   */
  isUpcoming?: boolean;
}
