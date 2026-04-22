import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';
import {getSongArtworkUri} from './songArtwork';

let playerSetupPromise = null;
let optionsConfigured = false;

export const isPlayerNotInitializedError = error => {
  const message = error?.message || '';
  return (
    message.includes('The player has not been initialized') ||
    message.includes('player is not initialized')
  );
};

export const normalizeTrack = (song, index = 0) => {
  if (!song) {
    return song;
  }

  const fallbackUrl = song.path || song.uri;
  const artwork = getSongArtworkUri(song);
  const trackId =
    song.id ?? song.url ?? fallbackUrl ?? `${song.title || 'track'}-${index}`;

  return {
    ...song,
    id: typeof trackId === 'number' ? `${trackId}` : trackId,
    url: song.url || fallbackUrl,
    title: song.title || song.name || 'Unknown title',
    artist: song.artist || song.author || 'Unknown artist',
    album: song.album || 'Unknown album',
    artwork: artwork || song.artwork,
  };
};

export const normalizeTracks = songs =>
  Array.isArray(songs)
    ? songs.map((song, index) => normalizeTrack(song, index))
    : [];

export const configurePlayerOptions = async () => {
  if (optionsConfigured) {
    return;
  }

  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.PausePlayback,
    },
    progressUpdateEventInterval: 1,
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SeekTo,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
    compactCapabilities: [
      Capability.SkipToPrevious,
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
    ],
    notificationCapabilities: [
      Capability.SkipToPrevious,
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SeekTo,
    ],
  });

  optionsConfigured = true;
};

export const ensurePlayerInitialized = async () => {
  if (!playerSetupPromise) {
    playerSetupPromise = (async () => {
      try {
        await TrackPlayer.getActiveTrackIndex();
      } catch (error) {
        if (!isPlayerNotInitializedError(error)) {
          const message = error?.message || '';
          if (!message.includes('already been initialized')) {
            throw error;
          }
        } else {
          await TrackPlayer.setupPlayer();
        }
      }

      await configurePlayerOptions();
      return true;
    })().catch(error => {
      playerSetupPromise = null;
      throw error;
    });
  }

  return playerSetupPromise;
};

export const getPlaybackProgress = async () => {
  await ensurePlayerInitialized();

  try {
    const progress = await TrackPlayer.getProgress();
    return {
      position: progress?.position || 0,
      duration: progress?.duration || 0,
      buffered: progress?.buffered || 0,
    };
  } catch (error) {
    if (isPlayerNotInitializedError(error)) {
      return {position: 0, duration: 0, buffered: 0};
    }
    throw error;
  }
};

export const getTrackIndexByUrl = async url => {
  if (!url) {
    return -1;
  }

  await ensurePlayerInitialized();
  const queue = await TrackPlayer.getQueue();
  return queue.findIndex(track => track.url === url);
};
