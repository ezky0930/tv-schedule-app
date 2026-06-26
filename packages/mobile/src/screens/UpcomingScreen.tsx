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
import PosterGrid from '../components/PosterGrid';
import FavoriteButton from '../components/FavoriteButton';
import { colors, radius, spacing } from '../theme';

// 공개/방영 예정 화면 (모바일) — 웹 UpcomingView 의 RN 포팅.
// 곧 공개되는 한국 OTT·콘텐츠를 공개일 빠른 순으로 그리드에 보여준다.
// 카드를 누르면 콘텐츠 상세 모달을 띄운다.

export default function UpcomingScreen() {
  const [items, setItems] = useState<OttContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<OttContent | null>(null);

  // 최초 진입 시 1회 공개 예정 목록을 불러온다.
  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getOttUpcoming()
      .then((res) => setItems(res.data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setLoading(false));
  }, []);

  // PosterGrid 상단 헤더 — 안내 문구.
  const header = (
    <Text style={styles.notice}>곧 공개·방영되는 한국 콘텐츠</Text>
  );

  // 로딩 상태
  if (loading) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={colors.textDim} style={{ marginTop: spacing.xl }} />
        <Text style={styles.loadingText}>불러오는 중…</Text>
      </View>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <View style={styles.center}>
        {header}
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <PosterGrid
        items={items}
        onSelect={setSelected}
        header={
          <View>
            {header}
            {items.length === 0 && (
              <Text style={styles.empty}>예정된 콘텐츠가 없습니다.</Text>
            )}
          </View>
        }
      />

      {/* 카드 선택 시 콘텐츠 상세 모달 */}
      {selected && (
        <ContentDetailModal
          initial={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

// ───────────────────────────────────────────────────────────
// 콘텐츠 상세 모달 (모바일 자체 구현).
// 목록 데이터(initial)를 즉시 보여주고, 백그라운드로 상세(api.getOttContent)를
// 받아 줄거리·출연진 등으로 보강한다.
// ───────────────────────────────────────────────────────────
function ContentDetailModal({
  initial,
  onClose,
}: {
  initial: OttContent;
  onClose: () => void;
}) {
  const [content, setContent] = useState<OttContent>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api
      .getOttContent(initial.id)
      .then((res) => {
        if (alive) setContent(res.data);
      })
      .catch((err: unknown) => {
        // 상세 보강 실패해도 목록 데이터로 계속 보여줄 수 있다.
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
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* 헤더: 닫기 + 즐겨찾기 */}
          <View style={styles.sheetHeader}>
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

          <ScrollView contentContainerStyle={styles.sheetBody}>
            {/* 배경/포스터 이미지 */}
            {(content.backdropUrl || content.posterUrl) && (
              <Image
                source={{ uri: content.backdropUrl ?? content.posterUrl }}
                style={styles.backdrop2}
                resizeMode="cover"
              />
            )}

            {/* 제목 */}
            <Text style={styles.detailTitle}>
              {content.mediaType === 'tv' ? '시리즈 · ' : ''}
              {content.title}
            </Text>
            {content.originalTitle && content.originalTitle !== content.title && (
              <Text style={styles.originalTitle}>{content.originalTitle}</Text>
            )}

            {/* 메타 줄: 공개일 · 평점 */}
            <View style={styles.metaRow}>
              {content.releaseDate && (
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>
                    {content.isUpcoming ? '공개예정 ' : ''}
                    {content.releaseDate}
                  </Text>
                </View>
              )}
              {typeof content.voteAverage === 'number' &&
                content.voteAverage > 0 && (
                  <View style={styles.metaPill}>
                    <Text style={[styles.metaPillText, { color: colors.amber }]}>
                      ★ {content.voteAverage.toFixed(1)}
                    </Text>
                  </View>
                )}
            </View>

            {/* 장르 */}
            {content.genres && content.genres.length > 0 && (
              <View style={styles.badges}>
                {content.genres.map((g) => (
                  <View key={g} style={styles.badge}>
                    <Text style={styles.badgeText}>{g}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 제공처 (OTT) */}
            {content.providers && content.providers.length > 0 && (
              <View style={styles.badges}>
                {content.providers.map((p) => (
                  <View
                    key={`${p.id}-${p.tmdbProviderId ?? p.name}`}
                    style={[styles.badge, styles.providerBadge]}
                  >
                    <Text style={styles.badgeText}>{p.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 태그라인 */}
            {content.tagline ? (
              <Text style={styles.tagline}>“{content.tagline}”</Text>
            ) : null}

            {/* 줄거리 */}
            {content.overview ? (
              <Text style={styles.overview}>{content.overview}</Text>
            ) : (
              !loading && <Text style={styles.overviewDim}>줄거리 정보가 없습니다.</Text>
            )}

            {/* 출연진 — 상세 보강으로 채워짐 */}
            {content.cast && content.cast.length > 0 && (
              <View style={styles.castSection}>
                <Text style={styles.sectionLabel}>출연</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.castRow}>
                    {content.cast.map((c, i) => (
                      <View key={`${c.name}-${i}`} style={styles.castCard}>
                        {c.profileUrl ? (
                          <Image
                            source={{ uri: c.profileUrl }}
                            style={styles.castImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.castImg, styles.castNoImg]}>
                            <Text style={styles.castNoImgText} numberOfLines={2}>
                              {c.name}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.castName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        {c.character ? (
                          <Text style={styles.castChar} numberOfLines={1}>
                            {c.character}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* 상세 보강 로딩/에러 표시 (목록 데이터는 이미 보임) */}
            {loading && (
              <View style={styles.detailLoading}>
                <ActivityIndicator color={colors.textDim} />
              </View>
            )}
            {error && !loading && (
              <Text style={styles.detailError}>상세 정보를 불러오지 못했어요.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  notice: {
    color: colors.textDim,
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  empty: {
    color: colors.textFaint,
    fontSize: 13,
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
  loadingText: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.red,
    fontSize: 13,
    marginTop: spacing.sm,
  },

  // 상세 모달
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  closeText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  sheetBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  backdrop2: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.md,
  },
  detailTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  originalTitle: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaPill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  metaPillText: { color: colors.textDim, fontSize: 12 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  badge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  providerBadge: { borderWidth: 1, borderColor: colors.border },
  badgeText: { color: colors.textDim, fontSize: 11 },
  tagline: {
    color: colors.textDim,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },
  overview: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  overviewDim: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: spacing.md,
  },
  castSection: { marginTop: spacing.lg },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  castRow: { flexDirection: 'row', gap: spacing.md },
  castCard: { width: 72 },
  castImg: {
    width: 72,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  castNoImg: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  castNoImgText: { color: colors.textFaint, fontSize: 10, textAlign: 'center' },
  castName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  castChar: { color: colors.textFaint, fontSize: 11, marginTop: 1 },
  detailLoading: { paddingVertical: spacing.lg, alignItems: 'center' },
  detailError: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: spacing.md,
  },
});
