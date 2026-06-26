import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, radius, spacing } from './src/theme';
import { useFavorites } from './src/lib/favorites';
import TvScheduleScreen from './src/screens/TvScheduleScreen';
import OttScreen from './src/screens/OttScreen';
import UpcomingScreen from './src/screens/UpcomingScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SearchScreen from './src/screens/SearchScreen';

// 최상위 앱 — 상단 검색바 + 하단 탭(TV편성표/OTT/예정/즐겨찾기).
// 검색어가 있으면 어느 탭이든 검색 화면으로 전환 (웹과 동일한 흐름).

type Mode = 'tv' | 'ott' | 'upcoming' | 'fav';

const TABS: Array<{ key: Mode; label: string }> = [
  { key: 'tv', label: 'TV편성표' },
  { key: 'ott', label: 'OTT' },
  { key: 'upcoming', label: '예정' },
  { key: 'fav', label: '⭐' },
];

export default function App() {
  const [mode, setMode] = useState<Mode>('tv');
  const [query, setQuery] = useState('');
  const favorites = useFavorites();
  const searching = query.trim().length > 0;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root} edges={['top']}>
        {/* 헤더 + 검색 */}
        <View style={styles.header}>
          <Text style={styles.title}>오늘 뭐 보지 📺</Text>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="프로그램·영화·시리즈 검색"
              placeholderTextColor={colors.textFaint}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searching && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Text style={styles.clear}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 본문 */}
        <View style={styles.body}>
          {searching ? (
            <SearchScreen query={query} />
          ) : mode === 'tv' ? (
            <TvScheduleScreen />
          ) : mode === 'ott' ? (
            <OttScreen />
          ) : mode === 'upcoming' ? (
            <UpcomingScreen />
          ) : (
            <FavoritesScreen />
          )}
        </View>

        {/* 하단 탭 (검색 중이 아닐 때) */}
        {!searching && (
          <View style={styles.tabbar}>
            {TABS.map((t) => {
              const on = mode === t.key;
              return (
                <Pressable key={t.key} style={styles.tab} onPress={() => setMode(t.key)}>
                  <Text style={[styles.tabText, on && styles.tabTextOn]}>
                    {t.label}
                    {t.key === 'fav' && favorites.length > 0 ? ` ${favorites.length}` : ''}
                  </Text>
                  {on && <View style={styles.tabDot} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  searchWrap: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24,24,27,0.6)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  searchIcon: { color: colors.textFaint, marginRight: spacing.sm },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 14 },
  clear: { color: colors.textFaint, fontSize: 16, paddingHorizontal: 4 },
  body: { flex: 1 },
  tabbar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabText: { color: colors.textDim, fontSize: 13, fontWeight: '500' },
  tabTextOn: { color: colors.text },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.text },
});
