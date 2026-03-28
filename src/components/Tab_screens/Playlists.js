import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import useResonixTheme from '../../hooks/useResonixTheme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

// simple placeholder listing playlists; favorites included
const Playlists = ({ navigation }) => {
  const palette = useResonixTheme();
  const dummy = [
    { id: 'fav', name: 'Favorites' },
    { id: '1', name: 'Workout' },
    { id: '2', name: 'Chill' },
  ];
  const openPlaylist = (item) => {
    // for now navigate to a playlist-viewing screen if implemented
    navigation.navigate('PlaylistDetail', {playlist: item});
  };
  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <FlatList
        data={dummy}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openPlaylist(item)} style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
            <FontAwesomeIcon icon={faChevronRight} size={14} color={palette.subtext} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  list: { paddingBottom: 120 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default Playlists;
