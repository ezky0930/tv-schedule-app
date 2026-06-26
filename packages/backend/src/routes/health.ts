// 헬스체크 라우트.
// 서버가 살아있는지 + shared 패키지가 제대로 연결됐는지(채널/OTT 상수 카운트)를 함께 응답한다.
import { Router } from 'express';
import { CHANNELS, OTT_PROVIDERS, type ApiResponse } from '@tv/shared';

export const healthRouter = Router();

interface HealthInfo {
  status: 'ok';
  /** 서버 기동 후 경과 시간(초) */
  uptimeSec: number;
  /** shared 에서 가져온 채널 수 — 모노레포 연결 확인용 */
  channelCount: number;
  /** shared 에서 가져온 OTT 수 — 모노레포 연결 확인용 */
  ottCount: number;
  version: string;
}

healthRouter.get('/', (_req, res) => {
  const body: ApiResponse<HealthInfo> = {
    data: {
      status: 'ok',
      uptimeSec: Math.round(process.uptime()),
      channelCount: CHANNELS.length,
      ottCount: OTT_PROVIDERS.length,
      version: '0.1.0',
    },
    fetchedAt: new Date().toISOString(),
    source: 'backend',
  };
  res.json(body);
});
