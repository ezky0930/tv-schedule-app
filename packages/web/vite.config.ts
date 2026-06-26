import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 웹앱 개발 서버 설정.
// /api 로 시작하는 요청은 백엔드(기본 4000 포트)로 프록시한다.
// 이렇게 하면 프론트 코드에서는 항상 상대경로 '/api/...' 만 쓰면 되고,
// 추후 React Native 에서는 같은 백엔드 주소를 절대경로로 바꿔 끼우기만 하면 된다.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
