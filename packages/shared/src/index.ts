// @tv/shared 공개 진입점.
// 웹앱·백엔드(추후 iOS 앱)는 모두 여기서 타입과 상수를 가져다 쓴다.
//   import { Program, OTT_PROVIDERS } from '@tv/shared';

// 타입
export type {
  DayOfWeek,
  MediaType,
  ApiResponse,
  ApiError,
} from './types/common.js';
export type { Channel, ChannelCategory } from './types/channel.js';
export type { Program, ChannelSchedule } from './types/program.js';
export type {
  OttContent,
  OttProviderId,
  WatchProvider,
  WatchMonetizationType,
  CastMember,
} from './types/ott.js';
export type { SearchResult, SearchResultType } from './types/search.js';
export type { FavoriteItem, FavoriteKind } from './types/favorite.js';

// 상수 / 헬퍼
export { CHANNELS, CHANNEL_BY_ID, CHANNEL_BY_NAME } from './constants/channels.js';
export {
  OTT_PROVIDERS,
  OTT_BY_ID,
  OTT_BY_TMDB_ID,
  TMDB_DEFAULTS,
} from './constants/ottProviders.js';
export {
  DAYS,
  DAY_LABELS_KO,
  dayOfWeekFromDate,
} from './constants/days.js';
