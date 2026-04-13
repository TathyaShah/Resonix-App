import AsyncStorage from '@react-native-async-storage/async-storage';
import {MUSIXMATCH_API_KEY as STATIC_MUSIXMATCH_API_KEY} from '../config/lyricsProviders';

export const ONLINE_LYRICS_STORAGE_KEY = 'onlineLyricsEnabled';

const LYRICS_CACHE_PREFIX = 'lyricsCache:';
const EMPTY_LYRICS_PAYLOAD = {
  plainLyrics: '',
  plainLines: [],
  syncedLyrics: '',
  syncedLines: [],
  source: null,
  provider: null,
};

const MUSIXMATCH_API_KEY =
  STATIC_MUSIXMATCH_API_KEY ||
  globalThis?.process?.env?.MUSIXMATCH_API_KEY ||
  globalThis?.__RESONIX_CONFIG__?.musixmatchApiKey ||
  '';

const cleanupPatterns = [
  /\s*\((feat|ft|featuring)[^)]+\)/giu,
  /\s*\[(feat|ft|featuring)[^\]]+\]/giu,
  /\s+(feat|ft|featuring)\.?\s+.+$/giu,
  /\s*\((official|audio|video|lyric video|lyrics video|visualizer|remastered?|live|version|from[^)]*)\)/giu,
  /\s*\[(official|audio|video|lyric video|lyrics video|visualizer|remastered?|live|version|from[^\]]*)\]/giu,
  /\s*-\s*(official|audio|video|lyric video|lyrics video|visualizer|remastered?|live|version).+$/giu,
];

const INVALID_METADATA_VALUES = new Set([
  '',
  'unknown',
  'unknown artist',
  'unknown album',
  '<unknown>',
  'various artists',
  'null',
  'undefined',
]);

const normalizeWhitespace = value => value.replace(/\s+/g, ' ').trim();

const isMeaningfulMetadata = value =>
  !INVALID_METADATA_VALUES.has(cleanSegment(value).toLocaleLowerCase());

const cleanSegment = value => {
  let normalized = (value || '').toString().normalize('NFKC');
  cleanupPatterns.forEach(pattern => {
    normalized = normalized.replace(pattern, ' ');
  });

  return normalizeWhitespace(normalized.replace(/[^\p{L}\p{N}\s'&-]/gu, ' '));
};

const normalizeForCompare = value => cleanSegment(value).toLocaleLowerCase();

const getSongField = (song, keys) =>
  keys
    .map(key => song?.[key])
    .find(
      value =>
        typeof value === 'string' &&
        value.trim() &&
        isMeaningfulMetadata(value),
    ) || '';

const splitArtists = value =>
  cleanSegment(value)
    .split(/\s*(?:,|&|x|and|\/)\s*/iu)
    .map(item => item.trim())
    .filter(Boolean);

const createVariants = value => {
  const base = cleanSegment(value);
  if (!base || !isMeaningfulMetadata(base)) {
    return [];
  }

  const variants = new Set([base]);
  cleanupPatterns.forEach(pattern => {
    const stripped = normalizeWhitespace(base.replace(pattern, ' '));
    if (stripped) {
      variants.add(stripped);
    }
  });

  const hyphenless = normalizeWhitespace(base.replace(/\s*-\s*/g, ' '));
  if (hyphenless) {
    variants.add(hyphenless);
  }

  return [...variants];
};

const getArtistCandidates = value => {
  const candidates = new Set([
    ...createVariants(value),
    ...splitArtists(value).flatMap(item => createVariants(item)),
  ]);

  return [...candidates].filter(Boolean);
};

const getSongMetadata = song => {
  const title = getSongField(song, ['title', 'name']);
  const artist = getSongField(song, ['artist', 'author', 'artistName']);
  const album = getSongField(song, ['album', 'albumName']);
  const fileName =
    getSongField(song, ['filename', 'fileName', 'url'])
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.[a-z0-9]+$/iu, '') || '';

  const titleVariants = createVariants(title || fileName);
  const artistVariants = getArtistCandidates(artist);
  const albumVariants = createVariants(album);

  if (!artistVariants.length && fileName.includes('-')) {
    const [maybeArtist, ...rest] = fileName.split('-');
    const derivedArtist = createVariants(maybeArtist);
    const derivedTitle = createVariants(rest.join('-'));
    return {
      title,
      artist,
      album,
      titleVariants: titleVariants.length ? titleVariants : derivedTitle,
      artistVariants: artistVariants.length ? artistVariants : derivedArtist,
      albumVariants,
      duration: song?.duration,
    };
  }

  return {
    title,
    artist,
    album,
    titleVariants,
    artistVariants,
    albumVariants,
    duration: song?.duration,
  };
};

const getLyricsLookupKey = song => {
  const metadata = getSongMetadata(song);
  return [metadata.artistVariants[0], metadata.titleVariants[0]]
    .filter(Boolean)
    .join('::')
    .toLocaleLowerCase();
};

const getLyricsCacheKey = song =>
  `${LYRICS_CACHE_PREFIX}${getLyricsLookupKey(song)}`;

const sanitizeDuration = duration => {
  if (!duration || Number.isNaN(Number(duration))) {
    return null;
  }

  const numericDuration = Number(duration);
  if (numericDuration <= 0) {
    return null;
  }

  return numericDuration > 1000
    ? Math.max(1, Math.round(numericDuration / 1000))
    : Math.round(numericDuration);
};

const parseTimestampToMs = value => {
  const match = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]$/.exec(value);
  if (!match) {
    return null;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = (match[3] || '0').padEnd(3, '0').slice(0, 3);
  return minutes * 60 * 1000 + seconds * 1000 + Number(fraction);
};

const parsePlainLyrics = lyrics =>
  (lyrics || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

const parseSyncedLyrics = lyrics =>
  (lyrics || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const timeTag = line.match(/^\[[^\]]+\]/)?.[0];
      const text = line.replace(/^\[[^\]]+\]\s*/, '').trim();
      const startTimeMs = timeTag ? parseTimestampToMs(timeTag) : null;

      if (startTimeMs === null || !text) {
        return null;
      }

      return {startTimeMs, text};
    })
    .filter(Boolean);

