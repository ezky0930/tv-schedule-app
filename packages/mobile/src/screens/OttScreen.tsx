import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { OttContent, OttProviderId } from '@tv/shared';
import { api, type MetaInfo } from '../lib/api';
import PosterGrid from '../components/PosterGrid';
import ContentDetailModal from '../components/ContentDetailModal';
import { colors, spacing, radius } from '../theme';

// OTT 콘텐츠 화면 (모바일): 탭(전체 인기 / OTT별) → 포스터 그리드 → 상세 모달.
// 정렬: 인기순 / 최신순 전환 가능.
// 웹의 OttView.tsx 포팅. 단, 웹의 '공개 예정' 탭은 모바일에선 별도 화면이라 여기서 제외한다.

/** 탭 키: 전체 인기 또는 OTT 제공처 id */
type TabKey = 'trending' | OttProviderId;
interface Tab {
  key: TabKey;
  label: string;
}
/** 정렬 모드 */
type SortMode = 'popular' | 'new';

const SORT_OPTIONS: Array<{ key: SortMode; label: string }> = [
  { key: 'popular', label: '인기순' },
  { key: 'new', label: '최신순' },
];

export default function OttScreen() {
  const [tabs, setTabs] = useState<Tab[]>([{ key: 'trending', label: '전체 인기' }]);
  const [activeTab, setActiveTab] = useState<TabKey>('trending');
  const [sort, setSort] = useState<SortMode>('popular');
  const [items, setItems] = useState<OttContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<OttContent | null>(null);

  // 메타에서 OTT 탭 목록을 구성한다. (공개 예정 탭은 제외)
  useEffect(() => {
    api
      .getMeta()
      .then((res: { data: MetaInfo }) => {
        const ottTabs: Tab[] = res.data.ott.map((o) => ({ key: o.id, label: o.name }));
        setTabs([{ key: 'trending', label: '전체 인기' }, ...ottTabs]);
      })
      .catch(() => {
        // 메타 로드 실패 시 '전체 인기'만 노출
        setTabs([{ key: 'trending', label: '전체 인기' }]);
      });
  }, []);

  // 선택된 탭의 콘텐츠를 불러온다.
  const loadTab = useCallback((tab: TabKey) => {
    setLoading(true);
    setError('');
    const req = tab === 'trending' ? api.getOttTrending() : api.getOttTrending(tab);
    req
      .then((res) => setItems(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  // 정렬 적용: 인기순(popularity 내림차순) / 최신순(공개일 내림차순, 날짜 없는 항목은 뒤로)
  const sortedItems = useMemo(() => {
    const arr = [...items];
    if (sort === 'popular') {
      arr.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    } else {
      arr.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
    }
    return arr;
  }, [items, sort]);

  // 그리드 위에 함께 스크롤되는 헤더(탭 + 정렬 컨트롤)
  const header = (
    <View style={styles.header}>
      {/* OTT 탭: 가로 스크롤 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {tabs.map((t) => {
          const active = activeTab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[styles.tab, active ? styles.tabActive : styles.tabInactive]}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 정렬: 인기순 / 최신순 세그먼트 */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>정렬</Text>
        <View style={styles.segment}>
          {SORT_OPTIONS.map((s) => {
            const active = sort === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSort(s.key)}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
              >
                <Text
                  style={[styles.segmentText, active ? styles.segmentTextActive : styles.segmentTextInactive]}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  // 로딩 / 에러 / 정상 상태 분기
  let body: React.ReactElement;
  if (loading) {
    body = (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={colors.text} style={{ marginTop: spacing.xl }} />
      </View>
    );
  } else if (error) {
    body = (
      <ScrollView contentContainerStyle={styles.errorScroll}>
        {header}
        <ErrorBox message={error} onRetry={() => loadTab(activeTab)} />
      </ScrollView>
    );
  } else {
    body = <PosterGrid items={sortedItems} onSelect={setSelected} header={header} />;
  }

  return (
    <View style={styles.container}>
      {body}

      {/* 카드 선택 시 상세 모달 */}
      {selected && <ContentDetailModal initial={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

/** 에러 박스 + 다시 시도 버튼 */
function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorTitle}>불러오지 못했습니다.</Text>
      <Text style={styles.errorMsg}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.retryBtn}>
        <Text style={styles.retryText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1 },

  // 헤더(탭+정렬)
  header: { paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  tabRow: { gap: spacing.sm, paddingRight: spacing.lg },
  tab: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  tabActive: { backgroundColor: colors.accent },
  tabInactive: { backgroundColor: colors.surfaceAlt },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: colors.accentText },
  tabTextInactive: { color: colors.textDim },

  // 정렬 세그먼트
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sortLabel: { fontSize: 12, color: colors.textFaint },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 2,
  },
  segmentItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { fontSize: 12, fontWeight: '500' },
  segmentTextActive: { color: colors.accentText },
  segmentTextInactive: { color: colors.textDim },

  // 에러
  errorScroll: { padding: spacing.lg },
  errorBox: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(127,29,29,0.5)',
    backgroundColor: 'rgba(69,10,10,0.3)',
    padding: spacing.lg,
  },
  errorTitle: { color: '#fca5a5', fontWeight: '600', fontSize: 15 },
  errorMsg: { color: 'rgba(248,113,113,0.8)', fontSize: 13, marginTop: spacing.xs },
  retryBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    backgroundColor: 'rgba(127,29,29,0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  retryText: { color: colors.text, fontSize: 13 },
});
