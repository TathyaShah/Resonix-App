import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
  ToastAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { selectedSong, setIsSongPlaying, setFavouritesSongs } from '../redux/action';
import TrackPlayer from 'react-native-track-player';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlay, faPause, faForwardStep, faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { useNavigation } from '@react-navigation/native';
import BottomPlayer from './Player/BottomPlayer';

const RecentHistory = () => {
  const [recent, setRecent] = useState([]);
  const [favSongs, setFavSongs] = useState([]);
  const dispatch = useDispatch();
  const selected = useSelector(state => state.selectedSongReducer);
  const isPlaying = useSelector(state => state.isSongPlaying);
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();

  const load = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentSongs');
      if (stored) {
        const arr = JSON.parse(stored);
        setRecent(arr.slice(0, 50)); // only keep first 50 in UI
      }
      const favStored = await AsyncStorage.getItem('favSongs');
      if (favStored) setFavSongs(JSON.parse(favStored));
    } catch (e) {
      console.error('load recent failed', e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const playItem = async (item) => {
    // dispatch selection immediately
    dispatch(selectedSong(item));
    dispatch(setIsSongPlaying(true));
    navigation.navigate('AudioPlayer');
    try {
      // attempt to find index in player's queue
      await TrackPlayer.skip(item.id ? item.id : 0);
    } catch (e) {
      console.warn('skip failed', e);
    }
    await TrackPlayer.play();
    // update recent order and trim to 50
    let arr = recent.filter(s => s.url !== item.url);
    arr.unshift(item);
    if (arr.length > 50) arr = arr.slice(0, 50);
    setRecent(arr);
    AsyncStorage.setItem('recentSongs', JSON.stringify(arr)).catch(() => {});
  };

  const togglePause = async (item) => {
    if (selected && selected.url === item.url && isPlaying) {
      await TrackPlayer.pause();
      dispatch(setIsSongPlaying(false));
    } else if (selected && selected.url === item.url) {
      await TrackPlayer.play();
      dispatch(setIsSongPlaying(true));
    } else {
      playItem(item);
    }
  };

  const nextTrack = async () => {
    try {
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
      dispatch(setIsSongPlaying(true));
    } catch (e) {
      console.warn('next failed', e);
    }
  };

  const addFavSongItem = async (favSong) => {
    try {
      let arr = favSongs ? [...favSongs] : [];
      const existingIndex = arr.findIndex(item => item.url === favSong.url);
      if (existingIndex !== -1) {
        // remove
        arr.splice(existingIndex, 1);
        ToastAndroid.show('Removed from favourites.', ToastAndroid.SHORT);
      } else {
        arr.push(favSong);
        ToastAndroid.show('Added to favourites.', ToastAndroid.SHORT);
      }
      setFavSongs(arr);
      dispatch(setFavouritesSongs(arr));
      await AsyncStorage.setItem('favSongs', JSON.stringify(arr));
    } catch (e) {
      console.error('fav update error', e);
    }
  };

  const renderItem = ({ item }) => {
    const isThisPlaying = selected && selected.url === item.url && isPlaying;
    const isFav = favSongs.findIndex(s => s.url === item.url) !== -1;
    return (
      <TouchableOpacity onPress={() => playItem(item)} style={styles.row}>
        <View style={styles.infoContainer}>
          <View style={styles.thumb}>
            {item.artwork ? <Image source={{ uri: item.artwork }} style={styles.thumb} /> : null}
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#555' }]} numberOfLines={1}>
              {item.album || item.artist}
            </Text>
          </View>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => togglePause(item)} style={styles.controlBtn}>
            <FontAwesomeIcon icon={isThisPlaying ? faPause : faPlay} size={18} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => addFavSongItem(item)} style={styles.controlBtn}>
            <FontAwesomeIcon icon={isFav ? faHeartSolid : faHeartRegular} size={18} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff', paddingTop: 20 }]}> 
      {/* header with back button and logo/title */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: isDark ? '#fff' : '#000' }]}>{'←'}</Text>
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          {/* placeholder logo circle */}
          <View style={[styles.logoCircle, { backgroundColor: '#E82255' }]} />
          <Text style={[styles.logoText, { color: isDark ? '#fff' : '#000' }]}>Resonix</Text>
        </View>
      </View>
      {/* gap under header */}
      <View style={{ height: 10 }} />
      <FlatList
        data={recent}
        keyExtractor={(item, idx) => item.url + idx}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 70 }}
      />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <BottomPlayer />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, paddingBottom: 0 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 5 },
  backBtn: { padding: 8 },
  backText: { fontSize: 20 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  logoCircle: { width: 24, height: 24, borderRadius: 12, marginRight: 6 },
  logoText: { fontSize: 18, fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  infoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  thumb: { width: 50, height: 50, backgroundColor: '#444', borderRadius: 4 },
  title: { fontSize: 14, fontWeight: 'bold' },
  subtitle: { fontSize: 12 },
  textContainer: { flex: 1, marginLeft: 10 },
  controls: { flexDirection: 'row', alignItems: 'center' },
  controlBtn: { padding: 8 },
  separator: { height: 1, backgroundColor: '#ccc', marginVertical: 8 },
});

export default RecentHistory;
