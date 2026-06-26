import { useEffect, useState } from 'react';
import type { OttContent } from '@tv/shared';
import { api } from '../lib/api.js';

// 히어로 배너 캐러셀 — 메인 상단의 큰 배너.
// api.getOttTrending() 의 인기작(포스터 보유) 상위 5개를 featured 로 쓰고,
// 우측에 포스터 3~4장을 살짝 겹쳐 기울여 배치한다. 3.5초 자동 회전.

interface HeroCarouselProps {
  /** 포스터 클릭 시 상세로 넘기는 콜백 (선택) */
  onSelect?: (content: OttContent) => void;
}

/** featured 로 보여줄 최대 개수(=하단 점 개수) */
const FEATURED_COUNT = 5;
/** 우측에 겹쳐 보여줄 포스터 장수 */
const STACK_SIZE = 4;
/** 자동 회전 주기(ms) */
const AUTO_MS = 3500;

/** 우측 겹침 포스터의 위치/기울기 프리셋 (4장 기준) */
const STACK_STYLES = [
  { rotate: '-8deg', translateX: '0px', translateY: '12px', z: 10 },
  { rotate: '-2deg', translateX: '56px', translateY: '-6px', z: 20 },
  { rotate: '5deg', translateX: '112px', translateY: '6px', z: 30 },
  { rotate: '11deg', translateX: '164px', translateY: '20px', z: 40 },
];

/** 빨간 LIVE 배지 */
function LiveBadge() {
  return (
    <span className="absolute left-1.5 top-1.5 z-50 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
      LIVE
    </span>
  );
}

/** 로딩 중 동일 높이 스켈레톤 */
function HeroSkeleton() {
  return (
    <div className="relative h-[340px] w-full animate-pulse overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-700/20 via-indigo-700/15 to-purple-700/15" />
      <div className="relative flex h-full flex-col justify-center gap-4 p-8">
        <div className="h-8 w-2/3 rounded-lg bg-white/10" />
        <div className="h-8 w-1/2 rounded-lg bg-white/10" />
        <div className="mt-2 h-4 w-1/3 rounded bg-white/10" />
        <div className="mt-4 h-11 w-44 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

export default function HeroCarousel({ onSelect }: HeroCarouselProps) {
  const [featured, setFeatured] = useState<OttContent[]>([]);
  const [loading, setLoading] = useState(true);
  // 우측 스택의 시작 인덱스(이 값을 회전시켜 보이는 포스터를 바꾼다)
  const [start, setStart] = useState(0);

  // 마운트 시 인기작 로드 → 포스터 보유 항목만 추려 상위 5개를 featured 로.
  useEffect(() => {
    let alive = true;
    api
      .getOttTrending()
      .then((res) => {
        if (!alive) return;
        const withPoster = res.data.filter((c) => Boolean(c.posterUrl));
        setFeatured(withPoster.slice(0, FEATURED_COUNT));
      })
      .catch(() => {
        if (alive) setFeatured([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 3.5초 자동 회전 (featured 가 2개 이상일 때만 의미 있음)
  useEffect(() => {
    if (featured.length <= 1) return;
    const t = setInterval(() => {
      setStart((s) => (s + 1) % featured.length);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [featured.length]);

  if (loading) return <HeroSkeleton />;
  if (featured.length === 0) return null;

  const len = featured.length;
  const prev = () => setStart((s) => (s - 1 + len) % len);
  const next = () => setStart((s) => (s + 1) % len);

  // 시작 인덱스부터 STACK_SIZE 장을 순환해서 우측 스택에 배치
  const stack = Array.from({ length: Math.min(STACK_SIZE, len) }, (_, i) => featured[(start + i) % len]);

  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0e1424]">
      {/* 배경 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-700/40 via-indigo-700/30 to-purple-700/30" />

      <div className="relative flex h-full items-center">
        {/* 왼쪽: 카피 + CTA */}
        <div className="z-10 flex max-w-[56%] flex-col gap-3 px-7 py-8 sm:px-9">
          <h2 className="text-2xl font-bold leading-tight text-slate-100 sm:text-3xl">
            지금, 놓치면 아쉬운 방송
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
              실시간으로 만나보세요!
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            라이브 방송부터 화제의 프로그램까지 한눈에
          </p>
          <div>
            <button
              type="button"
              onClick={() => onSelect?.(featured[start])}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0e1424] transition hover:bg-slate-200"
            >
              지금 편성표 보기 <span aria-hidden>▶</span>
            </button>
          </div>
        </div>

        {/* 오른쪽: 겹쳐 기울인 포스터 스택 (작은 화면에서는 숨김) */}
        <div className="pointer-events-none absolute inset-y-0 right-4 hidden w-[340px] items-center sm:flex">
          <div className="relative h-[260px] w-full">
            {stack.map((c, i) => {
              const st = STACK_STYLES[i] ?? STACK_STYLES[STACK_STYLES.length - 1];
              return (
                <button
                  key={`${c.id}-${i}`}
                  type="button"
                  onClick={() => onSelect?.(c)}
                  style={{
                    transform: `translate(${st.translateX}, ${st.translateY}) rotate(${st.rotate})`,
                    zIndex: st.z,
                  }}
                  className="card-hover pointer-events-auto absolute left-0 top-1/2 -mt-[120px] h-[240px] w-[160px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/40 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {/* 앞쪽 2장에만 LIVE 배지 */}
                  {i < 2 && <LiveBadge />}
                  <img
                    src={c.posterUrl}
                    alt={c.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단: 점(dots) + 좌우 화살표 */}
      <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-between px-7 sm:px-9">
        {/* 점 5개 — 현재 활성 강조 */}
        <div className="flex items-center gap-2">
          {featured.map((c, i) => (
            <button
              key={c.id}
              type="button"
              aria-label={`${i + 1}번째 배너로 이동`}
              aria-current={i === start}
              onClick={() => setStart(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === start ? 'w-6 bg-indigo-400' : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* 좌우 화살표 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="이전 배너"
            onClick={prev}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            <span aria-hidden>‹</span>
          </button>
          <button
            type="button"
            aria-label="다음 배너"
            onClick={next}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            <span aria-hidden>›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
