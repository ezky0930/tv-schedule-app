import type { OttContent } from '@tv/shared';
import FavoriteButton from './FavoriteButton.js';

// 포스터 그리드 — OTT 콘텐츠 목록을 포스터 카드로 표시한다.
// 카드 클릭 → onSelect(상세), 별표 → 즐겨찾기 토글.

interface PosterGridProps {
  items: OttContent[];
  onSelect: (content: OttContent) => void;
}

/** 평점 배지 (소수 1자리) */
function RatingBadge({ value }: { value?: number }) {
  if (!value || value <= 0) return null;
  return (
    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-amber-300">
      ★ {value.toFixed(1)}
    </span>
  );
}

function PosterCard({ content, onSelect }: { content: OttContent; onSelect: (c: OttContent) => void }) {
  return (
    <div
      onClick={() => onSelect(content)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(content);
        }
      }}
      className="group flex cursor-pointer flex-col text-left focus:outline-none"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/5 transition group-hover:ring-white/30">
        {content.posterUrl ? (
          <img
            src={content.posterUrl}
            alt={content.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-zinc-500">
            {content.title}
          </div>
        )}
        <RatingBadge value={content.voteAverage} />
        {/* 별표 (우상단) */}
        <FavoriteButton
          size="sm"
          className="absolute right-1.5 top-1.5"
          item={{
            key: content.id,
            kind: 'ott',
            title: content.title,
            posterUrl: content.posterUrl,
            tmdbId: content.id,
          }}
        />
      </div>
      <p className="mt-1.5 line-clamp-1 text-sm font-medium text-zinc-100">
        {content.mediaType === 'tv' && <span className="mr-1 text-[10px] text-indigo-400">시리즈</span>}
        {content.title}
      </p>
      {content.releaseDate && (
        <p className="text-xs text-zinc-500">{content.releaseDate.slice(0, 4)}</p>
      )}
      {/* 어디서 볼 수 있는지 (OTT 배지) */}
      {content.providers && content.providers.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {content.providers.slice(0, 2).map((p) => (
            <span
              key={`${p.id}-${p.tmdbProviderId}`}
              className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
            >
              {p.name}
            </span>
          ))}
          {content.providers.length > 2 && (
            <span className="px-1 text-[10px] text-zinc-500">+{content.providers.length - 2}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function PosterGrid({ items, onSelect }: PosterGridProps) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-500">표시할 콘텐츠가 없습니다.</p>;
  }
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {items.map((c) => (
        <PosterCard key={c.id} content={c} onSelect={onSelect} />
      ))}
    </div>
  );
}
