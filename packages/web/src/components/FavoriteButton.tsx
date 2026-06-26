import type { FavoriteItem } from '@tv/shared';
import { useIsFavorite, toggleFavorite } from '../lib/favorites.js';

// 별표 토글 버튼 — OTT 카드/상세, TV 편성표 행에서 공통 사용.

interface Props {
  /** 즐겨찾기에 저장할 항목 (addedAt 은 스토어가 채움) */
  item: Omit<FavoriteItem, 'addedAt'>;
  /** 크기 변형 */
  size?: 'sm' | 'md';
  /** 추가 클래스 */
  className?: string;
}

export default function FavoriteButton({ item, size = 'md', className = '' }: Props) {
  const active = useIsFavorite(item.key);
  const dim = size === 'sm' ? 'h-6 w-6 text-sm' : 'h-8 w-8 text-base';

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      title={active ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(item);
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition ${dim} ${
        active
          ? 'bg-amber-400/20 text-amber-300'
          : 'bg-black/50 text-zinc-300 hover:bg-black/70 hover:text-amber-300'
      } ${className}`}
    >
      {active ? '★' : '☆'}
    </button>
  );
}
