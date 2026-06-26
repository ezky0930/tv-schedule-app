import { Pressable, Text, StyleSheet } from 'react-native';
import type { FavoriteItem } from '@tv/shared';
import { useIsFavorite, toggleFavorite } from '../lib/favorites';
import { colors, radius } from '../theme';

// 별표 토글 버튼 (모바일). 웹의 FavoriteButton 과 동일 역할.
interface Props {
  item: Omit<FavoriteItem, 'addedAt'>;
  size?: 'sm' | 'md';
}

export default function FavoriteButton({ item, size = 'md' }: Props) {
  const active = useIsFavorite(item.key);
  const dim = size === 'sm' ? 26 : 32;
  const font = size === 'sm' ? 14 : 18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      hitSlop={8}
      onPress={() => toggleFavorite(item)}
      style={[
        styles.btn,
        { width: dim, height: dim, borderRadius: radius.full },
        active ? styles.active : styles.inactive,
      ]}
    >
      <Text style={{ fontSize: font, color: active ? colors.amber : colors.textDim }}>
        {active ? '★' : '☆'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: 'rgba(252,211,77,0.18)' },
  inactive: { backgroundColor: 'rgba(0,0,0,0.5)' },
});
