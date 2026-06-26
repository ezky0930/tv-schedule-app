// 여러 도메인에서 공통으로 쓰는 기본 타입들

/** 요일. 편성표는 요일 단위로 보여주므로 핵심 키로 사용한다. */
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** 콘텐츠 매체 종류 (TMDB 기준) */
export type MediaType = 'movie' | 'tv';

/**
 * 모든 API 응답을 감싸는 공통 봉투(envelope).
 * 캐시 여부·수집 시각·출처를 함께 내려주어 프론트가 "언제 기준 데이터인지" 표시할 수 있게 한다.
 */
export interface ApiResponse<T> {
  data: T;
  /** 캐시에서 응답했는지 여부 */
  cached?: boolean;
  /** 원본 데이터를 수집/갱신한 시각 (ISO 8601) */
  fetchedAt?: string;
  /** 데이터 출처 식별자 (예: 'tmdb', 'naver-epg', 'kbs') */
  source?: string;
}

/** 에러 응답 표준 형식 */
export interface ApiError {
  error: {
    /** 기계가 읽는 에러 코드 (예: 'NOT_FOUND', 'UPSTREAM_FAILED') */
    code: string;
    /** 사람이 읽는 메시지 */
    message: string;
  };
}
