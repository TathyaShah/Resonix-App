import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ToastAndroid } from 'react-native';
import useResonixTheme from '../../hooks/useResonixTheme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import MoodAssignmentModal from '../MoodAssignmentModal';
import {
  getAssignedMoodsForPlaylist,
  getPlaylistMoodAssignments,
  setPlaylistMoods,
} from '../../utils/moods';

const PLAYLIST_ITEMS = [
  { id: 'fav', name: 'Favorites' },
  { id: '1', name: 'Workout' },
  { id: '2', name: 'Chill' },
];

const Playlists = ({ navigation }) => {
  const palette = useResonixTheme();
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [moodModalVisible, setMoodModalVisible] = useState(false);

  const openPlaylist = item => {
    navigation.navigate('PlaylistDetail', { playlist: item });
  };

  const openMoodAssignment = async playlist => {
    try {
      const assignments = await getPlaylistMoodAssignments();
      setSelectedPlaylist(playlist);
      setSelectedMoods(getAssignedMoodsForPlaylist(assignments, playlist));
      setMoodModalVisible(true);
    } catch (error) {
      console.error('Failed to open playlist mood assignment', error);
    }
  };

  const saveMoodAssignment = async moodKeys => {
    try {
      await setPlaylistMoods(selectedPlaylist, moodKeys);
      setSelectedMoods(moodKeys);
      setMoodModalVisible(false);
      ToastAndroid.show('Playlist mood updated.', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Failed to save playlist mood assignment', error);
      ToastAndroid.show('Unable to update playlist moods.', ToastAndroid.SHORT);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <FlatList
        data={PLAYLIST_ITEMS}
        contentContainerStyle={styles.list}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <TouchableOpacity onPress={() => openPlaylist(item)} style={styles.rowLeft} activeOpacity={0.88}>
              <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
            </TouchableOpacity>
            <View style={styles.rowActions}>
              <TouchableOpacity onPress={() => openMoodAssignment(item)} style={styles.iconButton}>
                <FontAwesomeIcon icon={faEllipsisVertical} size={14} color={palette.subtext} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openPlaylist(item)} style={styles.iconButton}>
                <FontAwesomeIcon icon={faChevronRight} size={14} color={palette.subtext} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <MoodAssignmentModal
        visible={moodModalVisible}
        title={`Assign "${selectedPlaylist?.name || 'playlist'}"`}
        selectedMoods={selectedMoods}
        onClose={() => setMoodModalVisible(false)}
        onSave={saveMoodAssignment}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  list: { paddingBottom: 120 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flex: 1,
    marginRight: 14,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Playlists;
