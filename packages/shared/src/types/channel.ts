// TV 채널(지상파/종편/케이블) 모델

/**
 * 채널 분류
 * - terrestrial: 지상파 (KBS/MBC/SBS/EBS)
 * - general: 종합편성채널 (JTBC/채널A/MBN/TV조선)
 * - cable: 일반 케이블/PP (tvN/ENA 등)
 */
export type ChannelCategory = 'terrestrial' | 'general' | 'cable';

/** TV 채널 */
export interface Channel {
  /** 내부 식별자 (소문자 슬러그, 예: 'kbs2', 'tvn') */
  id: string;
  /** 화면에 표시할 이름 (예: 'KBS2', 'tvN') */
  name: string;
  /** 채널 분류 — 프론트의 "지상파만/종편만/전체" 필터에 사용 */
  category: ChannelCategory;
  /** 채널 로고 이미지 URL (선택) */
  logoUrl?: string;
  /** 정렬 우선순위 (작을수록 먼저 표시) */
  order?: number;
}
