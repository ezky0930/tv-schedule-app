import { useEffect, useState } from 'react';
import type { OttContent } from '@tv/shared';
import { api } from '../lib/api.js';
import PosterGrid from './PosterGrid.js';
import ContentDetailModal from './ContentDetailModal.js';

// "추천" 탭 — 한국 OTT 인기작을 포스터 그리드로.
export default function RecommendView() {
  const [items, setItems] = useState<OttContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OttContent | null>(null);

  useEffect(() => {
    api
      .getOttTrending()
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium text-slate-100">오늘의 추천 · 한국 OTT 인기작</h2>
      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">불러오는 중…</p>
      ) : (
        <PosterGrid items={items} onSelect={setSelected} />
      )}
      {selected && <ContentDetailModal initial={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
