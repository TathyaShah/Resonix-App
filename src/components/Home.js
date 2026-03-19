import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import useTheme from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { selectedSong, setIsSongPlaying } from '../redux/action';
import TrackPlayer from 'react-native-track-player';

// Home shows a recently played carousel
const Home = () => {
  const [recent, setRecent] = useState([]);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const isDark = isDarkMode;

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
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#555' }]} numberOfLines={1}>
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
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
      <View style={{ paddingHorizontal: 15, paddingTop: 15 }}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>What&apos;s your mood?</Text>
        <View style={styles.moodGrid}>
          {moods.map((mood) => (
            <TouchableOpacity key={mood.key} style={[styles.moodCard, { backgroundColor: isDark ? '#1E1E1E' : '#F2F2F2' }]}
              activeOpacity={0.85}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, { color: isDark ? '#fff' : '#111' }]}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.header, { marginTop: 2 }]}> 
        <Text style={[styles.headerText, { color: isDark ? '#fff' : '#000' }]}>Recently Played</Text>
        <TouchableOpacity onPress={() => navigation.navigate('RecentHistory')}>
          <Text style={{ color: '#E82255' }}>Show All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={recent}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, idx) => item.url + idx}
        renderItem={renderItem}
        contentContainerStyle={{ paddingLeft: 15, paddingRight: 10 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  headerText: { fontSize: 18, fontWeight: 'bold' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  moodCard: {
    width: '48%',
    aspectRatio: 5 / 3,
    maxHeight: 110,
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
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
  card: { width: 100, marginRight: 12 },
  thumb: { width: 100, height: 100, backgroundColor: '#444', borderRadius: 6 },
  title: { marginTop: 6, fontSize: 12 },
  subtitle: { fontSize: 10 },
});

export default Home;
