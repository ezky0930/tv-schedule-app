import { useEffect, useMemo, useState } from 'react';
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
import type { FavoriteItem, OttContent, MediaType } from '@tv/shared';
import { api } from '../lib/api';
import { useFavorites, removeFavorite } from '../lib/favorites';
import PosterGrid from '../components/PosterGrid';
import FavoriteButton from '../components/FavoriteButton';
import { colors, radius, spacing } from '../theme';

// 즐겨찾기 화면 (모바일) — 웹 FavoritesView.tsx 포팅.
// OTT 즐겨찾기는 포스터 그리드(별표로 해제·탭 시 상세), TV 즐겨찾기는 세로 목록(채널명 + 삭제).

/** 'tmdb:tv:1396' → 최소 OttContent (상세 모달이 id로 전체를 다시 불러옴) */
function favToOttContent(fav: FavoriteItem): OttContent | null {
  const id = fav.tmdbId ?? fav.key;
  const m = /^tmdb:(tv|movie):(\d+)$/.exec(id);
  if (!m) return null;
  return {
    id,
    tmdbId: Number(m[2]),
    mediaType: m[1] as MediaType,
    title: fav.title,
    posterUrl: fav.posterUrl,
  };
}

export default function FavoritesScreen() {
  const favorites = useFavorites();
  const [selected, setSelected] = useState<OttContent | null>(null);

  const ott = useMemo(() => favorites.filter((f) => f.kind === 'ott'), [favorites]);
  const tv = useMemo(() => favorites.filter((f) => f.kind === 'tv'), [favorites]);

  // OTT 즐겨찾기를 PosterGrid 가 받는 형태(OttContent[])로 변환
  const ottItems = useMemo(
    () => ott.map(favToOttContent).filter((c): c is OttContent => c !== null),
    [ott],
  );

  // 비어있을 때 안내
  if (favorites.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyStar}>☆</Text>
          <Text style={styles.emptyTitle}>아직 즐겨찾기가 없습니다.</Text>
          <Text style={styles.emptyHint}>
            OTT 포스터나 TV 편성표 프로그램의 별표(☆)를 눌러 추가하세요.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* OTT 즐겨찾기 */}
        {ottItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OTT ({ottItems.length})</Text>
            {/* PosterGrid 는 내부가 FlatList 이므로 스크롤 충돌을 막기 위해 높이를 콘텐츠에 맡긴다.
                ScrollView 안에서는 scrollEnabled 가 꺼진 형태로 동작하도록 래핑한다. */}
            <View style={styles.gridWrap}>
              <PosterGrid items={ottItems} onSelect={setSelected} />
            </View>
          </View>
        )}

        {/* TV 즐겨찾기 — 세로 목록 */}
        {tv.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TV 프로그램 ({tv.length})</Text>
            <View style={styles.list}>
              {tv.map((f, i) => {
                const ottForm = favToOttContent(f);
                return (
                  <View key={f.key} style={[styles.row, i > 0 && styles.rowBorder]}>
                    {/* 본문 — OTT 매칭이 있으면 탭 시 상세 모달 */}
                    <Pressable
                      style={styles.rowMain}
                      disabled={!ottForm}
                      onPress={() => ottForm && setSelected(ottForm)}
                    >
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {f.title}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {f.channelName ?? f.channelId}
                        {ottForm ? '  ·  상세 보기' : ''}
                      </Text>
                    </Pressable>

                    {/* 별표 토글 */}
                    <FavoriteButton
                      size="sm"
                      item={{
                        key: f.key,
                        kind: 'tv',
                        title: f.title,
                        channelId: f.channelId,
                        channelName: f.channelName,
                        tmdbId: f.tmdbId,
                      }}
                    />

                    {/* 삭제 버튼 */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="삭제"
                      hitSlop={6}
                      onPress={() => removeFavorite(f.key)}
                      style={styles.delBtn}
                    >
                      <Text style={styles.delText}>삭제</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 상세 모달 */}
      <ContentDetailModal initial={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 콘텐츠 상세 모달 (모바일) — 웹 ContentDetailModal.tsx 포팅.
// 목록에서 받은 기본 정보(initial)를 즉시 보여주고, /content/:id 로 상세를 채운다.

interface DetailProps {
  initial: OttContent | null;
  onClose: () => void;
}

function ContentDetailModal({ initial, onClose }: DetailProps) {
  // 처음엔 목록에서 받은 정보로 즉시 렌더하고, 상세를 받아오면 교체한다.
  const [content, setContent] = useState<OttContent | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setContent(initial);
    setError('');
    if (!initial) return;

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
  }, [initial]);

  const visible = initial !== null && content !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* 배경(탭 시 닫기) */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* 카드(탭 전파 차단) */}
        <Pressable style={styles.card} onPress={() => {}}>
          {content && (
            <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
              {/* 배경 이미지 */}
              {content.backdropUrl ? (
                <Image
                  source={{ uri: content.backdropUrl }}
                  style={styles.backdropImg}
                  resizeMode="cover"
                />
              ) : null}

              {/* 별표 + 닫기 (우상단) */}
              <View style={styles.cardTopRight}>
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

              <View style={styles.cardBody}>
                <View style={styles.headerRow}>
                  {content.posterUrl ? (
                    <Image
                      source={{ uri: content.posterUrl }}
                      style={[
                        styles.poster,
                        content.backdropUrl ? styles.posterOverlap : null,
                      ]}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={styles.headerText}>
                    <Text style={styles.detailTitle}>{content.title}</Text>
                    {content.originalTitle &&
                    content.originalTitle !== content.title ? (
                      <Text style={styles.original}>{content.originalTitle}</Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <View style={styles.typeChip}>
                        <Text style={styles.typeChipText}>
                          {content.mediaType === 'tv' ? '시리즈' : '영화'}
                        </Text>
                      </View>
                      {content.voteAverage ? (
                        <Text style={styles.vote}>
                          ★ {content.voteAverage.toFixed(1)}
                        </Text>
                      ) : null}
                      {content.releaseDate ? (
                        <Text style={styles.metaText}>{content.releaseDate}</Text>
                      ) : null}
                    </View>
                    {content.genres && content.genres.length > 0 ? (
                      <View style={styles.genreRow}>
                        {content.genres.map((g) => (
                          <View key={g} style={styles.genreChip}>
                            <Text style={styles.genreText}>{g}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>

                {content.tagline ? (
                  <Text style={styles.tagline}>“{content.tagline}”</Text>
                ) : null}

                {content.overview ? (
                  <Text style={styles.overview}>{content.overview}</Text>
                ) : null}

                {/* 어디서 볼 수 있는지 */}
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>어디서 볼 수 있나요?</Text>
                  {loading && !content.providers ? (
                    <Text style={styles.faint}>불러오는 중…</Text>
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
                            />
                          ) : null}
                          <Text style={styles.providerText}>{p.name}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.faint}>
                      {loading
                        ? '불러오는 중…'
                        : '국내 정액제 스트리밍 정보가 없습니다.'}
                    </Text>
                  )}
                </View>

                {/* 출연진 */}
                {content.cast && content.cast.length > 0 ? (
                  <View style={styles.block}>
                    <Text style={styles.blockTitle}>출연</Text>
                    <View style={styles.castRow}>
                      {content.cast.slice(0, 8).map((c, i) => (
                        <Text key={`${c.name}-${i}`} style={styles.castText}>
                          {c.name}
                          {c.character ? (
                            <Text style={styles.faint}> · {c.character}</Text>
                          ) : null}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : null}

                {error ? (
                  <Text style={styles.errorText}>상세 정보 오류: {error}</Text>
                ) : null}

                {/* 초기 로딩 표시 (콘텐츠가 비어있을 때 대비) */}
                {loading && !content.overview ? (
                  <ActivityIndicator
                    color={colors.indigo}
                    style={{ marginTop: spacing.lg }}
                  />
                ) : null}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xl },

  // 빈 상태
  emptyWrap: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.xl + spacing.sm,
    alignItems: 'center',
  },
  emptyStar: { fontSize: 30, color: colors.textDim },
  emptyTitle: { marginTop: spacing.md, color: colors.text, fontSize: 15 },
  emptyHint: {
    marginTop: spacing.xs,
    color: colors.textFaint,
    fontSize: 13,
    textAlign: 'center',
  },

  // 섹션
  section: { marginTop: spacing.lg },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  gridWrap: {
    // ScrollView 내부에서 PosterGrid(FlatList)가 자체 스크롤하지 않고 펼쳐지도록
    // 충분히 그리도록 함. RN 은 중첩 스크롤을 허용하지만 같은 방향은 비활성 권장.
  },

  // TV 목록
  list: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '500' },
  rowSub: { marginTop: 2, color: colors.textFaint, fontSize: 12 },
  delBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  delText: { color: colors.textDim, fontSize: 12 },

  // 모달
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    maxHeight: '88%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  backdropImg: { width: '100%', height: 180 },
  cardTopRight: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.text, fontSize: 14 },
  cardBody: { padding: spacing.lg },
  headerRow: { flexDirection: 'row', gap: spacing.md },
  poster: { width: 80, height: 120, borderRadius: radius.md },
  posterOverlap: { marginTop: -56 },
  headerText: { flex: 1, minWidth: 0 },
  detailTitle: { color: colors.accent, fontSize: 19, fontWeight: '700' },
  original: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  metaRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeChip: {
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeChipText: { color: colors.textDim, fontSize: 11 },
  vote: { color: colors.amber, fontSize: 13 },
  metaText: { color: colors.textDim, fontSize: 13 },
  genreRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  genreChip: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  genreText: { color: colors.textDim, fontSize: 11 },
  tagline: {
    marginTop: spacing.lg,
    color: colors.textDim,
    fontSize: 14,
    fontStyle: 'italic',
  },
  overview: {
    marginTop: spacing.lg,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  block: { marginTop: spacing.xl },
  blockTitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  faint: { color: colors.textFaint, fontSize: 13 },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  providerLogo: { width: 16, height: 16, borderRadius: radius.sm },
  providerText: { color: colors.text, fontSize: 13 },
  castRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  castText: { color: colors.textDim, fontSize: 13 },
  errorText: { marginTop: spacing.lg, color: colors.red, fontSize: 13 },
});
