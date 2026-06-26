// 즐겨찾기 모델 (웹·추후 iOS 공유).
// 저장 매체(localStorage / AsyncStorage)는 각 플랫폼이 정하고, 데이터 모양은 여기서 공유한다.

export type FavoriteKind = 'ott' | 'tv';

/** 즐겨찾기 1건 */
export interface FavoriteItem {
  /**
   * 안정적인 고유 키.
   * - OTT: 콘텐츠 id ('tmdb:tv:1396')
   * - TV : 'tv:{channelId}:{title}' (특정 회차가 아니라 "그 프로그램"을 가리킴)
   */
  key: string;
  kind: FavoriteKind;
  /** 표시 제목 */
  title: string;

  // OTT 용
  /** 포스터 URL */
  posterUrl?: string;
  /** 매칭된 TMDB 콘텐츠 id (상세 열기용) */
  tmdbId?: string;

  // TV 용
  /** 채널 id */
  channelId?: string;
  /** 채널 이름 */
  channelName?: string;

  /** 추가 시각 (ISO) */
  addedAt: string;
}
