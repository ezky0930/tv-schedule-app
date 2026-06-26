// Express 앱 구성.
// 서버 부트스트랩(index.ts)과 분리해서, 추후 테스트에서 app 만 가져다 쓸 수 있게 한다.
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { metaRouter } from './routes/meta.js';
import { ottRouter } from './routes/ott.js';
import { tvRouter } from './routes/tv.js';
import { searchRouter } from './routes/search.js';
import type { ApiError } from '@tv/shared';

export function createApp() {
  const app = express();

  // 요청 로깅 (개발 중 어떤 요청이 들어오는지 확인용)
  app.use(morgan('dev'));

  // CORS — 웹앱(다른 포트/도메인)에서의 호출 허용.
  // CORS_ORIGIN 에 '*' 가 있으면 모든 출처 허용(배포 초기 연결용), 아니면 지정 목록만.
  app.use(
    cors({
      origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
    }),
  );

  app.use(express.json());

  // --- 라우트 ---
  // 헬스체크는 /api/health 와 최상위 /health 양쪽에서 접근 가능하게 둔다.
  app.use('/api/health', healthRouter);
  app.use('/health', healthRouter);
  app.use('/api/meta', metaRouter);
  app.use('/api/ott', ottRouter);
  app.use('/api/tv', tvRouter);
  app.use('/api/search', searchRouter);

  // 루트: 간단한 안내
  app.get('/', (_req, res) => {
    res.json({
      name: 'tv-schedule-app API',
      version: '0.1.0',
      endpoints: [
        '/api/health',
        '/api/meta',
        '/api/ott/trending',
        '/api/ott/trending?provider=netflix',
        '/api/ott/upcoming',
        '/api/ott/content/:id',
        '/api/tv/schedule?day=mon',
        '/api/tv/now',
        '/api/search?q=검색어',
      ],
    });
  });

  // 404 핸들러
  app.use((req: Request, res: Response) => {
    const body: ApiError = {
      error: { code: 'NOT_FOUND', message: `경로를 찾을 수 없습니다: ${req.method} ${req.path}` },
    };
    res.status(404).json(body);
  });

  // 에러 핸들러 (라우트에서 던진 에러를 표준 형식으로 변환)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : '알 수 없는 서버 오류';
    console.error('[ERROR]', err);
    const body: ApiError = {
      error: { code: 'INTERNAL_ERROR', message },
    };
    res.status(500).json(body);
  });

  return app;
}
