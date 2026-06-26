import { useState } from 'react';
import TvSchedule from './components/TvSchedule.js';
import OttView from './components/OttView.js';
import FavoritesView from './components/FavoritesView.js';
import UpcomingView from './components/UpcomingView.js';
import SearchView from './components/SearchView.js';
import { useFavorites } from './lib/favorites.js';

// 최상위 화면: TV 편성표 / OTT / 예정 / 즐겨찾기 탭 + 통합 검색.
// 검색어가 있으면 어느 탭이든 검색 결과 화면으로 전환된다.

type Mode = 'tv' | 'ott' | 'upcoming' | 'fav';

const TABS: Array<{ key: Mode; label: string }> = [
  { key: 'tv', label: 'TV 편성표' },
  { key: 'ott', label: 'OTT' },
  { key: 'upcoming', label: '예정' },
  { key: 'fav', label: '⭐ 즐겨찾기' },
];

export default function App() {
  const [mode, setMode] = useState<Mode>('tv');
  const [query, setQuery] = useState('');
  const favorites = useFavorites();
  const searching = query.trim().length > 0;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* 헤더 */}
        <header className="mb-5">
          <h1 className="text-2xl font-bold sm:text-3xl">오늘 뭐 보지 📺</h1>
          <p className="mt-1 text-sm text-zinc-400">대한민국 TV 편성표 + OTT 통합</p>

          {/* 통합 검색 바 */}
          <div className="relative mt-4">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              🔍
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="프로그램·영화·시리즈 검색 (TV 편성표 + OTT)"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            {searching && (
              <button
                onClick={() => setQuery('')}
                aria-label="검색 지우기"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* 탭 네비게이션 (검색 중이 아닐 때) */}
          {!searching && (
            <nav className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div className="inline-flex w-max rounded-xl bg-zinc-800/50 p-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setMode(t.key)}
                    className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                      mode === t.key ? 'bg-white text-zinc-900' : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    {t.label}
                    {t.key === 'fav' && favorites.length > 0 && (
                      <span className="ml-1.5 rounded-full bg-amber-400/20 px-1.5 text-xs text-amber-300">
                        {favorites.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </nav>
          )}
        </header>

        {/* 본문: 검색 중이면 검색 결과, 아니면 선택한 탭 */}
        {searching ? (
          <SearchView query={query} />
        ) : mode === 'tv' ? (
          <TvSchedule />
        ) : mode === 'ott' ? (
          <OttView />
        ) : mode === 'upcoming' ? (
          <UpcomingView />
        ) : (
          <FavoritesView />
        )}

        {/* 푸터 (TMDB 출처 표기 — 무료 이용 조건) */}
        <footer className="mt-12 border-t border-zinc-800 pt-4 text-xs text-zinc-600">
          이 제품은 TMDB API를 사용하지만 TMDB의 인증·보증을 받지 않았습니다. TV 편성 정보 출처: 네이버
          편성표. · 추후 React Native(iOS) 확장 대비 모노레포 구조.
        </footer>
      </div>
    </div>
  );
}
