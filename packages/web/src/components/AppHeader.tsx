import type { Tab } from '../App.js';

// 상단 헤더 — 로고 + 통합 검색 + 탭 네비.
// 목업의 다크 네이비/블루·퍼플 톤을 그대로 따른다.
// 데이터 의존 없이 props 만으로 동작하는 순수 프레젠테이션 컴포넌트.

interface Props {
  /** 현재 검색어 (제어 컴포넌트) */
  query: string;
  /** 검색어 변경 콜백 */
  onQueryChange: (v: string) => void;
  /** 현재 활성 탭 */
  activeTab: Tab;
  /** 탭 클릭 콜백 */
  onTab: (t: Tab) => void;
  /** 찜한 콘텐츠 개수 (배지 표시용) */
  favoritesCount: number;
}

// 탭 메뉴 정의 (목업 순서 그대로)
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'tv', label: 'TV 편성표' },
  { key: 'ott', label: 'OTT' },
  { key: 'upcoming', label: '예정작' },
  { key: 'recommend', label: '추천' },
  { key: 'fav', label: '내가 찜한 콘텐츠' },
];

export default function AppHeader({
  query,
  onQueryChange,
  activeTab,
  onTab,
  favoritesCount,
}: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0e1a]/85 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        {/* 1행: 로고 / 검색 / 우측 아이콘 */}
        <div className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap sm:gap-4">
          {/* 로고 + 부제 */}
          <button
            type="button"
            onClick={() => onTab('tv')}
            className="flex shrink-0 flex-col items-start text-left"
          >
            <span className="text-lg font-bold leading-tight text-slate-100">
              오늘 뭐 보지 <span aria-hidden>📺</span>
            </span>
            <span className="text-xs font-normal text-slate-500">
              대한민국 TV 편성표 + OTT 통합
            </span>
          </button>

          {/* 검색 input — 모바일에선 전체폭(order로 마지막), 데스크톱에선 가운데 */}
          <div className="order-last w-full min-w-0 flex-1 sm:order-none sm:w-auto">
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                {/* 돋보기 아이콘 */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="프로그램·영화·시리즈 검색 (TV 편성표 + OTT)"
                aria-label="통합 검색"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm font-normal text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:bg-white/[0.07]"
              />
            </label>
          </div>

          {/* 우측 아이콘들 (시각만) */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {/* 로그인 */}
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              {/* 사람 아이콘 */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </svg>
              <span className="hidden sm:inline">로그인</span>
            </button>

            {/* 알림 종 (빨간 점) */}
            <button
              type="button"
              aria-label="알림"
              className="relative rounded-lg p-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </svg>
              {/* 빨간 점 */}
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0a0e1a]" />
            </button>

            {/* 햄버거 메뉴 */}
            <button
              type="button"
              aria-label="메뉴"
              className="rounded-lg p-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2행: 탭 네비 / 실시간 인기 버튼 */}
        <div className="flex items-center justify-between gap-3 pb-px">
          {/* 탭 — 모바일에선 가로 스크롤 */}
          <nav className="thin-scroll -mb-px flex min-w-0 items-center gap-1 overflow-x-auto sm:gap-2">
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onTab(t.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition ${
                    active
                      ? 'border-indigo-400 font-medium text-white'
                      : 'border-transparent font-normal text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                  {/* 찜 탭 배지 */}
                  {t.key === 'fav' && favoritesCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[11px] font-bold text-white">
                      {favoritesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 실시간 인기 TOP 20 — 추천 탭으로 이동 */}
          <button
            type="button"
            onClick={() => onTab('recommend')}
            className="mb-2 shrink-0 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:from-violet-500 hover:to-indigo-500"
          >
            <span aria-hidden>⭐ </span>
            <span className="hidden whitespace-nowrap sm:inline">실시간 인기 TOP 20</span>
            <span className="whitespace-nowrap sm:hidden">인기 TOP 20</span>
          </button>
        </div>
      </div>
    </header>
  );
}
