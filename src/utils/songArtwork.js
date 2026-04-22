const ARTWORK_KEYS = [
  'artwork',
  'cover',
  'albumArt',
  'album_art',
  'thumb',
  'thumbnail',
];

export const getSongArtworkUri = song => {
  const artworkValue = ARTWORK_KEYS.map(key => song?.[key]).find(Boolean);
  if (!artworkValue || typeof artworkValue !== 'string') {
    return null;
  }

  const trimmedArtwork = artworkValue.trim();
  if (!trimmedArtwork) {
    return null;
  }

  if (
    trimmedArtwork.startsWith('data:image/') ||
    trimmedArtwork.startsWith('file://') ||
    trimmedArtwork.startsWith('content://') ||
    trimmedArtwork.startsWith('http')
  ) {
    return trimmedArtwork;
  }

  if (
    /^[A-Za-z0-9+/=\r\n]+$/.test(trimmedArtwork) &&
    !trimmedArtwork.includes('\\')
  ) {
    return `data:image/jpeg;base64,${trimmedArtwork.replace(/\s+/g, '')}`;
  }

  if (
    trimmedArtwork.startsWith('/') ||
    trimmedArtwork.startsWith('./') ||
    trimmedArtwork.startsWith('../')
  ) {
    return `file://${trimmedArtwork}`;
  }

  return null;
};

export default getSongArtworkUri;
