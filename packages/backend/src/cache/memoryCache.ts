// 아주 단순한 메모리 TTL 캐시.
// TMDB 호출 결과를 일정 시간 동안 재사용해서 불필요한 외부 호출과 rate limit 을 줄인다.
// (추후 규모가 커지면 파일 캐시/SQLite/Redis 로 교체 가능 — 인터페이스만 유지하면 된다.)

interface Entry<T> {
  value: T;
  /** 만료 시각 (epoch ms) */
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/** 캐시에서 값을 읽는다. 없거나 만료됐으면 undefined. */
export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

/** 값을 TTL(초)과 함께 저장한다. */
export function cacheSet<T>(key: string, value: T, ttlSec: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

/**
 * 캐시 우선 헬퍼: 캐시에 있으면 그걸 주고, 없으면 loader 를 실행해 채운다.
 * 반환값에 fromCache 플래그를 함께 줘서 API 응답의 cached 필드에 활용한다.
 */
export async function cached<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>,
): Promise<{ value: T; fromCache: boolean }> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) {
    return { value: hit, fromCache: true };
  }
  const value = await loader();
  cacheSet(key, value, ttlSec);
  return { value, fromCache: false };
}

/** TTL 기본값(초) 모음 */
export const TTL = {
  /** 인기/신작 목록 — 6시간 */
  list: 6 * 60 * 60,
  /** 콘텐츠 상세 — 1시간 */
  detail: 60 * 60,
  /** 장르 매핑 — 24시간 */
  genres: 24 * 60 * 60,
} as const;
