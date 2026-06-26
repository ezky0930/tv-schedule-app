// 백엔드 API 클라이언트 (모바일).
// 웹의 api.ts 와 동일한 인터페이스 — BASE_URL 만 절대주소(config)로 다르다.
import type {
  ApiResponse,
  Channel,
  OttContent,
  OttProviderId,
  Program,
  DayOfWeek,
  SearchResult,
} from '@tv/shared';
import { API_BASE_URL } from '../config';

async function getJson<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    let message = `API 요청 실패 (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* 무시 */
    }
    throw new Error(message);
  }
  return (await res.json()) as ApiResponse<T>;
}

export interface MetaInfo {
  channels: Channel[];
  ott: Array<{ id: OttProviderId; name: string; tmdbProviderId: number }>;
  days: Array<{ key: string; label: string }>;
}

export const api = {
  getMeta: () => getJson<MetaInfo>('/api/meta'),

  getOttTrending: (provider?: OttProviderId) =>
    getJson<OttContent[]>(
      provider ? `/api/ott/trending?provider=${provider}` : '/api/ott/trending',
    ),
  getOttUpcoming: () => getJson<OttContent[]>('/api/ott/upcoming'),
  getOttContent: (id: string) =>
    getJson<OttContent>(`/api/ott/content/${encodeURIComponent(id)}`),

  getTvSchedule: (day: DayOfWeek, channel?: string, sort?: 'time' | 'popular') =>
    getJson<Program[]>(
      `/api/tv/schedule?day=${day}` +
        (channel ? `&channel=${encodeURIComponent(channel)}` : '') +
        (sort === 'popular' ? '&sort=popular' : ''),
    ),
  getTvNow: () => getJson<Program[]>('/api/tv/now'),

  search: (q: string) => getJson<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
};
