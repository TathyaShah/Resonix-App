import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faCompactDisc } from '@fortawesome/free-solid-svg-icons';
import useResonixTheme from '../../hooks/useResonixTheme';

const PlaylistDetail = ({ route, navigation }) => {
  const { playlist } = route.params || {};
  const palette = useResonixTheme();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: palette.surfaceMuted }]}>
        <FontAwesomeIcon icon={faArrowLeft} size={16} color={palette.text} />
      </TouchableOpacity>
      <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft }]}>
          <FontAwesomeIcon icon={faCompactDisc} size={16} color={palette.accent} />
        </View>
        <Text style={[styles.title, { color: palette.text }]}>{playlist?.name || 'Playlist'}</Text>
        <Text style={[styles.subtitle, { color: palette.subtext }]}>
          Playlist songs will appear here when playlist management is expanded.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroCard: { borderWidth: 1, borderRadius: 24, padding: 18 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 13, lineHeight: 18 },
});

export default PlaylistDetail;
