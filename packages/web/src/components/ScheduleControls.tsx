import { DAYS, DAY_LABELS_KO } from '@tv/shared';
import type { DayOfWeek } from '@tv/shared';

// 편성표 컨트롤 바 — 요일 선택 / 정렬 / 분류 / 재방송 숨김 토글을 한 줄(모바일 래핑)로 묶는다.
// 데이터/상태는 부모가 소유하고, 이 컴포넌트는 표시와 사용자 입력만 담당하는 순수 표현형 UI.

type Sort = 'time' | 'popular';
type Category = 'all' | 'terrestrial' | 'general' | 'cable';

interface Props {
  /** 현재 선택된 요일 */
  day: DayOfWeek;
  /** 요일 변경 */
  onDay: (d: DayOfWeek) => void;
  /** 현재 정렬 기준 */
  sort: Sort;
  /** 정렬 변경 */
  onSort: (s: Sort) => void;
  /** 현재 채널 분류 */
  category: Category;
  /** 분류 변경 */
  onCategory: (c: Category) => void;
  /** 재방송 숨김 여부 */
  hideReruns: boolean;
  /** 재방송 숨김 토글 */
  onToggleReruns: () => void;
  /** 숨겨지는 재방송 개수(배지 표시용) */
  rerunCount: number;
  /** 오늘 요일(요일 알약에서 '오늘'로 강조) */
  todayDay: DayOfWeek;
}

/** 정렬 세그먼트 옵션 */
const SORT_OPTIONS: ReadonlyArray<{ key: Sort; label: string }> = [
  { key: 'time', label: '시간순' },
  { key: 'popular', label: '인기순' },
];

/** 분류 세그먼트 옵션 */
const CATEGORY_OPTIONS: ReadonlyArray<{ key: Category; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'terrestrial', label: '지상파' },
  { key: 'general', label: '종편' },
  { key: 'cable', label: '케이블' },
];

export default function ScheduleControls({
  day,
  onDay,
  sort,
  onSort,
  category,
  onCategory,
  hideReruns,
  onToggleReruns,
  rerunCount,
  todayDay,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      {/* 요일 알약: 가로 스크롤(모바일) */}
      <div
        className="thin-scroll -mx-1 flex min-w-0 items-center gap-1.5 overflow-x-auto px-1"
        role="tablist"
        aria-label="요일 선택"
      >
        {DAYS.map((d) => {
          const active = d === day;
          const isToday = d === todayDay;
          // 오늘 요일은 라벨 대신 '오늘'로 강조한다.
          const label = isToday ? '오늘' : DAY_LABELS_KO[d];
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onDay(d)}
              title={isToday ? `오늘 (${DAY_LABELS_KO[d]})` : DAY_LABELS_KO[d]}
              className={[
                'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition',
                active
                  ? 'bg-white text-slate-900'
                  : isToday
                    ? 'bg-white/15 text-white hover:bg-white/25'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 구분선(넓은 화면에서만) */}
      <span className="hidden h-6 w-px bg-white/10 sm:block" aria-hidden="true" />

      {/* 정렬 세그먼트 컨트롤 — 활성칩 인디고 */}
      <div
        className="flex items-center gap-1 rounded-xl bg-white/5 p-1"
        role="group"
        aria-label="정렬"
      >
        {SORT_OPTIONS.map((opt) => {
          const active = opt.key === sort;
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={active}
              onClick={() => onSort(opt.key)}
              className={[
                'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                active
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-300 hover:text-white',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* 분류 세그먼트 컨트롤 — 활성칩 블루 */}
      <div
        className="thin-scroll flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-white/5 p-1"
        role="group"
        aria-label="채널 분류"
      >
        {CATEGORY_OPTIONS.map((opt) => {
          const active = opt.key === category;
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={active}
              onClick={() => onCategory(opt.key)}
              className={[
                'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                active
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-300 hover:text-white',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* 재방송 숨김 토글 — 맨 오른쪽으로 밀어둠 */}
      <button
        type="button"
        aria-pressed={hideReruns}
        onClick={onToggleReruns}
        title={hideReruns ? '재방송 숨김 켜짐' : '재방송 숨김 꺼짐'}
        className={[
          'ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition',
          hideReruns
            ? 'bg-emerald-500/90 text-white hover:bg-emerald-500'
            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white',
        ].join(' ')}
      >
        {/* 체크 아이콘(인라인 SVG, stroke 1.5) */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={hideReruns ? 'opacity-100' : 'opacity-60'}
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>재방송 숨김</span>
        {/* 숨겨지는 재방송 개수 배지 */}
        <span
          className={[
            'rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none',
            hideReruns ? 'bg-white/25 text-white' : 'bg-white/10 text-slate-400',
          ].join(' ')}
        >
          {rerunCount}
        </span>
      </button>
    </div>
  );
}
