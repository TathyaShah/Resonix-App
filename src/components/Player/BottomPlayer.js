import React, { useEffect, useRef, useState } from 'react';
import TextTicker from 'react-native-text-ticker';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlay, faForwardStep, faPause, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux'
import { selectedSong, setIsSongPlaying } from '../../redux/action';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { } from 'react-native-track-player';
import {
    Animated,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Easing
} from 'react-native';
import useTheme from '../../hooks/useTheme';
import useResonixTheme from '../../hooks/useResonixTheme';
import { useNavigation } from '@react-navigation/native';
import SongThumbnail from '../SongThumbnail';

const BottomPlayer = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch()
    const Songs = useSelector((state) => state.allSongsReducer);
    const selected = useSelector((state) => state.selectedSongReducer);
    const isSongPlaying = useSelector((state) => state.isSongPlaying);
    //theme 
    const { isDarkMode } = useTheme();
    const palette = useResonixTheme();
    const themeColor = isDarkMode ? Colors.white : Colors.black;
    const bgTheme = palette.surface;
    const dimColorTheme = isDarkMode ? Colors.light : Colors.darker;
    const [isPlayerReady, setPlayerReady] = useState(false);
    const [playerInitialized, setPlayerInitialized] = useState(false);
    const [isHidden, setIsHidden] = useState(false);

    // make sure the TrackPlayer has been initialized before any operations
    const ensurePlayerInitialized = async () => {
        if (playerInitialized) {
            return;
        }
        try {
            // try to get current state; if it fails we assume player isn't initialized
            await TrackPlayer.getState();
            setPlayerInitialized(true);
        } catch (e) {
            // if the error says 'already been initialized', treat as ready
            if (e && e.message && e.message.includes('already been initialized')) {
                setPlayerInitialized(true);
                return;
            }
            // initialization required
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
                    await TrackPlayer.add(Songs);
                    setPlayerReady(true);
                }
            } catch (error) {
                console.error('Failed to play selected song', error);
            }
        };

        const onTrackChange = async () => {
            const ActiveTrack = await TrackPlayer.getActiveTrack();
            storeSelectedSong(ActiveTrack);
            dispatch(selectedSong(ActiveTrack));
            updateRecent(ActiveTrack);
        };

        const subscription = TrackPlayer.addEventListener('playback-track-changed', onTrackChange);
        playSelectedSong();

        return () => {
            TrackPlayer.stop();
            subscription.remove();
        };
    }, [Songs]);

    const updateRecent = async (song) => {
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
    }

    const closePlayer = async () => {
        try {
            await ensurePlayerInitialized();
            await TrackPlayer.pause();
            dispatch(setIsSongPlaying(false));
            setIsHidden(true);
        } catch (error) {
            console.error('closePlayer failed:', error);
        }
    };

    const storeSelectedSong = async (song) => {
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

    if (isHidden || !selected) {
        return null;
    }

    return (
        <SafeAreaView style={{}}>
            <View style={[styles.bottomPlayer, { backgroundColor: bgTheme, borderColor: palette.border, shadowColor: palette.shadow }]}>
                <TouchableOpacity style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }} onPress={toggleModal}>
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <SongThumbnail song={selected} size={35} radius={18} textSize={14} />
                    </Animated.View>
                    {selected !== null ? (
                        <View style={{ flex: 1 }}>
                            <TextTicker numberOfLines={1} style={[styles.songName, { color: themeColor }]} ellipsizeMode="tail" scrollSpeed={50}>
                                {selected.title}
                            </TextTicker>
                            <Text style={[, { color: dimColorTheme, fontSize: 10 }]}>{selected.artist}</Text>
                        </View>
                    ) : (
                        <Text>No music item selected</Text>

                    )}
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => playPause()} style={[styles.controls, { backgroundColor: palette.surfaceMuted }]}>
                        <FontAwesomeIcon icon={isSongPlaying === true ? faPause : faPlay} size={18} style={{ color: themeColor, alignSelf: 'center' }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleNextSong} style={[styles.controls, { backgroundColor: palette.accent }]}>
                        <FontAwesomeIcon icon={faForwardStep} size={18} style={{ color: '#fff' }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={closePlayer} style={[styles.controls, { backgroundColor: palette.surfaceMuted }]}>
                        <FontAwesomeIcon icon={faTimes} size={16} style={{ color: themeColor }} />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView >
    )
}

const styles = StyleSheet.create({
    bottomPlayer: {
        paddingLeft: 13,
        paddingRight: 14,
        paddingVertical: 12,
        width: '92%',
        minHeight: 74,
        position: 'absolute',
        bottom: 72,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderRadius: 24,
        shadowOpacity: 0.16,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    controls: {
        borderRadius: 18,
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
    }
});


export default BottomPlayer;
