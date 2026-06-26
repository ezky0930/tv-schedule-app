// OTT 관련 API 라우트.
//   GET /api/ott/trending            전체 인기작
//   GET /api/ott/trending?provider=netflix   특정 OTT 인기작
//   GET /api/ott/upcoming            공개/개봉 예정작
//   GET /api/ott/content/:id         콘텐츠 상세 (id 예: tmdb:tv:1396)
import { Router } from 'express';
import {
  OTT_BY_ID,
  type ApiResponse,
  type ApiError,
  type OttContent,
  type OttProviderId,
} from '@tv/shared';
import {
  getTrending,
  getByProvider,
  getUpcoming,
  getContentDetail,
} from '../services/ottService.js';
import { parseContentId } from '../tmdb/normalize.js';
import { TmdbError } from '../tmdb/client.js';

export const ottRouter = Router();

/** TmdbError 를 표준 ApiError 응답으로 변환 */
function sendTmdbError(res: import('express').Response, err: unknown): void {
  if (err instanceof TmdbError) {
    res.status(err.status && err.status >= 400 ? 502 : 500).json({
      error: { code: 'TMDB_FAILED', message: err.message },
    } satisfies ApiError);
    return;
  }
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: String(err) },
  } satisfies ApiError);
}

// GET /api/ott/trending  (?provider=netflix 선택)
ottRouter.get('/trending', async (req, res) => {
  const provider = req.query.provider as string | undefined;
  try {
    if (provider) {
      // 알 수 없는 provider 면 400
      if (!(provider in OTT_BY_ID)) {
        res.status(400).json({
          error: {
            code: 'UNKNOWN_PROVIDER',
            message: `알 수 없는 OTT: ${provider}. 가능한 값: ${Object.keys(OTT_BY_ID).join(', ')}`,
          },
        } satisfies ApiError);
        return;
      }
      const { items, fromCache } = await getByProvider(provider as OttProviderId);
      const body: ApiResponse<OttContent[]> = {
        data: items,
        cached: fromCache,
        source: 'tmdb',
      };
      res.json(body);
      return;
    }

    const { items, fromCache } = await getTrending();
    const body: ApiResponse<OttContent[]> = { data: items, cached: fromCache, source: 'tmdb' };
    res.json(body);
  } catch (err) {
    sendTmdbError(res, err);
  }
});

// GET /api/ott/upcoming
ottRouter.get('/upcoming', async (_req, res) => {
  try {
    const { items, fromCache } = await getUpcoming();
    const body: ApiResponse<OttContent[]> = { data: items, cached: fromCache, source: 'tmdb' };
    res.json(body);
  } catch (err) {
    sendTmdbError(res, err);
  }
});

// GET /api/ott/content/:id   (id 예: tmdb:tv:1396)
ottRouter.get('/content/:id', async (req, res) => {
  const parsed = parseContentId(req.params.id);
  if (!parsed) {
    res.status(400).json({
      error: {
        code: 'BAD_CONTENT_ID',
        message: `잘못된 콘텐츠 id: ${req.params.id} (형식: tmdb:tv:1396 또는 tmdb:movie:123)`,
      },
    } satisfies ApiError);
    return;
  }
  try {
    const { content, fromCache } = await getContentDetail(parsed.mediaType, parsed.tmdbId);
    const body: ApiResponse<OttContent> = { data: content, cached: fromCache, source: 'tmdb' };
    res.json(body);
  } catch (err) {
    sendTmdbError(res, err);
  }
});
