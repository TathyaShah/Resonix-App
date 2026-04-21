import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    FlatList,
    Modal,
    PanResponder,
    PermissionsAndroid,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    StatusBar,
    Platform,
} from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faCheck,
    faChevronRight,
    faEllipsisVertical,
    faHeart,
    faInfoCircle,
    faMusic,
    faPlay,
    faPlus,
    faSearch,
    faShareAlt,
    faTimes,
    faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer from 'react-native-track-player';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { selectedSong, setFavouritesSongs, setIsSongPlaying } from '../../redux/action';
import useTheme from '../../hooks/useTheme';
import useResonixTheme from '../../hooks/useResonixTheme';
import MoodAssignmentModal from '../MoodAssignmentModal';
import SongThumbnail from '../SongThumbnail';
import { getAssignedMoodsForSong, getSongMoodAssignments, setSongMoods } from '../../utils/moods';

const FILTERS = ['Songs', 'Artist', 'Album', 'Playlist'];

const SearchMusic = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const songs = useSelector(state => state.allSongsReducer);
    const selectedItem = useSelector(state => state.selectedSongReducer);
    const isSongPlaying = useSelector(state => state.isSongPlaying);
    const { isDarkMode } = useTheme();
    const palette = useResonixTheme();
    const inputRef = useRef(null);
    const themeColor = isDarkMode ? Colors.white : Colors.black;
    const dimColorTheme = isDarkMode ? Colors.light : Colors.darker;

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('Songs');
    const [history, setHistory] = useState([]);
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [songOptionsVisible, setSongOptionsVisible] = useState(false);
    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [songForOptions, setSongForOptions] = useState(null);
    const [songForPlaylist, setSongForPlaylist] = useState(null);
    const [selectedPlaylists, setSelectedPlaylists] = useState([]);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [songItem, setSongItem] = useState(null);
    const [songsize, setSongSize] = useState(0);
    const [songDate, setSongDate] = useState(0);
    const [openDeleteSongmodal, setOpenDeleteSongmodal] = useState(false);
    const [moodModalVisible, setMoodModalVisible] = useState(false);
    const [selectedMoods, setSelectedMoods] = useState([]);

    const loadPlaylists = async () => {
        try {
            const saved = await AsyncStorage.getItem('userPlaylists');
            const playlists = saved ? JSON.parse(saved) : [];
            setUserPlaylists(playlists);
            return playlists;
        } catch (error) {
            console.error('Failed to load user playlists:', error);
            setUserPlaylists([]);
            return [];
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const saved = await AsyncStorage.getItem('searchHistory');
                if (saved) {
                    setHistory(JSON.parse(saved));
                }
            } catch (error) {
                console.error(error);
            }
        };
        loadHistory();
    }, []);

    useEffect(() => {
        loadPlaylists();
    }, []);

    useEffect(() => {
        const getStoredFavSong = async () => {
            let favSongsArray = [];
            const existingSongs = await AsyncStorage.getItem('favSongs');
            if (existingSongs !== null) {
                favSongsArray = JSON.parse(existingSongs);
                dispatch(setFavouritesSongs(favSongsArray));
            }
        };
        getStoredFavSong();
    }, [dispatch]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderRelease: (e, gestureState) => {
                if (gestureState.dy > 50) {
                    setModalVisible(false);
                    setSongOptionsVisible(false);
                }
            },
        })
    ).current;

    const saveHistory = async term => {
        const trimmed = term.trim();
        if (!trimmed) {
            return;
        }
        try {
            const nextHistory = [trimmed, ...history.filter(item => item !== trimmed)].slice(0, 10);
            setHistory(nextHistory);
            await AsyncStorage.setItem('searchHistory', JSON.stringify(nextHistory));
        } catch (error) {
            console.error(error);
        }
    };

    const removeHistoryItem = async term => {
        try {
            const nextHistory = history.filter(item => item !== term);
            setHistory(nextHistory);
            await AsyncStorage.setItem('searchHistory', JSON.stringify(nextHistory));
        } catch (error) {
            console.error(error);
        }
    };

    const updateRecent = async song => {
        try {
            let arr = [];
            const stored = await AsyncStorage.getItem('recentSongs');
            if (stored) {
                arr = JSON.parse(stored);
            }
            arr = arr.filter(item => item.url !== song.url);
            arr.unshift(song);
            if (arr.length > 20) {
                arr.pop();
            }
            await AsyncStorage.setItem('recentSongs', JSON.stringify(arr));
        } catch (error) {
            console.error('recent update error', error);
        }
    };

    const playSong = async song => {
        setSongOptionsVisible(false);
        if (selectedItem && selectedItem.url === song.url && isSongPlaying) {
            ToastAndroid.show('Already Playing...', ToastAndroid.SHORT);
            navigation.navigate('AudioPlayer');
            return;
        }

        dispatch(selectedSong(song));
        await AsyncStorage.setItem('lastPlayedSong', JSON.stringify(song));
        const songIndex = songs.findIndex(item => item.url === song.url);
        if (songIndex !== -1) {
            try {
                await TrackPlayer.skip(songIndex);
            } catch (error) {
                console.warn('skip failed', error);
            }
        }
        await TrackPlayer.play();
        dispatch(setIsSongPlaying(true));
        updateRecent(song);
        navigation.navigate('AudioPlayer');
    };

    const openSongOptions = song => {
        setSongItem(song);
        setSongForOptions(song);
        setSongOptionsVisible(true);
    };

    const openMoodAssignment = async item => {
        try {
            const assignments = await getSongMoodAssignments();
            setSelectedMoods(getAssignedMoodsForSong(assignments, item));
            setSongItem(item);
            setSongOptionsVisible(false);
            setMoodModalVisible(true);
        } catch (error) {
            console.error('Failed to open mood assignment', error);
        }
    };

    const saveMoodAssignment = async moodKeys => {
        try {
            await setSongMoods(songItem, moodKeys);
            setSelectedMoods(moodKeys);
            setMoodModalVisible(false);
            ToastAndroid.show('Mood assignment updated.', ToastAndroid.SHORT);
        } catch (error) {
            console.error('Failed to save mood assignment', error);
            ToastAndroid.show('Unable to update moods.', ToastAndroid.SHORT);
        }
    };

    const shareSong = async song => {
        setSongOptionsVisible(false);
        try {
            const filePath = song.url;
            const fileName = filePath.split('/').pop();
            const fileExtension = fileName.split('.').pop();
            const mimeType = `audio/${fileExtension}`;
            const options = {
                title: 'Share Audio',
                url: 'file://' + song.url,
                type: mimeType,
            };
            await Share.open(options);
        } catch (error) {
            ToastAndroid.show('Cancel', ToastAndroid.SHORT);
        }
    };

    const addFavSongItem = async favSong => {
        setSongOptionsVisible(false);
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
                    ToastAndroid.show('Already added to favrourites.', ToastAndroid.SHORT);
                } else {
                    favSongsArray.push(favSong);
                    await AsyncStorage.setItem('favSongs', JSON.stringify(favSongsArray));
                    ToastAndroid.show('Song added to favourites.', ToastAndroid.SHORT);
                }
            } else {
                favSongsArray.push(favSong);
                await AsyncStorage.setItem('favSongs', JSON.stringify(favSongsArray));
                ToastAndroid.show('Song added to favourites.', ToastAndroid.SHORT);
            }

            dispatch(setFavouritesSongs(favSongsArray));
        } catch (error) {
            console.error('Failed to add item to array:', error);
        }
    };

    const getFileExtension = url => {
        const parts = url.split('.');
        return parts[parts.length - 1];
    };

    const getFileSize = async url => {
        try {
            let contentLength;
            if (url.startsWith('http')) {
                const response = await fetch(url, { method: 'HEAD' });
                contentLength = response.headers.get('Content-Length');
            } else {
                const fileInfo = await RNFS.stat(url);
                contentLength = fileInfo.size;
            }

            if (contentLength) {
                return parseInt(contentLength);
            }
            throw new Error('Content-Length header not found');
        } catch (error) {
            console.error('Error getting file size:', error);
            return null;
        }
    };

    const formatFileSize = sizeInBytes => {
        if (sizeInBytes < 1024) {
            return sizeInBytes + ' B';
        } else if (sizeInBytes < 1024 * 1024) {
            return (sizeInBytes / 1024).toFixed(2) + ' KB';
        } else if (sizeInBytes < 1024 * 1024 * 1024) {
            return (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
        return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    const getFileDateTime = async url => {
        try {
            const fileInfo = await RNFS.stat(url);
            const date = fileInfo.mtime;
            return date.toLocaleString();
        } catch (error) {
            console.error('Error getting file date and time:', error);
            return null;
        }
    };

    const formatDuration = duration => {
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);

        const hoursDisplay = hours > 0 ? `${hours}:` : '';
        const minutesDisplay = `${minutes < 10 && hours > 0 ? '0' : ''}${minutes}:`;
        const secondsDisplay = `${seconds < 10 ? '0' : ''}${seconds}`;
        return `${hoursDisplay}${minutesDisplay}${secondsDisplay}`;
    };

    const openSongInfoModal = song => {
        setSongOptionsVisible(false);
        setModalVisible(true);
        setSongItem(song);

        getFileSize(song.url).then(size => {
            if (size !== null) {
                setSongSize(size);
            }
        });

        getFileDateTime(song.url).then(dateTime => {
            if (dateTime !== null) {
                setSongDate(dateTime);
            }
        });
    };

    const deleteSong = () => {
        setOpenDeleteSongmodal(true);
        setSongOptionsVisible(false);
    };

    const deleteSongfromLocal = async () => {
        if (songItem && songItem.url) {
            const filePath = songItem.url;

            try {
                const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
                const hasPermission = await PermissionsAndroid.check(permission);

                if (!hasPermission) {
                    const granted = await PermissionsAndroid.request(permission);
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        return;
                    }
                }

                const fileExists = await RNFS.exists(filePath);
                if (fileExists) {
                    await RNFS.unlink(filePath);
                    ToastAndroid.show('Song Deleted', ToastAndroid.SHORT);
                    setOpenDeleteSongmodal(false);
                }
            } catch (error) {
                console.log('Error:', error.message);
            }
        }
    };

    const results = useMemo(() => {
        const lower = searchQuery.trim().toLowerCase();
        if (!lower) {
            return [];
        }

        if (filterType === 'Artist') {
            return [...new Set(songs.map(song => song.artist).filter(Boolean))]
                .filter(artist => artist.toLowerCase().includes(lower))
                .map((artist, index) => ({
                    id: `artist-${index}`,
                    type: 'artist',
                    title: artist,
                    subtitle: 'Artist',
                }));
        }

        if (filterType === 'Album') {
            return [...new Set(songs.map(song => song.album).filter(Boolean))]
                .filter(album => album.toLowerCase().includes(lower))
                .map((album, index) => ({
                    id: `album-${index}`,
                    type: 'album',
                    title: album,
                    subtitle: 'Album',
                }));
        }

        if (filterType === 'Playlist') {
            return userPlaylists
                .filter(playlist => playlist.name.toLowerCase().includes(lower))
                .map(playlist => ({
                    id: playlist.id,
                    type: 'playlist',
                    title: playlist.name,
                    subtitle: `${playlist.songs?.length || 0} songs`,
                }));
        }

        return songs
            .filter(song =>
                (song.title || '').toLowerCase().includes(lower) ||
                (song.artist || '').toLowerCase().includes(lower) ||
                (song.album || '').toLowerCase().includes(lower)
            )
            .filter(song => !(selectedItem && selectedItem.url && song.url === selectedItem.url));
    }, [filterType, searchQuery, selectedItem, songs, userPlaylists]);

    const openResult = item => {
        saveHistory(searchQuery);
        if (filterType === 'Artist') {
            navigation.navigate('artistBasedSongs', { artistName: item.title });
            return;
        }
        if (filterType === 'Album') {
            navigation.navigate('albumbasesongs', { albumName: item.title });
            return;
        }
        if (filterType === 'Playlist') {
            navigation.navigate('PlaylistDetail', {
                playlist: userPlaylists.find(playlist => playlist.id === item.id) || { id: item.id, name: item.title },
            });
            return;
        }
        playSong(item);
    };

    const closePlaylistModal = () => {
        setPlaylistModalVisible(false);
        setSongForPlaylist(null);
        setSelectedPlaylists([]);
        setNewPlaylistName('');
        setIsCreatingPlaylist(false);
    };

    const openPlaylistModalForSong = async song => {
        const playlists = await loadPlaylists();
        setSongOptionsVisible(false);
        setSongItem(song);
        setSongForPlaylist(song);
        setSelectedPlaylists(
            playlists
                .filter(playlist => playlist.songs?.some(savedSong => savedSong.url === song.url))
                .map(playlist => playlist.id)
        );
        setNewPlaylistName('');
        setIsCreatingPlaylist(false);
        setPlaylistModalVisible(true);
    };

    const togglePlaylistSelection = playlistId => {
        setSelectedPlaylists(current =>
            current.includes(playlistId)
                ? current.filter(id => id !== playlistId)
                : [...current, playlistId]
        );
    };

    const addSongToSelectedPlaylists = async () => {
        if (!songForPlaylist) {
            return;
        }

        if (selectedPlaylists.length === 0) {
            ToastAndroid.show('Please select at least one playlist', ToastAndroid.SHORT);
            return;
        }

        try {
            const stored = await AsyncStorage.getItem('userPlaylists');
            const playlists = stored ? JSON.parse(stored) : [];
            const updatedPlaylists = playlists.map(playlist => {
                if (!selectedPlaylists.includes(playlist.id)) {
                    return playlist;
                }

                const existingSongs = playlist.songs || [];
                const alreadyExists = existingSongs.some(song => song.url === songForPlaylist.url);
                return alreadyExists
                    ? playlist
                    : {
                        ...playlist,
                        songs: [...existingSongs, songForPlaylist],
                    };
            });

            await AsyncStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists));
            setUserPlaylists(updatedPlaylists);
            ToastAndroid.show('Song added to selected playlists!', ToastAndroid.SHORT);
            closePlaylistModal();
        } catch (error) {
            console.error('Failed to add song to playlists:', error);
            ToastAndroid.show('Failed to add song to playlists', ToastAndroid.SHORT);
        }
    };

    const createNewPlaylistAndAdd = async () => {
        const trimmedName = newPlaylistName.trim();
        if (!trimmedName) {
            ToastAndroid.show('Please enter a playlist name', ToastAndroid.SHORT);
            return;
        }

        if (!songForPlaylist) {
            return;
        }

        try {
            const stored = await AsyncStorage.getItem('userPlaylists');
            const playlists = stored ? JSON.parse(stored) : [];
            const duplicatePlaylist = playlists.find(
                playlist => playlist.name.trim().toLowerCase() === trimmedName.toLowerCase()
            );

            if (duplicatePlaylist) {
                ToastAndroid.show('A playlist with this name already exists', ToastAndroid.SHORT);
                return;
            }

            const updatedPlaylists = [
                ...playlists,
                {
                    id: Date.now().toString(),
                    name: trimmedName,
                    songs: [songForPlaylist],
                    createdAt: new Date().toISOString(),
                },
            ];

            await AsyncStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists));
            setUserPlaylists(updatedPlaylists);
            ToastAndroid.show(`Playlist "${trimmedName}" created and song added!`, ToastAndroid.SHORT);
            closePlaylistModal();
        } catch (error) {
            console.error('Failed to create playlist:', error);
            ToastAndroid.show('Failed to create playlist', ToastAndroid.SHORT);
        }
    };

    const renderSongItem = ({ item }) => {
        const isSelected = selectedItem && selectedItem.url === item.url;
        return (
            <View style={[styles.songRow, { backgroundColor: palette.surface, borderColor: isSelected ? palette.accent : palette.border }]}>
                <TouchableOpacity onPress={() => openResult(item)} style={styles.songMainAction}>
                    <SongThumbnail song={item} width={56} height={42} radius={14} textSize={16} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: isSelected ? palette.accent : palette.text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={{ color: palette.subtext, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                            {`${item.artist || 'Unknown Artist'} - ${item.album || 'Unknown Album'}`}
                        </Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openSongOptions(item)} style={styles.songMenuButton}>
                    <FontAwesomeIcon icon={faEllipsisVertical} size={15} color={palette.subtext} />
                </TouchableOpacity>
            </View>
        );
    };

    const renderCollectionItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => openResult(item)}
            style={[styles.collectionRow, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
            <View style={[styles.collectionIcon, { backgroundColor: palette.accentSoft }]}>
                <FontAwesomeIcon icon={faSearch} size={14} color={palette.accent} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>{item.title}</Text>
                <Text style={{ color: palette.subtext, fontSize: 12, marginTop: 4 }}>{item.subtitle}</Text>
            </View>
            <FontAwesomeIcon icon={faChevronRight} size={14} color={palette.subtext} />
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: palette.background }}>
        <View style={[styles.searchShell, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
                <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <FontAwesomeIcon icon={faSearch} size={15} style={{ color: palette.subtext }} />
                    <TextInput
                        ref={inputRef}
                        style={[styles.searchInput, { color: palette.text }]}
                        placeholder={`Search ${filterType.toLowerCase()}`}
                        placeholderTextColor={palette.subtext}
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        cursorColor={palette.accent}
                        onSubmitEditing={() => saveHistory(searchQuery)}
                    />
                    {searchQuery !== '' ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
                            <FontAwesomeIcon icon={faTimes} size={16} style={{ color: palette.subtext }} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            <View style={styles.filterWrap}>
                {FILTERS.map(type => (
                    <TouchableOpacity
                        key={type}
                        style={[
                            styles.filterChip,
                            {
                                backgroundColor: filterType === type ? palette.accent : palette.surface,
                                borderColor: filterType === type ? palette.accent : palette.border,
                            },
                        ]}
                        onPress={() => setFilterType(type)}
                    >
                        <Text style={{ color: filterType === type ? '#fff' : palette.subtext, fontSize: 12, fontWeight: '600' }}>{type}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {searchQuery === '' && history.length > 0 ? (
                <View style={[styles.historyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Text style={{ color: palette.text, marginBottom: 8, fontWeight: '700' }}>Recent searches</Text>
                    {history.map(term => (
                        <View key={term} style={[styles.historyRow, { borderColor: palette.divider }]}>
                            <TouchableOpacity
                                style={{ flex: 1 }}
                                onPress={() => {
                                    setSearchQuery(term);
                                }}
                            >
                                <Text style={{ color: palette.accent }}>{term}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => removeHistoryItem(term)} style={{ padding: 4 }}>
                                <FontAwesomeIcon icon={faTimes} size={14} color={palette.subtext} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            ) : null}

            <FlatList
                data={results}
                renderItem={filterType === 'Songs' ? renderSongItem : renderCollectionItem}
                keyExtractor={(item, index) => item.url || item.id || index.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
                ListEmptyComponent={
                    searchQuery.trim() ? (
                        <View style={styles.emptyState}>
                            <FontAwesomeIcon icon={faSearch} size={24} color={palette.subtext} />
                            <Text style={{ color: palette.subtext, marginTop: 10, fontSize: 16 }}>
                                No {filterType.toLowerCase()} found
                            </Text>
                        </View>
                    ) : null
                }
            />

            <Modal
                animationType="slide"
                transparent
                visible={songOptionsVisible}
                onRequestClose={() => setSongOptionsVisible(false)}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setSongOptionsVisible(false)}
                >
                    <Pressable
                        style={[styles.bottomSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}
                        onPress={() => {}}
                    >
                        <View style={[styles.sheetHandle, { backgroundColor: palette.divider || palette.border }]} />
                        <TouchableOpacity
                            style={styles.sheetActionRow}
                            onPress={() => playSong(songItem)}
                        >
                            <FontAwesomeIcon icon={faPlay} size={16} color={dimColorTheme} />
                            <Text style={[styles.sheetActionText, { color: dimColorTheme }]}>Play this song</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.sheetActionRow}
                            onPress={() => addFavSongItem(songItem)}
                        >
                            <FontAwesomeIcon icon={faHeart} size={16} color={dimColorTheme} />
                            <Text style={[styles.sheetActionText, { color: dimColorTheme }]}>Add to favourites</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.sheetActionRow}
                            onPress={() => openMoodAssignment(songItem)}
                        >
                            <FontAwesomeIcon icon={faMusic} size={16} color={dimColorTheme} />
                            <Text style={[styles.sheetActionText, { color: dimColorTheme }]}>Assign to mood</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.sheetActionRow}
                            onPress={() => shareSong(songItem)}
                        >
                            <FontAwesomeIcon icon={faShareAlt} size={16} color={dimColorTheme} />
                            <Text style={[styles.sheetActionText, { color: dimColorTheme }]}>Share song file</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.sheetActionRow}
                            onPress={() => openPlaylistModalForSong(songForOptions)}
                        >
                            <FontAwesomeIcon icon={faPlus} size={16} color={dimColorTheme} />
                            <Text style={[styles.sheetActionText, { color: dimColorTheme }]}>Add to playlist</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.sheetActionRow}
                            onPress={() => openSongInfoModal(songItem)}
                        >
                            <FontAwesomeIcon icon={faInfoCircle} size={16} color={themeColor} />
                            <Text style={[styles.sheetActionText, { color: themeColor }]}>Song info</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.sheetActionRow}
                            onPress={() => deleteSong(songItem)}
                        >
                            <FontAwesomeIcon icon={faTrashCan} size={16} color={themeColor} />
                            <Text style={[styles.sheetActionText, { color: themeColor }]}>Delete song</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.sheetActionRow}
                            onPress={() => setSongOptionsVisible(false)}
                        >
                            <FontAwesomeIcon icon={faTimes} size={16} color={palette.accent} />
                            <Text style={[styles.sheetActionText, { color: palette.accent }]}>Close</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={openDeleteSongmodal}
                onRequestClose={() => {
                    setOpenDeleteSongmodal(!openDeleteSongmodal);
                }}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setOpenDeleteSongmodal(false)}
                >
                    <TouchableWithoutFeedback>
                        <View style={[styles.bottomSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                            <View {...panResponder.panHandlers}>
                                <View style={[styles.sheetHandle, { backgroundColor: palette.divider || palette.border }]} />
                                <View style={{ flexDirection: 'column', gap: 15 }}>
                                    <TouchableOpacity style={styles.deleteConfirmRow} onPress={deleteSongfromLocal}>
                                        <Text style={{ color: palette.accent, fontSize: 16 }}>Delete local file</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.deleteConfirmRow} onPress={() => setOpenDeleteSongmodal(false)}>
                                        <Text style={{ color: themeColor, fontSize: 14 }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Pressable>
            </Modal>

            <MoodAssignmentModal
                visible={moodModalVisible}
                title={`Assign "${songItem?.title || 'song'}"`}
                selectedMoods={selectedMoods}
                onClose={() => setMoodModalVisible(false)}
                onSave={saveMoodAssignment}
            />

            <Modal
                transparent
                visible={playlistModalVisible}
                animationType="fade"
                onRequestClose={closePlaylistModal}
            >
                <Pressable style={styles.modalOverlay} onPress={closePlaylistModal}>
                    <Pressable
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: palette.surface,
                                borderColor: palette.border,
                            },
                        ]}
                        onPress={() => {}}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: palette.text }]}>Add to Playlist</Text>
                            <TouchableOpacity
                                onPress={closePlaylistModal}
                                style={[styles.modalCloseButton, { backgroundColor: palette.surfaceMuted }]}
                            >
                                <FontAwesomeIcon icon={faTimes} size={14} color={palette.text} />
                            </TouchableOpacity>
                        </View>

                        {!isCreatingPlaylist ? (
                            <ScrollView style={styles.playlistsContainer} showsVerticalScrollIndicator={false}>
                                <TouchableOpacity
                                    onPress={() => setIsCreatingPlaylist(true)}
                                    style={[
                                        styles.createPlaylistButton,
                                        { backgroundColor: palette.accentSoft, borderColor: palette.accent },
                                    ]}
                                >
                                    <FontAwesomeIcon icon={faPlus} size={16} color={palette.accent} />
                                    <Text style={[styles.createPlaylistText, { color: palette.accent }]}>
                                        Create New Playlist
                                    </Text>
                                </TouchableOpacity>

                                {userPlaylists.length === 0 ? (
                                    <Text style={[styles.emptyText, { color: palette.subtext }]}>
                                        No playlists available. Create one to add this song!
                                    </Text>
                                ) : (
                                    userPlaylists.map(playlist => (
                                        <TouchableOpacity
                                            key={playlist.id}
                                            onPress={() => togglePlaylistSelection(playlist.id)}
                                            style={[
                                                styles.playlistItem,
                                                {
                                                    backgroundColor: selectedPlaylists.includes(playlist.id)
                                                        ? palette.accentSoft
                                                        : palette.surfaceMuted,
                                                    borderColor: selectedPlaylists.includes(playlist.id)
                                                        ? palette.accent
                                                        : palette.border,
                                                },
                                            ]}
                                        >
                                            <View style={styles.playlistItemLeft}>
                                                <Text style={[styles.playlistName, { color: palette.text }]}>
                                                    {playlist.name}
                                                </Text>
                                                <Text style={[styles.playlistSongCount, { color: palette.subtext }]}>
                                                    {playlist.songs?.length || 0} songs
                                                </Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.checkbox,
                                                    {
                                                        backgroundColor: selectedPlaylists.includes(playlist.id)
                                                            ? palette.accent
                                                            : 'transparent',
                                                        borderColor: selectedPlaylists.includes(playlist.id)
                                                            ? palette.accent
                                                            : palette.subtext,
                                                    },
                                                ]}
                                            >
                                                {selectedPlaylists.includes(playlist.id) ? (
                                                    <FontAwesomeIcon icon={faCheck} size={12} color="#fff" />
                                                ) : null}
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        ) : (
                            <View style={styles.createPlaylistForm}>
                                <TextInput
                                    style={[
                                        styles.playlistInput,
                                        {
                                            backgroundColor: palette.surfaceMuted,
                                            borderColor: palette.border,
                                            color: palette.text,
                                        },
                                    ]}
                                    placeholder="Enter playlist name"
                                    placeholderTextColor={palette.subtext}
                                    value={newPlaylistName}
                                    onChangeText={setNewPlaylistName}
                                />
                                <View style={styles.createPlaylistButtonsRow}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsCreatingPlaylist(false);
                                            setNewPlaylistName('');
                                        }}
                                        style={[styles.cancelButton, { backgroundColor: palette.surfaceMuted }]}
                                    >
                                        <Text style={[styles.buttonText, { color: palette.text }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={createNewPlaylistAndAdd}
                                        style={[styles.confirmButton, { backgroundColor: palette.accent }]}
                                    >
                                        <Text style={[styles.buttonText, { color: '#fff' }]}>Create & Add</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {!isCreatingPlaylist && selectedPlaylists.length > 0 ? (
                            <TouchableOpacity
                                onPress={addSongToSelectedPlaylists}
                                style={[styles.addButton, { backgroundColor: palette.accent }]}
                            >
                                <Text style={styles.addButtonText}>
                                    Add to {selectedPlaylists.length} Playlist{selectedPlaylists.length !== 1 ? 's' : ''}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(!modalVisible);
                }}
            >
                <Pressable
                    style={styles.bottomSheetOverlay}
                    onPress={() => setModalVisible(false)}
                >
                    <TouchableWithoutFeedback>
                        <View style={[styles.bottomSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                            <View style={[styles.sheetHandle, { backgroundColor: palette.divider || palette.border }]} />
                            <Text style={{ color: palette.accent, fontSize: 16, fontWeight: 'bold', marginBottom: 20 }}>Information</Text>
                            {songItem ? (
                                <View style={{ flexDirection: 'column', gap: 15, marginTop: 10 }} {...panResponder.panHandlers}>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoTitle, { color: themeColor }]}>Title</Text>
                                        <Text style={[styles.infoDesc, { color: themeColor }]}>{songItem.title}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoTitle, { color: themeColor }]}>Album</Text>
                                        <Text style={[styles.infoDesc, { color: themeColor }]}>{songItem.album}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoTitle, { color: themeColor }]}>Artist</Text>
                                        <Text style={[styles.infoDesc, { color: themeColor }]}>{songItem.artist}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoTitle, { color: themeColor }]}>Duration</Text>
                                        <Text style={[styles.infoDesc, { color: themeColor }]}>{formatDuration(songItem.duration)}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoTitle, { color: themeColor }]}>Size</Text>
                                        <Text style={[styles.infoDesc, { color: themeColor }]}>{formatFileSize(songsize)}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoTitle, { color: themeColor }]}>Format</Text>
                                        <Text style={[styles.infoDesc, { color: themeColor }]}>audio/{getFileExtension(songItem.url)}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoTitle, { color: themeColor }]}>Path</Text>
                                        <Text style={[styles.infoDesc, { color: themeColor }]}>{songItem.url}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={[styles.infoTitle, { color: themeColor }]}>Date</Text>
                                        <Text style={[styles.infoDesc, { color: themeColor }]}>{songDate}</Text>
                                    </View>
                                </View>
                            ) : null}
                        </View>
                    </TouchableWithoutFeedback>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    searchShell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
        paddingHorizontal: 16,
        marginTop: 0,
        marginBottom: 10,
    },
    searchBar: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        minHeight: 54,
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        paddingHorizontal: 10,
    },
    cancelPill: {
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    filterWrap: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 12,
        justifyContent: 'space-between',
        gap:6
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 0,
    },
    historyCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 10,
    },
    songMainAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    songMenuButton: {
        padding: 8,
        borderRadius: 20,
        alignSelf: 'center',
    },
    collectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderRadius: 20,
        marginBottom: 10,
    },
    collectionIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
    },
    bottomSheetOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.18)',
    },
    bottomSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 28,
    },
    sheetHandle: {
        width: 44,
        height: 5,
        borderRadius: 999,
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
    },
    sheetActionText: {
        fontSize: 15,
        fontWeight: '600',
    },
    deleteConfirmRow: {
        flexDirection: 'row',
        gap: 15,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '80%',
        borderRadius: 24,
        borderWidth: 1,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalCloseButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playlistsContainer: {
        maxHeight: 360,
    },
    createPlaylistButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 1,
        borderRadius: 18,
        paddingVertical: 14,
        marginBottom: 14,
    },
    createPlaylistText: {
        fontSize: 14,
        fontWeight: '700',
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 18,
        fontSize: 14,
        lineHeight: 20,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
    },
    playlistItemLeft: {
        flex: 1,
        paddingRight: 12,
    },
    playlistName: {
        fontSize: 15,
        fontWeight: '600',
    },
    playlistSongCount: {
        fontSize: 12,
        marginTop: 4,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 7,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createPlaylistForm: {
        gap: 16,
    },
    playlistInput: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
    },
    createPlaylistButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButton: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    addButton: {
        borderRadius: 18,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    infoRow: {
        flexDirection: 'row',
        gap: 15,
    },
    infoTitle: {
        width: 72,
        fontWeight: '700',
    },
    infoDesc: {
        flex: 1,
    },
});

export default SearchMusic;
