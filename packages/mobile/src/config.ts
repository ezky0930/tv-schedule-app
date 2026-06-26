// 백엔드 API 주소 설정.
//
// ⚠️ 모바일 앱은 웹과 달리 프록시가 없으므로 백엔드 "절대 주소"가 필요하다.
// - 개발(폰에서 Expo Go로 테스트): 컴퓨터의 LAN IP 를 넣어야 폰이 접속 가능
//     예) 'http://192.168.0.10:4000'  (localhost 는 폰에서 안 됨!)
//     맥에서 IP 확인:  ipconfig getifaddr en0
// - 배포 후: Render 백엔드 주소
//     예) 'https://tv-ott-backend.onrender.com'
//
// 환경변수 EXPO_PUBLIC_API_BASE_URL 이 있으면 그것을 우선 사용한다.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
