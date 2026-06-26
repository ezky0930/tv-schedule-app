# 배포 가이드 — 인터넷에 올리기 🚀

이 앱을 사장님 컴퓨터 밖, **인터넷 주소로 누구나 접속**할 수 있게 올리는 방법입니다.
구조는 두 조각으로 나눠 올립니다 (둘 다 **무료 플랜**으로 시작 가능):

| 조각 | 올리는 곳 | 역할 |
|------|-----------|------|
| 백엔드(데이터 서버) | **Render** | TMDB·편성표 데이터를 주는 API |
| 프론트(화면) | **Vercel** | 사람들이 보는 웹페이지 |

> 준비물: 이메일 계정 1개. 신용카드 불필요(무료 플랜).
> ⚠️ 계정 만들기·로그인·"배포" 최종 버튼은 **사장님이 직접** 누르셔야 합니다.

---

## 0단계 — 코드를 GitHub에 올리기

배포 서비스들은 GitHub에 있는 코드를 가져갑니다.

1. https://github.com 에서 **회원가입**(이미 있으면 로그인).
2. 우측 상단 **+ → New repository** → 이름 `tv-schedule-app` → **Private** 선택 → **Create**.
3. 생성 후 나오는 주소(예: `https://github.com/내아이디/tv-schedule-app.git`)를 복사.
4. 터미널에서 이 폴더(`tv-schedule-app`)로 이동 후, 아래를 한 줄씩 실행:
   ```bash
   git remote add origin https://github.com/내아이디/tv-schedule-app.git
   git branch -M main
   git push -u origin main
   ```
   > (이미 `git init` 과 첫 커밋은 만들어 두었습니다. 위 3줄만 하면 업로드됩니다.)
   > GitHub 비밀번호 대신 **개인 액세스 토큰**을 물어보면, GitHub 설정 → Developer settings → Personal access tokens 에서 발급해 입력합니다.

---

## 1단계 — 백엔드 배포 (Render)

1. https://render.com 가입(GitHub 계정으로 로그인하면 편함).
2. **New + → Blueprint** 클릭 → 방금 올린 `tv-schedule-app` 저장소 선택.
   - 저장소에 있는 `render.yaml` 을 자동으로 읽어 설정이 채워집니다.
3. **환경 변수(Environment)** 입력 화면에서:
   - `TMDB_API_KEY` → 사장님의 TMDB v4 토큰 붙여넣기 (지금 `.env`에 있는 그 값)
   - `CORS_ORIGIN` → **일단 비워두거나** `*` 입력 (3단계 후 Vercel 주소로 바꿈)
4. **Apply / Create** → 몇 분 기다리면 배포 완료.
5. 생성된 주소(예: `https://tv-ott-backend.onrender.com`)를 복사해 둡니다. ← **백엔드 주소**
   - 확인: 브라우저에서 `그주소/api/health` 열어 `{"data":{"status":"ok"...}}` 보이면 성공.

> 무료 플랜은 15분 미사용 시 잠들어, 다음 첫 요청이 20~30초 느릴 수 있습니다(정상).

---

## 2단계 — 프론트 배포 (Vercel)

1. https://vercel.com 가입(GitHub 계정으로).
2. **Add New → Project** → `tv-schedule-app` 저장소 **Import**.
   - 저장소의 `vercel.json` 이 빌드 설정을 자동 적용합니다.
3. **Environment Variables** 에 추가:
   - 이름 `VITE_API_BASE_URL` / 값 = **1단계의 백엔드 주소** (예: `https://tv-ott-backend.onrender.com`)
4. **Deploy** → 1~2분 후 완료.
5. 생성된 주소(예: `https://tv-ott.vercel.app`)가 **사람들에게 알려줄 웹 주소**입니다. 🎉

---

## 3단계 — 둘을 연결 (CORS 마무리)

백엔드가 "이 프론트 주소만 허용"하도록 알려줍니다.

1. Render 대시보드 → 백엔드 서비스 → **Environment** →
   - `CORS_ORIGIN` 값을 **2단계의 Vercel 주소**(예: `https://tv-ott.vercel.app`)로 수정 → 저장.
2. Render가 자동 재배포됩니다. 끝!

이제 `https://tv-ott.vercel.app` 를 폰·PC 아무 데서나 열면 동작합니다.

---

## 업데이트하는 법 (나중에 코드 고친 뒤)

```bash
git add -A && git commit -m "수정 내용" && git push
```
→ Render·Vercel이 **자동으로 다시 배포**합니다. (push만 하면 끝)

## 자주 묻는 문제

- **화면은 뜨는데 데이터가 안 와요** → 십중팔구 `CORS_ORIGIN`(Render) 또는 `VITE_API_BASE_URL`(Vercel) 주소 오타. 끝에 `/` 없이 정확히.
- **편성표가 비어요** → 백엔드 첫 기동 후 스크래핑에 10~20초 걸립니다. 잠시 후 새로고침.
- **비용** → 위 구성은 무료. 트래픽이 크게 늘면 유료 전환 안내가 옵니다.
