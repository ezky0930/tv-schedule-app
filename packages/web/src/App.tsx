import { useState } from 'react';
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

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        query={query}
        onQueryChange={setQuery}
        activeTab={tab}
        onTab={setTab}
        favoritesCount={favorites.length}
      />

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
