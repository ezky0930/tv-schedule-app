import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  DAYS,
  DAY_LABELS_KO,
  dayOfWeekFromDate,
  type Channel,
  type ChannelCategory,
  type Program,
  type DayOfWeek,
} from '@tv/shared';
import { api, type MetaInfo } from '../lib/api';
import FavoriteButton from '../components/FavoriteButton';
import { colors, radius, spacing } from '../theme';

// 요일별 TV 편성표 화면 (모바일) — 웹의 TvSchedule 컴포넌트를 RN 으로 포팅.
// 요일 탭 → 정렬(시간순/인기순) → 채널 타임라인 또는 인기 순위 리스트.
// 시간순: 채널별 컬럼 타임라인(가로 스크롤) + "지금 방영 중" 빨강 강조.
// 인기순: TMDB 평점/인기로 매칭된 프로그램을 순위 리스트로(중복 제거).

type CategoryFilter = 'all' | ChannelCategory;
type SortMode = 'time' | 'popular';

const CATEGORY_FILTERS: Array<{ key: CategoryFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'terrestrial', label: '지상파' },
  { key: 'general', label: '종편' },
  { key: 'cable', label: '케이블' },
];

const SORT_MODES: Array<{ key: SortMode; label: string }> = [
  { key: 'time', label: '시간순' },
  { key: 'popular', label: '인기순' },
];

