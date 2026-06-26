import { useMemo, useState } from 'react';
import type { FavoriteItem, OttContent, MediaType } from '@tv/shared';
import { useFavorites, removeFavorite } from '../lib/favorites.js';
import PosterGrid from './PosterGrid.js';
import ContentDetailModal from './ContentDetailModal.js';
import FavoriteButton from './FavoriteButton.js';

// 즐겨찾기 화면.
// OTT 즐겨찾기는 포스터 그리드(별표로 해제·클릭 시 상세), TV 즐겨찾기는 목록으로 표시.

/** 'tmdb:tv:1396' → 최소 OttContent (상세 모달이 id로 전체를 다시 불러옴) */
function favToOttContent(fav: FavoriteItem): OttContent | null {
  const id = fav.tmdbId ?? fav.key;
  const m = /^tmdb:(tv|movie):(\d+)$/.exec(id);
  if (!m) return null;
  return {
    id,
    tmdbId: Number(m[2]),
    mediaType: m[1] as MediaType,
    title: fav.title,
    posterUrl: fav.posterUrl,
  };
}

export default function FavoritesView() {
  const favorites = useFavorites();
  const [selected, setSelected] = useState<OttContent | null>(null);

  const ott = useMemo(() => favorites.filter((f) => f.kind === 'ott'), [favorites]);
  const tv = useMemo(() => favorites.filter((f) => f.kind === 'tv'), [favorites]);

  // OTT 즐겨찾기를 PosterGrid 가 받는 형태로 변환
  const ottItems = useMemo(
    () => ott.map(favToOttContent).filter((c): c is OttContent => c !== null),
    [ott],
  );

  if (favorites.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-10 text-center">
        <p className="text-3xl">☆</p>
        <p className="mt-3 text-zinc-300">아직 즐겨찾기가 없습니다.</p>
        <p className="mt-1 text-sm text-zinc-500">
          OTT 포스터나 TV 편성표 프로그램의 별표(☆)를 눌러 추가하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* OTT 즐겨찾기 */}
      {ottItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">OTT ({ottItems.length})</h2>
          <PosterGrid items={ottItems} onSelect={setSelected} />
        </section>
      )}

      {/* TV 즐겨찾기 */}
      {tv.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">TV 프로그램 ({tv.length})</h2>
          <ul className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
            {tv.map((f) => {
              const ottForm = favToOttContent(f);
              return (
                <li key={f.key} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={`min-w-0 flex-1 ${ottForm ? 'cursor-pointer' : ''}`}
                    onClick={() => ottForm && setSelected(ottForm)}
                  >
                    <p className="truncate text-sm font-medium text-zinc-100">{f.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {f.channelName ?? f.channelId}
                      {ottForm && <span className="ml-2 text-indigo-400">상세 보기</span>}
                    </p>
                  </div>
                  <FavoriteButton
                    size="sm"
                    item={{
                      key: f.key,
                      kind: 'tv',
                      title: f.title,
                      channelId: f.channelId,
                      channelName: f.channelName,
                      tmdbId: f.tmdbId,
                    }}
                  />
                  <button
                    onClick={() => removeFavorite(f.key)}
                    className="rounded-lg bg-zinc-800/60 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {selected && <ContentDetailModal initial={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
