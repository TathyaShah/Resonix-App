import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch, useSelector} from 'react-redux';
import {
  selectedSong,
  setIsSongPlaying,
  setFavouritesSongs,
} from '../redux/action';
import TrackPlayer from 'react-native-track-player';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
  faPlay,
  faPause,
  faTimes,
  faHeart as faHeartSolid,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import {faHeart as faHeartRegular} from '@fortawesome/free-regular-svg-icons';
import {useNavigation} from '@react-navigation/native';
import useResonixTheme from '../hooks/useResonixTheme';
import SongThumbnail from './SongThumbnail';
import {getTrackIndexByUrl} from '../utils/trackPlayer';

const RecentHistory = () => {
  const [recent, setRecent] = useState([]);
  const [favSongs, setFavSongs] = useState([]);
  const dispatch = useDispatch();
  const selected = useSelector(state => state.selectedSongReducer);
  const isPlaying = useSelector(state => state.isSongPlaying);
  const palette = useResonixTheme();
  const navigation = useNavigation();

  const load = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentSongs');
      if (stored) {
        const arr = JSON.parse(stored);
        setRecent(arr.slice(0, 50));
      }
      const favStored = await AsyncStorage.getItem('favSongs');
      if (favStored) {
        setFavSongs(JSON.parse(favStored));
      }
    } catch (e) {
      console.error('load recent failed', e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const playItem = async item => {
    dispatch(selectedSong(item));
    dispatch(setIsSongPlaying(true));
    navigation.navigate('AudioPlayer');
    try {
      const trackIndex = await getTrackIndexByUrl(item.url);
      if (trackIndex !== -1) {
        await TrackPlayer.skip(trackIndex);
      }
    } catch (e) {
      console.warn('skip failed', e);
    }
    await TrackPlayer.play();
    let arr = recent.filter(s => s.url !== item.url);
    arr.unshift(item);
    if (arr.length > 50) {
      arr = arr.slice(0, 50);
    }
    setRecent(arr);
    AsyncStorage.setItem('recentSongs', JSON.stringify(arr)).catch(() => {});
  };

  const removeRecentItem = async item => {
    try {
      const updated = recent.filter(song => song.url !== item.url);
      setRecent(updated);
      await AsyncStorage.setItem('recentSongs', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove recent item', e);
    }
  };

  const togglePause = async item => {
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

  const addFavSongItem = async favSong => {
    try {
      let arr = favSongs ? [...favSongs] : [];
      const existingIndex = arr.findIndex(item => item.url === favSong.url);
      if (existingIndex !== -1) {
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

  const renderItem = ({item}) => {
    const isThisPlaying = selected && selected.url === item.url && isPlaying;
    const isFav = favSongs.findIndex(s => s.url === item.url) !== -1;
    return (
      <TouchableOpacity
        onPress={() => playItem(item)}
        style={[
          styles.row,
          {backgroundColor: palette.surface, borderColor: palette.border},
        ]}>
        <View style={styles.infoContainer}>
          <SongThumbnail
            song={item}
            width={72}
            height={54}
            radius={14}
            textSize={20}
          />
          <View style={styles.textContainer}>
            <Text
              style={[styles.title, {color: palette.text}]}
              numberOfLines={1}>
              {item.title}
            </Text>
            <Text
              style={[styles.subtitle, {color: palette.subtext}]}
              numberOfLines={1}>
              {item.album || item.artist}
            </Text>
          </View>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => togglePause(item)}
            style={styles.controlBtn}>
            <FontAwesomeIcon
              icon={isThisPlaying ? faPause : faPlay}
              size={18}
              color={palette.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => addFavSongItem(item)}
            style={styles.controlBtn}>
            <FontAwesomeIcon
              icon={isFav ? faHeartSolid : faHeartRegular}
              size={18}
              color={isFav ? palette.accent : palette.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => removeRecentItem(item)}
            style={styles.controlBtn}>
            <FontAwesomeIcon icon={faTimes} size={18} color={palette.text} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: palette.background}]}>
      <View
        style={[
          styles.topCard,
          {backgroundColor: palette.surface, borderColor: palette.border},
        ]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, {backgroundColor: palette.surfaceMuted}]}>
            <FontAwesomeIcon
              icon={faArrowLeft}
              size={16}
              color={palette.text}
            />
          </TouchableOpacity>
          <View>
            <Text style={[styles.logoText, {color: palette.text}]}>
              Recent History
            </Text>
            <Text style={[styles.summary, {color: palette.subtext}]}>
              {recent.length} songs in your listening trail.
            </Text>
          </View>
        </View>
      </View>
      <FlatList
        data={recent}
        keyExtractor={(item, idx) => item.url + idx}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{height: 10}} />}
        contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 140}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, paddingTop: 20},
  topCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  topBar: {flexDirection: 'row', alignItems: 'center'},
  backBtn: {padding: 10, borderRadius: 14, marginRight: 12},
  logoText: {fontSize: 20, fontWeight: '700', marginBottom: 4},
  summary: {fontSize: 12},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  infoContainer: {flexDirection: 'row', alignItems: 'center', flex: 1},
  title: {fontSize: 14, fontWeight: '700'},
  subtitle: {fontSize: 12, marginTop: 4},
  textContainer: {flex: 1, marginLeft: 12},
  controls: {flexDirection: 'row', alignItems: 'center'},
  controlBtn: {padding: 8},
});

export default RecentHistory;
