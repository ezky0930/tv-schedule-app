import { useEffect, useMemo, useRef } from 'react';
import type { Channel, Program, DayOfWeek, ChannelCategory } from '@tv/shared';

// EPG 타임라인 그리드 — 채널=행, 시간(0~24시)=가로축, 프로그램=시간폭 블록.
// 자체 2D 스크롤 박스: 채널 열(왼쪽)·시간 헤더(위)가 둘 다 sticky 로 고정되어,
// 데스크톱·모바일 모두 한 박스 안에서 가로·세로로 편하게 본다.

interface Props {
  channels: Channel[];
  programs: Program[];
  selectedDay: DayOfWeek;
  todayDay: DayOfWeek;
  onSelect?: (p: Program) => void;
}

const PX_PER_MIN = 4; // 1분당 px (1시간 = 240px)
const ROW_H = 78;
const CH_COL_W = 92; // 좌측 채널열 고정 폭
const HEADER_H = 34;
const DAY_MIN = 1440;
const TRACK_W = DAY_MIN * PX_PER_MIN;

const CAT_HEX: Record<ChannelCategory, string> = {
  terrestrial: '#3b82f6',
  general: '#8b5cf6',
  cable: '#10b981',
};

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 제목 키워드로 장르 추정 */
function guessGenre(title: string): string {
  if (/뉴스/.test(title)) return '뉴스/시사';
  if (/드라마|일일|주말연속/.test(title)) return '드라마';
  if (/영화|시네마/.test(title)) return '영화';
  if (/다큐|르포/.test(title)) return '다큐';
  if (/예능|쇼|버라이어티/.test(title)) return '예능';
  return '';
}

export default function EpgTimelineGrid({
  channels,
  programs,
  selectedDay,
  todayDay,
  onSelect,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isToday = selectedDay === todayDay;
  const nowMin = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);
  const nowHHMM = `${String(Math.floor(nowMin / 60)).padStart(2, '0')}:${String(nowMin % 60).padStart(2, '0')}`;

  // 채널 id → 프로그램(시작시간 순)
  const byChannel = useMemo(() => {
    const m = new Map<string, Program[]>();
    for (const p of programs) {
      const arr = m.get(p.channelId) ?? [];
      arr.push(p);
      m.set(p.channelId, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return m;
  }, [programs]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, h) => h), []);

  // 마운트/요일 변경 시 현재 시각(또는 13시)으로 가로 자동 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = isToday ? nowMin * PX_PER_MIN - 90 : 13 * 60 * PX_PER_MIN - 90;
    el.scrollLeft = Math.max(0, target);
  }, [isToday, nowMin, selectedDay]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div
        ref={scrollRef}
        className="thin-scroll relative overflow-auto"
        style={{ maxHeight: '72vh' }}
      >
        <div style={{ width: CH_COL_W + TRACK_W, position: 'relative' }}>
          {/* 시간 헤더 (sticky top) */}
          <div className="sticky top-0 z-20 flex" style={{ height: HEADER_H }}>
            <div
              className="sticky left-0 z-10 shrink-0 border-b border-r border-white/10 bg-[#0b1018]"
              style={{ width: CH_COL_W }}
            />
            <div
              className="relative shrink-0 border-b border-white/10 bg-[#0b1018]"
              style={{ width: TRACK_W, height: HEADER_H }}
            >
              {hours.map((h) => (
                <span
                  key={h}
                  className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400"
                  style={{ left: h * 60 * PX_PER_MIN + 6 }}
                >
                  {String(h).padStart(2, '0')}:00
                </span>
              ))}
              {isToday && (
                <span
                  className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                  style={{ left: nowMin * PX_PER_MIN }}
                >
                  {nowHHMM}
                </span>
              )}
            </div>
          </div>

          {/* 채널 행들 */}
          {channels.map((ch) => {
            const list = byChannel.get(ch.id) ?? [];
            return (
              <div key={ch.id} className="flex border-b border-white/5" style={{ height: ROW_H }}>
                {/* 채널 셀 (sticky left) */}
                <div
                  className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-0.5 border-r border-white/10 bg-[#0b1018] px-2.5"
                  style={{ width: CH_COL_W, borderLeft: `3px solid ${CAT_HEX[ch.category]}` }}
                >
                  <span className="truncate text-[13px] font-semibold text-slate-100">
                    {ch.name}
                  </span>
                  <span className="text-[10px] text-slate-500">{list.length}편</span>
                </div>

                {/* 타임라인 트랙 */}
                <div className="relative shrink-0" style={{ width: TRACK_W, height: ROW_H }}>
                  {isToday && (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-[5] w-0.5 bg-red-500/80"
                      style={{ left: nowMin * PX_PER_MIN }}
                    />
                  )}
                  {list.map((p) => {
                    const startMin = timeToMin(p.startTime);
                    let endMin = p.endTime ? timeToMin(p.endTime) : startMin + 30;
                    if (endMin <= startMin) endMin = DAY_MIN;
                    const left = startMin * PX_PER_MIN;
                    const width = Math.max(endMin - startMin, 18) * PX_PER_MIN - 4;
                    const airing =
                      isToday && p.startTime <= nowHHMM && (!p.endTime || nowHHMM < p.endTime);
                    const genre = guessGenre(p.title);
                    return (
                      <button
                        key={p.id}
                        onClick={() => onSelect?.(p)}
                        className={`card-hover absolute top-1.5 overflow-hidden rounded-lg border px-2 py-1 text-left transition ${
                          airing
                            ? 'border-red-500/60 bg-red-500/10 ring-1 ring-red-500/40'
                            : 'border-white/10 bg-white/[0.06] hover:border-white/25'
                        }`}
                        style={{ left, width, height: ROW_H - 12 }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[10px] text-slate-400">{p.startTime}</span>
                          {(p.isLive || airing) && (
                            <span className="rounded bg-red-500 px-1 text-[9px] font-bold leading-tight text-white">
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[12px] font-medium leading-tight text-slate-100">
                          {p.title}
                        </p>
                        {genre && <p className="truncate text-[10px] text-slate-500">{genre}</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
