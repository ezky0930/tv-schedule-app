// 환경 변수 로딩 + 검증.
// 한 곳에서만 process.env 를 읽고, 나머지 코드는 이 config 객체를 import 해서 쓴다.
import 'dotenv/config';

/** 콤마로 구분된 문자열을 배열로. 빈 값은 제거. */
function parseList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

export const config = {
  /** 서버 포트 */
  port: Number(process.env.PORT ?? 4000),

  /** 실행 환경 */
  nodeEnv: process.env.NODE_ENV ?? 'development',

  /** CORS 허용 오리진 목록 (웹앱 개발 서버 등) */
  corsOrigins: parseList(process.env.CORS_ORIGIN, ['http://localhost:5173']),

  /** TMDB 설정 (Phase 2에서 사용) */
  tmdb: {
    apiKey: process.env.TMDB_API_KEY ?? '',
    /** 'v3' = api_key 쿼리 파라미터, 'v4' = Authorization Bearer 토큰 */
    authMode: (process.env.TMDB_AUTH_MODE ?? 'v4') as 'v3' | 'v4',
    baseUrl: 'https://api.themoviedb.org/3',
  },
} as const;

/** TMDB 키가 설정되어 있는지 (Phase 2 라우트에서 가드로 사용) */
export const isTmdbConfigured = (): boolean => config.tmdb.apiKey.length > 0;
