import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Modal,
} from 'react-native';
import {
  DAY_LABELS_KO,
  type SearchResult,
  type OttContent,
  type Program,
  type DayOfWeek,
} from '@tv/shared';
import { api } from '../lib/api';
import PosterGrid from '../components/PosterGrid';
import PosterCard from '../components/PosterCard';
import FavoriteButton from '../components/FavoriteButton';
import { colors, radius, spacing } from '../theme';

// 통합 검색 화면 (모바일) — 웹 SearchView.tsx 의 React Native 포팅.
// query(검색어) 를 prop 으로 받아 300ms 디바운스 후 api.search 호출하고,
// 결과를 TV 편성표 섹션(세로 리스트)과 OTT 섹션(PosterGrid)으로 나눠 보여준다.
// OTT 항목을 누르면 상세 모달(ContentDetailModal 역할)을 띄운다.

interface SearchScreenProps {
  /** 상위(헤더 검색바)에서 내려주는 검색어 */
  query: string;
}

export function SearchScreen({ query }: SearchScreenProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 선택된 OTT 콘텐츠 — null 이 아니면 상세 모달을 띄운다.
  const [selected, setSelected] = useState<OttContent | null>(null);

  // 검색어 디바운스 + API 호출.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    // 300ms 디바운스
    const t = setTimeout(() => {
      api
        .search(q)
        .then((res) => setResults(res.data))
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : String(err)),
        )
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // 결과를 TV 편성표 / OTT 두 그룹으로 분리.
  const tv = results.filter((r) => r.type === 'program');
  const ott = results
    .filter((r) => r.type === 'ott' && r.ott)
    .map((r) => r.ott as OttContent);

  // 빈 검색어 안내.
  if (query.trim().length < 1) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>
          프로그램·영화·시리즈 이름으로 TV 편성표와 OTT를 한 번에 검색하세요.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 로딩 */}
        {loading && (
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.textDim} />
            <Text style={styles.statusText}>검색 중…</Text>
          </View>
        )}

        {/* 에러 */}
        {!!error && <Text style={styles.errorText}>검색 오류: {error}</Text>}

        {/* 무결과 */}
        {!loading && !error && results.length === 0 && (
          <Text style={styles.placeholder}>
            "{query}" 검색 결과가 없습니다.
          </Text>
        )}

        {/* TV 편성표 결과 */}
        {tv.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TV 편성표 ({tv.length})</Text>
            <View style={styles.tvList}>
              {tv.map((r, idx) => {
                const p = r.program as Program;
                return (
                  <View
                    key={p.id}
                    style={[styles.tvRow, idx > 0 && styles.tvRowDivider]}
                  >
                    <View style={styles.tvInfo}>
                      <Text style={styles.tvTitle} numberOfLines={1}>
                        {p.title}
                        {p.episode ? (
                          <Text style={styles.tvEpisode}> {p.episode}</Text>
                        ) : null}
                      </Text>
                      <Text style={styles.tvMeta} numberOfLines={1}>
                        <Text style={styles.tvChannel}>
                          {r.availableOn.join(', ')}
                        </Text>
                        {' · '}
                        {DAY_LABELS_KO[p.day as DayOfWeek]} {p.startTime}
                        {p.isRerun ? '  재방송' : ''}
                      </Text>
                    </View>
                    <FavoriteButton
                      size="sm"
                      item={{
                        key: `tv:${p.channelId}:${p.title}`,
                        kind: 'tv',
                        title: p.title,
                        channelId: p.channelId,
                        channelName: r.availableOn[0],
                        tmdbId: p.tmdbId,
                      }}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* OTT 결과 — PosterGrid 재사용. ScrollView 안의 중첩 FlatList 스크롤 충돌을
            피하기 위해 OTT 가 있을 때만 별도 영역으로 렌더. */}
        {ott.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OTT ({ott.length})</Text>
            <OttResults items={ott} onSelect={setSelected} />
          </View>
        )}
      </ScrollView>

      {/* OTT 콘텐츠 상세 모달 */}
      {selected && (
        <ContentDetailModal
          initial={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

// OTT 결과를 화면 너비에 맞춰 3열 그리드로 직접 배치한다.
// (부모가 ScrollView 이므로 PosterGrid 의 FlatList 대신 정적 행 배치로
//  중첩 스크롤 충돌을 피한다. PosterCard 는 그대로 재사용.)
function OttResults({
  items,
  onSelect,
}: {
  items: OttContent[];
  onSelect: (c: OttContent) => void;
}) {
  const { width } = useWindowDimensions();
  const NUM_COLUMNS = 3;
  const cardWidth =
    (width - spacing.lg * 2 - spacing.md * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  return (
    <View style={styles.ottGrid}>
      {items.map((c) => (
        <PosterCard
          key={c.id}
          content={c}
          width={cardWidth}
          onPress={onSelect}
        />
      ))}
    </View>
  );
}

// 콘텐츠 상세 모달 (모바일) — 웹 ContentDetailModal.tsx 의 RN 포팅.
// 목록에서 받은 기본 정보(initial)를 즉시 보여주고, /content/:id 로 상세를 채운다.
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
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* 반투명 배경 — 탭하면 닫힘 */}
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        {/* 카드 영역 — 탭 이벤트 전파 차단 */}
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 배경 이미지 */}
            {content.backdropUrl ? (
              <View style={styles.backdropWrap}>
                <Image
                  source={{ uri: content.backdropUrl }}
                  style={styles.backdrop}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            {/* 별표 + 닫기 */}
            <View style={styles.modalActions}>
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
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalHeader}>
                {content.posterUrl ? (
                  <Image
                    source={{ uri: content.posterUrl }}
                    style={styles.detailPoster}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={styles.detailHeadText}>
                  <Text style={styles.detailTitle}>{content.title}</Text>
                  {content.originalTitle &&
                  content.originalTitle !== content.title ? (
                    <Text style={styles.detailOriginal}>
                      {content.originalTitle}
                    </Text>
                  ) : null}
                  <View style={styles.detailMetaRow}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {content.mediaType === 'tv' ? '시리즈' : '영화'}
                      </Text>
                    </View>
                    {typeof content.voteAverage === 'number' &&
                    content.voteAverage > 0 ? (
                      <Text style={styles.detailRating}>
                        ★ {content.voteAverage.toFixed(1)}
                      </Text>
                    ) : null}
                    {content.releaseDate ? (
                      <Text style={styles.detailDate}>{content.releaseDate}</Text>
                    ) : null}
                  </View>
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

              {content.tagline ? (
                <Text style={styles.tagline}>"{content.tagline}"</Text>
              ) : null}

              {content.overview ? (
                <Text style={styles.overview}>{content.overview}</Text>
              ) : null}

              {/* 어디서 볼 수 있는지 */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  어디서 볼 수 있나요?
                </Text>
                {loading && !content.providers ? (
                  <Text style={styles.muted}>불러오는 중…</Text>
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
                  <Text style={styles.muted}>
                    {loading
                      ? '불러오는 중…'
                      : '국내 정액제 스트리밍 정보가 없습니다.'}
                  </Text>
                )}
              </View>

              {/* 출연진 */}
              {content.cast && content.cast.length > 0 ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>출연</Text>
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

              {!!error && (
                <Text style={styles.errorText}>상세 정보 오류: {error}</Text>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default SearchScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xl * 2 },

  placeholder: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.xl + spacing.md,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  statusText: { color: colors.textFaint, fontSize: 13 },
  errorText: { color: colors.red, fontSize: 13 },

  section: { gap: spacing.md },
  sectionTitle: { color: colors.textDim, fontSize: 13, fontWeight: '600' },

  // TV 편성표 리스트
  tvList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  tvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tvRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  tvInfo: { flex: 1, minWidth: 0 },
  tvTitle: { color: colors.text, fontSize: 14, fontWeight: '500' },
  tvEpisode: { color: colors.textFaint, fontSize: 12, fontWeight: '400' },
  tvMeta: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  tvChannel: { color: colors.textDim },

  // OTT 그리드 (정적 배치)
  ottGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },

  // 상세 모달
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg * 1.5,
    borderTopRightRadius: radius.lg * 1.5,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  backdropWrap: { width: '100%', height: 180 },
  backdrop: { width: '100%', height: '100%' },
  modalActions: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: colors.text, fontSize: 15 },

  modalBody: { padding: spacing.xl },
  modalHeader: { flexDirection: 'row', gap: spacing.lg },
  detailPoster: {
    width: 80,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  detailHeadText: { flex: 1, minWidth: 0 },
  detailTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  detailOriginal: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  detailMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  typeBadge: {
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: { color: colors.textDim, fontSize: 11 },
  detailRating: { color: colors.amber, fontSize: 13 },
  detailDate: { color: colors.textDim, fontSize: 13 },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  genreChip: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  genreChipText: { color: colors.textDim, fontSize: 11 },

  tagline: {
    color: colors.textDim,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: spacing.lg,
  },
  overview: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.lg,
  },

  detailSection: { marginTop: spacing.xl },
  detailSectionTitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  muted: { color: colors.textFaint, fontSize: 13 },

  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  providerLogo: { width: 16, height: 16, borderRadius: radius.sm },
  providerName: { color: colors.text, fontSize: 13 },

  castRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  castText: { color: colors.textDim, fontSize: 13 },
  castCharacter: { color: colors.textFaint },
});
