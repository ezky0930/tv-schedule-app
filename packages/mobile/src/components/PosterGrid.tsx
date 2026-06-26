import { FlatList, useWindowDimensions, View } from 'react-native';
import type { OttContent } from '@tv/shared';
import PosterCard from './PosterCard';
import { spacing } from '../theme';

// 포스터 그리드 (모바일) — 화면 너비에 맞춰 3열로 배치.
interface Props {
  items: OttContent[];
  onSelect: (c: OttContent) => void;
  /** 리스트 위에 붙일 헤더 (탭/정렬 컨트롤 등) */
  header?: React.ReactElement | null;
}

const NUM_COLUMNS = 3;
const GAP = spacing.md;
const PADDING = spacing.lg;

export default function PosterGrid({ items, onSelect, header }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.id}
      numColumns={NUM_COLUMNS}
      ListHeaderComponent={header}
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ padding: PADDING, gap: GAP }}
      renderItem={({ item }) => (
        <PosterCard content={item} width={cardWidth} onPress={onSelect} />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
    />
  );
}