/** 현재 시각 'HH:mm' */
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TvScheduleScreen() {
  const todayKey = useMemo(() => dayOfWeekFromDate(new Date()), []);
  const [day, setDay] = useState<DayOfWeek>(todayKey);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  // 재방송 숨기기 (= '새로운 방송'만 보기). 기본 ON.
  const [hideReruns, setHideReruns] = useState(true);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState<string>('');
  const now = nowHHMM();

  // 채널 메타(분류/순서) 1회 로드
  useEffect(() => {
    api
      .getMeta()
      .then((res: { data: MetaInfo }) => setChannels(res.data.channels))
      .catch(() => setChannels([]));
  }, []);

  // 채널 id → 분류 매핑
  const channelCategory = useMemo(() => {
    const m: Record<string, ChannelCategory> = {};
    for (const c of channels) m[c.id] = c.category;
    return m;
  }, [channels]);

  // 선택 요일 + 정렬에 맞춰 편성표 로드
  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getTvSchedule(day, undefined, sortMode)
      .then((res) => {
        setPrograms(res.data);
        setFetchedAt(res.fetchedAt ?? '');
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [day, sortMode]);

  // 분류 필터를 통과하는 채널 목록 (시간순 그리드용)
  const visibleChannels = useMemo(
    () => channels.filter((c) => category === 'all' || c.category === category),
    [channels, category],
  );

  // 공통 필터: 재방송 숨김 + 분류
  const passesFilters = (p: Program) =>
    !(hideReruns && p.isRerun) &&
    (category === 'all' || channelCategory[p.channelId] === category);

  // 시간순: 채널별 프로그램 묶기
  const programsByChannel = useMemo(() => {
    const map = new Map<string, Program[]>();
    for (const p of programs) {
      if (hideReruns && p.isRerun) continue;
      const list = map.get(p.channelId) ?? [];
      list.push(p);
      map.set(p.channelId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs, hideReruns]);

  // 인기순: 매칭된 프로그램을 중복 제거(같은 TMDB 콘텐츠는 1개)
  const rankedList = useMemo(() => {
    const seen = new Set<string>();
    const out: Program[] = [];
    for (const p of programs) {
      if (!passesFilters(p)) continue;
      const key = p.tmdbId ?? p.title;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out.slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs, hideReruns, category, channelCategory]);

  // 숨겨진 재방송 개수 (안내용)
  const rerunCount = useMemo(() => programs.filter((p) => p.isRerun).length, [programs]);

  const isToday = day === todayKey;
  const isAiring = (p: Program) =>
    isToday && p.startTime <= now && (!p.endTime || now < p.endTime);

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  return (
    <View style={styles.root}>
      {/* 요일 탭 (가로 스크롤) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayTabs}
        contentContainerStyle={styles.dayTabsContent}
      >
        {DAYS.map((d) => {
          const selected = day === d;
          return (
            <Pressable
              key={d}
              onPress={() => setDay(d)}
              style={[styles.dayTab, selected ? styles.dayTabActive : styles.dayTabInactive]}
            >
              <Text style={selected ? styles.dayTabTextActive : styles.dayTabText}>
                {DAY_LABELS_KO[d]}
                {d === todayKey ? (
                  <Text style={selected ? styles.dayTabTodayActive : styles.dayTabToday}>
                    {' '}
                    오늘
                  </Text>
                ) : null}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 정렬(시간순/인기순) 세그먼트 + 분류 필터 + 재방송 토글 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.controls}
        contentContainerStyle={styles.controlsContent}
      >
        {/* 정렬 세그먼트 */}
        <View style={styles.segment}>
          {SORT_MODES.map((s) => {
            const selected = sortMode === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSortMode(s.key)}
                style={[styles.segmentItem, selected && styles.segmentItemActive]}
              >
                <Text style={selected ? styles.segmentTextActive : styles.segmentText}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* 분류 필터 */}
        {CATEGORY_FILTERS.map((f) => {
          const selected = category === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setCategory(f.key)}
              style={[styles.chip, selected ? styles.chipActive : styles.chipInactive]}
            >
              <Text style={selected ? styles.chipTextActive : styles.chipText}>{f.label}</Text>
            </Pressable>
          );
        })}

        <View style={styles.divider} />

        {/* 재방송 숨김 토글 */}
        <Pressable
          onPress={() => setHideReruns((v) => !v)}
          style={[styles.chip, hideReruns ? styles.chipRerunActive : styles.chipInactive]}
        >
          <Text style={hideReruns ? styles.chipTextActive : styles.chipText}>
            {hideReruns ? '✓ ' : ''}재방송 숨김
            {hideReruns && rerunCount > 0 ? ` (${rerunCount})` : ''}
          </Text>
        </Pressable>
      </ScrollView>

      {/* 본문: 에러 / 로딩 / 인기순 / 시간순 */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>편성표를 불러오지 못했습니다.</Text>
          <Text style={styles.errorMsg}>{error}</Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.textDim} />
          <Text style={styles.loadingText}>
            {sortMode === 'popular' ? 'TMDB로 인기 프로그램 매칭 중…' : '편성표 불러오는 중…'}
          </Text>
        </View>
      ) : sortMode === 'popular' ? (
        /* ===== 인기순 순위 리스트 ===== */
        <RankedList
          list={rankedList}
          channelName={channelName}
          isAiring={isAiring}
          footer={<FetchedAtNote fetchedAt={fetchedAt} sortMode={sortMode} />}
        />
      ) : (
        /* ===== 시간순 채널 컬럼 타임라인 (가로 스크롤) ===== */
        <ScrollView style={styles.timelineScroll} contentContainerStyle={styles.timelineContent}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.columns}
          >
            {visibleChannels.map((ch) => {
              const list = programsByChannel.get(ch.id) ?? [];
              return (
                <View key={ch.id} style={styles.column}>
                  {/* 채널명 헤더 */}
                  <View style={styles.columnHeader}>
                    <Text style={styles.columnHeaderName}>{ch.name}</Text>
                    <Text style={styles.columnHeaderCount}>{list.length}</Text>
                  </View>
                  {/* 세로 프로그램 리스트 */}
                  {list.length === 0 ? (
                    <Text style={styles.emptyRow}>편성 정보 없음</Text>
                  ) : (
                    list.map((p) => {
                      const airing = isAiring(p);
                      return (
                        <View
                          key={p.id}
                          style={[styles.programRow, airing && styles.programRowAiring]}
                        >
                          <View style={styles.programTop}>
                            <Text style={styles.programTime}>{p.startTime}</Text>
                            {airing ? (
                              <View style={styles.airingBadge}>
                                <View style={styles.airingDot} />
                                <Text style={styles.airingText}>방영중</Text>
                              </View>
                            ) : p.isLive ? (
                              <Text style={styles.liveText}>생방송</Text>
                            ) : null}
                            <View style={styles.favSpacer}>
                              <FavoriteButton
                                size="sm"
                                item={{
                                  key: `tv:${ch.id}:${p.title}`,
                                  kind: 'tv',
                                  title: p.title,
                                  channelId: ch.id,
                                  channelName: ch.name,
                                  tmdbId: p.tmdbId,
                                }}
                              />
                            </View>
                          </View>
                          <Text style={styles.programTitle}>
                            {p.title}
                            {p.episode ? (
                              <Text style={styles.programEpisode}> {p.episode}</Text>
                            ) : null}
                          </Text>
                          <View style={styles.tagRow}>
                            {p.rating && p.rating !== 'all' ? (
                              <View style={styles.tag}>
                                <Text style={styles.tagText}>{p.rating}세</Text>
                              </View>
                            ) : null}
                            {p.isRerun ? (
                              <View style={styles.tag}>
                                <Text style={styles.tagTextFaint}>재방송</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              );
            })}
          </ScrollView>
          <FetchedAtNote fetchedAt={fetchedAt} sortMode={sortMode} />
        </ScrollView>
      )}
    </View>
  );
}

/** 인기순 순위 리스트 (세로 FlatList) */
function RankedList({
  list,
  channelName,
  isAiring,
  footer,
}: {
  list: Program[];
  channelName: (id: string) => string;
  isAiring: (p: Program) => boolean;
  footer?: React.ReactElement | null;
}) {
  if (list.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.emptyRankText}>
          매칭된 인기 프로그램이 없습니다.{'\n'}
          (뉴스·생활정보 등은 TMDB에 없어 인기순에서 제외됩니다)
        </Text>
        {footer}
      </View>
    );
  }
  return (
    <FlatList
      data={list}
      keyExtractor={(p) => p.id}
      style={styles.rankList}
      contentContainerStyle={styles.rankListContent}
      ListFooterComponent={footer}
      ItemSeparatorComponent={() => <View style={styles.rankSeparator} />}
      renderItem={({ item: p, index: i }) => {
        const airing = isAiring(p);
        return (
          <View style={[styles.rankRow, airing && styles.rankRowAiring]}>
            <Text style={styles.rankNum}>{i + 1}</Text>
            <View style={styles.rankMain}>
              <Text style={styles.rankTitle} numberOfLines={1}>
                {p.title}
              </Text>
              <View style={styles.rankMeta}>
                <Text style={styles.rankChannel}>{channelName(p.channelId)}</Text>
                <Text style={styles.rankTime}>{p.startTime}</Text>
                {airing ? <Text style={styles.rankAiring}>방영중</Text> : null}
                {p.isRerun ? <Text style={styles.rankRerun}>재방송</Text> : null}
              </View>
            </View>
            {typeof p.tmdbRating === 'number' && p.tmdbRating > 0 ? (
              <Text style={styles.rankRating}>★ {p.tmdbRating.toFixed(1)}</Text>
            ) : null}
            <FavoriteButton
              size="sm"
              item={{
                key: `tv:${p.channelId}:${p.title}`,
                kind: 'tv',
                title: p.title,
                channelId: p.channelId,
                channelName: channelName(p.channelId),
                tmdbId: p.tmdbId,
              }}
            />
          </View>
        );
      }}
    />
  );
}

/** 편성표 기준 시각/출처 안내 */
function FetchedAtNote({ fetchedAt, sortMode }: { fetchedAt: string; sortMode: SortMode }) {
  if (!fetchedAt) return null;
  return (
    <Text style={styles.fetchedAt}>
      편성표 기준: {new Date(fetchedAt).toLocaleString('ko-KR')} · 출처: 네이버 편성표
      {sortMode === 'popular' ? ' · 인기/평점: TMDB' : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // 요일 탭
  dayTabs: { flexGrow: 0 },
  dayTabsContent: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  dayTab: {
    minWidth: 48,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  dayTabActive: { backgroundColor: colors.accent },
  dayTabInactive: { backgroundColor: colors.surfaceAlt },
  dayTabText: { fontSize: 14, fontWeight: '500', color: colors.textDim },
  dayTabTextActive: { fontSize: 14, fontWeight: '500', color: colors.accentText },
  dayTabToday: { fontSize: 11, color: colors.textFaint },
  dayTabTodayActive: { fontSize: 11, color: colors.accentText, opacity: 0.6 },

  // 컨트롤 바 (정렬/필터/토글)
  controls: { flexGrow: 0 },
  controlsContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(39,39,42,0.5)',
    borderRadius: radius.md,
    padding: 2,
  },
  segmentItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { fontSize: 12, fontWeight: '500', color: colors.textDim },
  segmentTextActive: { fontSize: 12, fontWeight: '500', color: colors.accentText },

  divider: { width: 1, height: 16, backgroundColor: colors.border, marginHorizontal: spacing.xs },

  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  chipActive: { backgroundColor: colors.indigo },
  chipInactive: { backgroundColor: colors.surfaceAlt },
  chipRerunActive: { backgroundColor: colors.emerald },
  chipText: { fontSize: 12, fontWeight: '500', color: colors.textDim },
  chipTextActive: { fontSize: 12, fontWeight: '500', color: '#ffffff' },

  // 에러
  errorBox: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(127,29,29,0.5)',
    backgroundColor: 'rgba(69,10,10,0.3)',
  },
  errorTitle: { color: '#fca5a5', fontWeight: '600', fontSize: 14 },
  errorMsg: { color: 'rgba(248,113,113,0.8)', fontSize: 13, marginTop: 4 },

  // 로딩 / 빈 상태
  loadingBox: { paddingVertical: 40, alignItems: 'center', gap: spacing.md },
  loadingText: { color: colors.textFaint, fontSize: 13 },
  emptyRankText: { color: colors.textFaint, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // 시간순 타임라인
  timelineScroll: { flex: 1 },
  timelineContent: { paddingBottom: spacing.lg },
  columns: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },
  column: {
    width: 176,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(24,24,27,0.4)',
    overflow: 'hidden',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(24,24,27,0.9)',
  },
  columnHeaderName: { fontSize: 14, fontWeight: '600', color: colors.text },
  columnHeaderCount: { fontSize: 12, color: colors.textFaint },
  emptyRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    fontSize: 12,
    color: colors.textFaint,
  },

  programRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(39,39,42,0.6)',
  },
  programRowAiring: { backgroundColor: 'rgba(239,68,68,0.1)' },
  programTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  programTime: { fontSize: 12, color: colors.textDim, fontVariant: ['tabular-nums'] },
  airingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  airingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red },
  airingText: { fontSize: 10, fontWeight: '500', color: '#fca5a5' },
  liveText: { fontSize: 10, color: '#fb7185' },
  favSpacer: { marginLeft: 'auto' },

  programTitle: { fontSize: 14, lineHeight: 18, color: colors.text, marginTop: 2 },
  programEpisode: { fontSize: 12, color: colors.textFaint },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: { backgroundColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 4, paddingVertical: 1 },
  tagText: { fontSize: 10, color: colors.textDim },
  tagTextFaint: { fontSize: 10, color: colors.textFaint },

  // 인기순 순위 리스트
  rankList: { flex: 1 },
  rankListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  rankSeparator: { height: 1, backgroundColor: 'rgba(39,39,42,0.6)' },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rankRowAiring: { backgroundColor: 'rgba(239,68,68,0.1)' },
  rankNum: { width: 24, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.textFaint },
  rankMain: { flex: 1, minWidth: 0 },
  rankTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  rankMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 2 },
  rankChannel: { fontSize: 12, color: colors.textDim },
  rankTime: { fontSize: 12, color: colors.textFaint, fontVariant: ['tabular-nums'] },
  rankAiring: { fontSize: 12, color: '#f87171' },
  rankRerun: { fontSize: 12, color: colors.textFaint },
  rankRating: { fontSize: 14, fontWeight: '500', color: colors.amber },

  // 기준 시각 안내
  fetchedAt: {
    fontSize: 12,
    color: colors.textFaint,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
});
