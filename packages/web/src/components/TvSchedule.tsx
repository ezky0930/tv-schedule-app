import { useEffect, useMemo, useState } from 'react';
import {
  DAYS,
  DAY_LABELS_KO,
  dayOfWeekFromDate,
  type Channel,
  type ChannelCategory,
  type Program,
  type DayOfWeek,
} from '@tv/shared';
import { api, type MetaInfo } from '../lib/api.js';
import FavoriteButton from './FavoriteButton.js';

// 요일별 TV 편성표 뷰 (메인 화면).
// 요일 탭 → 정렬(시간순/인기순) → 채널 타임라인 또는 인기 순위 리스트.
// 시간순: 채널별 컬럼 타임라인 + "지금 방영 중" 강조.
// 인기순: TMDB 평점/인기로 매칭된 프로그램을 순위로(중복 제거).

type CategoryFilter = 'all' | ChannelCategory;
type SortMode = 'time' | 'popular';

const CATEGORY_FILTERS: Array<{ key: CategoryFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'terrestrial', label: '지상파' },
  { key: 'general', label: '종편' },
  { key: 'cable', label: '케이블' },
];

/** 현재 시각 'HH:mm' */
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TvSchedule() {
  const todayKey = useMemo(() => dayOfWeekFromDate(new Date()), []);
  const [day, setDay] = useState<DayOfWeek>(todayKey);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  // 재방송 숨기기 (= '새로운 방송'만 보기). 기본 ON.
  const [hideReruns, setHideReruns] = useState(true);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState<string>('');
  const now = nowHHMM();

  // 채널 메타(분류/순서) 1회 로드
  useEffect(() => {
    api
      .getMeta()
      .then((res: { data: MetaInfo }) => setChannels(res.data.channels))
      .catch(() => setChannels([]));
  }, []);

  // 채널 id → 분류 매핑
  const channelCategory = useMemo(() => {
    const m: Record<string, ChannelCategory> = {};
    for (const c of channels) m[c.id] = c.category;
    return m;
  }, [channels]);

  // 선택 요일 + 정렬에 맞춰 편성표 로드
  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getTvSchedule(day, undefined, sortMode)
      .then((res) => {
        setPrograms(res.data);
        setFetchedAt(res.fetchedAt ?? '');
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [day, sortMode]);

  // 분류 필터를 통과하는 채널 목록 (시간순 그리드용)
  const visibleChannels = useMemo(
    () => channels.filter((c) => category === 'all' || c.category === category),
    [channels, category],
  );

  // 공통 필터: 재방송 숨김 + 분류
  const passesFilters = (p: Program) =>
    !(hideReruns && p.isRerun) &&
    (category === 'all' || channelCategory[p.channelId] === category);

  // 시간순: 채널별 프로그램 묶기
  const programsByChannel = useMemo(() => {
    const map = new Map<string, Program[]>();
    for (const p of programs) {
      if (hideReruns && p.isRerun) continue;
      const list = map.get(p.channelId) ?? [];
      list.push(p);
      map.set(p.channelId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs, hideReruns]);

  // 인기순: 매칭된 프로그램을 중복 제거(같은 TMDB 콘텐츠는 1개)
  const rankedList = useMemo(() => {
    const seen = new Set<string>();
    const out: Program[] = [];
    for (const p of programs) {
      if (!passesFilters(p)) continue;
      const key = p.tmdbId ?? p.title;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out.slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs, hideReruns, category, channelCategory]);

  // 숨겨진 재방송 개수 (안내용)
  const rerunCount = useMemo(() => programs.filter((p) => p.isRerun).length, [programs]);

  const isToday = day === todayKey;
  const isAiring = (p: Program) =>
    isToday && p.startTime <= now && (!p.endTime || now < p.endTime);

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  return (
    <div>
      {/* 요일 탭 */}
      <nav className="mb-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2">
          {DAYS.map((d) => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`min-w-[3rem] whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                day === d ? 'bg-white text-zinc-900' : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {DAY_LABELS_KO[d]}
              {d === todayKey && <span className="ml-1 text-xs opacity-60">오늘</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* 정렬(시간순/인기순) + 분류 필터 + 재방송 토글 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-zinc-800/50 p-0.5">
          {(
            [
              { key: 'time', label: '시간순' },
              { key: 'popular', label: '인기순' },
            ] as Array<{ key: SortMode; label: string }>
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => setSortMode(s.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                sortMode === s.key ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <span className="mx-1 h-4 w-px bg-zinc-700" />

        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setCategory(f.key)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
              category === f.key
                ? 'bg-indigo-500 text-white'
                : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {f.label}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-zinc-700" />

        <button
          onClick={() => setHideReruns((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition ${
            hideReruns ? 'bg-emerald-600/80 text-white' : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700'
          }`}
          title="재방송 프로그램을 숨깁니다 (새로운 방송만 보기)"
        >
          {hideReruns ? '✓ ' : ''}재방송 숨김
          {hideReruns && rerunCount > 0 && <span className="opacity-70">({rerunCount})</span>}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-5 text-red-300">
          <p className="font-medium">편성표를 불러오지 못했습니다.</p>
          <p className="mt-1 text-sm text-red-400/80">{error}</p>
        </div>
      ) : loading ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          {sortMode === 'popular' ? 'TMDB로 인기 프로그램 매칭 중…' : '편성표 불러오는 중…'}
        </p>
      ) : sortMode === 'popular' ? (
        /* ===== 인기순 순위 리스트 ===== */
        <RankedList list={rankedList} channelName={channelName} isAiring={isAiring} />
      ) : (
        /* ===== 시간순 채널 컬럼 타임라인 ===== */
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          <div className="flex gap-3">
            {visibleChannels.map((ch) => {
              const list = programsByChannel.get(ch.id) ?? [];
              return (
                <section
                  key={ch.id}
                  className="flex w-44 shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/40"
                >
                  <header className="sticky top-0 rounded-t-xl border-b border-zinc-800 bg-zinc-900/90 px-3 py-2 backdrop-blur">
                    <span className="text-sm font-semibold text-zinc-100">{ch.name}</span>
                    <span className="ml-1.5 text-xs text-zinc-500">{list.length}</span>
                  </header>
                  <ul className="flex-1 divide-y divide-zinc-800/60">
                    {list.length === 0 ? (
                      <li className="px-3 py-4 text-xs text-zinc-600">편성 정보 없음</li>
                    ) : (
                      list.map((p) => {
                        const airing = isAiring(p);
                        return (
                          <li key={p.id} className={`px-3 py-2 ${airing ? 'bg-red-500/10' : ''}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-zinc-400">{p.startTime}</span>
                              {airing && (
                                <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-1 text-[10px] font-medium text-red-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />방영중
                                </span>
                              )}
                              {p.isLive && !airing && (
                                <span className="text-[10px] text-rose-400">생방송</span>
                              )}
                              <FavoriteButton
                                size="sm"
                                className="ml-auto !bg-transparent"
                                item={{
                                  key: `tv:${ch.id}:${p.title}`,
                                  kind: 'tv',
                                  title: p.title,
                                  channelId: ch.id,
                                  channelName: ch.name,
                                  tmdbId: p.tmdbId,
                                }}
                              />
                            </div>
                            <p className="mt-0.5 text-sm leading-snug text-zinc-100">
                              {p.title}
                              {p.episode && (
                                <span className="ml-1 text-xs text-zinc-500">{p.episode}</span>
                              )}
                            </p>
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {p.rating && p.rating !== 'all' && (
                                <span className="rounded bg-zinc-800 px-1 text-[10px] text-zinc-400">
                                  {p.rating}세
                                </span>
                              )}
                              {p.isRerun && (
                                <span className="rounded bg-zinc-800 px-1 text-[10px] text-zinc-500">
                                  재방송
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {fetchedAt && (
        <p className="mt-4 text-xs text-zinc-600">
          편성표 기준: {new Date(fetchedAt).toLocaleString('ko-KR')} · 출처: 네이버 편성표
          {sortMode === 'popular' && ' · 인기/평점: TMDB'}
        </p>
      )}
    </div>
  );
}

/** 인기순 순위 리스트 */
function RankedList({
  list,
  channelName,
  isAiring,
}: {
  list: Program[];
  channelName: (id: string) => string;
  isAiring: (p: Program) => boolean;
}) {
  if (list.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        매칭된 인기 프로그램이 없습니다. (뉴스·생활정보 등은 TMDB에 없어 인기순에서 제외됩니다)
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
      {list.map((p, i) => {
        const airing = isAiring(p);
        return (
          <li key={p.id} className={`flex items-center gap-3 px-4 py-3 ${airing ? 'bg-red-500/10' : ''}`}>
            <span className="w-6 shrink-0 text-center text-sm font-semibold text-zinc-500">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">{p.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                <span className="text-zinc-400">{channelName(p.channelId)}</span>
                <span className="font-mono">{p.startTime}</span>
                {airing && <span className="text-red-400">방영중</span>}
                {p.isRerun && <span>재방송</span>}
              </p>
            </div>
            {typeof p.tmdbRating === 'number' && p.tmdbRating > 0 && (
              <span className="shrink-0 text-sm font-medium text-amber-300">
                ★ {p.tmdbRating.toFixed(1)}
              </span>
            )}
            <FavoriteButton
              size="sm"
              className="!bg-transparent"
              item={{
                key: `tv:${p.channelId}:${p.title}`,
                kind: 'tv',
                title: p.title,
                channelId: p.channelId,
                channelName: channelName(p.channelId),
                tmdbId: p.tmdbId,
              }}
            />
          </li>
        );
      })}
    </ul>
  );
}
