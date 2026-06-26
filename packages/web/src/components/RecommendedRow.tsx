import { useEffect, useState } from 'react';
import type { OttContent } from '@tv/shared';
import { api } from '../lib/api.js';
import FavoriteButton from './FavoriteButton.js';

// "오늘의 추천 콘텐츠" 가로 카드 행.
// api.getOttTrending() 상위 ~12개를 가로 스크롤 카드로 보여준다.
// 카드 클릭 → onSelect(상세), 별표 → 즐겨찾기 토글(FavoriteButton 재사용).

interface RecommendedRowProps {
  /** 카드 클릭 시 상세로 전달 */
  onSelect?: (content: OttContent) => void;
}

/** 좌상단 배지 종류 — 인덱스로 부여한다(0번은 항상 LIVE). */
type BadgeKind = 'live' | '추천' | '인기' | '신작';

/** 인덱스 기준 배지 부여: 0=LIVE, 이후 추천/인기/신작 번갈아. */
function badgeForIndex(i: number): BadgeKind {
  if (i === 0) return 'live';
  const cycle: BadgeKind[] = ['추천', '인기', '신작'];
  return cycle[(i - 1) % cycle.length];
}

/** 배지 색상 토큰 (LIVE=빨강, 추천=핑크, 인기=주황, 신작=초록). */
const BADGE_STYLE: Record<BadgeKind, string> = {
  live: 'bg-red-500 text-white',
  추천: 'bg-pink-500 text-white',
  인기: 'bg-orange-500 text-white',
  신작: 'bg-emerald-500 text-white',
};

/** voteAverage(0~10) → 점수칩 퍼센트(0~100 클램프). */
function scorePercent(content: OttContent): number {
  const raw = Math.round((content.voteAverage ?? 7) * 10);
  return Math.max(0, Math.min(100, raw));
}

/** 부제: 장르 1~2개를 우선, 없으면 mediaType 라벨. */
function subtitleOf(content: OttContent): string {
  if (content.genres && content.genres.length > 0) {
    return content.genres.slice(0, 2).join(' · ');
  }
  return content.mediaType === 'tv' ? '시리즈' : '영화';
}

function RecommendCard({
  content,
  index,
  onSelect,
}: {
  content: OttContent;
  index: number;
  onSelect?: (c: OttContent) => void;
}) {
  // 포스터는 backdropUrl(가로) 우선, 없으면 posterUrl.
  const image = content.backdropUrl ?? content.posterUrl;
  const badge = badgeForIndex(index);
  const score = scorePercent(content);

  return (
    <div
      onClick={() => onSelect?.(content)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(content);
        }
      }}
      className="card-hover group w-[220px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-white/20 focus:outline-none focus-visible:border-indigo-400"
    >
      {/* 상단 포스터 (16:9) */}
      <div className="relative aspect-video w-full overflow-hidden bg-white/5">
        <img
          src={image}
          alt={content.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        {/* 좌상단 배지 */}
        <span
          className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${BADGE_STYLE[badge]}`}
        >
          {badge === 'live' ? 'LIVE' : badge}
        </span>
        {/* 우상단 별표 (즐겨찾기) */}
        <FavoriteButton
          size="sm"
          className="absolute right-2 top-2"
          item={{
            key: content.id,
            kind: 'ott',
            title: content.title,
            posterUrl: content.posterUrl,
            tmdbId: content.id,
          }}
        />
        {/* 우하단 점수칩 */}
        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300 backdrop-blur">
          ▲ {score}%
        </span>
      </div>

      {/* 제목 + 부제 */}
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-medium text-slate-100">{content.title}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{subtitleOf(content)}</p>
      </div>
    </div>
  );
}

/** 로딩 자리표시 카드(스켈레톤). */
function SkeletonCard() {
  return (
    <div className="w-[220px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="aspect-video w-full animate-pulse bg-white/5" />
      <div className="space-y-2 px-3 py-2.5">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  );
}

export default function RecommendedRow({ onSelect }: RecommendedRowProps) {
  const [items, setItems] = useState<OttContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api
      .getOttTrending()
      .then((res) => {
        if (!alive) return;
        // 포스터 이미지(backdrop/poster) 없는 항목은 제외 후 상위 12개.
        const filtered = res.data.filter((c) => c.backdropUrl || c.posterUrl).slice(0, 12);
        setItems(filtered);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 에러이면서 표시할 게 없으면 행 자체를 숨긴다(다른 섹션 흐름 방해 금지).
  if (error && items.length === 0 && !loading) return null;

  return (
    <section className="mb-8">
      {/* 헤더: 제목 + 더보기 */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100">오늘의 추천 콘텐츠</h2>
        <button
          type="button"
          className="text-sm font-medium text-slate-400 transition hover:text-white"
        >
          더보기 ›
        </button>
      </div>

      {/* 가로 스크롤 카드 행 */}
      <div className="-mx-4 overflow-x-auto px-4 thin-scroll sm:mx-0 sm:px-0">
        <div className="flex w-max gap-4 pb-1">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : items.map((c, i) => (
                <RecommendCard key={c.id} content={c} index={i} onSelect={onSelect} />
              ))}
        </div>
      </div>
    </section>
  );
}