const buildLyricsPayload = item => {
  const plainLyrics =
    typeof item?.plainLyrics === 'string' ? item.plainLyrics.trim() : '';
  const syncedLyrics =
    typeof item?.syncedLyrics === 'string' ? item.syncedLyrics.trim() : '';

  return {
    plainLyrics,
    plainLines: parsePlainLyrics(plainLyrics),
    syncedLyrics,
    syncedLines: parseSyncedLyrics(syncedLyrics),
  };
};

const buildMusixmatchPayload = item => {
  const plainLyrics =
    typeof item?.lyrics_body === 'string'
      ? item.lyrics_body
          .replace(/\*+\s*This Lyrics is NOT for Commercial use.*$/isu, '')
          .trim()
      : '';

  if (!plainLyrics) {
    return null;
  }

  return {
    plainLyrics,
    plainLines: parsePlainLyrics(plainLyrics),
    syncedLyrics: '',
    syncedLines: [],
  };
};

const fetchJson = async url => {
  const controller =
    typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), 10000)
    : null;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const scoreCandidate = (metadata, item) => {
  if (!item) {
    return -1;
  }

  const expectedTitle = normalizeForCompare(metadata.titleVariants[0]);
  const expectedArtist = normalizeForCompare(metadata.artistVariants[0]);
  const expectedAlbum = normalizeForCompare(metadata.albumVariants[0]);
  const expectedDuration = sanitizeDuration(metadata.duration);

  const candidateTitle = normalizeForCompare(
    item.trackName || item.name || item.track_name,
  );
  const candidateArtist = normalizeForCompare(
    item.artistName || item.artist_name,
  );
  const candidateAlbum = normalizeForCompare(item.albumName || item.album_name);

  let score = 0;

  if (candidateTitle === expectedTitle) score += 6;
  else if (
    (candidateTitle &&
      expectedTitle &&
      candidateTitle.includes(expectedTitle)) ||
    (candidateTitle && expectedTitle && expectedTitle.includes(candidateTitle))
  ) {
    score += 3;
  }

  if (candidateArtist === expectedArtist) score += 6;
  else if (
    (candidateArtist &&
      expectedArtist &&
      candidateArtist.includes(expectedArtist)) ||
    (candidateArtist &&
      expectedArtist &&
      expectedArtist.includes(candidateArtist))
  ) {
    score += 3;
  }

  if (expectedAlbum && candidateAlbum === expectedAlbum) score += 2;

  if (expectedDuration && item.duration) {
    const delta = Math.abs(Number(item.duration) - expectedDuration);
    if (delta <= 2) score += 4;
    else if (delta <= 5) score += 2;
    else if (delta <= 10) score += 1;
  }

  if (item.syncedLyrics || item.subtitle_body) score += 3;
  else if (item.plainLyrics || item.lyrics_body) score += 1;

  return score;
};

