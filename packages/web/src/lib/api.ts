// 백엔드 API 클라이언트 (UI 와 분리).
//
// 핵심 설계: 데이터 호출 로직을 컴포넌트에서 떼어내 이 파일에 모은다.
// 추후 React Native 앱에서는 BASE_URL 만 절대주소(예: https://api.example.com)로
// 바꾸면 이 파일을 거의 그대로 재사용할 수 있다.
import type {
  ApiResponse,
  Channel,
  OttContent,
  OttProviderId,
  Program,
  DayOfWeek,
  SearchResult,
} from '@tv/shared';

// 웹에서는 Vite 프록시(/api → 백엔드)를 쓰므로 빈 문자열(상대경로)로 둔다.
// RN 에서는 환경변수로 백엔드 절대주소를 주입한다.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** 공통 GET — 응답을 ApiResponse<T> 로 파싱하고 에러를 표준화한다. */
async function getJson<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    // 백엔드가 내려준 표준 에러 메시지를 최대한 살린다.
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

// --- 엔드포인트별 함수 ---

export interface HealthInfo {
  status: string;
  uptimeSec: number;
  channelCount: number;
  ottCount: number;
  version: string;
}

export interface MetaInfo {
  channels: Channel[];
  ott: Array<{ id: OttProviderId; name: string; tmdbProviderId: number }>;
  days: Array<{ key: string; label: string }>;
}

export const api = {
  /** 백엔드 헬스체크 */
  getHealth: () => getJson<HealthInfo>('/api/health'),
  /** 앱 메타정보(채널/OTT/요일 목록) */
  getMeta: () => getJson<MetaInfo>('/api/meta'),

  /** OTT 인기작. provider 를 주면 해당 OTT 인기작, 없으면 전체 인기작. */
  getOttTrending: (provider?: OttProviderId) =>
    getJson<OttContent[]>(
      provider ? `/api/ott/trending?provider=${provider}` : '/api/ott/trending',
    ),
  /** 공개/개봉 예정작 */
  getOttUpcoming: () => getJson<OttContent[]>('/api/ott/upcoming'),
  /** 콘텐츠 상세 (id 예: 'tmdb:tv:1396') */
  getOttContent: (id: string) =>
    getJson<OttContent>(`/api/ott/content/${encodeURIComponent(id)}`),

  /** 특정 요일(+선택 채널) TV 편성표. sort='popular' 면 TMDB 인기도순(매칭된 항목만). */
  getTvSchedule: (day: DayOfWeek, channel?: string, sort?: 'time' | 'popular') =>
    getJson<Program[]>(
      `/api/tv/schedule?day=${day}` +
        (channel ? `&channel=${encodeURIComponent(channel)}` : '') +
        (sort === 'popular' ? '&sort=popular' : ''),
    ),
  /** 지금 방영 중 (채널별 1개) */
  getTvNow: () => getJson<Program[]>('/api/tv/now'),

  /** 통합 검색 (TV 편성표 + OTT) */
  search: (q: string) => getJson<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
};
