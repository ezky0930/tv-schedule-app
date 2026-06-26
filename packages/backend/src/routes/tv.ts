// TV 편성표 API 라우트.
//   GET /api/tv/schedule?day=mon            특정 요일 전체 편성표
//   GET /api/tv/schedule?day=mon&channel=tvN  특정 요일 + 채널
//   GET /api/tv/now                         지금 방영 중 (채널별 1개)
//   GET /api/tv/status                      스크래핑 상태(채널별 성공/실패)
import { Router } from 'express';
import {
  DAYS,
  CHANNEL_BY_ID,
  CHANNEL_BY_NAME,
  type ApiResponse,
  type ApiError,
  type Program,
  type DayOfWeek,
} from '@tv/shared';
import { getSchedule, getNowPlaying, getScheduleStatus } from '../services/tvService.js';

export const tvRouter = Router();

/** channel 파라미터(id 'tvn' 또는 이름 'tvN')를 channelId 로 해석 */
function resolveChannelId(input: string | undefined): string | undefined | null {
  if (!input) return undefined; // 채널 미지정
  if (CHANNEL_BY_ID[input]) return input;
  if (CHANNEL_BY_NAME[input]) return CHANNEL_BY_NAME[input].id;
  return null; // 알 수 없는 채널
}

// GET /api/tv/schedule?day=mon&channel=tvN
tvRouter.get('/schedule', async (req, res) => {
  const day = req.query.day as string | undefined;
  if (day && !DAYS.includes(day as DayOfWeek)) {
    res.status(400).json({
      error: { code: 'BAD_DAY', message: `day 는 ${DAYS.join('|')} 중 하나여야 합니다.` },
    } satisfies ApiError);
    return;
  }

  const channelId = resolveChannelId(req.query.channel as string | undefined);
  if (channelId === null) {
    res.status(400).json({
      error: { code: 'UNKNOWN_CHANNEL', message: `알 수 없는 채널: ${req.query.channel}` },
    } satisfies ApiError);
    return;
  }

  // 정렬: time(기본) | popular(TMDB 인기도순)
  const sort = req.query.sort === 'popular' ? 'popular' : 'time';

  try {
    const { programs, fetchedAt } = await getSchedule(
      day as DayOfWeek | undefined,
      channelId,
      sort,
    );
    const body: ApiResponse<Program[]> = {
      data: programs,
      fetchedAt,
      cached: true,
      source: sort === 'popular' ? 'naver-epg+tmdb' : 'naver-epg',
    };
    res.json(body);
  } catch (err) {
    res.status(502).json({
      error: { code: 'SCRAPE_FAILED', message: err instanceof Error ? err.message : String(err) },
    } satisfies ApiError);
  }
});

// GET /api/tv/now
tvRouter.get('/now', async (_req, res) => {
  try {
    const { programs, fetchedAt } = await getNowPlaying();
    const body: ApiResponse<Program[]> = {
      data: programs,
      fetchedAt,
      cached: true,
      source: 'naver-epg',
    };
    res.json(body);
  } catch (err) {
    res.status(502).json({
      error: { code: 'SCRAPE_FAILED', message: err instanceof Error ? err.message : String(err) },
    } satisfies ApiError);
  }
});

// GET /api/tv/status — 스크래핑 채널별 상태(디버깅/관리)
tvRouter.get('/status', async (_req, res) => {
  const status = await getScheduleStatus();
  res.json({ data: status, source: 'backend' });
});
