import { useEffect, useState } from 'react';
import type { OttContent } from '@tv/shared';
import { api } from '../lib/api.js';
import FavoriteButton from './FavoriteButton.js';

// 콘텐츠 상세 모달.
// 목록에서 받은 기본 정보(initial)를 먼저 보여주고, /content/:id 로 상세(출연진·시청처)를 채운다.

interface Props {
  initial: OttContent;
  onClose: () => void;
}

export default function ContentDetailModal({ initial, onClose }: Props) {
  // 처음엔 목록에서 받은 정보로 즉시 렌더하고, 상세를 받아오면 교체한다.
  const [content, setContent] = useState<OttContent>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getOttContent(initial.id)
      .then((res) => {
        if (alive) setContent(res.data);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [initial.id]);

  // ESC 로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 배경 이미지 */}
        {content.backdropUrl && (
          <div className="relative h-44 w-full sm:h-56">
            <img src={content.backdropUrl} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
          </div>
        )}

        {/* 별표 + 닫기 버튼 */}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <FavoriteButton
            item={{
              key: content.id,
              kind: 'ott',
              title: content.title,
              posterUrl: content.posterUrl,
              tmdbId: content.id,
            }}
          />
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-zinc-200 hover:bg-black/80"
          >
            ✕
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex gap-4">
            {content.posterUrl && (
              <img
                src={content.posterUrl}
                alt={content.title}
                className={`hidden w-24 shrink-0 rounded-lg sm:block ${content.backdropUrl ? '-mt-16' : ''}`}
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-white">{content.title}</h2>
              {content.originalTitle && content.originalTitle !== content.title && (
                <p className="text-sm text-zinc-400">{content.originalTitle}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
                  {content.mediaType === 'tv' ? '시리즈' : '영화'}
                </span>
                {content.voteAverage ? (
                  <span className="text-amber-300">★ {content.voteAverage.toFixed(1)}</span>
                ) : null}
                {content.releaseDate && <span>{content.releaseDate}</span>}
              </div>
              {content.genres && content.genres.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {content.genres.map((g) => (
                    <span key={g} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {content.tagline && (
            <p className="mt-4 italic text-zinc-400">“{content.tagline}”</p>
          )}

          {content.overview && (
            <p className="mt-4 text-sm leading-relaxed text-zinc-200">{content.overview}</p>
          )}

          {/* 어디서 볼 수 있는지 */}
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">어디서 볼 수 있나요?</h3>
            {loading && !content.providers ? (
              <p className="text-sm text-zinc-500">불러오는 중…</p>
            ) : content.providers && content.providers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {content.providers.map((p) => (
                  <span
                    key={`${p.id}-${p.tmdbProviderId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 text-sm text-zinc-100"
                  >
                    {p.logoUrl && <img src={p.logoUrl} alt="" className="h-4 w-4 rounded" />}
                    {p.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                {loading ? '불러오는 중…' : '국내 정액제 스트리밍 정보가 없습니다.'}
              </p>
            )}
          </div>

          {/* 출연진 */}
          {content.cast && content.cast.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">출연</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-300">
                {content.cast.slice(0, 8).map((c, i) => (
                  <span key={`${c.name}-${i}`}>
                    {c.name}
                    {c.character && <span className="text-zinc-500"> · {c.character}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-400">상세 정보 오류: {error}</p>}
        </div>
      </div>
    </div>
  );
}
