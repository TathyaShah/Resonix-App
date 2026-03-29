import React, { useEffect, useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
    TextInput,
    StatusBar,
    Platform,
} from 'react-native';
import useTheme from '../../hooks/useTheme';
import useResonixTheme from '../../hooks/useResonixTheme';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faArrowLeft,
    faSearch,
} from '@fortawesome/free-solid-svg-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setFavouritesSongs } from '../../redux/action';
import { useDispatch, useSelector } from 'react-redux'
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';
import SongThumbnail from '../SongThumbnail';

const AddToFavourites = (props) => {
    const { isDarkMode } = useTheme();
    const palette = useResonixTheme();
    const dispatch = useDispatch()
    const Songs = useSelector((state) => state.allSongsReducer);
    const favSongs = useSelector((state) => state.favSongsReducer);

    const [searchQuery, setSearchQuery] = useState('');
    const themeColor = isDarkMode ? Colors.white : Colors.black;
    const dimColorTheme = isDarkMode ? Colors.light : Colors.darker;
    const [allFavSongs, setAllFavSong] = useState([]);
    const [allSongs, setfilterSongs] = useState([]);


    useEffect(() => {
        setAllFavSong(favSongs);
    }, [favSongs])
    useEffect(() => {
        setfilterSongs(Songs);
    }, [Songs])


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
                    await AsyncStorage.setItem('favSongs', JSON.stringify(favSongsArray));
                    ToastAndroid.show('Removed from favourites.', ToastAndroid.SHORT);
                }
                else {
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

        } catch (e) {
            console.error('Failed to add item to array:', e);
        }
    };

    const goBack = () => {
        props.navigation.goBack();
    };
    const handleSearch = (text) => {
        setSearchQuery(text);
        // Perform search logic here
        const filteredSongs = Songs.filter((song) =>
            song.title.toLowerCase().includes(text.toLowerCase()) ||
            song.artist.toLowerCase().includes(text.toLowerCase()) ||
            song.album.toLowerCase().includes(text.toLowerCase())
        );
        setfilterSongs(filteredSongs)
    };
    const renderItem = ({ item }) => {
        const isFav = allFavSongs.some(fav => fav.url === item.url);
        return (
            <View style={{ marginBottom: 10 }}>
                <View style={[styles.songRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <TouchableOpacity onPress={() => addFavSongItem(item)}
                        style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 }}

                    >
                        <SongThumbnail song={item} size={42} radius={14} textSize={16} />
                        <View style={{ flexDirection: 'column', gap: 5, alignContent: 'center', flex: 1 }}>
                            <Text style={[styles.songName, { color: themeColor }]} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
                            <View style={[styles.songInfo, { flexDirection: 'row', gap: 4, alignItems: 'center' }]}>
                                <Text style={{ color: dimColorTheme, fontSize: 10 }}>{item.artist}</Text>
                                <Text style={{ color: dimColorTheme, fontSize: 10 }}>-</Text>
                                <Text style={{ color: dimColorTheme, fontSize: 10 }}>{item.album}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    {isFav ?
                        <TouchableOpacity onPress={() => addFavSongItem(item)} style={{ padding:10 }}>
                            <FontAwesomeIcon icon={solidHeart} size={20} style={{ color: '#e82255', paddingLeft:5 }} />
                        </TouchableOpacity>
                        :
                        <TouchableOpacity onPress={() => addFavSongItem(item)} style={{ padding:10}}>
                            <FontAwesomeIcon icon={regularHeart} size={20} style={{ color:themeColor, paddingLeft: 5 }} />
                        </TouchableOpacity>
                    }
                </View>


            </View>
        );
    };

    return (

        <SafeAreaView>
            <View style={{ backgroundColor: palette.background, width: '100%', height: '100%' }}>
                <View style={[styles.toolBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <TouchableOpacity onPress={goBack} style={[styles.backBtn, { backgroundColor: palette.surfaceMuted }]}>
                        <FontAwesomeIcon icon={faArrowLeft} size={20} style={{ color: themeColor }} />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ color: themeColor, fontSize: 18, fontWeight: '700' }}>Add Songs</Text>
                        <Text style={{ color: palette.subtext, fontSize: 12 }}>Manage your favourite collection.</Text>
                    </View>
                </View>
                <View style={[styles.searchContainer, {
                    backgroundColor: palette.surface, color: themeColor, borderColor: palette.border
                }]}>
                    <FontAwesomeIcon icon={faSearch} size={16} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { backgroundColor: "transparent" }]}
                        placeholder="Search song, artist, album"
                        placeholderTextColor="#999"
                        onChangeText={handleSearch}
                        value={searchQuery}
                        cursorColor={'#E82255'}
                    />
                </View>

                <FlatList
                    data={allSongs}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
                />
            </View>

        </SafeAreaView>

    )



}
const styles = StyleSheet.create({
    searchContainer: {
        marginLeft: 16,
        marginRight: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 20,
        borderRadius: 18,
        borderWidth: 1,
        padding: 6,
        marginTop: 15,
        marginBottom: 10

    },
    searchIcon: {
        marginRight: 5,
    },
    searchInput: {
        height: 40,
        borderRadius: 10

    },
    toolBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderWidth: 1,
        borderRadius: 24,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        marginTop:16,
        marginHorizontal: 16,
        padding: 12,
        gap: 15
    },
    backBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    songRow: {
        flexDirection: 'row',
        gap: 5,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 20,
        borderWidth: 1,
    },
});

export default AddToFavourites;
