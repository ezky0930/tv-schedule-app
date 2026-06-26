# 오늘 뭐 보지 📺 — 대한민국 TV·OTT 통합 편성표 앱

대한민국에서 시청 가능한 **지상파/종편 TV 편성표**와 **OTT(넷플릭스·디즈니+·티빙·웨이브·쿠팡플레이) 콘텐츠**를 한 곳에서 보는 웹앱입니다. 추후 React Native(iOS) 앱으로 확장할 수 있도록 데이터 로직과 UI를 철저히 분리한 **모노레포** 구조로 만들었습니다.

## 모노레포 구조

```
tv-schedule-app/
├── packages/
│   ├── shared/    # 공통 타입·상수 (웹 + 백엔드 + 추후 iOS 공유)
│   ├── backend/   # Express API 서버
│   └── web/       # React + Vite 웹앱
```

- **shared** 에 `Channel`, `Program`, `OttContent`, `WatchProvider` 등 핵심 타입과 채널/OTT 상수를 정의하고, 백엔드와 프론트가 `@tv/shared` 로 가져다 씁니다.
- 추후 React Native 앱을 추가할 때 `shared` 와 `backend` 를 그대로 재사용합니다.

## 기술 스택

| 영역 | 스택 |
|------|------|
| 프론트(웹) | React + Vite + TypeScript + Tailwind CSS v4 |
| 백엔드 | Node.js + Express + TypeScript |
| 공통 | `@tv/shared` (npm workspaces) |
| 데이터 | TMDB API(OTT) · 편성표 스크래핑(TV) |

## 요구 사항

- Node.js **20 이상**
- npm 10 이상 (npm workspaces 사용)

## 빠른 시작

```bash
# 1) 의존성 설치 (루트에서 한 번)
npm install

# 2) shared 패키지 빌드 (백엔드·웹이 dist 를 참조)
npm run build:shared

# 3) 백엔드 환경변수 준비
cp packages/backend/.env.example packages/backend/.env
#   → .env 의 TMDB_API_KEY 는 Phase 2부터 필요 (아래 발급 방법 참고)

# 4) 개발 서버 전체 실행 (shared watch + backend + web 동시)
npm run dev
```

- 백엔드:  http://localhost:4000  (헬스체크: `/api/health`)
- 웹앱:    http://localhost:5173

> 개별 실행도 가능합니다:
> `npm run dev:backend` / `npm run dev:web` / `npm run watch:shared`

### 동작 확인 (Phase 1)

웹앱(5173)을 열면 상단에 **"백엔드 연결됨 ✅"** 와 채널 수·OTT 수가 보이고, 아래에 채널/OTT 목록이 표시됩니다. 이는 `웹 → (Vite 프록시) → 백엔드 → @tv/shared 상수` 전체 연결이 정상임을 의미합니다.

