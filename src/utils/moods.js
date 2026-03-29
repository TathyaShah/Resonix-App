import AsyncStorage from '@react-native-async-storage/async-storage';

export const MOOD_OPTIONS = [
  { key: 'happy', label: 'Happy', emoji: '😊' },
  { key: 'sad', label: 'Sad', emoji: '😢' },
  { key: 'energetic', label: 'Energetic', emoji: '⚡' },
  { key: 'love', label: 'Love', emoji: '❤️' },
];

export const SONG_MOOD_STORAGE_KEY = 'songMoodAssignments';
export const PLAYLIST_MOOD_STORAGE_KEY = 'playlistMoodAssignments';

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

export const getSongMoodAssignments = async () => {
  const stored = await AsyncStorage.getItem(SONG_MOOD_STORAGE_KEY);
  return safeParse(stored);
};

export const saveSongMoodAssignments = async assignments => {
  await AsyncStorage.setItem(SONG_MOOD_STORAGE_KEY, JSON.stringify(assignments));
};

export const getPlaylistMoodAssignments = async () => {
  const stored = await AsyncStorage.getItem(PLAYLIST_MOOD_STORAGE_KEY);
  return safeParse(stored);
};

export const savePlaylistMoodAssignments = async assignments => {
  await AsyncStorage.setItem(PLAYLIST_MOOD_STORAGE_KEY, JSON.stringify(assignments));
};

export const getSongMoodKey = song => song?.url || song?.id || `${song?.title || ''}-${song?.artist || ''}`;

export const getPlaylistMoodKey = playlist =>
  playlist?.id || playlist?.name || playlist?.title || 'playlist';

export const getAssignedMoodsForSong = (assignments, song) => {
  const key = getSongMoodKey(song);
  return Array.isArray(assignments?.[key]) ? assignments[key] : [];
};

export const getAssignedMoodsForPlaylist = (assignments, playlist) => {
  const key = getPlaylistMoodKey(playlist);
  return Array.isArray(assignments?.[key]) ? assignments[key] : [];
};

export const setSongMoods = async (song, moodKeys) => {
  const assignments = await getSongMoodAssignments();
  const key = getSongMoodKey(song);
  const normalized = Array.from(new Set((moodKeys || []).filter(Boolean)));

  if (!key) {
    return normalized;
  }

  if (normalized.length) {
    assignments[key] = normalized;
  } else {
    delete assignments[key];
  }

  await saveSongMoodAssignments(assignments);
  return normalized;
};

export const setPlaylistMoods = async (playlist, moodKeys) => {
  const assignments = await getPlaylistMoodAssignments();
  const key = getPlaylistMoodKey(playlist);
  const normalized = Array.from(new Set((moodKeys || []).filter(Boolean)));

  if (!key) {
    return normalized;
  }

  if (normalized.length) {
    assignments[key] = normalized;
  } else {
    delete assignments[key];
  }

  await savePlaylistMoodAssignments(assignments);
  return normalized;
};

export const filterSongsByMood = (songs, assignments, moodKey) =>
  (songs || []).filter(song => getAssignedMoodsForSong(assignments, song).includes(moodKey));

export const getMoodMeta = moodKey =>
  MOOD_OPTIONS.find(option => option.key === moodKey) || MOOD_OPTIONS[0];
