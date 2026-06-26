// 서버 부트스트랩 — 앱을 만들고 포트에 바인딩한다.
import { createApp } from './app.js';
import { config } from './config/env.js';
import { startScheduleScheduler, getScheduleData } from './services/tvService.js';

const app = createApp();

app.listen(config.port, () => {
  console.log('');
  console.log('🟢 TV 편성표 + OTT API 서버 시작');
  console.log(`   http://localhost:${config.port}`);
  console.log(`   • 헬스체크:  http://localhost:${config.port}/api/health`);
  console.log(`   • 메타정보:  http://localhost:${config.port}/api/meta`);
  console.log(`   • OTT 인기:  http://localhost:${config.port}/api/ott/trending`);
  console.log(`   • TV 편성표: http://localhost:${config.port}/api/tv/schedule?day=fri`);
  console.log(`   환경: ${config.nodeEnv}`);
  console.log('');

  // 편성표 주기 갱신 스케줄러 시작 + 캐시가 비어있으면 백그라운드로 미리 한 번 채운다.
  startScheduleScheduler();
  getScheduleData().catch((err) => console.warn('[startup] 편성표 초기 로딩 실패:', err));
});
