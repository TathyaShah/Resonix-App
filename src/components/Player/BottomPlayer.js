import React, {useEffect, useMemo, useRef, useState} from 'react';
import TextTicker from 'react-native-text-ticker';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
  faBackwardStep,
  faPlay,
  faForwardStep,
  faPause,
} from '@fortawesome/free-solid-svg-icons';
import {useDispatch, useSelector} from 'react-redux';
import {selectedSong, setIsSongPlaying} from '../../redux/action';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, {Event} from 'react-native-track-player';
import {
  Animated,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Easing,
} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import useTheme from '../../hooks/useTheme';
import useResonixTheme from '../../hooks/useResonixTheme';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import SongThumbnail from '../SongThumbnail';
import {
  ensurePlayerInitialized as ensureTrackPlayerInitialized,
  getPlaybackProgress,
  normalizeTracks,
} from '../../utils/trackPlayer';

const getActiveRouteName = state => {
  if (!state || !Array.isArray(state.routes) || state.routes.length === 0) {
    return undefined;
  }

  const index = typeof state.index === 'number' ? state.index : 0;
  const route = state.routes[index];

  if (!route) {
    return undefined;
  }

  if (route.state) {
    return getActiveRouteName(route.state);
  }

  return route.name;
};

const CircularProgressBar = ({size, progress, accentColor}) => {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{position: 'absolute'}}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={accentColor}
        strokeWidth="3"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation={-90}
        originX={size / 2}
        originY={size / 2}
      />
    </Svg>
  );
};

