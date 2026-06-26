// 사이트 푸터 — 목업 디자인(다크 네이비 + 블루/퍼플 톤)에 맞춘 정적 푸터.
//
// 구성
//  1행: 5개 바로가기(아이콘 + 제목 + 부제). 모바일에선 2~3열로 래핑.
//  2행: 저작권 / 정책 링크 / 소셜 아이콘.
//  맨 아래: TMDB·네이버 출처 고지(회색 작은 글씨).
// props 없음.

import type { ReactNode } from 'react';

/** 1행 바로가기 항목 1개 */
interface QuickLink {
  /** inline SVG 아이콘 */
  icon: ReactNode;
  /** 제목 */
  title: string;
  /** 작은 부제 */
  subtitle: string;
}

// 공통 SVG 속성(stroke 1.5, currentColor, 18px) — 규칙에 맞춘 단순 라인 아이콘.
const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** 1행: 5개 바로가기 정의 */
const QUICK_LINKS: QuickLink[] = [
  {
    // 모바일 앱 다운로드
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    ),
    title: '앱 다운로드',
    subtitle: 'iOS / Android',
  },
  {
    // 카카오톡 알림(말풍선)
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.25 9.3 9.3 0 0 1-3.4-.6L4 21l1.1-3.2A7.9 7.9 0 0 1 4 11.5 8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />
      </svg>
    ),
    title: '카카오톡 알림',
    subtitle: '편성표 변경 알림 받기',
  },
  {
    // 즐겨찾기(별)
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
      </svg>
    ),
    title: '즐겨찾기',
    subtitle: '찜한 콘텐츠 모아보기',
  },
  {
    // 시청 기록(시계)
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    title: '시청 기록',
    subtitle: '최근 본 콘텐츠 확인',
  },
  {
    // 고객센터(헤드셋)
    icon: (
      <svg {...iconProps} aria-hidden="true">
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
        <path d="M4 13a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z" />
        <path d="M20 13a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2 1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1Z" />
        <path d="M18 19a3 3 0 0 1-3 3h-2" />
      </svg>
    ),
    title: '고객센터',
    subtitle: '문의하기',
  },
];

/** 2행 오른쪽 소셜 아이콘(원형 버튼). 단순 inline SVG. */
const SOCIALS: { label: string; icon: ReactNode }[] = [
  {
    label: '인스타그램',
    icon: (
      <svg {...iconProps} width={16} height={16} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17" cy="7" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: '유튜브',
    icon: (
      <svg {...iconProps} width={16} height={16} aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="3" />
        <path d="M10.5 9.5l4 2.5-4 2.5v-5Z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: '엑스(트위터)',
    icon: (
      <svg {...iconProps} width={16} height={16} aria-hidden="true">
        <path d="M5 5l14 14M19 5L5 19" />
      </svg>
    ),
  },
  {
    label: '페이스북',
    icon: (
      <svg {...iconProps} width={16} height={16} aria-hidden="true">
        <path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2.2l.8-3H14v-2a1 1 0 0 1 1-1Z" />
      </svg>
    ),
  },
];

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        {/* 1행: 5개 바로가기 — 모바일 2열 / 태블릿 3열 / 데스크톱 5열 */}
        <nav
          aria-label="바로가기"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          {QUICK_LINKS.map((link) => (
            <a
              key={link.title}
              href="#"
              className="card-hover flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20"
            >
              {/* 아이콘 칩 */}
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                {link.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-100">
                  {link.title}
                </span>
                <span className="block truncate text-xs text-slate-400">
                  {link.subtitle}
                </span>
              </span>
            </a>
          ))}
        </nav>

        {/* 2행: 저작권 / 정책 링크 / 소셜 */}
        <div className="mt-10 flex flex-col items-center gap-6 border-t border-white/10 pt-8 md:flex-row md:justify-between">
          {/* 왼쪽: 저작권 */}
          <p className="text-xs text-slate-500">
            © 2024 오늘 뭐 보지. All rights reserved.
          </p>

          {/* 가운데: 정책 링크 */}
          <nav
            aria-label="정책"
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-400"
          >
            <a href="#" className="transition hover:text-white">
              이용약관
            </a>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <a href="#" className="transition hover:text-white">
              개인정보처리방침
            </a>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <a href="#" className="transition hover:text-white">
              광고문의
            </a>
          </nav>

          {/* 오른쪽: 소셜 아이콘 4개(원형) */}
          <div className="flex items-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                title={s.label}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-white/20 hover:text-white"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* 맨 아래: 출처 고지 */}
        <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-500">
          이 제품은 TMDB API를 사용하지만 TMDB의 인증·보증을 받지 않았습니다. TV 편성 정보 출처:
          네이버 편성표.
        </p>
      </div>
    </footer>
  );
}
