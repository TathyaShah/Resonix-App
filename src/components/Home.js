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
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClockRotateLeft, faHeadphones, faSparkles } from '@fortawesome/free-solid-svg-icons';

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
      <LinearGradient
        colors={palette.isDarkMode ? ['#1A1020', '#090A0F'] : ['#FFF3F7', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, { borderColor: palette.border }]}
      >
        <View style={styles.heroHeader}>
          <View style={[styles.heroIcon, { backgroundColor: palette.accentSoft }]}>
            <FontAwesomeIcon icon={faSparkles} size={16} color={palette.accent} />
          </View>
          <Text style={[styles.heroEyebrow, { color: palette.subtext }]}>For today</Text>
        </View>
        <Text style={[styles.heroTitle, { color: palette.text }]}>Find the right mood faster.</Text>
        <Text style={[styles.heroSubtitle, { color: palette.subtext }]}>
          Jump into vibes, rediscover your recents, and keep listening without friction.
        </Text>
      </LinearGradient>

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
            <Text style={[styles.headerText, { color: palette.text }]}>Recently Played</Text>
            <View style={[styles.badge, { backgroundColor: palette.surfaceMuted }]}>
              <FontAwesomeIcon icon={faClockRotateLeft} size={12} color={palette.accent} />
              <Text style={[styles.badgeText, { color: palette.subtext }]}>{recent.length} tracks</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('RecentHistory')}>
            <Text style={{ color: palette.accent, fontWeight: '600' }}>Show All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={recent}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, idx) => item.url + idx}
          renderItem={renderItem}
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
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  heroEyebrow: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
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
  },
  moodCard: {
    width: '48%',
    aspectRatio: 5 / 3,
    maxHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
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
