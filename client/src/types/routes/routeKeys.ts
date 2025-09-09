// Этот файл сгенерирован автоматически. Не редактируйте вручную!

export type RootRouteKey =
  | 'HOME'
  | 'PROFILE'
  | 'ADMIN'
  | 'SCAMFORMS'
  | 'SCAMMERS'
  | 'NO_RIGHTS'
  | 'NOT_FOUND';

export type SubRouteKey =
  | 'ADMIN_USERS'
  | 'ADMIN_USERS_ID'
  | 'ADMIN_GARANTS'
  | 'ADMIN_ADD_PERSON'
  | 'ADMIN_CHAT_MESSAGES';

export type RouteKey = RootRouteKey | SubRouteKey;

export const rootRouteKeys = [
  "HOME",
  "PROFILE",
  "ADMIN",
  "SCAMFORMS",
  "SCAMMERS",
  "NO_RIGHTS",
  "NOT_FOUND"
] as const;

export const subRouteKeys = [
  "ADMIN_USERS",
  "ADMIN_USERS_ID",
  "ADMIN_GARANTS",
  "ADMIN_ADD_PERSON",
  "ADMIN_CHAT_MESSAGES"
] as const;
