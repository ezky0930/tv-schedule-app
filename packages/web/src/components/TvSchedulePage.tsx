import { useEffect, useMemo, useState } from 'react';
import {
  DAY_LABELS_KO,
  dayOfWeekFromDate,
  type Channel,
  type ChannelCategory,
  type Program,
  type DayOfWeek,
  type OttContent,
} from '@tv/shared';
import { api, type MetaInfo } from '../lib/api.js';
import HeroCarousel from './HeroCarousel.js';
import ScheduleControls from './ScheduleControls.js';
import EpgTimelineGrid from './EpgTimelineGrid.js';
import RecommendedRow from './RecommendedRow.js';
import ContentDetailModal from './ContentDetailModal.js';
import FavoriteButton from './FavoriteButton.js';

// TV 편성표 페이지 — 히어로 + 컨트롤 + EPG 그리드(시간순) / 인기 순위(인기순) + 추천 행.
type CategoryFilter = 'all' | ChannelCategory;
type SortMode = 'time' | 'popular';

export default function TvSchedulePage() {
  const todayDay = useMemo(() => dayOfWeekFromDate(new Date()), []);
  const [day, setDay] = useState<DayOfWeek>(todayDay);
  const [sort, setSort] = useState<SortMode>('time');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [hideReruns, setHideReruns] = useState(true);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<OttContent | null>(null);

  useEffect(() => {
    api
      .getMeta()
      .then((r: { data: MetaInfo }) => setChannels(r.data.channels))
      .catch(() => setChannels([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getTvSchedule(day, undefined, sort)
      .then((r) => setPrograms(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [day, sort]);

  const channelCat = useMemo(() => {
    const m: Record<string, ChannelCategory> = {};
    for (const c of channels) m[c.id] = c.category;
    return m;
  }, [channels]);

  const rerunCount = useMemo(() => programs.filter((p) => p.isRerun).length, [programs]);

  // 시간순: 분류·재방송 필터 적용한 채널/프로그램
  const visibleChannels = useMemo(
    () => channels.filter((c) => category === 'all' || c.category === category),
    [channels, category],
  );
  const gridPrograms = useMemo(
    () =>
      programs.filter(
        (p) =>
          !(hideReruns && p.isRerun) &&
          (category === 'all' || channelCat[p.channelId] === category),
      ),
    [programs, hideReruns, category, channelCat],
  );

  // 인기순: 중복(같은 tmdbId) 제거한 순위 리스트
  const rankedList = useMemo(() => {
    const seen = new Set<string>();
    const out: Program[] = [];
    for (const p of programs) {
      if (hideReruns && p.isRerun) continue;
      if (category !== 'all' && channelCat[p.channelId] !== category) continue;
      const key = p.tmdbId ?? p.title;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out.slice(0, 40);
  }, [programs, hideReruns, category, channelCat]);

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <HeroCarousel onSelect={setSelected} />

      <ScheduleControls
        day={day}
        onDay={setDay}
        sort={sort}
        onSort={setSort}
        category={category}
        onCategory={setCategory}
        hideReruns={hideReruns}
        onToggleReruns={() => setHideReruns((v) => !v)}
        rerunCount={rerunCount}
        todayDay={todayDay}
      />

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-5 text-red-300">
          편성표를 불러오지 못했습니다. {error}
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-16 text-center text-sm text-slate-500">
          편성표 불러오는 중…
        </div>
      ) : sort === 'popular' ? (
        <PopularList list={rankedList} channelName={channelName} />
      ) : (
        <EpgTimelineGrid
          channels={visibleChannels}
          programs={gridPrograms}
          selectedDay={day}
          todayDay={todayDay}
        />
      )}

      <RecommendedRow onSelect={setSelected} />

      {selected && <ContentDetailModal initial={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/** 인기순 순위 리스트 (시간 그리드 대신) */
function PopularList({
  list,
  channelName,
}: {
  list: Program[];
  channelName: (id: string) => string;
}) {
  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-16 text-center text-sm text-slate-500">
        매칭된 인기 프로그램이 없습니다. (뉴스·생활정보 등은 인기순에서 제외)
      </div>
    );
  }
  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {list.map((p, i) => (
        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
          <span className="w-6 text-center text-sm font-medium text-slate-500">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-100">{p.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {channelName(p.channelId)} · {DAY_LABELS_KO[p.day]} {p.startTime}
            </p>
          </div>
          {typeof p.tmdbRating === 'number' && p.tmdbRating > 0 && (
            <span className="text-sm font-medium text-amber-300">★ {p.tmdbRating.toFixed(1)}</span>
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
      ))}
    </ul>
  );
}
