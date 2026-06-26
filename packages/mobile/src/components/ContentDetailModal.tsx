import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import type { OttContent } from '@tv/shared';
import { api } from '../lib/api';
import FavoriteButton from './FavoriteButton';
import { colors, radius, spacing } from '../theme';

// 콘텐츠 상세 모달 (모바일).
// 목록에서 받은 기본 정보(initial)를 먼저 보여주고, /content/:id 로 상세(출연진·시청처)를 채운다.
// 웹의 ContentDetailModal 과 동일 역할 — RN Modal(slide / pageSheet)로 구현.
interface Props {
  initial: OttContent;
  onClose: () => void;
}

export default function ContentDetailModal({ initial, onClose }: Props) {
  // 처음엔 목록에서 받은 정보로 즉시 렌더하고, 상세를 받아오면 교체한다.
  const [content, setContent] = useState<OttContent>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getOttContent(initial.id)
      .then((res) => {
        if (alive) setContent(res.data);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [initial.id]);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* 우상단 별표 + 닫기 버튼 (스크롤과 무관하게 고정) */}
        <View style={styles.topActions}>
          <FavoriteButton
            item={{
              key: content.id,
              kind: 'ott',
              title: content.title,
              posterUrl: content.posterUrl,
              tmdbId: content.id,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            hitSlop={8}
            onPress={onClose}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 배경 이미지 */}
          {content.backdropUrl ? (
            <View style={styles.backdropWrap}>
              <Image
                source={{ uri: content.backdropUrl }}
                style={styles.backdrop}
                resizeMode="cover"
              />
              {/* 아래로 갈수록 어두워지는 그라데이션 대용 — 단색 페이드 오버레이 */}
              <View style={styles.backdropFade} />
            </View>
          ) : null}

          <View style={styles.body}>
            {/* 포스터 + 헤더 정보 */}
            <View style={styles.headerRow}>
              {content.posterUrl ? (
                <Image
                  source={{ uri: content.posterUrl }}
                  style={[
                    styles.poster,
                    // 배경이 있으면 배경 위로 살짝 겹쳐 올린다.
                    content.backdropUrl ? styles.posterOverlap : null,
                  ]}
                  resizeMode="cover"
                />
              ) : null}

              <View style={styles.headerInfo}>
                <Text style={styles.title}>{content.title}</Text>
                {content.originalTitle &&
                content.originalTitle !== content.title ? (
                  <Text style={styles.originalTitle}>
                    {content.originalTitle}
                  </Text>
                ) : null}

                {/* 평점 / 종류 / 공개일 */}
                <View style={styles.metaRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                      {content.mediaType === 'tv' ? '시리즈' : '영화'}
                    </Text>
                  </View>
                  {content.voteAverage ? (
                    <Text style={styles.rating}>
                      ★ {content.voteAverage.toFixed(1)}
                    </Text>
                  ) : null}
                  {content.releaseDate ? (
                    <Text style={styles.metaText}>{content.releaseDate}</Text>
                  ) : null}
                </View>

                {/* 장르 */}
                {content.genres && content.genres.length > 0 ? (
                  <View style={styles.genreRow}>
                    {content.genres.map((g) => (
                      <View key={g} style={styles.genreChip}>
                        <Text style={styles.genreChipText}>{g}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>

            {/* 태그라인 */}
            {content.tagline ? (
              <Text style={styles.tagline}>“{content.tagline}”</Text>
            ) : null}

            {/* 줄거리 */}
            {content.overview ? (
              <Text style={styles.overview}>{content.overview}</Text>
            ) : null}

            {/* 어디서 볼 수 있는지 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>어디서 볼 수 있나요?</Text>
              {loading && !content.providers ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator size="small" color={colors.textDim} />
                  <Text style={styles.dimText}>불러오는 중…</Text>
                </View>
              ) : content.providers && content.providers.length > 0 ? (
                <View style={styles.providerRow}>
                  {content.providers.map((p) => (
                    <View
                      key={`${p.id}-${p.tmdbProviderId}`}
                      style={styles.providerChip}
                    >
                      {p.logoUrl ? (
                        <Image
                          source={{ uri: p.logoUrl }}
                          style={styles.providerLogo}
                          resizeMode="cover"
                        />
                      ) : null}
                      <Text style={styles.providerName}>{p.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.dimText}>
                  {loading
                    ? '불러오는 중…'
                    : '국내 정액제 스트리밍 정보가 없습니다.'}
                </Text>
              )}
            </View>

            {/* 출연진 */}
            {content.cast && content.cast.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>출연</Text>
                <View style={styles.castRow}>
                  {content.cast.slice(0, 8).map((c, i) => (
                    <Text key={`${c.name}-${i}`} style={styles.castText}>
                      {c.name}
                      {c.character ? (
                        <Text style={styles.castCharacter}>
                          {' · '}
                          {c.character}
                        </Text>
                      ) : null}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}

            {/* 에러 */}
            {error ? (
              <Text style={styles.errorText}>상세 정보 오류: {error}</Text>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const BACKDROP_HEIGHT = 200;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  // 우상단 고정 액션 (별표 + 닫기)
  topActions: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  closeText: { color: colors.text, fontSize: 16, fontWeight: '600' },

  scrollContent: { paddingBottom: spacing.xl },

  // 배경 이미지
  backdropWrap: { width: '100%', height: BACKDROP_HEIGHT },
  backdrop: { width: '100%', height: '100%' },
  backdropFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BACKDROP_HEIGHT / 2,
    backgroundColor: colors.surface,
    opacity: 0.55,
  },

  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },

  headerRow: { flexDirection: 'row', gap: spacing.lg },
  poster: {
    width: 96,
    height: 144,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
  },
  // 배경이 있을 때 포스터를 위로 끌어올려 겹친다.
  posterOverlap: { marginTop: -64 },
  headerInfo: { flex: 1, minWidth: 0, paddingTop: spacing.xs },

  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  originalTitle: { color: colors.textDim, fontSize: 13, marginTop: 2 },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  typeBadge: {
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: { color: colors.textDim, fontSize: 11 },
  rating: { color: colors.amber, fontSize: 13, fontWeight: '500' },
  metaText: { color: colors.textDim, fontSize: 13 },

  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  genreChip: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  genreChipText: { color: colors.textDim, fontSize: 11 },

  tagline: {
    color: colors.textDim,
    fontStyle: 'italic',
    fontSize: 14,
    marginTop: spacing.lg,
  },
  overview: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.lg,
  },

  section: { marginTop: spacing.xl },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  inlineLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dimText: { color: colors.textFaint, fontSize: 13 },

  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  providerLogo: { width: 16, height: 16, borderRadius: radius.sm },
  providerName: { color: colors.text, fontSize: 13 },

  castRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  castText: { color: colors.textDim, fontSize: 13 },
  castCharacter: { color: colors.textFaint },

  errorText: { color: colors.red, fontSize: 13, marginTop: spacing.lg },
});
