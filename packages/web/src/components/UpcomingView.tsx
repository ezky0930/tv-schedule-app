import { useEffect, useState } from 'react';
import type { OttContent } from '@tv/shared';
import { api } from '../lib/api.js';
import PosterGrid from './PosterGrid.js';
import ContentDetailModal from './ContentDetailModal.js';

// 공개/방영 예정 화면 — 곧 공개되는 한국 OTT·콘텐츠를 공개일 빠른 순으로.

export default function UpcomingView() {
  const [items, setItems] = useState<OttContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<OttContent | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getOttUpcoming()
      .then((res) => setItems(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-400">곧 공개·방영되는 한국 콘텐츠</p>

      {loading ? (
        <p className="py-10 text-center text-sm text-zinc-500">불러오는 중…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <PosterGrid items={items} onSelect={setSelected} />
      )}

      {selected && <ContentDetailModal initial={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
