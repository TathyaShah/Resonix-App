import React, { useEffect, useState, useRef } from 'react';
import {
    Animated, Easing,
    View,
    StyleSheet,
    Text,
    Dimensions,
    TouchableOpacity,
    ToastAndroid,
    StatusBar, PanResponder, Platform
} from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useDispatch, useSelector } from 'react-redux'
import useTheme from '../../hooks/useTheme';
import useResonixTheme from '../../hooks/useResonixTheme';
import { setIsSongPlaying, setFavouritesSongs } from '../../redux/action';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, {} from 'react-native-track-player';
import {
    faForwardStep,
    faBackwardStep,
    faPlay,
    faAngleDown,
    faPause,
} from '@fortawesome/free-solid-svg-icons';
import TextTicker from 'react-native-text-ticker';
import Slider from '@react-native-community/slider';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';
import { useNavigation } from '@react-navigation/native';
import SongThumbnail from '../SongThumbnail';

const AudioPlayer = () => {
    // hooks
    const dispatch = useDispatch()
    const selected = useSelector((state) => state.selectedSongReducer);
    const isSongPlaying = useSelector((state) => state.isSongPlaying);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playerInitialized, setPlayerInitialized] = useState(false);
    const navigation = useNavigation();
    const { isDarkMode } = useTheme();
    const palette = useResonixTheme();
    const [isFavSong, setFavSong] = useState(false);

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

    // theme
    const themeColor = isDarkMode ? Colors.white : Colors.black;
    const bgTheme = palette.background;
    const dimColorTheme = isDarkMode ? Colors.light : Colors.darker;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const shouldRotate = useRef(false);

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
        let intervalId = setInterval(updatePosition, 1000);
        return () => clearInterval(intervalId);
    }, []);

    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const onSlidingComplete = (value) => {
        try {
            TrackPlayer.seekTo(value);
            setPosition(value)
        } catch (error) {
            console.warn(error)
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
            }
            else {
                await TrackPlayer.play();
                dispatch(setIsSongPlaying(true));
            }
        } catch (err) {
            console.error('playPause failed:', err);
        }
    }

    useEffect(() => {
        const checkFavourite = async () => {
            try {
                const existingSongs = await AsyncStorage.getItem('favSongs');
                if (existingSongs !== null) {
                    const favSongsArray = JSON.parse(existingSongs);
                    const existingIndex = favSongsArray.findIndex(item => item.url === selected.url);
                    if (existingIndex !== -1) {
                        setFavSong(true);
                    } else {
                        setFavSong(false);
                    }
                } else {
                    setFavSong(false);
                }
            } catch (e) {
                console.error('Failed to check favourite songs:', e);
            }
        };

        checkFavourite();
    }, [selected]);


    const addFavSongItem = async (favSong) => {
        try {
            if (!favSong || !favSong.url) {
                console.error('Invalid song object:', favSong);
                return;
            }
            let favSongsArray = [];
            const existingSongs = await AsyncStorage.getItem('favSongs');

            if (existingSongs !== null) {
                favSongsArray = JSON.parse(existingSongs);
                const existingIndex = favSongsArray.findIndex(item => item.url === favSong.url);
                if (existingIndex !== -1) {
                    favSongsArray.splice(existingIndex, 1);
                    setFavSong(false);
                    await AsyncStorage.setItem('favSongs', JSON.stringify(favSongsArray));
                    ToastAndroid.show('Removed from favourites.', ToastAndroid.SHORT);

                }
                else {
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
        })
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
                }).start(({ finished }) => {
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
    return (
        <View style={[styles.modal, {}]}>
            <LinearGradient
                colors={isDarkMode ? ['#1A1020', '#050507'] : ['#FFF2F6', '#F5F6FA']}
                style={[styles.gradient, {}]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={[styles.content, {}]} {...panResponder.panHandlers}>
                    <View style={styles.toolBar} >
                        <TouchableOpacity onPress={closeIt} style={[styles.toolBarIconsContainer, { marginLeft: -10, backgroundColor: palette.surface }]}>
                            <FontAwesomeIcon icon={faAngleDown} size={20} style={{ color: themeColor }} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toolBarIconsContainer, { marginRight: -10, backgroundColor: palette.surface }]} onPress={toggleFavSong}>
                        <FontAwesomeIcon icon={isFavSong ? solidHeart : regularHeart} size={22} color={isFavSong ? palette.success : palette.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ marginTop: 30, flexDirection: 'column', gap: 5 }}>
                        <TextTicker scrollSpeed={50} numberOfLines={1} style={[styles.songName, { color: themeColor }]} ellipsizeMode="tail">
                            {selected.title}
                        </TextTicker>
                        <Text style={[, { color: dimColorTheme, fontSize: 14 }]}>{selected.artist}</Text>
                    </View>

                    <Animated.View style={[styles.musicIconContainer, { shadowColor: palette.shadow, transform: [{ rotate: spin }] }]}>
                        <SongThumbnail song={selected} size={250} radius={125} textSize={92} />
                    </Animated.View>
                    <View style={[styles.infoCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                        <Text style={{ color: themeColor, textAlign: 'center' }} numberOfLines={2}>
                            {selected && selected.title ? `Lyrics not available for "${selected.title}"` : 'Lyrics will be shown here'}
                        </Text>
                    </View>
                    <View style={{ height: 30, backgroundColor: palette.surface, marginVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: palette.border }}>
                    </View>
                    <View style={{ marginTop: 40, flexDirection: 'column', gap: 5, width: '100%' }}>
                        <Slider
                            style={{ width: '100%' }}
                            minimumValue={0}
                            maximumValue={duration}
                            minimumTrackTintColor={palette.accent}
                            maximumTrackTintColor={palette.subtext}
                            thumbTintColor={palette.accent}
                            value={position}
                            onSlidingComplete={onSlidingComplete}
                        />

                        <View style={styles.durationContainer}>
                            <Text style={[styles.durationText, { color: dimColorTheme }]}> {formatTime(position)}</Text>
                            <Text style={[styles.durationText, { color: dimColorTheme }]}> {formatTime(duration)}</Text>
                        </View>
                    </View>
                  
                    <View style={[styles.featuresIconContainer, { marginTop: 50 }]}>
                        <TouchableOpacity onPress={handlePreviousSong} style={[styles.playPousedContainer, { backgroundColor: 'transparent', marginLeft: -22 }]}>
                            <FontAwesomeIcon icon={faBackwardStep} size={22} style={{ color: themeColor }} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.playPousedContainer, { backgroundColor: palette.accent }]} onPress={playPause}>
                            <FontAwesomeIcon icon={isSongPlaying === true ? faPause : faPlay} size={25} style={{ color: bgTheme }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleNextSong} style={[styles.playPousedContainer, { backgroundColor: 'transparent', marginRight: -22 }]}>
                            <FontAwesomeIcon icon={faForwardStep} size={22} style={{ color: themeColor }} />
                        </TouchableOpacity>
                    </View>
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

    playPousedContainer: {
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 50,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featuresIconContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 12,
        paddingRight: 12,
        marginTop: 30,
        alignItems: 'center'
    },
    toolBarIconsContainer: {
        borderRadius: 16,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    durationText: {
        fontSize: 10
    },
    durationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 12,
        paddingRight: 12
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
        shadowOffset: { width: 0, height: 14 },
        elevation: 8,

    },
    toolBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },

    content: {
        height: Dimensions.get('window').height,
        paddingTop: 10,
        paddingHorizontal: 20,
        flex: 1,

    },
    gradient: {
        flex: 1,
    },
    infoCard: {
        marginTop: 20,
        paddingHorizontal: 20,
        height: 72,
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: 1,
    },
    songName: {
        fontSize: 18
    }
});

export default AudioPlayer;
