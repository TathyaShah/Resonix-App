import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import LinearGradient from 'react-native-linear-gradient';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {useDispatch, useSelector} from 'react-redux';
import useTheme from '../../hooks/useTheme';
import useResonixTheme from '../../hooks/useResonixTheme';
import {setFavouritesSongs, setIsSongPlaying} from '../../redux/action';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer from 'react-native-track-player';
import {
  faAngleDown,
  faAngleUp,
  faBackwardStep,
  faForwardStep,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import {faHeart as solidHeart} from '@fortawesome/free-solid-svg-icons';
import {faHeart as regularHeart} from '@fortawesome/free-regular-svg-icons';
import TextTicker from 'react-native-text-ticker';
import Slider from '@react-native-community/slider';
import {useNavigation} from '@react-navigation/native';
import SongThumbnail from '../SongThumbnail';
import {AppContext} from '../../../App';
import {fetchLyricsForSong} from '../../utils/lyrics';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');
const LYRICS_SHEET_MAX_HEIGHT = Math.round(SCREEN_HEIGHT * 0.64);
const LYRICS_COLLAPSED_OFFSET = LYRICS_SHEET_MAX_HEIGHT + 32;
const SYNCED_LINE_HEIGHT = 56;

const EMPTY_LYRICS = {
  plainLyrics: '',
  plainLines: [],
  syncedLyrics: '',
  syncedLines: [],
};

const AudioPlayer = () => {
  const dispatch = useDispatch();
  const selected = useSelector(state => state.selectedSongReducer);
  const isSongPlaying = useSelector(state => state.isSongPlaying);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerInitialized, setPlayerInitialized] = useState(false);
  const [isFavSong, setFavSong] = useState(false);
  const [lyricsState, setLyricsState] = useState('idle');
  const [lyricsData, setLyricsData] = useState(EMPTY_LYRICS);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isLyricsSheetVisible, setIsLyricsSheetVisible] = useState(false);
  const navigation = useNavigation();
  const {isDarkMode} = useTheme();
  const palette = useResonixTheme();
  const {onlineLyricsEnabled} = useContext(AppContext);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const lyricsSheetAnim = useRef(
    new Animated.Value(LYRICS_COLLAPSED_OFFSET),
  ).current;
  const shouldRotate = useRef(false);
  const syncedLyricsListRef = useRef(null);

  const themeColor = isDarkMode ? Colors.white : Colors.black;
  const bgTheme = palette.background;
  const dimColorTheme = isDarkMode ? Colors.light : Colors.darker;

  const ensurePlayerInitialized = async () => {
    if (playerInitialized) {
      return;
    }
    try {
      await TrackPlayer.getState();
      setPlayerInitialized(true);
    } catch (e) {
      if (e && e.message && e.message.includes('already been initialized')) {
        setPlayerInitialized(true);
        return;
      }
      try {
        await TrackPlayer.setupPlayer();
        setPlayerInitialized(true);
      } catch (setupErr) {
        if (
          setupErr &&
          setupErr.message &&
          setupErr.message.includes('already been initialized')
        ) {
          setPlayerInitialized(true);
        } else {
          console.error('Error setting up TrackPlayer:', setupErr);
        }
      }
    }
  };

  const closeIt = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    const updatePosition = async () => {
      try {
        await ensurePlayerInitialized();
        const pos = await TrackPlayer.getPosition();
        const dur = await TrackPlayer.getDuration();
        setPosition(pos);
        setDuration(dur);
      } catch (err) {
        // ignore initialization errors here
      }
    };

    updatePosition();
    const intervalId = setInterval(updatePosition, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const formatTime = timeInSeconds => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  const onSlidingComplete = value => {
    try {
      TrackPlayer.seekTo(value);
      setPosition(value);
    } catch (error) {
      console.warn(error);
    }
  };

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

  useEffect(() => {
    const checkFavourite = async () => {
      try {
        const existingSongs = await AsyncStorage.getItem('favSongs');
        if (existingSongs !== null) {
          const favSongsArray = JSON.parse(existingSongs);
          const existingIndex = favSongsArray.findIndex(
            item => item.url === selected.url,
          );
          setFavSong(existingIndex !== -1);
        } else {
          setFavSong(false);
        }
      } catch (e) {
        console.error('Failed to check favourite songs:', e);
      }
    };

    checkFavourite();
  }, [selected]);

  useEffect(() => {
    let cancelled = false;

    const loadLyrics = async () => {
      if (!selected?.title) {
        setLyricsData(EMPTY_LYRICS);
        setLyricsState('idle');
        setIsLyricsOpen(false);
        return;
      }

      if (!onlineLyricsEnabled) {
        setLyricsData(EMPTY_LYRICS);
        setLyricsState('disabled');
        setIsLyricsOpen(false);
        return;
      }

      setLyricsData(EMPTY_LYRICS);
      setLyricsState('loading');

      try {
        const result = await fetchLyricsForSong(selected);
        if (cancelled) {
          return;
        }

        if (result?.syncedLines?.length || result?.plainLines?.length) {
          setLyricsData(result);
          setLyricsState('ready');
          return;
        }

        setLyricsState('empty');
      } catch (error) {
        if (!cancelled) {
          setLyricsState('error');
        }
      }
    };

    loadLyrics();

    return () => {
      cancelled = true;
    };
  }, [onlineLyricsEnabled, selected]);

  useEffect(() => {
    if (isLyricsOpen) {
      setIsLyricsSheetVisible(true);
      Animated.timing(lyricsSheetAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(lyricsSheetAnim, {
      toValue: LYRICS_COLLAPSED_OFFSET,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) {
        setIsLyricsSheetVisible(false);
      }
    });
  }, [isLyricsOpen, lyricsSheetAnim]);

  const addFavSongItem = async favSong => {
    try {
      if (!favSong || !favSong.url) {
        console.error('Invalid song object:', favSong);
        return;
      }
      let favSongsArray = [];
      const existingSongs = await AsyncStorage.getItem('favSongs');

      if (existingSongs !== null) {
        favSongsArray = JSON.parse(existingSongs);
        const existingIndex = favSongsArray.findIndex(
          item => item.url === favSong.url,
        );
        if (existingIndex !== -1) {
          favSongsArray.splice(existingIndex, 1);
          setFavSong(false);
          await AsyncStorage.setItem('favSongs', JSON.stringify(favSongsArray));
          ToastAndroid.show('Removed from favourites.', ToastAndroid.SHORT);
        } else {
          favSongsArray.push(favSong);
          setFavSong(true);
          await AsyncStorage.setItem('favSongs', JSON.stringify(favSongsArray));
          ToastAndroid.show('Song added to favourites.', ToastAndroid.SHORT);
        }
      } else {
        favSongsArray.push(favSong);
        setFavSong(true);
        await AsyncStorage.setItem('favSongs', JSON.stringify(favSongsArray));
        ToastAndroid.show('Song added to favourites.', ToastAndroid.SHORT);
      }

      dispatch(setFavouritesSongs(favSongsArray));
    } catch (e) {
      console.error('Failed to add item to array:', e);
    }
  };

  const toggleFavSong = () => {
    if (selected && selected.url) {
      addFavSongItem(selected);
    } else {
      console.error('Invalid song object:', selected);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy > 50) {
          closeIt();
        }
      },
    }),
  ).current;

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, gestureState) =>
        Math.abs(gestureState.dy) > 10 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy > 50) {
          setIsLyricsOpen(false);
        }
      },
    }),
  ).current;

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

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const activeSyncedIndex = useMemo(() => {
    const syncedLines = lyricsData.syncedLines || [];
    if (!syncedLines.length) {
      return -1;
    }

    const currentPositionMs = Math.max(0, Math.round(position * 1000));
    for (let index = syncedLines.length - 1; index >= 0; index -= 1) {
      if (currentPositionMs >= syncedLines[index].startTimeMs) {
        return index;
      }
    }

    return -1;
  }, [lyricsData.syncedLines, position]);

  useEffect(() => {
    if (
      !isLyricsOpen ||
      activeSyncedIndex < 0 ||
      !lyricsData.syncedLines?.length
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      syncedLyricsListRef.current?.scrollToIndex({
        index: activeSyncedIndex,
        animated: true,
        viewOffset: 80,
        viewPosition: 0.1,
      });
    }, 120);

    return () => clearTimeout(timeoutId);
  }, [activeSyncedIndex, isLyricsOpen, lyricsData.syncedLines]);

  const currentSyncedLine =
    activeSyncedIndex >= 0
      ? lyricsData.syncedLines[activeSyncedIndex]?.text
      : '';
  const unsyncedPreview = (lyricsData.plainLines || [])[0] || '';

  const lyricsMessage = (() => {
    if (lyricsState === 'disabled') {
      return 'Enable online lyrics in Account to load lyrics for the current song.';
    }
    if (lyricsState === 'loading') {
      return 'Looking up lyrics...';
    }
    if (lyricsState === 'error') {
      return 'Could not load lyrics right now. Please try again in a moment.';
    }
    if (lyricsState === 'ready') {
      if (currentSyncedLine) {
        return currentSyncedLine;
      }
      if (unsyncedPreview) {
        return unsyncedPreview;
      }
    }
    if (lyricsState === 'empty') {
      return selected && selected.title
        ? `Lyrics not available for "${selected.title}"`
        : 'Lyrics will be shown here';
    }
    return 'Lyrics will be shown here';
  })();

  const renderLyricsContent = () => {
    if (lyricsState !== 'ready') {
      return (
        <View style={styles.lyricsEmptyState}>
          <Text style={[styles.lyricsEmptyText, {color: dimColorTheme}]}>
            {lyricsMessage}
          </Text>
        </View>
      );
    }

    if (lyricsData.syncedLines?.length) {
      return (
        <FlatList
          ref={syncedLyricsListRef}
          data={lyricsData.syncedLines}
          keyExtractor={(item, index) => `${item.startTimeMs}-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.lyricsListContent}
          getItemLayout={(data, index) => ({
            length: SYNCED_LINE_HEIGHT,
            offset: SYNCED_LINE_HEIGHT * index,
            index,
          })}
          onScrollToIndexFailed={({index}) => {
            syncedLyricsListRef.current?.scrollToOffset({
              offset: Math.max(0, index * SYNCED_LINE_HEIGHT - 120),
              animated: true,
            });
          }}
          renderItem={({item, index}) => {
            const isActive = index === activeSyncedIndex;
            const isPast = activeSyncedIndex > index;
            return (
              <View style={styles.lyricLineWrap}>
                <Text
                  style={[
                    styles.lyricLine,
                    {
                      color:
                        isActive || isPast ? palette.accent : dimColorTheme,
                      opacity: isActive ? 1 : isPast ? 0.78 : 0.88,
                      fontSize: 18,
                      lineHeight: 26,
                      fontWeight: isActive ? '800' : '600',
                    },
                  ]}>
                  {item.text}
                </Text>
              </View>
            );
          }}
        />
      );
    }

    return (
      <FlatList
        data={lyricsData.plainLines}
        keyExtractor={(item, index) => `${item}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lyricsListContent}
        renderItem={({item}) => (
          <View style={styles.lyricLineWrap}>
            <Text
              style={[
                styles.lyricLine,
                {
                  color: palette.text,
                  fontSize: 18,
                  lineHeight: 28,
                  fontWeight: '600',
                },
              ]}>
              {item}
            </Text>
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.modal}>
      <LinearGradient
        colors={isDarkMode ? ['#1A1020', '#050507'] : ['#FFF2F6', '#F5F6FA']}
        style={styles.gradient}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}>
        <View
          style={styles.content}
          {...(!isLyricsOpen ? panResponder.panHandlers : {})}>
          <View style={styles.toolBar}>
            <TouchableOpacity
              onPress={closeIt}
              style={[
                styles.toolBarIconsContainer,
                {marginLeft: -10, backgroundColor: palette.surface},
              ]}>
              <FontAwesomeIcon
                icon={faAngleDown}
                size={20}
                style={{color: themeColor}}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toolBarIconsContainer,
                {marginRight: -10, backgroundColor: palette.surface},
              ]}
              onPress={toggleFavSong}>
              <FontAwesomeIcon
                icon={isFavSong ? solidHeart : regularHeart}
                size={22}
                color={isFavSong ? palette.success : palette.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCopy}>
            <TextTicker
              scrollSpeed={50}
              numberOfLines={1}
              style={[styles.songName, {color: themeColor}]}
              ellipsizeMode="tail">
              {selected.title}
            </TextTicker>
            <Text style={{color: dimColorTheme, fontSize: 14}}>
              {selected.artist}
            </Text>
          </View>

          <Animated.View
            style={[
              styles.musicIconContainer,
              {shadowColor: palette.shadow, transform: [{rotate: spin}]},
            ]}>
            <SongThumbnail
              song={selected}
              size={250}
              radius={125}
              textSize={92}
            />
          </Animated.View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsLyricsOpen(current => !current)}
            style={styles.lyricsToggle}>
            <View
              style={[
                styles.lyricsToggleButton,
                {backgroundColor: palette.surface, borderColor: palette.border},
              ]}>
              <FontAwesomeIcon
                icon={isLyricsOpen ? faAngleDown : faAngleUp}
                size={18}
                style={{color: palette.text}}
              />
            </View>
            <Text style={[styles.lyricsToggleLabel, {color: dimColorTheme}]}>
              {isLyricsOpen ? 'hide lyrics' : 'see lyrics'}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.compactLyricsCard,
              {backgroundColor: palette.surface, borderColor: palette.border},
            ]}>
            <Text
              style={{
                color:
                  lyricsState === 'ready' && currentSyncedLine
                    ? palette.accent
                    : dimColorTheme,
                textAlign: 'center',
              }}
              numberOfLines={1}>
              {lyricsMessage}
            </Text>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.timelineWrap}>
              <Slider
                style={{width: '100%'}}
                minimumValue={0}
                maximumValue={duration}
                minimumTrackTintColor={palette.accent}
                maximumTrackTintColor={palette.subtext}
                thumbTintColor={palette.accent}
                value={position}
                onSlidingComplete={onSlidingComplete}
              />

              <View style={styles.durationContainer}>
                <Text style={[styles.durationText, {color: dimColorTheme}]}>
                  {' '}
                  {formatTime(position)}
                </Text>
                <Text style={[styles.durationText, {color: dimColorTheme}]}>
                  {' '}
                  {formatTime(duration)}
                </Text>
              </View>
            </View>

            <View style={styles.featuresIconContainer}>
              <TouchableOpacity
                onPress={handlePreviousSong}
                style={[
                  styles.playPousedContainer,
                  {backgroundColor: 'transparent', marginLeft: -22},
                ]}>
                <FontAwesomeIcon
                  icon={faBackwardStep}
                  size={22}
                  style={{color: themeColor}}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.playPousedContainer,
                  {backgroundColor: palette.accent},
                ]}
                onPress={playPause}>
                <FontAwesomeIcon
                  icon={isSongPlaying === true ? faPause : faPlay}
                  size={25}
                  style={{color: bgTheme}}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNextSong}
                style={[
                  styles.playPousedContainer,
                  {backgroundColor: 'transparent', marginRight: -22},
                ]}>
                <FontAwesomeIcon
                  icon={faForwardStep}
                  size={22}
                  style={{color: themeColor}}
                />
              </TouchableOpacity>
            </View>
          </View>

          {isLyricsSheetVisible ? (
            <Animated.View
              pointerEvents={isLyricsOpen ? 'auto' : 'none'}
              style={[
                styles.lyricsSheet,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  transform: [{translateY: lyricsSheetAnim}],
                },
              ]}
              {...sheetPanResponder.panHandlers}>
              <View style={styles.lyricsSheetHandleWrap}>
                <View
                  style={[
                    styles.lyricsSheetHandle,
                    {backgroundColor: palette.border},
                  ]}
                />
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setIsLyricsOpen(false)}
                  style={[
                    styles.sheetToggleButton,
                    {
                      backgroundColor: palette.surfaceMuted || palette.surface,
                      borderColor: palette.border,
                    },
                  ]}>
                  <FontAwesomeIcon
                    icon={faAngleDown}
                    size={16}
                    style={{color: palette.text}}
                  />
                  <Text
                    style={[styles.sheetToggleText, {color: dimColorTheme}]}>
                    close lyrics
                  </Text>
                </TouchableOpacity>
              </View>
              {renderLyricsContent()}
            </Animated.View>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  gradient: {
    flex: 1,
  },
  content: {
    height: Dimensions.get('window').height,
    paddingTop: 10,
    paddingHorizontal: 20,
    flex: 1,
  },
  toolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  toolBarIconsContainer: {
    borderRadius: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    marginTop: 30,
    flexDirection: 'column',
    gap: 5,
  },
  songName: {
    fontSize: 18,
  },
  musicIconContainer: {
    width: 250,
    height: 250,
    borderRadius: 250,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 40,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 14},
    elevation: 8,
  },
  lyricsToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  lyricsToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  lyricsToggleLabel: {
    marginTop: 8,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  compactLyricsCard: {
    marginTop: 18,
    paddingHorizontal: 20,
    minHeight: 72,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingBottom: 28,
  },
  timelineWrap: {
    marginTop: 10,
    flexDirection: 'column',
    gap: 5,
    width: '100%',
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 12,
  },
  durationText: {
    fontSize: 10,
  },
  featuresIconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 12,
    marginTop: 36,
    alignItems: 'center',
  },
  playPousedContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 50,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lyricsSheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 26 : 54,
    bottom: 188,
    borderRadius: 28,
    borderWidth: 1,
    paddingTop: 14,
    overflow: 'hidden',
  },
  lyricsSheetHandleWrap: {
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 18,
  },
  lyricsSheetHandle: {
    width: 54,
    height: 5,
    borderRadius: 3,
    marginBottom: 12,
  },
  sheetToggleButton: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetToggleText: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  lyricsListContent: {
    paddingTop: 22,
    paddingBottom: 130,
    paddingHorizontal: 22,
  },
  lyricLineWrap: {
    minHeight: SYNCED_LINE_HEIGHT,
    justifyContent: 'center',
  },
  lyricLine: {
    textAlign: 'center',
  },
  lyricsEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingBottom: 50,
  },
  lyricsEmptyText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default AudioPlayer;
