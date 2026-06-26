import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import type { OttContent } from '@tv/shared';
import { colors, radius, spacing } from '../theme';
import FavoriteButton from './FavoriteButton';

// 포스터 카드 (모바일) — 포스터 + 제목 + 평점 + OTT 배지 + 별표.
// 그리드(FlatList numColumns)에서 사용. width 는 부모가 지정.
interface Props {
  content: OttContent;
  width: number;
  onPress: (c: OttContent) => void;
}

export default function PosterCard({ content, width, onPress }: Props) {
  return (
    <Pressable style={{ width }} onPress={() => onPress(content)}>
      <View style={[styles.poster, { width, height: width * 1.5 }]}>
        {content.posterUrl ? (
          <Image source={{ uri: content.posterUrl }} style={styles.img} resizeMode="cover" />
        ) : (
          <View style={styles.noimg}>
            <Text style={styles.noimgText} numberOfLines={3}>
              {content.title}
            </Text>
          </View>
        )}
        {typeof content.voteAverage === 'number' && content.voteAverage > 0 && (
          <View style={styles.rating}>
            <Text style={styles.ratingText}>★ {content.voteAverage.toFixed(1)}</Text>
          </View>
        )}
        <View style={styles.star}>
          <FavoriteButton
            size="sm"
            item={{
              key: content.id,
              kind: 'ott',
              title: content.title,
              posterUrl: content.posterUrl,
              tmdbId: content.id,
            }}
          />
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {content.mediaType === 'tv' ? '시리즈 · ' : ''}
        {content.title}
      </Text>
      {content.providers && content.providers.length > 0 && (
        <View style={styles.badges}>
          {content.providers.slice(0, 2).map((p) => (
            <View key={`${p.id}-${p.tmdbProviderId}`} style={styles.badge}>
              <Text style={styles.badgeText}>{p.name}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  poster: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
  noimg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  noimgText: { color: colors.textFaint, fontSize: 12, textAlign: 'center' },
  rating: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: { color: colors.amber, fontSize: 11, fontWeight: '500' },
  star: { position: 'absolute', right: 6, top: 6 },
  title: { color: colors.text, fontSize: 13, fontWeight: '500', marginTop: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  badge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: { color: colors.textDim, fontSize: 10 },
});
