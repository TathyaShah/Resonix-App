import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import useTheme from '../../hooks/useTheme';

// simple placeholder listing playlists; favorites included
const Playlists = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const isDark = isDarkMode;
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
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}> 
      <FlatList
        data={dummy}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openPlaylist(item)} style={styles.row}>
            <Text style={{ color: isDark ? '#fff' : '#000' }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#ccc' },
});

export default Playlists;
