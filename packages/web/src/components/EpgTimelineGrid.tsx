import { useEffect, useMemo, useRef } from 'react';
import {
  dayOfWeekFromDate,
  type Channel,
  type ChannelCategory,
  type Program,
  type DayOfWeek,
} from '@tv/shared';
import FavoriteButton from './FavoriteButton.js';

// EPG 타임라인 그리드 — 채널을 행, 시간(0~24시)을 가로축으로 두고
// 각 프로그램을 "시작~종료 시간폭"만큼의 블록으로 절대배치해 보여준다.
// 가로로 스크롤하며 하루 전체 편성을 한눈에 본다(가이드 채널 EPG 형태).

// --- 레이아웃 상수 (px) ---
const PX_PER_MIN = 4; // 1분당 가로 픽셀
const ROW_H = 92; // 채널 행 높이
const CH_COL_W = 120; // 좌측 채널열 고정 폭
const HEADER_H = 40; // 상단 시간 눈금 행 높이
const DAY_MIN = 1440; // 하루 = 24h * 60m
const TRACK_W = DAY_MIN * PX_PER_MIN; // 타임라인 트랙 총폭

interface Props {
  /** 표시할 채널 목록(행) */
  channels: Channel[];
  /** 해당 요일의 전체 프로그램(모든 채널 섞여 있어도 됨) */
  programs: Program[];
  /** 현재 보고 있는 요일 */
  selectedDay: DayOfWeek;
  /** 오늘 요일(현재 시간선 표시 여부 판단) */
  todayDay: DayOfWeek;
  /** 블록 클릭 시 콜백 */
  onSelect?: (p: Program) => void;
}

/** 'HH:mm' → 분 단위 정수 (파싱 실패 시 0) */
function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  const hi = Number(h);
  const mi = Number(m);
  if (Number.isNaN(hi) || Number.isNaN(mi)) return 0;
  return hi * 60 + mi;
}

/** 채널 분류별 배지 색 (지상파=블루, 종편=바이올렛, 케이블=에메랄드) */
function categoryBadge(cat: ChannelCategory): string {
  switch (cat) {
    case 'terrestrial':
      return 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-400/30';
    case 'general':
      return 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30';
    case 'cable':
    default:
      return 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30';
  }
}

/** 채널명 → 배지에 넣을 짧은 약자 (영문 대문자/숫자 위주 2~3자) */
function channelAbbr(name: string): string {
  const compact = name.replace(/\s+/g, '');
  // 'KBS2' → 'KBS', 'tvN' → 'TVN' 처럼 앞 3글자만, 너무 길면 자름.
  const letters = compact.replace(/[^A-Za-z0-9가-힣]/g, '');
  return (letters.slice(0, 3) || name.slice(0, 2)).toUpperCase();
}

/**
 * 제목 키워드로 장르를 가볍게 추론한다(서버 genre 가 없을 때 보조용).
 * 매칭 안 되면 빈 문자열.
 */
