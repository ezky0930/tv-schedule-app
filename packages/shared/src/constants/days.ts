// 요일 상수 — 프론트 요일 탭, 백엔드 편성표 키로 공유 사용
import type { DayOfWeek } from '../types/common.js';

/** 월~일 순서 (한 주 시작은 월요일) */
export const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** 요일 한글 라벨 */
export const DAY_LABELS_KO: Record<DayOfWeek, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

/** JS Date.getDay()(0=일~6=토) -> 우리 DayOfWeek 매핑 */
const JS_DAY_INDEX: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Date 객체에서 우리 요일 키를 얻는다 */
export function dayOfWeekFromDate(date: Date): DayOfWeek {
  return JS_DAY_INDEX[date.getDay()];
}
