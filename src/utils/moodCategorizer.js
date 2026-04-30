import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSongMoodAssignments,
  getSongMoodKey,
  saveSongMoodAssignments,
} from './moods';

export const AUTO_MOOD_CATEGORIZATION_STORAGE_KEY =
  'autoMoodCategorizationEnabled';

const ONLINE_MOOD_CACHE_STORAGE_KEY = 'onlineMoodCategorizationCache';
const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const ITUNES_REQUEST_DELAY_MS = 3100;

const GENRE_MOOD_RULES = [
  {
    mood: 'energetic',
    tokens: [
      'dance',
      'electronic',
      'edm',
      'house',
      'techno',
      'trance',
      'dubstep',
      'drum',
      'bass',
      'hip-hop',
      'hip hop',
      'rap',
      'metal',
      'punk',
      'hard rock',
      'rock',
      'reggaeton',
      'afrobeat',
      'workout',
    ],
  },
  {
    mood: 'love',
    tokens: [
      'r&b',
      'rnb',
      'soul',
      'vocal',
      'jazz',
      'easy listening',
      'singer/songwriter',
      'adult contemporary',
      'smooth',
    ],
  },
  {
    mood: 'sad',
    tokens: [
      'blues',
      'folk',
      'acoustic',
      'indie',
      'alternative',
      'classical',
      'country',
      'ambient',
      'soundtrack',
      'opera',
      'new age',
    ],
  },
  {
    mood: 'happy',
    tokens: [
      'pop',
      'disco',
      'funk',
      'reggae',
      'ska',
      'latin',
      'salsa',
      'children',
      'comedy',
      'world',
      'bollywood',
    ],
  },
];

const normalizeText = value =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getSongTitle = song => song?.title || song?.name || '';

const getSongArtist = song =>
  song?.artist && song.artist !== '<unknown>'
    ? song.artist
    : song?.author || '';

const safeParse = value => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const getCachedMood = (cache, cacheKey) => {
  const cached = cache?.[cacheKey];
  if (!cached?.mood || !cached?.createdAt) {
    return null;
  }

  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    return null;
  }

  return cached;
};

const buildLookupUrl = song => {
  const title = getSongTitle(song);
  const artist = getSongArtist(song);
  const term = [title, artist].filter(Boolean).join(' ');

  if (!term) {
    return null;
  }

  return `${ITUNES_SEARCH_URL}?term=${encodeURIComponent(
    term,
  )}&media=music&entity=song&limit=5`;
};

const scoreResult = (song, result) => {
  const localTitle = normalizeText(getSongTitle(song));
  const localArtist = normalizeText(getSongArtist(song));
  const remoteTitle = normalizeText(result?.trackName);
  const remoteArtist = normalizeText(result?.artistName);

  let score = 0;

  if (localTitle && remoteTitle === localTitle) {
    score += 6;
  } else if (
    localTitle &&
    remoteTitle &&
    (remoteTitle.includes(localTitle) || localTitle.includes(remoteTitle))
  ) {
    score += 3;
  }

  if (localArtist && remoteArtist === localArtist) {
    score += 4;
  } else if (
    localArtist &&
    remoteArtist &&
    (remoteArtist.includes(localArtist) || localArtist.includes(remoteArtist))
  ) {
    score += 2;
  }

  return score;
};

const pickBestResult = (song, results) => {
  const match = (results || [])
    .map(result => ({ result, score: scoreResult(song, result) }))
    .sort((a, b) => b.score - a.score)[0];

  return match?.score >= 3 ? match.result : null;
};

const classifyMoodFromOnlineResult = result => {
  const genre = normalizeText(result?.primaryGenreName);

  for (const rule of GENRE_MOOD_RULES) {
    if (rule.tokens.some(token => genre.includes(normalizeText(token)))) {
      return rule.mood;
    }
  }

  return genre ? 'happy' : null;
};

export const classifySongMoodOnline = async song => {
  const url = buildLookupUrl(song);

  if (!url) {
    return null;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`iTunes lookup failed with status ${response.status}`);
  }

  const data = await response.json();
  const bestResult = pickBestResult(song, data?.results);
  const mood = classifyMoodFromOnlineResult(bestResult);

  if (!mood) {
    return null;
  }

  return {
    mood,
    source: 'itunes',
    genre: bestResult?.primaryGenreName || '',
    matchedTitle: bestResult?.trackName || '',
    matchedArtist: bestResult?.artistName || '',
  };
};

export const autoCategorizeSongMoods = async (
  songs,
  { overwriteExisting = false, onProgress } = {},
) => {
  const safeSongs = Array.isArray(songs) ? songs : [];
  const assignments = await getSongMoodAssignments();
  const storedCache = await AsyncStorage.getItem(ONLINE_MOOD_CACHE_STORAGE_KEY);
  const cache = safeParse(storedCache);
  let categorizedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let index = 0; index < safeSongs.length; index += 1) {
    const song = safeSongs[index];
    const songKey = getSongMoodKey(song);

    if (!songKey) {
      skippedCount += 1;
      continue;
    }

    if (
      !overwriteExisting &&
      Array.isArray(assignments[songKey]) &&
      assignments[songKey].length
    ) {
      skippedCount += 1;
      continue;
    }

    try {
      const cached = getCachedMood(cache, songKey);
      const result = cached || (await classifySongMoodOnline(song));

      if (!cached && index < safeSongs.length - 1) {
        await wait(ITUNES_REQUEST_DELAY_MS);
      }

      if (result?.mood) {
        assignments[songKey] = [result.mood];
        cache[songKey] = {
          ...result,
          createdAt: cached?.createdAt || Date.now(),
        };
        categorizedCount += 1;
      } else {
        skippedCount += 1;
      }
    } catch (error) {
      failedCount += 1;
      console.error('Failed to auto-categorize song mood', {
        title: getSongTitle(song),
        artist: getSongArtist(song),
        error,
      });
    }

    onProgress?.({
      current: index + 1,
      total: safeSongs.length,
      categorizedCount,
      skippedCount,
      failedCount,
    });
  }

  await Promise.all([
    saveSongMoodAssignments(assignments),
    AsyncStorage.setItem(ONLINE_MOOD_CACHE_STORAGE_KEY, JSON.stringify(cache)),
  ]);

  return {
    assignments,
    categorizedCount,
    skippedCount,
    failedCount,
  };
};
