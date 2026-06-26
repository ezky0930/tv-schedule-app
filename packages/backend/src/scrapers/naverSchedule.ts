// 네이버 검색 "{채널} 편성표" 주간 편성표 스크래퍼.
//
// 동작 원리(2026-06 기준 검증):
//   https://search.naver.com/search.naver?query={채널명} 편성표
//   → 응답 HTML 안에 'timeline_wrap weekly' 주간 그리드가 정적으로 들어있다.
//   → 24시간(행) × 7일(col1~col7, 열) 격자. 각 셀(.inner)에 분/제목/등급/배지.
//   → '_date_list' 의 li.colN 텍스트("06.26.(금)")로 열↔날짜/요일을 동적 매핑한다.
//
// ⚠️ 네이버 구조가 바뀌면 selector 가 깨질 수 있다. 그래서 파싱 실패 시 빈 배열을 반환하고,
//    오케스트레이터(scrapeAllSchedules)가 채널별로 에러를 격리한다.
import * as cheerio from 'cheerio';
import type { Channel, Program, DayOfWeek } from '@tv/shared';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/** 한글 요일 → 우리 DayOfWeek */
const DOW_KO_TO_KEY: Record<string, DayOfWeek> = {
  월: 'mon',
  화: 'tue',
  수: 'wed',
  목: 'thu',
  금: 'fri',
  토: 'sat',
  일: 'sun',
};

/** age_icon 클래스(a15/a19/aall...) → 등급 문자열 */
function ratingFromAgeClass(cls: string | undefined): string | undefined {
  const m = (cls || '').match(/a(\d+|all)/);
  return m ? m[1] : undefined;
}

/**
 * (month, day) 와 기준일(today)로 연도를 추론한다.
 * 주간 그리드는 today 전후 약 7일 범위이므로, today 와 가장 가까운 연도를 고른다.
 * (12월↔1월 경계도 안전하게 처리)
 */
function inferYear(month: number, day: number, today: Date): number {
  const candidates = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];
  let best = today.getFullYear();
  let bestDiff = Infinity;
  for (const y of candidates) {
    const d = new Date(y, month - 1, day);
    const diff = Math.abs(d.getTime() - today.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      best = y;
    }
  }
  return best;
}

/** 제목에서 회차"(12회)"를 분리한다 → { title, episode } */
function splitEpisode(raw: string): { title: string; episode?: string } {
  const m = raw.match(/\((\d+)\s*회\)\s*$/);
  if (!m) return { title: raw };
  return { title: raw.replace(/\(\d+\s*회\)\s*$/, '').trim(), episode: `${m[1]}회` };
}

/** 'YYYY-MM-DD' 포맷 */
function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 네이버 주간 편성표 HTML 을 파싱해 Program[] 로 변환한다.
 * (네트워크와 분리해 단위 테스트가 가능하도록 별도 함수로 둠)
 *
 * @param html  검색 결과 HTML
 * @param channel  대상 채널
 * @param today  연도 추론 기준일 (기본: 현재)
 */
export function parseNaverWeekly(html: string, channel: Channel, today = new Date()): Program[] {
  const $ = cheerio.load(html);

  // 1) 열(col1~col7) → { day, date } 매핑
  interface ColInfo {
    day: DayOfWeek;
    date: string;
  }
  const colMap: Record<string, ColInfo> = {};
  $('._date_list li').each((_, li) => {
    const colCls = ($(li).attr('class') || '').match(/col(\d)/);
    if (!colCls) return;
    const txt = $(li).text().replace(/\s+/g, ' ').trim(); // "06.26.(금)오늘"
    const m = txt.match(/(\d{1,2})\.(\d{1,2})\.\(([월화수목금토일])/);
    if (!m) return;
    const month = Number(m[1]);
    const day = Number(m[2]);
    const dayKey = DOW_KO_TO_KEY[m[3]];
    if (!dayKey) return;
    const year = inferYear(month, day, today);
    colMap['col' + colCls[1]] = { day: dayKey, date: ymd(year, month, day) };
  });

  // 날짜 매핑을 못 구하면 파싱 불가로 간주
  if (Object.keys(colMap).length === 0) return [];

  // 2) 주간 타임라인 격자 파싱
  const programs: Program[] = [];
  $('.timeline_wrap.weekly')
    .find('li.item')
    .each((_, li) => {
      const hourM = $(li).find('.time_box').first().text().trim().match(/(\d{1,2})\s*시/);
      if (!hourM) return;
      const hour = Number(hourM[1]);

      $(li)
        .find('.ind_program')
        .each((_, p) => {
          const colCls = ($(p).attr('class') || '').match(/col(\d)/);
          if (!colCls) return;
          const col = 'col' + colCls[1];
          const colInfo = colMap[col];
          if (!colInfo) return;

          // 한 시간 칸에 여러 프로그램이 있을 수 있으므로 .inner 단위로 분리
          $(p)
            .find('.inner')
            .each((_, inner) => {
              const $inner = $(inner);
              const $title = $inner.find('.pr_title');
              const rawTitle = ($title.attr('title') || $title.text() || '').trim();
              if (!rawTitle) return;

              const minute = Number($inner.find('.time_min').text().replace(/[^0-9]/g, '') || '0');
              const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
              const { title, episode } = splitEpisode(rawTitle);

              const labels = $inner
                .find('.s_label')
                .map((_, s) => $(s).attr('class') || '')
                .get()
                .join(' ');

              programs.push({
                id: `${channel.id}:${colInfo.date}:${startTime}`,
                channelId: channel.id,
                title,
                startTime,
                day: colInfo.day,
                date: colInfo.date,
                episode,
                rating: ratingFromAgeClass($inner.find('.age_icon').attr('class')),
                isLive: /\blive\b/.test(labels),
                isRerun: /\bre\b/.test(labels),
              });
            });
        });
    });

  // 3) 같은 날짜끼리 정렬 후 endTime(다음 프로그램 시작 시각) 채우기
  const byDate = new Map<string, Program[]>();
  for (const p of programs) {
    const list = byDate.get(p.date!) ?? [];
    list.push(p);
    byDate.set(p.date!, list);
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < list.length - 1; i++) {
      list[i].endTime = list[i + 1].startTime;
    }
  }

  return programs;
}

/** 네이버 검색용 쿼리 문자열 (채널별 override 가능, 기본은 "{이름} 편성표") */
export function channelSearchQuery(channel: Channel): string {
  return `${channel.name} 편성표`;
}

/**
 * 한 채널의 주간 편성표를 네이버에서 가져와 파싱한다.
 * 네트워크/파싱 실패 시 에러를 던진다(오케스트레이터가 채널별로 격리).
 */
export async function scrapeChannelSchedule(channel: Channel): Promise<Program[]> {
  const query = encodeURIComponent(channelSearchQuery(channel));
  const url = `https://search.naver.com/search.naver?query=${query}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`네이버 응답 오류 (${res.status}) — ${channel.name}`);
    }
    const html = await res.text();
    return parseNaverWeekly(html, channel);
  } finally {
    clearTimeout(timeout);
  }
}
