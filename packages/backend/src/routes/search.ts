// 통합 검색 라우트 — TV 편성표 + OTT 콘텐츠를 한 번에 검색한다.
//   GET /api/search?q=검색어
import { Router } from 'express';
import {
  CHANNEL_BY_ID,
  type ApiResponse,
  type ApiError,
  type SearchResult,
} from '@tv/shared';
import { searchTvPrograms } from '../services/tvService.js';
import { searchOtt } from '../services/ottService.js';

export const searchRouter = Router();

// GET /api/search?q=
searchRouter.get('/', async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim() ?? '';
  if (q.length < 1) {
    res.status(400).json({
      error: { code: 'EMPTY_QUERY', message: '검색어(q)를 입력하세요.' },
    } satisfies ApiError);
    return;
  }

  try {
    // TV(로컬 캐시, 빠름)와 OTT(TMDB) 를 동시에 검색
    const [tvPrograms, ottItems] = await Promise.all([
      searchTvPrograms(q).catch(() => []), // TV 실패해도 OTT 는 살림
      searchOtt(q).catch(() => []),
    ]);

    const tvResults: SearchResult[] = tvPrograms.map((p) => ({
      type: 'program',
      program: p,
      availableOn: [CHANNEL_BY_ID[p.channelId]?.name ?? p.channelId],
    }));

    const ottResults: SearchResult[] = ottItems.map((c) => ({
      type: 'ott',
      ott: c,
      availableOn: (c.providers ?? []).map((pr) => pr.name),
    }));

    const body: ApiResponse<SearchResult[]> = {
      data: [...tvResults, ...ottResults],
      source: 'tv+ott',
    };
    res.json(body);
  } catch (err) {
    res.status(500).json({
      error: { code: 'SEARCH_FAILED', message: err instanceof Error ? err.message : String(err) },
    } satisfies ApiError);
  }
});
