import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const ARTWORK_KEYS = ['artwork', 'cover', 'albumArt', 'album_art', 'thumb', 'thumbnail'];

const FALLBACK_PALETTE = [
  { background: '#F8BBD0', text: '#8E245A' },
  { background: '#F5C6AA', text: '#8A4A22' },
  { background: '#FFE39F', text: '#8B6400' },
  { background: '#D7CCC8', text: '#6D4C41' },
  { background: '#C5E1A5', text: '#557A1F' },
  { background: '#B2DFDB', text: '#00695C' },
  { background: '#B3E5FC', text: '#0277BD' },
  { background: '#C5CAE9', text: '#3949AB' },
  { background: '#D1C4E9', text: '#5E35B1' },
  { background: '#E1BEE7', text: '#8E24AA' },
  { background: '#CFD8DC', text: '#455A64' },
  { background: '#FFCDD2', text: '#C62828' },
];

const hashString = value => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const getFallbackColors = seed => {
  const base = hashString(seed || 'resonix');
  return FALLBACK_PALETTE[base % FALLBACK_PALETTE.length];
};

const getInitials = song => {
  const source = song?.title || song?.artist || song?.album || 'R';
  return source
    .replace(/[^A-Za-z\s]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
};

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
  // `react-native-get-music-files` may provide raw base64 artwork in `cover`.
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(trimmedArtwork) && !trimmedArtwork.includes('\\')) {
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

const SongThumbnail = ({
  song,
  size = 42,
  width,
  height,
  radius = 14,
  textSize = 16,
  style,
}) => {
  const artworkUri = getSongArtworkUri(song);
  const [imageFailed, setImageFailed] = useState(false);
  const initials = useMemo(() => getInitials(song), [song]);
  const resolvedWidth = width ?? size;
  const resolvedHeight = height ?? size;
  const fallbackColors = useMemo(
    () =>
      getFallbackColors(
        `${song?.title || ''}${song?.artist || ''}${song?.album || ''}${song?.url || ''}`,
      ),
    [song],
  );

  useEffect(() => {
    setImageFailed(false);
  }, [artworkUri]);

  const wrapperStyle = [
    styles.thumb,
    {
      width: resolvedWidth,
      height: resolvedHeight,
      borderRadius: radius,
    },
    style,
  ];

  if (artworkUri && !imageFailed) {
    return (
      <View style={wrapperStyle}>
        <Image
          source={{ uri: artworkUri }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={[wrapperStyle, { backgroundColor: fallbackColors.background }]}>
      <Text style={[styles.initials, { fontSize: textSize, color: fallbackColors.text }]}>
        {initials || 'R'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  thumb: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default SongThumbnail;
