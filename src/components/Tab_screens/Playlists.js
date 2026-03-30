import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faAngleRight,
  faCompactDisc,
  faFolder,
  faHeart,
  faMicrophoneLines,
} from '@fortawesome/free-solid-svg-icons';
import useResonixTheme from '../../hooks/useResonixTheme';
import MoodAssignmentModal from '../MoodAssignmentModal';
import {
  getAssignedMoodsForPlaylist,
  getPlaylistMoodAssignments,
  setPlaylistMoods,
} from '../../utils/moods';

const PLAYLIST_ITEMS = [
  { id: 'fav', name: 'Favorites Mix', description: 'Quick access to the songs you love most.' },
  { id: '1', name: 'Workout', description: 'High-energy tracks for motion and momentum.' },
  { id: '2', name: 'Chill', description: 'Easy listening for slower moments.' },
];

const PlaylistsHub = ({ navigation }) => {
  const palette = useResonixTheme();
  const songs = useSelector(state => state.allSongsReducer);
  const favouriteSongs = useSelector(state => state.favSongsReducer);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [moodModalVisible, setMoodModalVisible] = useState(false);

  const artists = useMemo(
    () =>
      [...new Set(songs.map(song => song.artist).filter(Boolean))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [songs],
  );

  const albums = useMemo(
    () =>
      [...new Set(songs.map(song => song.album).filter(Boolean))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [songs],
  );

  const collectionCards = [
    {
      id: 'favourites',
      title: 'Favourites',
      subtitle: `${favouriteSongs.length} saved songs`,
      icon: faHeart,
      accent: '#E35D6A',
      onPress: () => navigation.navigate('Favourites'),
    },
    {
      id: 'artists',
      title: 'Artists',
      subtitle: `${artists.length} artists`,
      icon: faMicrophoneLines,
      accent: '#3C9D8F',
      onPress: () => navigation.navigate('ArtistsLibrary'),
    },
    {
      id: 'albums',
      title: 'Albums',
      subtitle: `${albums.length} albums`,
      icon: faFolder,
      accent: '#E59B2D',
      onPress: () => navigation.navigate('AlbumsLibrary'),
    },
  ];

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
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.collectionGrid}>
        {collectionCards.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.collectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            activeOpacity={0.9}
            onPress={item.onPress}
          >
            <View style={[styles.collectionIcon, { backgroundColor: item.accent }]}>
              <FontAwesomeIcon icon={item.icon} size={16} color="#fff" />
            </View>
            <Text style={[styles.collectionTitle, { color: palette.text }]}>{item.title}</Text>
            <Text style={[styles.collectionSubtitle, { color: palette.subtext }]}>{item.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.playlistsList}>
        {PLAYLIST_ITEMS.map(item => (
          <View
            key={item.id}
            style={[styles.playlistRow, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <TouchableOpacity style={styles.playlistRowMain} activeOpacity={0.88} onPress={() => openPlaylist(item)}>
              <View style={[styles.playlistIconWrap, { backgroundColor: palette.surfaceMuted }]}>
                <FontAwesomeIcon icon={faCompactDisc} size={16} color={palette.accent} />
              </View>
              <View style={styles.playlistTextWrap}>
                <Text style={[styles.playlistName, { color: palette.text }]}>{item.name}</Text>
                <Text style={[styles.playlistDescription, { color: palette.subtext }]} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: palette.surfaceMuted }]}
              onPress={() => openMoodAssignment(item)}
            >
              <Text style={[styles.actionText, { color: palette.accent }]}>Mood</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chevronButton} onPress={() => openPlaylist(item)}>
              <FontAwesomeIcon icon={faAngleRight} size={16} color={palette.subtext} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <MoodAssignmentModal
        visible={moodModalVisible}
        title={`Assign "${selectedPlaylist?.name || 'playlist'}"`}
        selectedMoods={selectedMoods}
        onClose={() => setMoodModalVisible(false)}
        onSave={saveMoodAssignment}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 140,
    gap: 12,
  },
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  collectionCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    minHeight: 128,
  },
  playlistsList: {
    gap: 12,
  },
  collectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  collectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  playlistRow: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playlistRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playlistIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistTextWrap: {
    flex: 1,
    gap: 4,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '700',
  },
  playlistDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionButton: {
    height: 36,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  chevronButton: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PlaylistsHub;
