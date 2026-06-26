// 메타 정보 라우트 — 앱이 다루는 채널 목록과 OTT 목록을 내려준다.
// 프론트가 필터 UI나 OTT 탭을 그릴 때 하드코딩하지 않고 이 API를 쓸 수 있다.
import { Router } from 'express';
import {
  CHANNELS,
  OTT_PROVIDERS,
  DAYS,
  DAY_LABELS_KO,
  type Channel,
  type ApiResponse,
} from '@tv/shared';

export const metaRouter = Router();

interface MetaInfo {
  channels: Channel[];
  ott: typeof OTT_PROVIDERS;
  days: Array<{ key: string; label: string }>;
}

metaRouter.get('/', (_req, res) => {
  const body: ApiResponse<MetaInfo> = {
    data: {
      channels: CHANNELS,
      ott: OTT_PROVIDERS,
      days: DAYS.map((d) => ({ key: d, label: DAY_LABELS_KO[d] })),
    },
    source: 'backend',
  };
  res.json(body);
});
