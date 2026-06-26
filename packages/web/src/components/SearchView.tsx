import { useEffect, useState } from 'react';
import { DAY_LABELS_KO, type SearchResult, type OttContent, type DayOfWeek } from '@tv/shared';
import { api } from '../lib/api.js';
import PosterGrid from './PosterGrid.js';
import ContentDetailModal from './ContentDetailModal.js';
import FavoriteButton from './FavoriteButton.js';

// 통합 검색 결과 화면.
// 입력(query)을 디바운스해서 /api/search 를 호출하고, TV 편성표 / OTT 두 그룹으로 보여준다.

export default function SearchView({ query }: { query: string }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<OttContent | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError('');
    // 300ms 디바운스
    const t = setTimeout(() => {
      api
        .search(q)
        .then((res) => setResults(res.data))
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const tv = results.filter((r) => r.type === 'program');
  const ott = results
    .filter((r) => r.type === 'ott' && r.ott)
    .map((r) => r.ott as OttContent);

  if (query.trim().length < 1) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        프로그램·영화·시리즈 이름으로 TV 편성표와 OTT를 한 번에 검색하세요.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {loading && <p className="py-6 text-center text-sm text-zinc-500">검색 중…</p>}
      {error && <p className="text-sm text-red-400">검색 오류: {error}</p>}

      {!loading && !error && results.length === 0 && (
        <p className="py-10 text-center text-sm text-zinc-500">
          "{query}" 검색 결과가 없습니다.
        </p>
      )}

      {/* TV 편성표 결과 */}
      {tv.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">TV 편성표 ({tv.length})</h2>
          <ul className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
            {tv.map((r) => {
              const p = r.program!;
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {p.title}
                      {p.episode && <span className="ml-1 text-xs text-zinc-500">{p.episode}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      <span className="text-zinc-400">{r.availableOn.join(', ')}</span>
                      {' · '}
                      {DAY_LABELS_KO[p.day as DayOfWeek]} {p.startTime}
                      {p.isRerun && <span className="ml-2">재방송</span>}
                    </p>
                  </div>
                  <FavoriteButton
                    size="sm"
                    className="!bg-transparent"
                    item={{
                      key: `tv:${p.channelId}:${p.title}`,
                      kind: 'tv',
                      title: p.title,
                      channelId: p.channelId,
                      channelName: r.availableOn[0],
                      tmdbId: p.tmdbId,
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* OTT 결과 */}
      {ott.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">OTT ({ott.length})</h2>
          <PosterGrid items={ott} onSelect={setSelected} />
        </section>
      )}

      {selected && <ContentDetailModal initial={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
