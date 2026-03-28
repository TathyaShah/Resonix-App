import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    StatusBar,
    Platform,
    ToastAndroid,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faMusic, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer from 'react-native-track-player';
import { selectedSong, setIsSongPlaying } from '../../redux/action';
import useResonixTheme from '../../hooks/useResonixTheme';

const PLAYLISTS = [
    { id: 'fav', name: 'Favorites', subtitle: 'Your saved songs' },
    { id: '1', name: 'Workout', subtitle: 'High-energy picks' },
    { id: '2', name: 'Chill', subtitle: 'Relaxed listening' },
];

const FILTERS = ['Songs', 'Artist', 'Album', 'Playlist'];

const SearchMusic = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const songs = useSelector(state => state.allSongsReducer);
    const selectedItem = useSelector(state => state.selectedSongReducer);
    const isSongPlaying = useSelector(state => state.isSongPlaying);
    const palette = useResonixTheme();
    const inputRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('Songs');
    const [history, setHistory] = useState([]);

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
            return PLAYLISTS
                .filter(playlist => playlist.name.toLowerCase().includes(lower))
                .map(playlist => ({
                    id: playlist.id,
                    type: 'playlist',
                    title: playlist.name,
                    subtitle: playlist.subtitle,
                }));
        }

        return songs
            .filter(song =>
                (song.title || '').toLowerCase().includes(lower) ||
                (song.artist || '').toLowerCase().includes(lower) ||
                (song.album || '').toLowerCase().includes(lower)
            )
            .filter(song => !(selectedItem && selectedItem.url && song.url === selectedItem.url));
    }, [filterType, searchQuery, selectedItem, songs]);

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
                playlist: PLAYLISTS.find(playlist => playlist.id === item.id) || { id: item.id, name: item.title },
            });
            return;
        }
        playSong(item);
    };

    const renderSongItem = ({ item }) => {
        const isSelected = selectedItem && selectedItem.url === item.url;
        return (
            <TouchableOpacity
                onPress={() => openResult(item)}
                style={[styles.songRow, { backgroundColor: palette.surface, borderColor: isSelected ? palette.accent : palette.border }]}
            >
                <View style={[styles.musicIconContainer, { backgroundColor: isSelected ? palette.accent : palette.accentSoft }]}>
                    <FontAwesomeIcon icon={faMusic} size={18} color='white' />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: isSelected ? palette.accent : palette.text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={{ color: palette.subtext, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                        {`${item.artist || 'Unknown Artist'} - ${item.album || 'Unknown Album'}`}
                    </Text>
                </View>
            </TouchableOpacity>
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.cancelPill, { backgroundColor: palette.surfaceMuted }]}>
                    <Text style={{ color: palette.success, fontWeight: '700' }}>Close</Text>
                </TouchableOpacity>
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
        </View>
    );
};

const styles = StyleSheet.create({
    searchShell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        marginTop: 10,
        marginBottom: 10,
    },
    searchBar: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 18,
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
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
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
    musicIconContainer: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
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
});

export default SearchMusic;