const fetchFromLyricsOvh = async metadata => {
  const artistCandidates = metadata.artistVariants.length
    ? metadata.artistVariants
    : getArtistCandidates(metadata.artist);
  const titleCandidates = metadata.titleVariants;

  for (const artist of artistCandidates) {
    for (const title of titleCandidates) {
      if (!artist || !title) {
        continue;
      }

      try {
        const data = await fetchJson(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(
            artist,
          )}/${encodeURIComponent(title)}`,
        );

        const plainLyrics =
          typeof data?.lyrics === 'string' ? data.lyrics.trim() : '';
        if (plainLyrics) {
          return {
            plainLyrics,
            plainLines: parsePlainLyrics(plainLyrics),
            syncedLyrics: '',
            syncedLines: [],
            provider: 'lyrics.ovh',
          };
        }
      } catch (error) {
        // Keep trying alternate variants before giving up on the provider.
      }
    }
  }

  return null;
};

const fetchFromLrcLib = async metadata => {
  const duration = sanitizeDuration(metadata.duration);
  const titleCandidates = metadata.titleVariants.length
    ? metadata.titleVariants
    : [metadata.title];
  const artistCandidates = metadata.artistVariants.length
    ? metadata.artistVariants
    : getArtistCandidates(metadata.artist);
  const albumCandidate = metadata.albumVariants[0];

  for (const title of titleCandidates) {
    for (const artist of artistCandidates) {
      if (!title || !artist) {
        continue;
      }

      const exactQuery = [
        `track_name=${encodeURIComponent(title)}`,
        `artist_name=${encodeURIComponent(artist)}`,
        albumCandidate
          ? `album_name=${encodeURIComponent(albumCandidate)}`
          : null,
        duration ? `duration=${duration}` : null,
      ]
        .filter(Boolean)
        .join('&');

      try {
        const exactData = await fetchJson(
          `https://lrclib.net/api/get?${exactQuery}`,
        );
        const exactPayload = buildLyricsPayload(exactData);
        if (exactPayload.syncedLines.length || exactPayload.plainLines.length) {
          return {...exactPayload, provider: 'lrclib'};
        }
      } catch (error) {
        // Fall through to broader search.
      }

      try {
        const searchQuery = [
          `track_name=${encodeURIComponent(title)}`,
          `artist_name=${encodeURIComponent(artist)}`,
          albumCandidate
            ? `album_name=${encodeURIComponent(albumCandidate)}`
            : null,
        ]
          .filter(Boolean)
          .join('&');

        const data = await fetchJson(
          `https://lrclib.net/api/search?${searchQuery}`,
        );
        if (!Array.isArray(data) || !data.length) {
          continue;
        }

        const match = [...data].sort(
          (left, right) =>
            scoreCandidate(metadata, right) - scoreCandidate(metadata, left),
        )[0];

        const payload = buildLyricsPayload(match);
        if (payload.syncedLines.length || payload.plainLines.length) {
          return {...payload, provider: 'lrclib'};
        }
      } catch (error) {
        // Keep trying other title/artist variants.
      }
    }

    try {
      const titleOnlyQuery = [`track_name=${encodeURIComponent(title)}`]
        .filter(Boolean)
        .join('&');

      const data = await fetchJson(
        `https://lrclib.net/api/search?${titleOnlyQuery}`,
      );
      if (!Array.isArray(data) || !data.length) {
        continue;
      }

      const match = [...data].sort(
        (left, right) =>
          scoreCandidate(metadata, right) - scoreCandidate(metadata, left),
      )[0];

      const payload = buildLyricsPayload(match);
      if (payload.syncedLines.length || payload.plainLines.length) {
        return {...payload, provider: 'lrclib'};
      }
    } catch (error) {
      // Final fallback for tracks with unusable artist metadata.
    }
  }

  return null;
};

const fetchFromMusixmatch = async metadata => {
  if (!MUSIXMATCH_API_KEY) {
    return null;
  }

  const titleCandidates = metadata.titleVariants.length
    ? metadata.titleVariants
    : [metadata.title];
  const artistCandidates = metadata.artistVariants.length
    ? metadata.artistVariants
    : getArtistCandidates(metadata.artist);

  for (const title of titleCandidates) {
    for (const artist of artistCandidates) {
      if (!title || !artist) {
        continue;
      }

      const url = `https://api.musixmatch.com/ws/1.1/matcher.lyrics.get?apikey=${encodeURIComponent(
        MUSIXMATCH_API_KEY,
      )}&q_track=${encodeURIComponent(title)}&q_artist=${encodeURIComponent(
        artist,
      )}`;

      try {
        const data = await fetchJson(url);
        const statusCode = data?.message?.header?.status_code;
        if (statusCode !== 200) {
          continue;
        }

        const lyrics = data?.message?.body?.lyrics;
        const payload = buildMusixmatchPayload(lyrics);
        if (payload?.plainLines?.length) {
          return {...payload, provider: 'musixmatch'};
        }
      } catch (error) {
        // Continue to the next variant or provider.
      }
    }
  }

  return null;
};

export const clearLyricsCacheForSong = async song => {
  const cacheKey = getLyricsCacheKey(song);
  if (cacheKey !== LYRICS_CACHE_PREFIX) {
    await AsyncStorage.removeItem(cacheKey);
  }
};

export const fetchLyricsForSong = async song => {
  const lookupKey = getLyricsLookupKey(song);
  if (!lookupKey) {
    return EMPTY_LYRICS_PAYLOAD;
  }

  const cacheKey = getLyricsCacheKey(song);
  const cachedLyrics = await AsyncStorage.getItem(cacheKey);
  if (cachedLyrics) {
    try {
      return {...JSON.parse(cachedLyrics), source: 'cache'};
    } catch (error) {
      await AsyncStorage.removeItem(cacheKey);
    }
  }

  const metadata = getSongMetadata(song);
  const providers = [fetchFromMusixmatch, fetchFromLrcLib, fetchFromLyricsOvh];

  for (const provider of providers) {
    try {
      const payload = await provider(metadata);
      if (
        payload &&
        (payload.syncedLines?.length || payload.plainLines?.length)
      ) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
        return {...payload, source: 'remote'};
      }
    } catch (error) {
      // Fall through to the next provider when a service is unavailable.
    }
  }

  return EMPTY_LYRICS_PAYLOAD;
};
