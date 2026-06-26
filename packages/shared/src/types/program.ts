// 편성표 프로그램 모델
import type { DayOfWeek } from './common.js';

/**
 * 편성표상의 한 프로그램(방송 1회 편성).
 * 스크래핑 소스마다 제공 정보가 다르므로 title·startTime 외에는 모두 선택 필드로 둔다.
 */
export interface Program {
  /**
   * 안정적인 고유 id. 같은 편성은 항상 같은 id가 나오도록
   * `channelId:date:startTime` 형태로 생성한다. (예: 'tvn:2026-06-26:22:00')
   */
  id: string;
  /** 어느 채널의 편성인지 (Channel.id 참조) */
  channelId: string;
  /** 프로그램 제목 */
  title: string;
  /** 시작 시각 'HH:mm' (24시간제) */
  startTime: string;
  /** 종료 시각 'HH:mm' (다음 프로그램 시작 시각으로 추정 가능, 선택) */
  endTime?: string;
  /** 편성 요일 */
  day: DayOfWeek;
  /** 방송 날짜 'YYYY-MM-DD' (정확히 알 수 있는 경우) */
  date?: string;
  /** 회차 (예: '12회') */
  episode?: string;
  /** 시청 등급 (예: '15', '19', 'all') */
  rating?: string;
  /** 생방송 여부 */
  isLive?: boolean;
  /** 재방송 여부 */
  isRerun?: boolean;
  /** 장르 (예: '드라마', '예능', '뉴스') */
  genre?: string;
  /** 간단한 설명/부제 (선택) */
  description?: string;

  // --- TMDB 매칭으로 보강되는 선택 필드 (인기순 정렬용) ---
  /** TMDB 평점(0~10). 제목이 TMDB 와 매칭됐을 때만 채워짐 */
  tmdbRating?: number;
  /** TMDB 인기도 점수 */
  tmdbPopularity?: number;
  /** TMDB 투표 수 (가중 평점 계산용 — 적을수록 평점 신뢰도 낮음) */
  tmdbVoteCount?: number;
  /** 매칭된 TMDB 콘텐츠 id (예: 'tmdb:tv:1396') — 상세로 연결 가능 */
  tmdbId?: string;
}

/** 특정 채널의 특정 요일 편성 묶음 — 프론트의 타임라인 뷰에 바로 쓰기 좋은 형태 */
export interface ChannelSchedule {
  channelId: string;
  day: DayOfWeek;
  programs: Program[];
}