const BottomPlayer = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const Songs = useSelector(state => state.allSongsReducer);
  const selected = useSelector(state => state.selectedSongReducer);
  const isSongPlaying = useSelector(state => state.isSongPlaying);
  const currentRouteName = useNavigationState(state =>
    getActiveRouteName(state),
  );
  //theme
  const {isDarkMode} = useTheme();
  const palette = useResonixTheme();
  const themeColor = isDarkMode ? Colors.white : Colors.black;
  const bgTheme = palette.surface;
  const dimColorTheme = isDarkMode ? Colors.light : Colors.darker;
  const [isPlayerReady, setPlayerReady] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const swipeTranslateX = useRef(new Animated.Value(0)).current;

  const ensurePlayerInitialized = async () => {
    try {
      await ensureTrackPlayerInitialized();
    } catch (error) {
      console.error('Error setting up TrackPlayer:', error);
    }
  };

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shouldRotate = useRef(false);
  const toggleModal = () => {
    navigation.navigate('AudioPlayer');
  };

  useEffect(() => {
    const playSelectedSong = async () => {
      try {
        // ensure the player has been initialized before interacting with it
        await ensurePlayerInitialized();

        await TrackPlayer.stop();
        await TrackPlayer.reset();
        if (Songs && Songs.length > 0) {
          await TrackPlayer.add(normalizeTracks(Songs));
          setPlayerReady(true);
        }
      } catch (error) {
        console.error('Failed to play selected song', error);
      }
    };

    const onTrackChange = async event => {
      const activeTrack = event?.track ?? (await TrackPlayer.getActiveTrack());
      if (!activeTrack) {
        return;
      }

      storeSelectedSong(activeTrack);
      dispatch(selectedSong(activeTrack));
      updateRecent(activeTrack);
    };

    const trackSubscription = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      onTrackChange,
    );
    const playStateSubscription = TrackPlayer.addEventListener(
      Event.PlaybackPlayWhenReadyChanged,
      event => {
        dispatch(setIsSongPlaying(Boolean(event.playWhenReady)));
      },
    );
    playSelectedSong();

    return () => {
      TrackPlayer.stop();
      trackSubscription.remove();
      playStateSubscription.remove();
    };
  }, [Songs]);

  const updateRecent = async song => {
    if (!song) return;
    try {
      let arr = [];
      const stored = await AsyncStorage.getItem('recentSongs');
      if (stored) arr = JSON.parse(stored);
      // remove duplicate
      arr = arr.filter(s => s.url !== song.url);
      arr.unshift(song);
      if (arr.length > 20) arr.pop();
      await AsyncStorage.setItem('recentSongs', JSON.stringify(arr));
    } catch (e) {
      console.error('Failed to update recent songs', e);
    }
  };

  useEffect(() => {
    const syncSelectedTrack = async () => {
      if (!isPlayerReady || selected === null) {
        return;
      }
      try {
        const queue = await TrackPlayer.getQueue();
        const index = queue.findIndex(item => item.url === selected.url);
        if (index !== -1) {
          await TrackPlayer.skip(index);
        }
      } catch (error) {
        console.error('Failed to sync selected track', error);
      }
    };
    syncSelectedTrack();
  }, [isPlayerReady, selected, Songs]);

  useEffect(() => {
    if (selected && selected.url) {
      setIsHidden(false);
    }
  }, [selected]);

  const handleNextSong = async () => {
    try {
      await ensurePlayerInitialized();
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
      dispatch(setIsSongPlaying(true));
    } catch (err) {
      console.error('Next song failed:', err);
    }
  };

  const handlePreviousSong = async () => {
    try {
      await ensurePlayerInitialized();
      await TrackPlayer.skipToPrevious();
      await TrackPlayer.play();
      dispatch(setIsSongPlaying(true));
    } catch (err) {
      console.error('Previous song failed:', err);
    }
  };

  const playPause = async () => {
    try {
      await ensurePlayerInitialized();
      if (selected && isSongPlaying === true) {
        await TrackPlayer.pause();
        dispatch(setIsSongPlaying(false));
      } else {
        await TrackPlayer.play();
        dispatch(setIsSongPlaying(true));
      }
    } catch (err) {
      console.error('playPause failed:', err);
    }
  };

  const closePlayer = async () => {
    try {
      await ensurePlayerInitialized();
      await TrackPlayer.pause();
      dispatch(setIsSongPlaying(false));
      setIsHidden(true);
      swipeTranslateX.setValue(0);
    } catch (error) {
      console.error('closePlayer failed:', error);
    }
  };

  const storeSelectedSong = async song => {
    try {
      if (song) {
        await AsyncStorage.setItem('lastPlayedSong', JSON.stringify(song));
      }
    } catch (error) {
      console.error('Failed to store selected song:', error);
    }
  };
  useEffect(() => {
    shouldRotate.current = isSongPlaying;
    const rotate = () => {
      if (shouldRotate.current) {
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (finished && shouldRotate.current) {
            rotateAnim.setValue(0);
            rotate();
          }
        });
      }
    };

    rotate();
  }, [isSongPlaying, rotateAnim]);

  useEffect(() => {
    const updateProgress = async () => {
      try {
        const progress = await getPlaybackProgress();
        setCurrentTime(progress.position);
        setDuration(progress.duration);
      } catch (error) {
        console.error('Error getting track progress:', error);
      }
    };

    let interval = null;
    if (isSongPlaying || selected?.url) {
      updateProgress();
      interval = setInterval(updateProgress, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSongPlaying, selected?.url]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const playerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          swipeTranslateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: async (_, gestureState) => {
          const dismissThreshold = 110;

          if (Math.abs(gestureState.dx) >= dismissThreshold) {
            Animated.timing(swipeTranslateX, {
              toValue: gestureState.dx > 0 ? 420 : -420,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              closePlayer();
            });
            return;
          }

          Animated.spring(swipeTranslateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
            tension: 70,
          }).start();
        },
      }),
    [swipeTranslateX],
  );

  if (
    isHidden ||
    !selected ||
    currentRouteName === 'AudioPlayer' ||
    currentRouteName === 'AccountScreen'
  ) {
    return null;
  }

  return (
    <SafeAreaView style={{}}>
      <Animated.View
        {...playerPanResponder.panHandlers}
        style={[
          styles.bottomPlayer,
          {
            backgroundColor: bgTheme,
            borderColor: palette.border,
            shadowColor: palette.shadow,
            transform: [{translateX: swipeTranslateX}],
            opacity: swipeTranslateX.interpolate({
              inputRange: [-180, 0, 180],
              outputRange: [0.7, 1, 0.7],
              extrapolate: 'clamp',
            }),
          },
        ]}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
            flex: 1,
            minWidth: 0,
          }}
          onPress={toggleModal}>
          <View style={styles.thumbnailContainer}>
            <CircularProgressBar
              size={45}
              progress={duration > 0 ? currentTime / duration : 0}
              accentColor={palette.accent}
            />
            <SongThumbnail
              song={selected}
              size={35}
              radius={18}
              textSize={14}
            />
          </View>
          {selected !== null ? (
            <View style={{flex: 1}}>
              <TextTicker
                numberOfLines={1}
                style={[styles.songName, {color: themeColor}]}
                ellipsizeMode="tail"
                scrollSpeed={50}>
                {selected.title}
              </TextTicker>
              <Text style={[, {color: dimColorTheme, fontSize: 10}]}>
                {selected.artist}
              </Text>
            </View>
          ) : (
            <Text>No music item selected</Text>
          )}
        </TouchableOpacity>
        <View style={{flexDirection: 'row', gap: 4, alignItems: 'center'}}>
          <TouchableOpacity
            onPress={handlePreviousSong}
            style={[styles.controls, {backgroundColor: palette.surfaceMuted}]}>
            <FontAwesomeIcon
              icon={faBackwardStep}
              size={16}
              style={{color: themeColor}}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => playPause()}
            style={[styles.controls, {backgroundColor: palette.accent}]}>
            <FontAwesomeIcon
              icon={isSongPlaying === true ? faPause : faPlay}
              size={18}
              style={{color: '#fff', alignSelf: 'center'}}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNextSong}
            style={[styles.controls, {backgroundColor: palette.surfaceMuted}]}>
            <FontAwesomeIcon
              icon={faForwardStep}
              size={18}
              style={{color: themeColor}}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomPlayer: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingVertical: 12,
    width: '92%',
    // minHeight: 74,
    position: 'absolute',
    bottom: 82,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderRadius: 24,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 10,
  },
  thumbnailContainer: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    borderRadius: 18,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BottomPlayer;