백엔드만 따로 확인하려면:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/meta
```

## TMDB API 키 발급 방법 (Phase 2부터 필요)

OTT 콘텐츠 정보는 무료인 [TMDB(The Movie Database)](https://www.themoviedb.org) API로 가져옵니다.

1. https://www.themoviedb.org/signup 에서 **회원가입** 후 이메일 인증.
2. 로그인 → 우측 상단 프로필 → **Settings(설정)** 진입.
3. 좌측 메뉴에서 **API** 클릭 → "Create / 새 키 생성".
4. 용도는 **Developer** 선택, 양식 작성(앱 이름·설명·URL 은 임의로 가능).
5. 발급되면 두 가지가 보입니다:
   - **API Key (v3 auth)** — 짧은 문자열
   - **API Read Access Token (v4 auth)** — 긴 JWT 형태 토큰 (권장)
6. `packages/backend/.env` 에 입력:
   ```env
   # v4 토큰을 쓰는 경우 (권장)
   TMDB_API_KEY=여기에_v4_read_access_token
   TMDB_AUTH_MODE=v4

   # 또는 v3 키를 쓰는 경우
   # TMDB_API_KEY=여기에_v3_api_key
   # TMDB_AUTH_MODE=v3
   ```
7. 모든 요청에는 `region=KR`, `language=ko-KR` 를 붙여 한국 기준 데이터를 가져옵니다.

> ⚠️ API 키는 **백엔드 `.env` 에만** 저장하고 절대 프론트엔드에 노출하지 않습니다. (`.gitignore` 에 포함)

## OTT TMDB Watch Provider ID (KR 기준)

`packages/shared/src/constants/ottProviders.ts` 에 상수로 정리되어 있습니다. **아래 값은 추정값**이며, 개발 중 실제 API(`/watch/providers/tv?watch_region=KR`)로 검증 후 갱신합니다.

| OTT | 내부 id | TMDB provider id (추정) |
|-----|---------|------------------------|
| Netflix | `netflix` | 8 |
| Disney+ | `disney` | 337 |
| 티빙 | `tving` | 1883 |
| 웨이브 | `wavve` | 356 |
| 쿠팡플레이 | `coupang` | 1881 |

## 개발 로드맵

- [x] **Phase 1 — 뼈대**: 모노레포 셋업, shared 타입 정의, Express 헬스체크
- [x] **Phase 2 — OTT**: TMDB 연동(`/api/ott/trending`, `/api/ott/upcoming`, `/api/ott/content/:id`), OTT 탭·포스터 그리드·상세 모달, KR provider ID 검증, TTL 캐시
- [x] **Phase 3 — TV 편성표**: 네이버 편성표 스크래핑(전 11채널), 파일 캐시·스케줄러(12h), 요일별 편성표 뷰(채널별 타임라인·지금 방영중 강조)
- [x] **Phase 4 — 통합**: 통합 검색(TV+OTT 동시·어디서 보는지), 공개/방영 예정 화면, 상단 검색바 + 탭(반응형)
- 추가 개선: OTT 정렬(인기순/최신순), TV 인기순(TMDB 가중평점 매칭), 즐겨찾기(별표·localStorage), OTT "전체 인기"를 한국 OTT 시청가능 콘텐츠로 교정 + 카드 OTT 배지

### API 엔드포인트 (현재)

```
GET /api/health                          # 서버 상태 + shared 연결 확인
GET /api/meta                            # 채널/OTT/요일 목록
GET /api/ott/trending                    # 이번 주 전체 인기작
GET /api/ott/trending?provider=netflix   # 특정 OTT 인기작 (netflix|disney|tving|wavve|coupang)
GET /api/ott/upcoming                    # 공개/개봉 예정작
GET /api/ott/content/:id                 # 콘텐츠 상세 (id 예: tmdb:tv:1396) + 출연진 + watch providers
GET /api/tv/schedule?day=fri             # 특정 요일 전체 편성표 (시간순)
GET /api/tv/schedule?day=fri&channel=tvN # 특정 요일 + 채널 (channel 은 id 'tvn' 또는 이름 'tvN')
GET /api/tv/schedule?day=fri&sort=popular # 인기순 — 편성 제목을 TMDB 매칭해 가중 평점순(매칭된 항목만)
GET /api/tv/now                          # 지금 방영 중 (채널별 1개)
GET /api/tv/status                       # 스크래핑 채널별 성공/실패 상태
GET /api/ott/upcoming                    # 곧 공개되는 한국 콘텐츠 (공개일 빠른 순)
GET /api/search?q=검색어                 # 통합 검색 — TV 편성표 + OTT (어디서 볼 수 있는지 포함)
```

> TV 편성표는 네이버 검색 "{채널} 편성표" 주간 그리드를 cheerio 로 파싱합니다(채널 1회 요청 = 그 채널 일주일 전체). 결과는 `packages/backend/.cache/schedule.json` 파일 캐시에 저장되어 12시간마다(또는 캐시 만료 시) 갱신되고, 채널별로 에러가 격리됩니다.

> 모든 OTT 응답은 TTL 캐시(목록 6h / 상세 1h / 장르 24h)를 거쳐 내려가며, `cached` 플래그로 캐시 적중 여부를 알 수 있습니다.

## 배포 (추후)

- 백엔드: Railway / Render 등
- 프론트: Vercel (`/api` 는 백엔드 주소로 프록시 또는 환경변수 `VITE_API_BASE_URL` 지정)
