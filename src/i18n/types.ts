export type SupportedLanguage = "en" | "fr";

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
  flag: string;
}

export interface CommonTranslations {
  save: string;
  cancel: string;
  close: string;
  back: string;
  retry: string;
  loading: string;
  error: string;
  success: string;
  search: string;
  delete: string;
  edit: string;
  continue: string;
  finish: string;
  yes: string;
  no: string;
  or: string;
  version: string;
  clear: string;
  ok: string;
  all: string;
}

export interface TabsTranslations {
  home: string;
  search: string;
  library: string;
  settings: string;
  downloads: string;
}

export interface OnboardingTranslations {
  languageStepBadge: string;
  languageSelectTitle: string;
  languageSelectSubtitle: string;
  skip: string;
  next: string;
  slide1Badge: string;
  slide1TitlePrefix: string;
  slide1TitleHighlight: string;
  slide1Desc: string;
  fastPill: string;
  directPlayPill: string;
  privatePill: string;
  slide2Badge: string;
  slide2TitlePrefix: string;
  slide2TitleHighlight: string;
  slide2Desc: string;
  introsTitle: string;
  introsDesc: string;
  offlineTitle: string;
  offlineDesc: string;
  slide3Badge: string;
  welcomeBack: string;
  welcomeBackUser: string;
  sessionReadyDesc: string;
  enterFinora: string;
  switchAccount: string;
  connectTitle: string;
  connectSubtitle: string;
  keepAccount: string;
  serverUrlLabel: string;
  serverUrlPlaceholder: string;
  testServer: string;
  testing: string;
  serverOnline: string;
  serverErrorFallback: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  loginAndStart: string;
  serverRequiredWarning: string;
  errorMissingServerUrl: string;
  errorMissingUsername: string;
  errorInvalidCredentials: string;
  errorCannotConnect: string;
}

export interface HomeTranslations {
  title: string;
  continueWatching: string;
  recentlyAdded: string;
  libraries: string;
  playHero: string;
  detailsHero: string;
  emptyContinueTitle: string;
  emptyContinueDesc: string;
  resumeFrom: string;
}

export interface SearchTranslations {
  placeholder: string;
  recentSearches: string;
  clearHistory: string;
  noResultsTitle: string;
  noResultsDesc: string;
  initialPrompt: string;
  moviesCategory: string;
  showsCategory: string;
  episodesCategory: string;
}

export interface LibraryTranslations {
  title: string;
  all: string;
  movies: string;
  shows: string;
  seasons: string;
  episodes: string;
  filter: string;
  sortBy: string;
  sortName: string;
  sortDate: string;
  sortRating: string;
  emptyTitle: string;
  emptyDesc: string;
  searchLibrary: string;
}

export interface DownloadsTranslations {
  title: string;
  storageUsed: string;
  noDownloadsTitle: string;
  noDownloadsDesc: string;
  browseContent: string;
  pauseAll: string;
  resumeAll: string;
  deleteAll: string;
  deleteSingleTitle: string;
  deleteSingleDesc: string;
  deleteAllTitle: string;
  deleteAllDesc: string;
  statusDownloading: string;
  statusPaused: string;
  statusCompleted: string;
  statusFailed: string;
  statusQueued: string;
  retryDownload: string;
  cancelDownload: string;
  playOffline: string;
}

export interface DetailsTranslations {
  play: string;
  resume: string;
  download: string;
  downloading: string;
  downloaded: string;
  episodes: string;
  seasons: string;
  seasonCount: string;
  cast: string;
  overview: string;
  similar: string;
  director: string;
  genres: string;
  studio: string;
  duration: string;
  releaseDate: string;
  rating: string;
  qualityModalTitle: string;
  qualityAuto: string;
  downloadEpisode: string;
  downloadSeason: string;
  downloadSeries: string;
  markWatched: string;
  markUnwatched: string;
}

export interface PlayerTranslations {
  skipIntro: string;
  skipRecap: string;
  skipOutro: string;
  nextEpisode: string;
  audioTracks: string;
  subtitleTracks: string;
  subtitleOff: string;
  subtitleStyle: string;
  playbackSpeed: string;
  quality: string;
  directPlay: string;
  directStream: string;
  transcode: string;
  auto: string;
  brightness: string;
  volume: string;
  playbackError: string;
  playbackRetry: string;
}

export interface SettingsTranslations {
  title: string;
  accountSection: string;
  switchServer: string;
  connected: string;
  notConnected: string;
  savedAccounts: string;
  activeAccount: string;
  switchAccountTo: string;
  removeAccount: string;
  preferencesSection: string;
  appLanguage: string;
  appLanguageSubtitle: string;
  selectLanguageModalTitle: string;
  playbackSpeed: string;
  playbackSpeedDesc: string;
  autoSkipIntro: string;
  autoSkipIntroDesc: string;
  hapticFeedback: string;
  hapticFeedbackDesc: string;
  preferredAudioLanguage: string;
  preferredAudioLanguageDesc: string;
  preferredSubtitleLanguage: string;
  preferredSubtitleLanguageDesc: string;
  subtitleMode: string;
  subtitleModeAlways: string;
  subtitleModeSmart: string;
  subtitleModeNone: string;
  subtitleStyle: string;
  subtitleStyleDesc: string;
  downloadsSection: string;
  wifiOnly: string;
  wifiOnlyDesc: string;
  defaultDownloadQuality: string;
  notificationsSection: string;
  notificationsEnabled: string;
  notificationsDesc: string;
  notificationsPermissionTitle: string;
  notificationsPermissionDesc: string;
  cacheSection: string;
  clearImageCache: string;
  clearImageCacheDesc: string;
  imageCacheCleared: string;
  diagnostics: string;
  diagnosticsDesc: string;
  aboutSection: string;
  appVersion: string;
  jellyfinServer: string;
  logout: string;
  logoutConfirmTitle: string;
  logoutConfirmDesc: string;
  changeServerTitle: string;
}

export interface ErrorTranslations {
  networkFailureTitle: string;
  networkFailureDesc: string;
  serverUnreachableTitle: string;
  serverUnreachableDesc: string;
  unauthorizedTitle: string;
  unauthorizedDesc: string;
  genericErrorTitle: string;
  genericErrorDesc: string;
  offlineBanner: string;
}

export interface Translations {
  common: CommonTranslations;
  tabs: TabsTranslations;
  onboarding: OnboardingTranslations;
  home: HomeTranslations;
  search: SearchTranslations;
  library: LibraryTranslations;
  downloads: DownloadsTranslations;
  details: DetailsTranslations;
  player: PlayerTranslations;
  settings: SettingsTranslations;
  errors: ErrorTranslations;
}
