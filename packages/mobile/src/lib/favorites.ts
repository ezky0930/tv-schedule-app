// 즐겨찾기 스토어 (모바일) — 웹의 lib/favorites.ts 와 동일한 인터페이스.
// 저장 매체만 localStorage → AsyncStorage 로 교체했다. (이게 모노레포 분리의 이점)
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FavoriteItem } from '@tv/shared';

const STORAGE_KEY = 'tv-ott:favorites:v1';

let cache: FavoriteItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** 앱 시작 시 1회 AsyncStorage 에서 불러온다 */
async function init() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
  } catch {
    cache = [];
  }
  loaded = true;
  emit();
}
void init();

function persist(next: FavoriteItem[]) {
  cache = next;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  emit();
}

export function getFavorites(): FavoriteItem[] {
  return cache;
}

export function isFavorite(key: string): boolean {
  return cache.some((f) => f.key === key);
}

export function toggleFavorite(item: Omit<FavoriteItem, 'addedAt'>): void {
  if (cache.some((f) => f.key === item.key)) {
    persist(cache.filter((f) => f.key !== item.key));
  } else {
    persist([{ ...item, addedAt: new Date().toISOString() }, ...cache]);
  }
}

export function removeFavorite(key: string): void {
  persist(cache.filter((f) => f.key !== key));
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useFavorites(): FavoriteItem[] {
  return useSyncExternalStore(subscribe, getFavorites);
}

export function useIsFavorite(key: string): boolean {
  return useSyncExternalStore(subscribe, () => isFavorite(key));
}
