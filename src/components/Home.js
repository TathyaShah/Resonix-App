import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import useResonixTheme from '../hooks/useResonixTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { selectedSong, setIsSongPlaying } from '../redux/action';
import TrackPlayer from 'react-native-track-player';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faHeadphones } from '@fortawesome/free-solid-svg-icons';

// Home shows a recently played carousel
const Home = () => {
  const [recent, setRecent] = useState([]);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const palette = useResonixTheme();

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('recentSongs');
        if (stored) setRecent(JSON.parse(stored));
      } catch (e) {
        console.error('load recent failed', e);
      }
    };
    const sub = navigation.addListener('focus', load);
    load();
    return sub;
  }, [navigation]);

  const renderItem = ({ item }) => {
    const playSong = async () => {
      dispatch(selectedSong(item));
      dispatch(setIsSongPlaying(true));
      try {
        await TrackPlayer.skip(item.id ? item.id : 0);
        await TrackPlayer.play();
      } catch (e) {
        // if skip fails, just play
        await TrackPlayer.play();
      }
      navigation.navigate('AudioPlayer');
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={playSong}
      >
        <View style={styles.thumb}>
          {/* use artwork if available, else placeholder */}
          {item.artwork ? (
            <Image source={{ uri: item.artwork }} style={styles.thumb} />
          ) : null}
        </View>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.subtitle, { color: palette.subtext }]} numberOfLines={1}>
          {item.album || item.artist}
        </Text>
      </TouchableOpacity>
    );
  };

  const moods = [
    { key: 'happy', label: 'Happy', emoji: '😄' },
    { key: 'sad', label: 'Sad', emoji: '😢' },
    { key: 'energetic', label: 'Energetic', emoji: '⚡' },
    { key: 'love', label: 'Love', emoji: '❤️' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>What&apos;s your mood?</Text>
          <View style={[styles.badge, { backgroundColor: palette.surfaceMuted }]}>
            <FontAwesomeIcon icon={faHeadphones} size={12} color={palette.accent} />
            <Text style={[styles.badgeText, { color: palette.subtext }]}>Curated</Text>
          </View>
        </View>
        <View style={styles.moodGrid}>
          {moods.map((mood, index) => (
            <TouchableOpacity
              key={mood.key}
              style={[
                styles.moodCard,
                {
                  backgroundColor: index % 2 === 0 ? palette.surfaceMuted : palette.surfaceStrong,
                  borderColor: palette.border,
                },
              ]}
              activeOpacity={0.85}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, { color: palette.text }]}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.header}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.recentTitleWrap}>
              <Text style={[styles.headerText, { color: palette.text }]}>Recently Played</Text>
              <View style={[styles.counterBadge, { backgroundColor: palette.accent }]}>
                <Text style={styles.counterText}>{recent.length}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('RecentHistory')} style={styles.recentArrow}>
              <FontAwesomeIcon icon={faChevronRight} size={16} color={palette.accent} />
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
            <View style={[styles.emptyCard, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No recent tracks yet</Text>
              <Text style={[styles.emptySubtitle, { color: palette.subtext }]}>
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
    gap: 16,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
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
  headerText: { fontSize: 20, fontWeight: '700' },
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
    marginTop: 14,
    rowGap: 10,
  },
  moodCard: {
    width: '48%',
    aspectRatio: 5 / 3,
    maxHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: { width: 126, marginRight: 12 },
  recentListContent: { paddingTop: 8 },
  thumb: { width: 126, height: 126, backgroundColor: '#444', borderRadius: 18 },
  title: { marginTop: 8, fontSize: 13, fontWeight: '600' },
  subtitle: { fontSize: 11, marginTop: 4 },
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
