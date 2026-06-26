// TMDB 저수준 클라이언트.
// 인증(v3 api_key / v4 Bearer), KR·ko-KR 기본 파라미터, 타임아웃, 에러 표준화를 한 곳에서 처리한다.
import { config, isTmdbConfigured } from '../config/env.js';
import { TMDB_DEFAULTS } from '@tv/shared';

/** TMDB 호출 중 발생한 에러 — 라우트에서 잡아 502 등으로 변환 */
export class TmdbError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'TmdbError';
  }
}

/**
 * TMDB GET 호출.
 * @param path  '/trending/all/week' 처럼 선행 슬래시 포함 경로
 * @param params 추가 쿼리 파라미터 (language/region 은 기본값이 자동 주입됨)
 */
export async function tmdbGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  if (!isTmdbConfigured()) {
    throw new TmdbError('TMDB API 키가 설정되지 않았습니다. backend/.env 의 TMDB_API_KEY 를 확인하세요.', 500);
  }

  const url = new URL(config.tmdb.baseUrl + path);

  // 기본 파라미터: 한국 기준 데이터
  url.searchParams.set('language', TMDB_DEFAULTS.language);
  // region/watch_region 은 엔드포인트별로 다르게 쓰이므로 호출부에서 필요시 넘긴다.

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { accept: 'application/json' };
  if (config.tmdb.authMode === 'v4') {
    // v4: Authorization Bearer 토큰
    headers.Authorization = `Bearer ${config.tmdb.apiKey}`;
  } else {
    // v3: api_key 쿼리 파라미터
    url.searchParams.set('api_key', config.tmdb.apiKey);
  }

  // 타임아웃 (10초) — TMDB 가 느리거나 막혔을 때 무한 대기 방지
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new TmdbError(
        `TMDB 응답 오류 (${res.status}) ${path} ${text.slice(0, 200)}`,
        res.status,
      );
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof TmdbError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new TmdbError(`TMDB 요청 타임아웃: ${path}`, 504);
    }
    throw new TmdbError(`TMDB 요청 실패: ${path} — ${String(err)}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}
