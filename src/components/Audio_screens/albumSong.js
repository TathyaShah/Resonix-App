import React, { useEffect, useState, useContext, useRef } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
    Modal,
    Pressable, TouchableWithoutFeedback, PanResponder, PermissionsAndroid,
} from 'react-native';
import useTheme from '../../hooks/useTheme';
import useResonixTheme from '../../hooks/useResonixTheme';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faEllipsisVertical, faPlay,
    faHeart,
    faTimes,
    faShareAlt, faInfoCircle, faTrashCan,
    faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux'
import { selectedSong, setIsSongPlaying, setFavouritesSongs } from '../../redux/action';
import TrackPlayer from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import SongThumbnail from '../SongThumbnail';
import MoodAssignmentModal from '../MoodAssignmentModal';
import { getAssignedMoodsForSong, getSongMoodAssignments, setSongMoods } from '../../utils/moods';
const AlbumSongs = ({ route, navigation }) => {
    const Songs = useSelector((state) => state.allSongsReducer);
    const [selectedArtistSongs, setselectedArtistSongs] = useState([]);
    const dispatch = useDispatch()
    const selectedItem = useSelector((state) => state.selectedSongReducer);
    const isSongPlaying = useSelector((state) => state.isSongPlaying);
    const { isDarkMode } = useTheme();
    const palette = useResonixTheme();
    const [songItem, setSongItem] = useState();
    const { albumName } = route.params;
    const themeColor = isDarkMode ? Colors.white : Colors.black;
    const bgTheme = isDarkMode ? Colors.black : Colors.white;
    const dimColorTheme = isDarkMode ? Colors.light : Colors.darker;
    const [modalVisible, setModalVisible] = useState(false);
    const [optionModalVisible, setOptionModalVisible] = useState(false);
    const [songsize, setSongSize] = useState(0);
    const [songDate, setSongDate] = useState(0);
    const [openDeleteSongmodal, setOpenDeleteSongmodal] = useState(false);
    const [moodModalVisible, setMoodModalVisible] = useState(false);
    const [selectedMoods, setSelectedMoods] = useState([]);

    useEffect(() => {
        if (albumName) {
            const filteredSongs = Songs.filter(song => song.album === albumName);
            setselectedArtistSongs(filteredSongs);
        } else {
            setselectedArtistSongs([]);
        }
    }, [albumName, Songs]);

    useEffect(() => {
        const getStoredFavSong = async () => {
            let favSongsArray = [];
            const existingSongs = await AsyncStorage.getItem('favSongs');
            if (existingSongs !== null) {
                favSongsArray = JSON.parse(existingSongs);
                dispatch(setFavouritesSongs(favSongsArray));
            }
        }
        getStoredFavSong();
    }, [])

    const handleSongItem = async (item) => {
        setOptionModalVisible(false)
        if (selectedItem && selectedItem.url === item.url && isSongPlaying) {
            ToastAndroid.show('Already Playing...', ToastAndroid.SHORT);
        }
        else {
            dispatch(selectedSong(item));
            storeSelectedSong(item);
            await TrackPlayer.play();
            dispatch(setIsSongPlaying(true));
        }

    }
    const storeSelectedSong = async (song) => {
        try {
            if (song) {
                await AsyncStorage.setItem('lastPlayedSong', JSON.stringify(song));
            }
        } catch (error) {
            console.error('Failed to store selected song:', error);
        }
    };

    const openBottomSheet = (item) => {
        setOptionModalVisible(true)
        setSongItem(item);
    };

    const openMoodAssignment = async item => {
        try {
            const assignments = await getSongMoodAssignments();
            setSelectedMoods(getAssignedMoodsForSong(assignments, item));
            setSongItem(item);
            setOptionModalVisible(false);
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


    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderRelease: (e, gestureState) => {
                if (gestureState.dy > 50) {
                    setModalVisible(false)
                    setOptionModalVisible(false)
                }
            },
        })
    ).current;

    const shareSong = async (song) => {
        setOptionModalVisible(false)
        try {
            const filePath = song.url;
            const fileName = filePath.split('/').pop();
            const fileExtension = fileName.split('.').pop();
            const mimeType = `audio/${fileExtension}`;
            const options = {
                title: 'Share Audio',
                url: 'file://' + song.url,
                type: mimeType
            };
            await Share.open(options);
        } catch (error) {
            ToastAndroid.show('Cancel', ToastAndroid.SHORT);

        }
    };


    const openSongInfoModal = (song) => {
        setOptionModalVisible(false)
        setModalVisible(true);
        setSongItem(song);

        getFileSize(song.url).then((size) => {
            if (size !== null) {
                setSongSize(size)
            }
        });

        getFileDateTime(song.url).then((dateTime) => {
            if (dateTime !== null) {
                setSongDate(dateTime)
            }
        });
    }


    const addFavSongItem = async (favSong) => {
        setOptionModalVisible(false)
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
    function formatDuration(duration) {
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);

        const hoursDisplay = hours > 0 ? `${hours}:` : '';
        const minutesDisplay = `${minutes < 10 && hours > 0 ? '0' : ''}${minutes}:`;
        const secondsDisplay = `${seconds < 10 ? '0' : ''}${seconds}`;
        return `${hoursDisplay}${minutesDisplay}${secondsDisplay}`;
    }



    const getFileExtension = (url) => {
        const parts = url.split('.');
        return parts[parts.length - 1];
    };

    const getFileSize = async (url) => {
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
            } else {
                throw new Error('Content-Length header not found');
            }
        } catch (error) {
            console.error('Error getting file size:', error);
            return null;
        }
    };

    const formatFileSize = (sizeInBytes) => {
        if (sizeInBytes < 1024) {
            return sizeInBytes + ' B';
        } else if (sizeInBytes < 1024 * 1024) {
            return (sizeInBytes / 1024).toFixed(2) + ' KB';
        } else if (sizeInBytes < 1024 * 1024 * 1024) {
            return (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
        } else {
            return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }
    };
    const getFileDateTime = async (url) => {
        try {
            const fileInfo = await RNFS.stat(url);
            const date = fileInfo.mtime;
            return date.toLocaleString();
        } catch (error) {
            console.error('Error getting file date and time:', error);
            return null;
        }
    };

    const deleteSong = () => {
        setOpenDeleteSongmodal(true);
        setOptionModalVisible(false);
    }
    const deleteSongfromLocal = async () => {
        if (songItem && songItem.url) {
            const filePath = songItem.url;
            console.log('File Path:', filePath);

            try {
                const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
                const hasPermission = await PermissionsAndroid.check(permission);

                if (!hasPermission) {
                    const granted = await PermissionsAndroid.request(permission);
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        console.log('Permission denied');
                        return;
                    }
                }

                const fileExists = await RNFS.exists(filePath);
                console.log('File exists:', fileExists);

                if (fileExists) {
                    await RNFS.unlink(filePath);
                    console.log('File deleted successfully');
                    ToastAndroid.show('Song Deleted', ToastAndroid.SHORT);
                    setOpenDeleteSongmodal(false);
                } else {
                    console.log('File does not exist');
                }

            } catch (error) {
                console.log('Error:', error.message);
            }
        } else {
            console.log('Invalid file path');
        }
    };
    const goBack = () => {
        navigation.goBack();
    }

    const renderItem = ({ item }) => {
        const isSelected = selectedItem && selectedItem.url === item.url;
        return (
            <View style={{ marginBottom: 10 }}>
                <View style={[styles.songRow, { backgroundColor: palette.surface, borderColor: isSelected ? palette.accent : palette.border }]}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 }}
                        onPress={() => handleSongItem(item)} onLongPress={() => openBottomSheet(item)}
                    >
                        <SongThumbnail song={item} size={42} radius={14} textSize={16} />
                        <View style={{ flexDirection: 'column', gap: 5, alignContent: 'center', flex: 1 }}>
                            <Text style={[styles.songName, { color: isSelected ? '#E82255' : themeColor }]} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
                            <Text style={[styles.songInfo, { color: isSelected ? '#E82255' : dimColorTheme, fontSize: 10 }]} numberOfLines={1} ellipsizeMode="tail">
                                {`${item.artist || 'Unknown Artist'} - ${item.album || 'Unknown Album'}`}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ padding: 8, borderRadius: 25 }} onPress={() => openBottomSheet(item)}>
                        <FontAwesomeIcon icon={faEllipsisVertical} size={15} style={{ color: palette.subtext, }} />
                    </TouchableOpacity>
                </View>


            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: palette.background }}>
            <View style={[styles.headerContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <TouchableOpacity onPress={goBack} style={[styles.backButton, { backgroundColor: palette.surfaceMuted }]}>
                  <FontAwesomeIcon icon={faArrowLeft} size={18} style={{ color: themeColor }} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.headerText, { color: themeColor,textTransform:'capitalize' }]}>{albumName}</Text>
                  <Text style={{ color: palette.subtext, fontSize: 12 }}>{selectedArtistSongs.length} songs in this album</Text>
                </View>
            </View>

            <FlatList
                data={selectedArtistSongs}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={openDeleteSongmodal}
                onRequestClose={() => {
                    setOpenDeleteSongmodal(!openDeleteSongmodal);
                }}

            >
                <Pressable
                    style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onPress={() => setOpenDeleteSongmodal(false)}
                >
                    <TouchableWithoutFeedback >
                        <View style={{
                            backgroundColor: isDarkMode ? '#212121' : 'white',
                            padding: 20,
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            width: '100%',
                            shadowColor: '#000',
                            shadowOffset: {
                                width: 0,
                                height: 2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5,

                        }}  >
                            <View  {...panResponder.panHandlers}>
                                <View style={{ backgroundColor: '#999', width: 40, borderRadius: 5, height: 5, alignSelf: 'center', marginBottom: 20 }}></View>
                                <View style={{ flexDirection: 'column', gap: 15 }} >
                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 15, justifyContent: 'center', alignItems: 'center', padding: 15 }} onPress={deleteSongfromLocal}>
                                        <Text style={{ color: '#E82255', fontSize: 16, }}>Delete local file</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 15, justifyContent: 'center', alignItems: 'center', padding: 15 }} onPress={() => setOpenDeleteSongmodal(false)}>
                                        <Text style={{ color: themeColor, fontSize: 14 }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Pressable>
            </Modal>





            <Modal
                animationType="slide"
                transparent={true}
                visible={optionModalVisible}
                onRequestClose={() => {
                    setOptionModalVisible(!optionModalVisible);
                }}

            >
                <Pressable
                    style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
                    onPress={() => setOptionModalVisible(false)}
                >
                    <TouchableWithoutFeedback >
                        <View style={{
                            backgroundColor: isDarkMode ? '#212121' : 'white',
                            padding: 20,
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            width: '100%',
                            shadowColor: '#000',
                            shadowOffset: {
                                width: 0,
                                height: 2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5,

                        }}  >
                            <View  {...panResponder.panHandlers}>

                                <View style={{ backgroundColor: '#999', width: 40, borderRadius: 5, height: 5, alignSelf: 'center', marginBottom: 20 }}></View>
                                <View style={{ flexDirection: 'column', gap: 15 }} >
                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => handleSongItem(songItem)}>
                                        <FontAwesomeIcon icon={faPlay} size={16} style={{ color: dimColorTheme }} />
                                        <Text style={{ color: dimColorTheme, fontSize: 14 }}>Play this song</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => addFavSongItem(songItem)}>
                                        <FontAwesomeIcon icon={faHeart} size={16} style={{ color: dimColorTheme }} />
                                        <Text style={{ color: dimColorTheme, fontSize: 14 }}>Add to favourites</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => openMoodAssignment(songItem)}>
                                        <FontAwesomeIcon icon={faPlay} size={16} style={{ color: dimColorTheme }} />
                                        <Text style={{ color: dimColorTheme, fontSize: 14 }}>Assign to mood</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => shareSong(songItem)}>
                                        <FontAwesomeIcon icon={faShareAlt} size={16} style={{ color: dimColorTheme }} />
                                        <Text style={{ color: dimColorTheme, fontSize: 14 }}>Share song file</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => openSongInfoModal(songItem)}>
                                        <FontAwesomeIcon icon={faInfoCircle} size={16} style={{ color: themeColor }} />
                                        <Text style={{ color: themeColor, fontSize: 14 }}>Song info</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => deleteSong(songItem)}>
                                        <FontAwesomeIcon icon={faTrashCan} size={16} style={{ color: themeColor }} />
                                        <Text style={{ color: themeColor, fontSize: 14 }}>Delete song </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => setOptionModalVisible(false)}>
                                        <FontAwesomeIcon icon={faTimes} size={16} style={{ color: '#E82255' }} />
                                        <Text style={{ color: '#E82255', fontSize: 14 }}>Close </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
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
                    style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
                    onPress={() => setModalVisible(false)}
                >
                    <TouchableWithoutFeedback >
                        <View style={{
                            backgroundColor: isDarkMode ? '#212121' : 'white',
                            padding: 20,
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            width: '100%',
                            shadowColor: '#000',
                            shadowOffset: {
                                width: 0,
                                height: 2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5,

                        }}  >

                            <View style={{ backgroundColor: '#999', width: 40, borderRadius: 5, height: 5, alignSelf: 'center', marginBottom: 20 }}></View>
                            <Text style={{ color: '#E82255', fontSize: 16, fontWeight: 'bold', marginBottom: 20 }}>Information</Text>
                            {songItem &&
                                <View style={{ flexDirection: 'column', gap: 15, marginTop: 10, }}  {...panResponder.panHandlers}>

                                    <View style={{ flexDirection: 'row', gap: 15, }}>
                                        <Text style={[styles.title, { color: themeColor }]}>Title</Text>
                                        <Text style={[styles.desc, { color: themeColor }]}>{songItem.title}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 15, }}>
                                        <Text style={[styles.title, { color: themeColor }]}>Album</Text>
                                        <Text style={[styles.desc, { color: themeColor }]}>{songItem.album}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 15, }}>
                                        <Text style={[styles.title, { color: themeColor }]}>Artist</Text>
                                        <Text style={[styles.desc, { color: themeColor }]}>{songItem.artist}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 15, }}>
                                        <Text style={[styles.title, { color: themeColor }]}>Duration</Text>
                                        <Text style={[styles.desc, { color: themeColor }]}>{formatDuration(songItem.duration)}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 15, }}>
                                        <Text style={[styles.title, { color: themeColor }]}>Size</Text>
                                        <Text style={[styles.desc, { color: themeColor }]}>{formatFileSize(songsize)}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 15, }}>
                                        <Text style={[styles.title, { color: themeColor }]}>Format</Text>
                                        <Text style={[styles.desc, { color: themeColor }]}>audio/{getFileExtension(songItem.url)}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 15, }}>
                                        <Text style={[styles.title, { color: themeColor }]}>Path</Text>
                                        <Text style={[styles.desc, { color: themeColor }]}>{songItem.url}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 15, }}>
                                        <Text style={[styles.title, { color: themeColor }]}>Date</Text>
                                        <Text style={[styles.desc, { color: themeColor }]}>{songDate}</Text>
                                    </View>
                                </View>
                            }

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
        </View>

    )
}

const styles = StyleSheet.create({

    desc: {
        flex: 1
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginTop: 18,
        marginHorizontal: 16,
        borderWidth:1,
        borderRadius: 24,

    },
    backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerText: {
        fontSize: 20,
        fontWeight: '700',
    },
    songRow: { flexDirection: 'row', gap: 5, padding: 12, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 20 },

    songInfo: {

    }
});


export default AlbumSongs;
