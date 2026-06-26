import { useEffect, useState, useCallback, useMemo } from 'react';
import type { OttContent, OttProviderId } from '@tv/shared';
import { api, type MetaInfo } from '../lib/api.js';
import PosterGrid from './PosterGrid.js';
import ContentDetailModal from './ContentDetailModal.js';

// OTT 콘텐츠 뷰: 탭(전체 인기 / OTT별 / 공개 예정) → 포스터 그리드 → 상세 모달.
// 정렬: 인기순 / 최신순(새로운 콘텐츠) 전환 가능.

type TabKey = 'trending' | OttProviderId | 'upcoming';
interface Tab {
  key: TabKey;
  label: string;
}
/** 정렬 모드 */
type SortMode = 'popular' | 'new';

export default function OttView() {
  const [tabs, setTabs] = useState<Tab[]>([{ key: 'trending', label: '전체 인기' }]);
  const [activeTab, setActiveTab] = useState<TabKey>('trending');
  const [sort, setSort] = useState<SortMode>('popular');
  const [items, setItems] = useState<OttContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<OttContent | null>(null);

  useEffect(() => {
    api
      .getMeta()
      .then((res: { data: MetaInfo }) => {
        const ottTabs: Tab[] = res.data.ott.map((o) => ({ key: o.id, label: o.name }));
        setTabs([
          { key: 'trending', label: '전체 인기' },
          ...ottTabs,
          { key: 'upcoming', label: '공개 예정' },
        ]);
      })
      .catch(() => {
        setTabs([
          { key: 'trending', label: '전체 인기' },
          { key: 'upcoming', label: '공개 예정' },
        ]);
      });
  }, []);

  const loadTab = useCallback((tab: TabKey) => {
    setLoading(true);
    setError('');
    const req =
      tab === 'trending'
        ? api.getOttTrending()
        : tab === 'upcoming'
          ? api.getOttUpcoming()
          : api.getOttTrending(tab);
    req
      .then((res) => setItems(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  // 정렬 적용: 인기순(popularity) / 최신순(공개일 최신)
  const sortedItems = useMemo(() => {
    const arr = [...items];
    if (sort === 'popular') {
      arr.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    } else {
      // 최신순: 공개일(releaseDate) 내림차순. 날짜 없는 항목은 뒤로.
      arr.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
    }
    return arr;
  }, [items, sort]);

  return (
    <div>
      {/* OTT 탭 */}
      <nav className="mb-3 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeTab === t.key
                  ? 'bg-white text-zinc-900'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* 정렬: 인기순 / 최신순 */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs text-zinc-500">정렬</span>
        <div className="inline-flex rounded-lg bg-zinc-800/50 p-0.5">
          {(
            [
              { key: 'popular', label: '인기순' },
              { key: 'new', label: '최신순' },
            ] as Array<{ key: SortMode; label: string }>
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                sort === s.key ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <PosterGridSkeleton />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => loadTab(activeTab)} />
      ) : (
        <PosterGrid items={sortedItems} onSelect={setSelected} />
      )}

      {selected && <ContentDetailModal initial={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-5 text-red-300">
      <p className="font-medium">불러오지 못했습니다.</p>
      <p className="mt-1 text-sm text-red-400/80">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-lg bg-red-900/40 px-3 py-1.5 text-sm hover:bg-red-900/60"
      >
        다시 시도
      </button>
    </div>
  );
}

function PosterGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] w-full animate-pulse rounded-lg bg-zinc-800/60" />
      ))}
    </div>
  );
}
