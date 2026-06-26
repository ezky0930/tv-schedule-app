# 모바일 앱 실행 가이드 📱 (Expo)

이 앱은 **Expo**로 만들어서, 따로 빌드 없이 **폰에 Expo Go 앱만 깔면** 바로 실행해볼 수 있습니다.

## 준비물
- 컴퓨터와 폰이 **같은 와이파이**에 연결
- 폰에 **Expo Go** 설치 (앱스토어/플레이스토어에서 "Expo Go" 검색)
- 백엔드가 실행 중이어야 함 (`npm run dev:backend` — 컴퓨터에서)

## 1) 백엔드 주소 맞추기 (중요!)

폰은 컴퓨터의 `localhost` 에 접속할 수 없습니다. **컴퓨터의 와이파이 IP**를 알려줘야 합니다.

```bash
# 맥에서 IP 확인
ipconfig getifaddr en0      # 예: 192.168.0.10
```

그 IP를 환경변수로 주거나, `src/config.ts` 의 기본값을 바꿉니다:

```bash
# 방법 A) 실행할 때 환경변수로 (권장)
cd packages/mobile
EXPO_PUBLIC_API_BASE_URL="http://192.168.0.10:4000" npx expo start
```

또는 `src/config.ts` 의 `'http://localhost:4000'` 을 `'http://192.168.0.10:4000'` 으로 직접 수정.

> 배포(Render)까지 했다면 그냥 그 주소를 넣으면 됩니다:
> `EXPO_PUBLIC_API_BASE_URL="https://tv-ott-backend.onrender.com" npx expo start`
> (이 경우 와이파이·IP 신경 안 써도 됩니다.)

## 2) 실행

```bash
cd packages/mobile
npx expo start
```

- 터미널에 **QR 코드**가 뜹니다.
- 폰의 **Expo Go** 앱(안드로이드) 또는 **카메라**(아이폰)로 QR을 스캔하면 앱이 폰에서 열립니다.

## 화면 구성
- 하단 탭: **TV편성표 / OTT / 예정 / ⭐(즐겨찾기)**
- 상단: 통합 검색
- 웹과 같은 백엔드(`@tv/backend`)·공통 타입(`@tv/shared`)을 그대로 재사용합니다.

## 자주 막히는 곳
- **데이터가 안 떠요** → 99% 백엔드 주소 문제. 위 1)의 IP를 정확히, 백엔드가 켜져 있는지 확인.
- **"Network request failed"** → 폰과 컴퓨터가 같은 와이파이인지, 방화벽이 4000 포트를 막지 않는지 확인.
- **@tv/shared 를 못 찾는다** → 루트에서 `npm install` 과 `npm run build:shared` 를 먼저 실행.

## 실제 앱으로 출시하려면 (나중에)
- `npx expo prebuild` + EAS Build(`eas build`)로 아이폰/안드로이드 설치 파일(.ipa/.aab) 생성 → 앱스토어/플레이스토어 등록. (별도 개발자 계정 필요)