function inferGenre(title: string): string {
  const t = title;
  if (/뉴스|시사|토론|특보/.test(t)) return '뉴스/시사';
  if (/드라마|일일극|주말극|연속극/.test(t)) return '드라마';
  if (/영화|시네마|무비/.test(t)) return '영화';
  if (/다큐|기행|탐사|자연/.test(t)) return '다큐멘터리';
  if (/예능|코미디|버라이어티|쇼|토크/.test(t)) return '예능';
  if (/스포츠|축구|야구|배구|중계/.test(t)) return '스포츠';
  if (/교양|강좌|클래스|교육|특강/.test(t)) return '교양';
  if (/음악|콘서트|가요|뮤직/.test(t)) return '음악';
  if (/만화|애니/.test(t)) return '애니메이션';
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

  // 현재 분(오늘일 때만 의미 있음). 1분마다 갱신하진 않고 마운트/요일변경 시 계산.
  const nowMin = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
    // selectedDay 가 바뀌면 현재선 위치 재계산
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // 채널 id → 프로그램 목록(시작시간 순)
  const byChannel = useMemo(() => {
    const map = new Map<string, Program[]>();
    for (const p of programs) {
      const list = map.get(p.channelId) ?? [];
      list.push(p);
      map.set(p.channelId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [programs]);

  // 채널 id → 분류 (배지 색용)
  const catById = useMemo(() => {
    const m: Record<string, ChannelCategory> = {};
    for (const c of channels) m[c.id] = c.category;
    return m;
  }, [channels]);

  // 마운트(또는 요일 변경) 시 자동 가로 스크롤:
  // 오늘이면 현재 시각 살짝 앞으로, 아니면 13:00 위치로 이동.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = isToday
      ? Math.max(0, nowMin * PX_PER_MIN - 100)
      : 13 * 60 * PX_PER_MIN;
    el.scrollLeft = target;
  }, [isToday, nowMin, selectedDay]);

  // 현재 방영중 판정(오늘 + start<=now<end)
  const airingNow = (startMin: number, endMin: number): boolean =>
    isToday && startMin <= nowMin && nowMin < endMin;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {/* 가로 스크롤 컨테이너 — 채널열(sticky)은 스크롤해도 고정된다 */}
      <div ref={scrollRef} className="thin-scroll overflow-x-auto">
        {/* 내부 폭 = 채널열 + 타임라인 총폭 */}
        <div style={{ width: CH_COL_W + TRACK_W }}>
          {/* ===== 헤더행: 좌측 코너 + 시간 눈금 ===== */}
          <div
            className="sticky top-0 z-30 flex border-b border-white/10 bg-[#0a0e1a]/85 backdrop-blur"
            style={{ height: HEADER_H }}
          >
            {/* 좌상단 코너 (채널열과 정렬) */}
            <div
              className="sticky left-0 z-10 flex shrink-0 items-center border-r border-white/10 bg-[#0a0e1a]/95 px-3 text-xs font-medium text-slate-400"
              style={{ width: CH_COL_W }}
            >
              채널
            </div>
            {/* 시간 눈금 트랙 */}
            <div className="relative" style={{ width: TRACK_W }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="absolute top-0 flex h-full items-center border-l border-white/5 pl-2 text-xs font-medium text-slate-400"
                  style={{ left: h * 60 * PX_PER_MIN }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* ===== 채널 행들 ===== */}
          <div className="relative">
            {channels.map((ch) => {
              const list = byChannel.get(ch.id) ?? [];
              const cat = catById[ch.id] ?? 'cable';
              return (
                <div
                  key={ch.id}
                  className="flex border-b border-white/5"
                  style={{ height: ROW_H }}
                >
                  {/* 좌측 채널셀 (가로 스크롤해도 고정) */}
                  <div
                    className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-white/10 bg-[#0a0e1a]/95 px-2"
                    style={{ width: CH_COL_W }}
                  >
                    {/* 분류색 배지 + 약자 */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${categoryBadge(
                        cat,
                      )}`}
                    >
                      {channelAbbr(ch.name)}
                    </div>
                    {/* 채널명 + 프로그램 수 + 즐겨찾기 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate text-sm font-bold text-slate-100">
                          {ch.name}
                        </span>
                        <FavoriteButton
                          size="sm"
                          className="!h-5 !w-5 !bg-transparent !text-[12px]"
                          item={{
                            key: `tv:${ch.id}:${ch.name}`,
                            kind: 'tv',
                            title: ch.name,
                            channelId: ch.id,
                            channelName: ch.name,
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{list.length}편</span>
                    </div>
                  </div>

                  {/* 우측 타임라인 트랙 — 프로그램 블록 절대배치 */}
                  <div className="relative" style={{ width: TRACK_W, height: ROW_H }}>
                    {list.map((p) => {
                      const startMin = timeToMin(p.startTime);
                      let endMin = p.endTime ? timeToMin(p.endTime) : startMin + 30;
                      // 종료가 시작 이하면 자정 넘김으로 보고 하루 끝까지 클램프
                      if (endMin <= startMin) endMin = DAY_MIN;
                      const leftPx = startMin * PX_PER_MIN;
                      const widthPx = Math.max(endMin - startMin, 20) * PX_PER_MIN - 4;

                      const airing = airingNow(startMin, endMin);
                      const live = Boolean(p.isLive) || airing;
                      const genre = p.genre || inferGenre(p.title);
                      const sub =
                        genre ||
                        (p.rating && p.rating !== 'all' ? `${p.rating}세` : '') ||
                        '';

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onSelect?.(p)}
                          className={`card-hover absolute flex items-center gap-2 overflow-hidden rounded-lg border px-2 text-left transition ${
                            airing
                              ? 'border-red-500/40 bg-red-500/10 ring-2 ring-red-500/60'
                              : 'border-white/10 bg-white/[0.06] hover:border-white/20'
                          }`}
                          style={{
                            left: leftPx,
                            width: widthPx,
                            top: 6,
                            height: ROW_H - 12,
                          }}
                          title={`${p.startTime} ${p.title}`}
                        >
                          {/* 작은 채널색 배지 */}
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded text-[10px] font-bold ${categoryBadge(
                              cat,
                            )}`}
                          >
                            {channelAbbr(ch.name)}
                          </div>
                          {/* 텍스트 영역 */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-medium text-slate-400">
                                {p.startTime}
                              </span>
                              {live && (
                                <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <p className="truncate text-sm font-medium text-slate-100">
                              {p.title}
                            </p>
                            {sub && (
                              <p className="truncate text-[11px] text-slate-500">{sub}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ===== 현재 시간 라인 (오늘일 때만, 트랙 전체 높이) ===== */}
            {isToday && (
              <div
                className="pointer-events-none absolute top-0 z-20"
                style={{ left: CH_COL_W + nowMin * PX_PER_MIN, height: '100%' }}
              >
                {/* 빨간 세로선 */}
                <div className="absolute top-0 h-full w-px bg-red-500" />
                {/* 상단 '현재 시간' 알약 */}
                <div className="absolute -top-px -translate-x-1/2 whitespace-nowrap rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  현재 시간
                </div>
              </div>
            )}

            {channels.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                표시할 채널이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
