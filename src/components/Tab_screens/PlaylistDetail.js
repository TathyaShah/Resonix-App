import React from 'react';
import { View, Text, StyleSheet, FlatList, useColorScheme } from 'react-native';

const PlaylistDetail = ({ route }) => {
  const { playlist } = route.params || {};
  const isDark = useColorScheme() === 'dark';
  // dummy songs
  const songs = playlist && playlist.id === 'fav' ? [] : [];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}> 
      <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>{playlist?.name || 'Playlist'}</Text>
      <Text style={{ color: isDark ? '#ccc' : '#444' }}>Songs will be listed here</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
});

export default PlaylistDetail;
