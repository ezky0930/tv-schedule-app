// 통합 검색 결과 모델 (TV 편성표 + OTT 콘텐츠를 한 번에)
import type { Program } from './program.js';
import type { OttContent } from './ott.js';

export type SearchResultType = 'program' | 'ott';

/**
 * 통합 검색 결과 1건.
 * TV 프로그램이면 program 이, OTT 콘텐츠면 ott 가 채워진다.
 * availableOn 에는 "어디서 볼 수 있는지"를 사람이 읽는 문자열로 모아둔다.
 * (예: ['KBS2'] 또는 ['Netflix', '티빙'])
 */
export interface SearchResult {
  type: SearchResultType;
  /** type === 'program' 일 때 채워짐 */
  program?: Program;
  /** type === 'ott' 일 때 채워짐 */
  ott?: OttContent;
  /** 시청 가능한 채널명/OTT명 모음 (프론트에서 배지로 표시) */
  availableOn: string[];
  /** 관련도 정렬용 점수 (선택) */
  score?: number;
}
