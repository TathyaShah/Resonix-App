import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import useResonixTheme from '../hooks/useResonixTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {selectedSong, setIsSongPlaying} from '../redux/action';
import TrackPlayer from 'react-native-track-player';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faChevronRight, faHeadphones} from '@fortawesome/free-solid-svg-icons';
import SongThumbnail from './SongThumbnail';
import {
  filterSongsByMood,
  getSongMoodAssignments,
  MOOD_OPTIONS,
} from '../utils/moods';
import {getTrackIndexByUrl} from '../utils/trackPlayer';

const MOOD_ACCENT_COLORS = {
  happy: '#2E7D32',
  sad: '#E53935',
  energetic: '#F57C00',
  love: '#1565C0',
};

const Home = () => {
  const [recent, setRecent] = useState([]);
  const [moodAssignments, setMoodAssignments] = useState({});
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const palette = useResonixTheme();
  const allSongs = useSelector(state => state.allSongsReducer);

  const openMoodScreen = moodKey => {
    const parentNavigation = navigation.getParent?.();

    if (parentNavigation) {
      parentNavigation.navigate('MoodSongs', {
        moodKey,
        autoPlay: false,
      });
      return;
    }

    navigation.navigate('MoodSongs', {
      moodKey,
      autoPlay: false,
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [storedRecent, storedMoodAssignments] = await Promise.all([
          AsyncStorage.getItem('recentSongs'),
          getSongMoodAssignments(),
        ]);

        setRecent(storedRecent ? JSON.parse(storedRecent) : []);
        setMoodAssignments(storedMoodAssignments);
      } catch (error) {
        console.error('load home failed', error);
      }
    };

    const sub = navigation.addListener('focus', load);
    load();
    return sub;
  }, [navigation]);

  const moods = useMemo(
    () =>
      MOOD_OPTIONS.map(mood => ({
        ...mood,
        count: filterSongsByMood(allSongs, moodAssignments, mood.key).length,
      })),
    [allSongs, moodAssignments],
  );

  const renderItem = ({item}) => {
    const playSong = async () => {
      dispatch(selectedSong(item));
      dispatch(setIsSongPlaying(true));
      try {
        const trackIndex = await getTrackIndexByUrl(item.url);
        if (trackIndex !== -1) {
          await TrackPlayer.skip(trackIndex);
        }
        await TrackPlayer.play();
      } catch (error) {
        await TrackPlayer.play();
      }
      navigation.navigate('AudioPlayer');
    };

    return (
      <TouchableOpacity style={styles.card} onPress={playSong}>
        <SongThumbnail
          song={item}
          width={96}
          height={72}
          radius={14}
          textSize={24}
        />
        <Text style={[styles.title, {color: palette.text}]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text
          style={[styles.subtitle, {color: palette.subtext}]}
          numberOfLines={1}>
          {item.album || item.artist}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: palette.background}}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.sectionCard,
          {backgroundColor: palette.surface, borderColor: palette.border},
        ]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, {color: palette.text}]}>
            What&apos;s your mood?
          </Text>
          <View style={[styles.badge, {backgroundColor: palette.surfaceMuted}]}>
            <FontAwesomeIcon
              icon={faHeadphones}
              size={12}
              color={palette.accent}
            />
            <Text style={[styles.badgeText, {color: palette.subtext}]}>
              Curated
            </Text>
          </View>
        </View>
        <View style={styles.moodGrid}>
          {moods.map((mood, index) => (
            <TouchableOpacity
              key={mood.key}
              style={[
                styles.moodCard,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderLeftColor:
                    MOOD_ACCENT_COLORS[mood.key] || palette.accent,
                  // borderBottomColor: MOOD_ACCENT_COLORS[mood.key] || palette.accent,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => openMoodScreen(mood.key)}>
              <View>
                <Text style={[styles.moodLabel, {color: palette.text}]}>
                  {mood.label}
                </Text>
                <Text style={[styles.moodCount, {color: palette.subtext}]}>
                  {mood.count ? `${mood.count} songs` : 'No songs yet'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.sectionCard,
          {backgroundColor: palette.surface, borderColor: palette.border},
        ]}>
        <View style={styles.header}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.recentTitleWrap}>
              <Text style={[styles.headerText, {color: palette.text}]}>
                Recently Played
              </Text>
              <View
                style={[
                  styles.counterBadge,
                  {backgroundColor: palette.accent},
                ]}>
                <Text style={styles.counterText}>{recent.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('RecentHistory')}
              style={styles.recentArrow}>
              <FontAwesomeIcon
                icon={faChevronRight}
                size={16}
                color={palette.accent}
              />
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={recent}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, idx) => item.url + idx}
          renderItem={renderItem}
          contentContainerStyle={styles.recentListContent}
          ListEmptyComponent={
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.border,
                },
              ]}>
              <Text style={[styles.emptyTitle, {color: palette.text}]}>
                No recent tracks yet
              </Text>
              <Text style={[styles.emptySubtitle, {color: palette.subtext}]}>
                Start playing music and your history will appear here.
              </Text>
            </View>
          }
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 140,
    gap: 18,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  header: {
    justifyContent: 'space-between',
    gap: 14,
  },
  recentTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  counterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  recentArrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {fontSize: 20, fontWeight: '700'},
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    rowGap: 12,
  },
  moodCard: {
    width: '48%',
    aspectRatio: 5 / 3,
    maxHeight: 110,
    borderRadius: 16,
    borderLeftWidth: 5,
    // borderBottomWidth: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    elevation: 1,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  moodCount: {
    fontSize: 11,
    marginTop: 4,
  },
  card: {width: 96, marginRight: 14},
  recentListContent: {paddingTop: 10, paddingBottom: 2, paddingRight: 6},
  title: {marginTop: 8, fontSize: 12, fontWeight: '600'},
  subtitle: {fontSize: 10, marginTop: 4},
  emptyCard: {
    width: 280,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default Home;
