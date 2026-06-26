import { useState, useRef, useEffect } from 'react';
import AppHeader from './components/AppHeader.js';
import SiteFooter from './components/SiteFooter.js';
import TvSchedulePage from './components/TvSchedulePage.js';
import OttView from './components/OttView.js';
import UpcomingView from './components/UpcomingView.js';
import RecommendView from './components/RecommendView.js';
import FavoritesView from './components/FavoritesView.js';
import SearchView from './components/SearchView.js';
import { useFavorites } from './lib/favorites.js';

// 최상위 앱 — 새 헤더(검색+탭) + 페이지 + 푸터.
// 검색어가 있으면 어느 탭이든 검색 결과로 전환된다.
export type Tab = 'tv' | 'ott' | 'upcoming' | 'recommend' | 'fav';

export default function App() {
  const [tab, setTab] = useState<Tab>('tv');
  const [query, setQuery] = useState('');
  const favorites = useFavorites();
  const searching = query.trim().length > 0;

  // 헤더 실제 높이를 측정해 CSS 변수(--app-header-h)로 노출.
  // 모바일 편성표의 채널 칩이 이 높이만큼 아래에 sticky 로 고정되도록 한다.
  const headerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () =>
      document.documentElement.style.setProperty('--app-header-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <div ref={headerRef}>
        <AppHeader
          query={query}
          onQueryChange={setQuery}
          activeTab={tab}
          onTab={setTab}
          favoritesCount={favorites.length}
        />
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {searching ? (
          <SearchView query={query} />
        ) : tab === 'tv' ? (
          <TvSchedulePage />
        ) : tab === 'ott' ? (
          <OttView />
        ) : tab === 'upcoming' ? (
          <UpcomingView />
        ) : tab === 'recommend' ? (
          <RecommendView />
        ) : (
          <FavoritesView />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
