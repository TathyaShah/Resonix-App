import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
  faArrowLeft,
  faEllipsisVertical,
  faPlay,
  faShuffle,
} from '@fortawesome/free-solid-svg-icons';
import {useDispatch, useSelector} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer from 'react-native-track-player';
import useResonixTheme from '../hooks/useResonixTheme';
import SongThumbnail from './SongThumbnail';
import MoodAssignmentModal from './MoodAssignmentModal';
import {
  filterSongsByMood,
  getAssignedMoodsForSong,
  getMoodMeta,
  getSongMoodAssignments,
  setSongMoods,
} from '../utils/moods';
import {selectedSong, setIsSongPlaying} from '../redux/action';
import {normalizeTracks} from '../utils/trackPlayer';

const shuffleList = songs =>
  [...songs]
    .map(song => ({song, sortKey: Math.random()}))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(item => item.song);

const MoodSongs = ({route, navigation}) => {
  const moodKey = route?.params?.moodKey || 'happy';
  const autoPlay = Boolean(route?.params?.autoPlay);
  const allSongs = useSelector(state => state.allSongsReducer);
  const selectedItem = useSelector(state => state.selectedSongReducer);
  const palette = useResonixTheme();
  const dispatch = useDispatch();

  const [assignments, setAssignments] = useState({});
  const [menuSong, setMenuSong] = useState(null);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const hasAutoPlayed = useRef(false);

  const moodMeta = useMemo(() => getMoodMeta(moodKey), [moodKey]);
  const moodSongs = useMemo(
    () => filterSongsByMood(allSongs, assignments, moodKey),
    [allSongs, assignments, moodKey],
  );

  const loadAssignments = useCallback(async () => {
    try {
      const stored = await getSongMoodAssignments();
      setAssignments(stored);
    } catch (error) {
      console.error('Failed to load mood assignments', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAssignments();
    }, [loadAssignments]),
  );

  const updateRecent = useCallback(async song => {
    try {
      let arr = [];
      const stored = await AsyncStorage.getItem('recentSongs');
      if (stored) {
        arr = JSON.parse(stored);
      }
      arr = arr.filter(item => item.url !== song.url);
      arr.unshift(song);
      if (arr.length > 20) {
        arr.pop();
      }
      await AsyncStorage.setItem('recentSongs', JSON.stringify(arr));
    } catch (error) {
      console.error('recent update error', error);
    }
  }, []);

  const playSongsQueue = useCallback(
    async (songsToPlay, startIndex = 0) => {
      if (!songsToPlay.length) {
        ToastAndroid.show(
          `No ${moodMeta.label.toLowerCase()} songs assigned yet.`,
          ToastAndroid.SHORT,
        );
        return;
      }

      try {
        const safeStartIndex = Math.min(
          Math.max(startIndex, 0),
          songsToPlay.length - 1,
        );
        const normalizedSongs = normalizeTracks(songsToPlay);
        const firstSong = normalizedSongs[safeStartIndex];

        await TrackPlayer.stop();
        await TrackPlayer.reset();
        await TrackPlayer.add(normalizedSongs);
        await TrackPlayer.skip(safeStartIndex);
        await TrackPlayer.play();

        dispatch(selectedSong(firstSong));
        dispatch(setIsSongPlaying(true));
        await AsyncStorage.setItem('lastPlayedSong', JSON.stringify(firstSong));
        await updateRecent(firstSong);
        navigation.navigate('AudioPlayer');
      } catch (error) {
        console.error('Mood playback failed', error);
        ToastAndroid.show('Unable to start mood playback.', ToastAndroid.SHORT);
      }
    },
    [dispatch, moodMeta.label, navigation, updateRecent],
  );

  useEffect(() => {
    hasAutoPlayed.current = false;
  }, [moodKey]);

  useEffect(() => {
    if (!autoPlay || !moodSongs.length || hasAutoPlayed.current) {
      return;
    }

    hasAutoPlayed.current = true;
    playSongsQueue(shuffleList(moodSongs), 0);
  }, [autoPlay, moodSongs, playSongsQueue]);

  const openMoodAssignment = async song => {
    setMenuSong(song);
    setMoodModalVisible(true);
  };

  const saveMoodAssignment = async moodKeys => {
    try {
      await setSongMoods(menuSong, moodKeys);
      await loadAssignments();
      setMoodModalVisible(false);
      setMenuSong(null);
      ToastAndroid.show('Mood assignment updated.', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Failed to save mood assignment', error);
      ToastAndroid.show('Unable to update moods.', ToastAndroid.SHORT);
    }
  };

  const renderItem = ({item}) => {
    const isSelected = selectedItem && selectedItem.url === item.url;

    return (
      <View
        style={[
          styles.songRow,
          {
            backgroundColor: palette.surface,
            borderColor: isSelected ? palette.accent : palette.border,
          },
        ]}>
        <TouchableOpacity
          onPress={() =>
            playSongsQueue(
              moodSongs,
              moodSongs.findIndex(song => song.url === item.url),
            )
          }
          style={styles.songRowLeft}
          activeOpacity={0.88}>
          <SongThumbnail
            song={item}
            width={56}
            height={42}
            radius={14}
            textSize={16}
          />
          <View style={styles.songTextWrap}>
            <Text
              style={[
                styles.songName,
                {color: isSelected ? palette.accent : palette.text},
              ]}
              numberOfLines={1}>
              {item.title}
            </Text>
            <Text
              style={[styles.songInfo, {color: palette.subtext}]}
              numberOfLines={1}>
              {`${item.artist || 'Unknown Artist'} - ${
                item.album || 'Unknown Album'
              }`}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openMoodAssignment(item)}
          style={styles.actionButton}>
          <FontAwesomeIcon
            icon={faEllipsisVertical}
            size={15}
            color={palette.subtext}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: palette.background}]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleWrap}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[
                styles.backButton,
                {backgroundColor: palette.surfaceMuted},
              ]}>
              <FontAwesomeIcon
                icon={faArrowLeft}
                size={16}
                color={palette.text}
              />
            </TouchableOpacity>
            <Text style={[styles.title, {color: palette.text}]} numberOfLines={1}>
              {moodMeta.label}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.playAllButton}
              onPress={() => playSongsQueue(moodSongs, 0)}>
              <View
                style={[
                  styles.playAllIconWrap,
                  {backgroundColor: palette.accent},
                ]}>
                <FontAwesomeIcon icon={faPlay} size={10} color="#fff" />
              </View>
              <Text style={[styles.playAllText, {color: palette.text}]}>Play</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shuffleButton}
              onPress={() => playSongsQueue(shuffleList(moodSongs), 0)}>
              <FontAwesomeIcon icon={faShuffle} size={14} color={palette.accent} />
              <Text style={[styles.shuffleButtonText, {color: palette.text}]}>
                Shuffle
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={moodSongs}
        keyExtractor={(item, index) => item.url || `${item.title}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyCard,
              {backgroundColor: palette.surface, borderColor: palette.border},
            ]}>
            <Text style={styles.emptyEmoji}>{moodMeta.emoji}</Text>
            <Text style={[styles.emptyTitle, {color: palette.text}]}>
              No songs assigned yet
            </Text>
            <Text style={[styles.emptySubtitle, {color: palette.subtext}]}>
              Use the 3-dot menu on songs and assign them to{' '}
              {moodMeta.label.toLowerCase()}.
            </Text>
          </View>
        }
      />

      <MoodAssignmentModal
        visible={moodModalVisible}
        title={`Assign "${menuSong?.title || 'song'}"`}
        selectedMoods={getAssignedMoodsForSong(assignments, menuSong)}
        onClose={() => {
          setMoodModalVisible(false);
          setMenuSong(null);
        }}
        onSave={saveMoodAssignment}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    flexShrink: 0,
  },
  playAllButton: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  playAllIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shuffleButton: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  playAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  shuffleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 140,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 12,
  },
  songRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  songTextWrap: {
    flex: 1,
  },
  songName: {
    fontSize: 14,
    fontWeight: '700',
  },
  songInfo: {
    fontSize: 12,
    marginTop: 4,
  },
  actionButton: {
    padding: 8,
    marginLeft: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: 'center',
    marginTop: 14,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});

export default MoodSongs;
