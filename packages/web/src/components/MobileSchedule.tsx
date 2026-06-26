import { useEffect, useMemo, useState } from 'react';
import type { Channel, Program, DayOfWeek, ChannelCategory } from '@tv/shared';
import FavoriteButton from './FavoriteButton.js';

// 모바일 편성표 — 가로 그리드 대신 "채널 선택 + 그 채널의 하루 세로 타임라인".
// 좁은 화면에서 가독성을 우선한다(네이버 모바일 편성표 스타일).

interface Props {
  channels: Channel[];
  programs: Program[];
  selectedDay: DayOfWeek;
  todayDay: DayOfWeek;
}

/** 채널 분류별 강조색 */
const CAT_COLOR: Record<ChannelCategory, string> = {
  terrestrial: 'bg-blue-500',
  general: 'bg-violet-500',
  cable: 'bg-emerald-500',
};

/** 제목 키워드로 장르 추정 */
function guessGenre(title: string): string {
  if (/뉴스/.test(title)) return '뉴스/시사';
  if (/드라마|일일|주말연속/.test(title)) return '드라마';
  if (/영화|시네마/.test(title)) return '영화';
  if (/다큐|르포/.test(title)) return '다큐';
  if (/예능|쇼|버라이어티/.test(title)) return '예능';
  return '';
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function MobileSchedule({ channels, programs, selectedDay, todayDay }: Props) {
  const [channelId, setChannelId] = useState<string>('');
  const now = nowHHMM();
  const isToday = selectedDay === todayDay;

  // 첫 채널 자동 선택(목록 바뀌면 유효성 보정)
  useEffect(() => {
    if (channels.length === 0) return;
    if (!channels.some((c) => c.id === channelId)) {
      setChannelId(channels[0].id);
    }
  }, [channels, channelId]);

  // 채널별 프로그램(시작시간 순)
  const list = useMemo(
    () =>
      programs
        .filter((p) => p.channelId === channelId)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [programs, channelId],
  );

  const selectedChannel = channels.find((c) => c.id === channelId);
  const isAiring = (p: Program) =>
    isToday && p.startTime <= now && (!p.endTime || now < p.endTime);

  return (
    <div className="space-y-3">
      {/* 채널 선택 칩 — 스크롤해도 헤더 바로 아래에 고정(sticky) */}
      <div
        style={{ top: 'var(--app-header-h, 0px)' }}
        className="thin-scroll sticky z-30 flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-[#0a0e17]/95 p-2.5 shadow-lg shadow-black/30 backdrop-blur"
      >
        {channels.map((c) => {
          const on = c.id === channelId;
          return (
            <button
              key={c.id}
              onClick={() => setChannelId(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                on ? 'bg-white text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${CAT_COLOR[c.category]}`} />
              {c.name}
            </button>
          );
        })}
      </div>

      {/* 선택 채널 하루 편성 (세로 타임라인) */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {list.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">
          {selectedChannel ? '편성 정보가 없습니다.' : '채널을 선택하세요.'}
        </p>
      ) : (
        <ul>
          {list.map((p) => {
            const airing = isAiring(p);
            const genre = guessGenre(p.title);
            return (
              <li
                key={p.id}
                className={`flex gap-3 border-b border-white/5 px-4 py-3 ${
                  airing ? 'bg-red-500/10' : ''
                }`}
              >
                {/* 시간 레일 */}
                <div className="w-12 shrink-0 pt-0.5 text-right">
                  <div
                    className={`font-mono text-sm font-medium ${
                      airing ? 'text-red-400' : 'text-slate-200'
                    }`}
                  >
                    {p.startTime}
                  </div>
                  {p.endTime && (
                    <div className="font-mono text-[11px] text-slate-500">~{p.endTime}</div>
                  )}
                </div>

                {/* 세로 구분선 + 점 */}
                <div className="relative flex w-3 shrink-0 justify-center">
                  <div className="absolute inset-y-0 w-px bg-white/10" />
                  <div
                    className={`relative mt-1.5 h-2.5 w-2.5 rounded-full ${
                      airing ? 'bg-red-500 ring-4 ring-red-500/20' : 'bg-white/25'
                    }`}
                  />
                </div>

                {/* 프로그램 내용 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-slate-100">
                      {p.title}
                      {p.episode && (
                        <span className="ml-1 text-xs text-slate-500">{p.episode}</span>
                      )}
                    </p>
                    <FavoriteButton
                      size="sm"
                      className="!bg-transparent"
                      item={{
                        key: `tv:${p.channelId}:${p.title}`,
                        kind: 'tv',
                        title: p.title,
                        channelId: p.channelId,
                        channelName: selectedChannel?.name,
                        tmdbId: p.tmdbId,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {airing && (
                      <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />방영중
                      </span>
                    )}
                    {p.isLive && !airing && (
                      <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        LIVE
                      </span>
                    )}
                    {genre && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-400">
                        {genre}
                      </span>
                    )}
                    {p.rating && p.rating !== 'all' && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-400">
                        {p.rating}세
                      </span>
                    )}
                    {p.isRerun && (
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-500">
                        재방송
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </div>
  );
}
