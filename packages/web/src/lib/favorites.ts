// 즐겨찾기 스토어 (UI 와 분리).
//
// 저장 매체는 web=localStorage. 추후 React Native 에서는 아래 load/persist 만
// AsyncStorage 버전으로 바꾸면 나머지(훅·컴포넌트)는 그대로 재사용된다.
import { useSyncExternalStore } from 'react';
import type { FavoriteItem } from '@tv/shared';

const STORAGE_KEY = 'tv-ott:favorites:v1';

let cache: FavoriteItem[] | null = null;
const listeners = new Set<() => void>();

/** 저장소에서 1회 읽어 메모리에 캐시 (web: localStorage) */
function load(): FavoriteItem[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as FavoriteItem[];
  } catch {
    cache = [];
  }
  return cache;
}

/** 메모리 + 저장소에 반영하고 구독자에게 알림 */
function persist(next: FavoriteItem[]): void {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* 용량 초과 등은 무시 */
  }
  listeners.forEach((l) => l());
}

export function getFavorites(): FavoriteItem[] {
  return load();
}

export function isFavorite(key: string): boolean {
  return load().some((f) => f.key === key);
}

/** 있으면 제거, 없으면 추가 (최신이 앞으로) */
export function toggleFavorite(item: Omit<FavoriteItem, 'addedAt'>): void {
  const cur = load();
  if (cur.some((f) => f.key === item.key)) {
    persist(cur.filter((f) => f.key !== item.key));
  } else {
    persist([{ ...item, addedAt: new Date().toISOString() }, ...cur]);
  }
}

export function removeFavorite(key: string): void {
  persist(load().filter((f) => f.key !== key));
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** 전체 즐겨찾기 목록 구독 훅 */
export function useFavorites(): FavoriteItem[] {
  return useSyncExternalStore(subscribe, getFavorites, getFavorites);
}

/** 특정 키의 즐겨찾기 여부 구독 훅 */
export function useIsFavorite(key: string): boolean {
  const get = () => isFavorite(key);
  return useSyncExternalStore(subscribe, get, get);
}
