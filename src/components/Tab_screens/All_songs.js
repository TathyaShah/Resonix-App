import React, {useEffect, useState, useContext, useRef} from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  PanResponder,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import TextTicker from 'react-native-text-ticker';
import useTheme from '../../hooks/useTheme';
import useResonixTheme from '../../hooks/useResonixTheme';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
  faHeart,
  faMusic,
  faEllipsisVertical,
  faTimes,
  faPlay,
  faShuffle,
  faShareAlt,
  faInfoCircle,
  faTrashCan,
  faPlus,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import {useDispatch, useSelector} from 'react-redux';
import {
  selectedSong,
  setIsSongPlaying,
  setFavouritesSongs,
  setAllSongs,
} from '../../redux/action';
import TrackPlayer from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppContext} from '../../../App';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import SongThumbnail from '../SongThumbnail';
import MoodAssignmentModal from '../MoodAssignmentModal';
import {
  getAssignedMoodsForSong,
  getSongMoodKey,
  getSongMoodAssignments,
  saveSongMoodAssignments,
  setSongMoods,
} from '../../utils/moods';
import {normalizeTracks} from '../../utils/trackPlayer';

const All_songs = props => {
  const {fetchMoreSongs} = useContext(AppContext);
  const dispatch = useDispatch();
  const Songs = useSelector(state => state.allSongsReducer);
  const selectedItem = useSelector(state => state.selectedSongReducer);
  const isSongPlaying = useSelector(state => state.isSongPlaying);

  const {isDarkMode} = useTheme();
  const palette = useResonixTheme();
  const [songItem, setSongItem] = useState();
  const themeColor = isDarkMode ? Colors.white : Colors.black;
  const dimColorTheme = isDarkMode ? Colors.light : Colors.darker;
  const [modalVisible, setModalVisible] = useState(false);
  const [optionModalVisible, setOptionModalVisible] = useState(false);
  const [songsize, setSongSize] = useState(0);
  const [songDate, setSongDate] = useState(0);
  const [openDeleteSongmodal, setOpenDeleteSongmodal] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const playAllSongs = async () => {
    if (isSongPlaying) {
      await TrackPlayer.skip(0);
      await TrackPlayer.pause();
      dispatch(setIsSongPlaying(false));
    } else {
      await TrackPlayer.skip(0);
      await TrackPlayer.play();
      dispatch(setIsSongPlaying(true));
    }
  };

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
  }, []);

  useEffect(() => {
    const setDefaultPlayingSong = async () => {
      try {
        const lastPlayed = await getSelectedSong();
        if (lastPlayed) {
          dispatch(selectedSong(lastPlayed));
        } else {
          dispatch(selectedSong(Songs[0]));
          await TrackPlayer.pause();
          dispatch(setIsSongPlaying(false));
        }
      } catch (error) {
        console.error('Failed to set default playing song:', error);
      }
    };
    setDefaultPlayingSong();
  }, [Songs]);

  const isFetchingMoreRef = useRef(false);

  const handleEndReached = () => {
    if (isFetchingMoreRef.current) return;
    isFetchingMoreRef.current = true;
    // ask App context to append next chunk
    if (typeof fetchMoreSongs === 'function') fetchMoreSongs();
    // simple throttle to avoid rapid repeated calls
    setTimeout(() => {
      isFetchingMoreRef.current = false;
    }, 800);
  };

  const updateRecent = async song => {
    try {
      let arr = [];
      const stored = await AsyncStorage.getItem('recentSongs');
      if (stored) arr = JSON.parse(stored);
      arr = arr.filter(s => s.url !== song.url);
      arr.unshift(song);
      if (arr.length > 20) arr.pop();
      await AsyncStorage.setItem('recentSongs', JSON.stringify(arr));
    } catch (e) {
      console.error('recent update error', e);
    }
  };

  const handleSongItem = async item => {
    setOptionModalVisible(false);
    if (selectedItem && selectedItem.url === item.url && isSongPlaying) {
      ToastAndroid.show('Already Playing...', ToastAndroid.SHORT);
    } else {
      dispatch(selectedSong(item));
      storeSelectedSong(item);
      dispatch(setIsSongPlaying(true));
      await TrackPlayer.play();
      updateRecent(item);
    }
  };

  const shuffleSongs = async () => {
    try {
      if (!Songs.length) {
        return;
      }
      const shuffledSongs = [...Songs]
        .map(song => ({song, sortKey: Math.random()}))
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(item => item.song);
      const normalizedSongs = normalizeTracks(shuffledSongs);
      const firstSong = normalizedSongs[0];

      await TrackPlayer.stop();
      await TrackPlayer.reset();
      await TrackPlayer.add(normalizedSongs);
      await TrackPlayer.skip(0);
      dispatch(selectedSong(firstSong));
      await storeSelectedSong(firstSong);
      dispatch(setIsSongPlaying(true));
      await TrackPlayer.play();
      updateRecent(firstSong);
    } catch (error) {
      console.error('Shuffle failed', error);
      ToastAndroid.show('Unable to shuffle songs.', ToastAndroid.SHORT);
    }
  };
  const getSelectedSong = async () => {
    try {
      const lastPlayedSong = await AsyncStorage.getItem('lastPlayedSong');
      return lastPlayedSong ? JSON.parse(lastPlayedSong) : null;
    } catch (error) {
      console.error('Failed to retrieve selected song:', error);
      return null;
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

  const openBottomSheet = item => {
    setOptionModalVisible(true);
    setSongItem(item);
  };

  const loadAvailablePlaylists = async () => {
    try {
      const stored = await AsyncStorage.getItem('userPlaylists');
      const playlists = stored ? JSON.parse(stored) : [];
      setAvailablePlaylists(playlists);
      return playlists;
    } catch (error) {
      console.error('Failed to load playlists:', error);
      setAvailablePlaylists([]);
      return [];
    }
  };

  const openPlaylistModal = async song => {
    const playlists = await loadAvailablePlaylists();
    setSongItem(song);
    setOptionModalVisible(false);
    setSelectedPlaylists(
      playlists
        .filter(playlist =>
          playlist.songs?.some(savedSong => savedSong.url === song.url),
        )
        .map(playlist => playlist.id),
    );
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
    setPlaylistModalVisible(true);
  };

  const closePlaylistModal = () => {
    setPlaylistModalVisible(false);
    setSelectedPlaylists([]);
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
  };

  const togglePlaylistSelection = playlistId => {
    setSelectedPlaylists(current =>
      current.includes(playlistId)
        ? current.filter(id => id !== playlistId)
        : [...current, playlistId],
    );
  };

  const createNewPlaylistAndAdd = async () => {
    const trimmedName = newPlaylistName.trim();
    if (!trimmedName) {
      ToastAndroid.show('Please enter a playlist name', ToastAndroid.SHORT);
      return;
    }

    if (!songItem) {
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('userPlaylists');
      const playlists = stored ? JSON.parse(stored) : [];
      const duplicatePlaylist = playlists.find(
        playlist =>
          playlist.name.trim().toLowerCase() === trimmedName.toLowerCase(),
      );

      if (duplicatePlaylist) {
        ToastAndroid.show(
          'A playlist with this name already exists',
          ToastAndroid.SHORT,
        );
        return;
      }

      const updatedPlaylists = [
        ...playlists,
        {
          id: Date.now().toString(),
          name: trimmedName,
          songs: [songItem],
          createdAt: new Date().toISOString(),
        },
      ];

      await AsyncStorage.setItem(
        'userPlaylists',
        JSON.stringify(updatedPlaylists),
      );
      setAvailablePlaylists(updatedPlaylists);
      ToastAndroid.show(
        `Playlist "${trimmedName}" created and song added!`,
        ToastAndroid.SHORT,
      );
      closePlaylistModal();
    } catch (error) {
      console.error('Failed to create playlist:', error);
      ToastAndroid.show('Failed to create playlist', ToastAndroid.SHORT);
    }
  };

  const addSongToSelectedPlaylists = async () => {
    if (!songItem) {
      return;
    }

    if (selectedPlaylists.length === 0) {
      ToastAndroid.show(
        'Please select at least one playlist',
        ToastAndroid.SHORT,
      );
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
        const alreadyExists = existingSongs.some(
          song => song.url === songItem.url,
        );
        return alreadyExists
          ? playlist
          : {
              ...playlist,
              songs: [...existingSongs, songItem],
            };
      });

      await AsyncStorage.setItem(
        'userPlaylists',
        JSON.stringify(updatedPlaylists),
      );
      setAvailablePlaylists(updatedPlaylists);
      ToastAndroid.show(
        'Song added to selected playlists!',
        ToastAndroid.SHORT,
      );
      closePlaylistModal();
    } catch (error) {
      console.error('Failed to add song to playlists:', error);
      ToastAndroid.show('Failed to add song to playlists', ToastAndroid.SHORT);
    }
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
          setModalVisible(false);
          setOptionModalVisible(false);
        }
      },
    }),
  ).current;

  const shareSong = async song => {
    setOptionModalVisible(false);
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

  const openSongInfoModal = song => {
    setOptionModalVisible(false);
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

  const addFavSongItem = async favSong => {
    setOptionModalVisible(false);
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
          ToastAndroid.show(
            'Already added to favrourites.',
            ToastAndroid.SHORT,
          );
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

  const getFileExtension = url => {
    const parts = url.split('.');
    return parts[parts.length - 1];
  };

  const getFileSize = async url => {
    try {
      let contentLength;
      if (url.startsWith('http')) {
        const response = await fetch(url, {method: 'HEAD'});
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

  const formatFileSize = sizeInBytes => {
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

  const deleteSong = () => {
    setOpenDeleteSongmodal(true);
    setOptionModalVisible(false);
  };

  const getSongIdentity = song =>
    song?.url ||
    song?.path ||
    song?.id ||
    `${song?.title || ''}-${song?.artist || ''}`;

  const removeSongFromSavedData = async deletedSong => {
    const deletedIdentity = getSongIdentity(deletedSong);
    const isSameSong = item => getSongIdentity(item) === deletedIdentity;
    const removeFromSongList = list =>
      Array.isArray(list) ? list.filter(item => !isSameSong(item)) : [];

    const updatedSongs = removeFromSongList(Songs);
    dispatch(setAllSongs(updatedSongs));

    if (selectedItem && isSameSong(selectedItem)) {
      dispatch(selectedSong(updatedSongs[0] || null));
      dispatch(setIsSongPlaying(false));
      await TrackPlayer.reset();

      if (updatedSongs[0]) {
        await storeSelectedSong(updatedSongs[0]);
      } else {
        dispatch(
          selectedSong({
            id: null,
            url: null,
            path: null,
            title: '',
            artist: '',
            album: '',
          }),
        );
        await AsyncStorage.removeItem('lastPlayedSong');
      }
    }

    const [
      storedFavSongs,
      storedRecentSongs,
      storedPlaylists,
      storedMoodAssignments,
    ] = await Promise.all([
      AsyncStorage.getItem('favSongs'),
      AsyncStorage.getItem('recentSongs'),
      AsyncStorage.getItem('userPlaylists'),
      getSongMoodAssignments(),
    ]);

    const updatedFavSongs = removeFromSongList(
      storedFavSongs ? JSON.parse(storedFavSongs) : [],
    );
    const updatedRecentSongs = removeFromSongList(
      storedRecentSongs ? JSON.parse(storedRecentSongs) : [],
    );
    const playlists = storedPlaylists ? JSON.parse(storedPlaylists) : [];
    const updatedPlaylists = Array.isArray(playlists)
      ? playlists.map(playlist => ({
          ...playlist,
          songs: removeFromSongList(playlist.songs),
        }))
      : [];
    const updatedMoodAssignments = {...storedMoodAssignments};
    delete updatedMoodAssignments[getSongMoodKey(deletedSong)];
    delete updatedMoodAssignments[deletedSong.url];
    delete updatedMoodAssignments[deletedSong.path];
    delete updatedMoodAssignments[deletedSong.id];
    delete updatedMoodAssignments[deletedIdentity];

    await Promise.all([
      AsyncStorage.setItem('favSongs', JSON.stringify(updatedFavSongs)),
      AsyncStorage.setItem('recentSongs', JSON.stringify(updatedRecentSongs)),
      AsyncStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists)),
      saveSongMoodAssignments(updatedMoodAssignments),
    ]);

    dispatch(setFavouritesSongs(updatedFavSongs));
  };

  const deleteSongfromLocal = async () => {
    if (songItem && songItem.url) {
      const filePath = songItem.url;
      console.log('File Path:', filePath);

      try {
        if (Platform.OS === 'android' && Platform.Version < 33) {
          const permission =
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
          const hasPermission = await PermissionsAndroid.check(permission);

          if (!hasPermission) {
            const granted = await PermissionsAndroid.request(permission);
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              console.log('Permission denied');
              return;
            }
          }
        }

        const fileExists = await RNFS.exists(filePath);
        console.log('File exists:', fileExists);

        if (fileExists) {
          await RNFS.unlink(filePath);
          await removeSongFromSavedData(songItem);
          console.log('File deleted successfully');
          ToastAndroid.show('Song Deleted', ToastAndroid.SHORT);
          setOpenDeleteSongmodal(false);
          setSongItem(null);
        } else {
          console.log('File does not exist');
          await removeSongFromSavedData(songItem);
          ToastAndroid.show('Song removed from library', ToastAndroid.SHORT);
          setOpenDeleteSongmodal(false);
          setSongItem(null);
        }
      } catch (error) {
        console.log('Error:', error.message);
        ToastAndroid.show('Unable to delete song', ToastAndroid.SHORT);
      }
    } else {
      console.log('Invalid file path');
    }
  };

  const renderItem = ({item}) => {
    const isSelected = selectedItem && selectedItem.url === item.url;
    return (
      <View style={styles.songItemWrap}>
        <View
          style={[
            styles.songRow,
            {
              backgroundColor: palette.surface,
              borderColor: isSelected ? palette.accent : palette.border,
            },
          ]}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              flex: 1,
            }}
            onPress={() => handleSongItem(item)}
            onLongPress={() => openBottomSheet(item)}>
            <SongThumbnail
              song={item}
              width={56}
              height={42}
              radius={14}
              textSize={16}
            />
            <View
              style={{
                flex: 1,
                alignContent: 'center',
                justifyContent: 'center',
                minWidth: 0,
              }}>
              <Text
                style={[
                  styles.songName,
                  {color: isSelected ? palette.accent : themeColor},
                ]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {item.title}
              </Text>
              {isSelected ? (
                <TextTicker
                  style={[styles.songInfoText, {color: dimColorTheme}]}
                  duration={12000}
                  loop
                  bounce={false}
                  repeatSpacer={80}
                  marqueeDelay={1200}
                  scrollSpeed={20}
                  useNativeDriver
                  numberOfLines={1}>
                  {`${item.artist || 'Unknown Artist'}  -  ${
                    item.album || 'Unknown Album'
                  }${item.genre ? '  -  ' + item.genre : ''}`}
                </TextTicker>
              ) : (
                <Text
                  style={[styles.songInfoText, {color: dimColorTheme}]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {`${item.artist || 'Unknown Artist'} - ${
                    item.album || 'Unknown Album'
                  }${item.genre ? ' - ' + item.genre : ''}`}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{padding: 8, borderRadius: 25}}
            onPress={() => openBottomSheet(item)}>
            <FontAwesomeIcon
              icon={faEllipsisVertical}
              size={15}
              style={{color: palette.subtext}}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView>
      <View
        style={{
          backgroundColor: palette.background,
          width: '100%',
          height: '100%',
        }}>
        <View style={styles.actionWrap}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.playAllButton}
              onPress={playAllSongs}>
              <View
                style={[
                  styles.playAllIconWrap,
                  {backgroundColor: palette.accent},
                ]}>
                <FontAwesomeIcon
                  icon={faPlay}
                  size={10}
                  style={{color: '#fff'}}
                />
              </View>
              <Text style={[styles.playAllText, {color: palette.text}]}>
                Play All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shuffleButton}
              onPress={shuffleSongs}>
              <FontAwesomeIcon
                icon={faShuffle}
                size={14}
                style={{color: palette.accent}}
              />
              <Text style={[styles.shuffleButtonText, {color: palette.text}]}>
                Shuffle
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View
          style={[
            styles.musicContainer,
            {backgroundColor: palette.background},
          ]}>
          <FlatList
            data={Songs}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={openDeleteSongmodal}
        onRequestClose={() => {
          setOpenDeleteSongmodal(!openDeleteSongmodal);
        }}>
        <Pressable
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          onPress={() => setOpenDeleteSongmodal(false)}>
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: isDarkMode ? '#212121' : 'white',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: 20,
                width: '100%',
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}>
              <View {...panResponder.panHandlers}>
                <View
                  style={{
                    backgroundColor: '#999',
                    width: 40,
                    borderRadius: 5,
                    height: 5,
                    alignSelf: 'center',
                    marginBottom: 20,
                  }}></View>
                <View style={{flexDirection: 'column', gap: 15}}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      gap: 15,
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 15,
                    }}
                    onPress={deleteSongfromLocal}>
                    <Text style={{color: palette.accent, fontSize: 16}}>
                      Delete local file
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      gap: 15,
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 15,
                    }}
                    onPress={() => setOpenDeleteSongmodal(false)}>
                    <Text style={{color: themeColor, fontSize: 14}}>
                      Cancel
                    </Text>
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
        }}>
        <Pressable
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          }}
          onPress={() => setOptionModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: isDarkMode ? '#212121' : 'white',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: 20,
                width: '100%',
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}>
              <View {...panResponder.panHandlers}>
                <View
                  style={{
                    backgroundColor: '#999',
                    width: 40,
                    borderRadius: 5,
                    height: 5,
                    alignSelf: 'center',
                    marginBottom: 20,
                  }}></View>
                <View style={{flexDirection: 'column', gap: 15}}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      gap: 15,
                      alignItems: 'center',
                      padding: 10,
                    }}
                    onPress={() => handleSongItem(songItem)}>
                    <FontAwesomeIcon
                      icon={faPlay}
                      size={16}
                      style={{color: dimColorTheme}}
                    />
                    <Text style={{color: dimColorTheme, fontSize: 14}}>
                      Play this song
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      gap: 15,
                      alignItems: 'center',
                      padding: 10,
                    }}
                    onPress={() => addFavSongItem(songItem)}>
                    <FontAwesomeIcon
                      icon={faHeart}
                      size={16}
                      style={{color: dimColorTheme}}
                    />
                    <Text style={{color: dimColorTheme, fontSize: 14}}>
                      Add to favourites
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      gap: 15,
                      alignItems: 'center',
                      padding: 10,
                    }}
                    onPress={() => openMoodAssignment(songItem)}>
                    <FontAwesomeIcon
                      icon={faMusic}
                      size={16}
                      style={{color: dimColorTheme}}
                    />
                    <Text style={{color: dimColorTheme, fontSize: 14}}>
                      Assign to mood
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      gap: 15,
                      alignItems: 'center',
                      padding: 10,
                    }}
                    onPress={() => shareSong(songItem)}>
                    <FontAwesomeIcon
                      icon={faShareAlt}
                      size={16}
                      style={{color: dimColorTheme}}
                    />
                    <Text style={{color: dimColorTheme, fontSize: 14}}>
                      Share song file
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      gap: 15,
                      alignItems: 'center',
                      padding: 10,
                    }}
                    onPress={() => openPlaylistModal(songItem)}>
                    <FontAwesomeIcon
                      icon={faPlus}
                      size={16}
                      style={{color: dimColorTheme}}
                    />
                    <Text style={{color: dimColorTheme, fontSize: 14}}>
                      Add to playlist
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      gap: 15,
                      alignItems: 'center',
                      padding: 10,
                    }}
                    onPress={() => openSongInfoModal(songItem)}>
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      size={16}
                      style={{color: themeColor}}
                    />
                    <Text style={{color: themeColor, fontSize: 14}}>
                      Song info
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      gap: 15,
                      alignItems: 'center',
                      padding: 10,
                    }}
                    onPress={() => deleteSong(songItem)}>
                    <FontAwesomeIcon
                      icon={faTrashCan}
                      size={16}
                      style={{color: themeColor}}
                    />
                    <Text style={{color: themeColor, fontSize: 14}}>
                      Delete song{' '}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      gap: 15,
                      alignItems: 'center',
                      padding: 10,
                    }}
                    onPress={() => setOptionModalVisible(false)}>
                    <FontAwesomeIcon
                      icon={faTimes}
                      size={16}
                      style={{color: palette.accent}}
                    />
                    <Text style={{color: palette.accent, fontSize: 14}}>
                      Close{' '}
                    </Text>
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
        transparent={true}
        visible={playlistModalVisible}
        animationType="fade"
        onRequestClose={closePlaylistModal}>
        <Pressable
          style={styles.playlistModalOverlay}
          onPress={closePlaylistModal}>
          <Pressable
            style={[
              styles.playlistModalContent,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
            onPress={() => {}}>
            <View style={styles.playlistModalHeader}>
              <Text style={[styles.playlistModalTitle, {color: themeColor}]}>
                Add to Playlist
              </Text>
              <TouchableOpacity
                onPress={closePlaylistModal}
                style={[
                  styles.playlistModalCloseButton,
                  {backgroundColor: palette.surfaceMuted},
                ]}>
                <FontAwesomeIcon icon={faTimes} size={14} color={themeColor} />
              </TouchableOpacity>
            </View>

            {!isCreatingPlaylist ? (
              <FlatList
                data={availablePlaylists}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <TouchableOpacity
                    onPress={() => setIsCreatingPlaylist(true)}
                    style={[
                      styles.createPlaylistButton,
                      {
                        backgroundColor: palette.accentSoft,
                        borderColor: palette.accent,
                      },
                    ]}>
                    <FontAwesomeIcon
                      icon={faPlus}
                      size={16}
                      color={palette.accent}
                    />
                    <Text
                      style={[
                        styles.createPlaylistText,
                        {color: palette.accent},
                      ]}>
                      Create New Playlist
                    </Text>
                  </TouchableOpacity>
                }
                ListEmptyComponent={
                  <Text
                    style={[
                      styles.emptyPlaylistText,
                      {color: palette.subtext},
                    ]}>
                    No playlists available. Create one to add this song!
                  </Text>
                }
                renderItem={({item}) => (
                  <TouchableOpacity
                    onPress={() => togglePlaylistSelection(item.id)}
                    style={[
                      styles.playlistItem,
                      {
                        backgroundColor: selectedPlaylists.includes(item.id)
                          ? palette.accentSoft
                          : palette.surfaceMuted,
                        borderColor: selectedPlaylists.includes(item.id)
                          ? palette.accent
                          : palette.border,
                      },
                    ]}>
                    <View style={styles.playlistItemLeft}>
                      <Text style={[styles.playlistName, {color: themeColor}]}>
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.playlistSongCount,
                          {color: palette.subtext},
                        ]}>
                        {item.songs?.length || 0} songs
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: selectedPlaylists.includes(item.id)
                            ? palette.accent
                            : 'transparent',
                          borderColor: selectedPlaylists.includes(item.id)
                            ? palette.accent
                            : palette.subtext,
                        },
                      ]}>
                      {selectedPlaylists.includes(item.id) ? (
                        <FontAwesomeIcon
                          icon={faCheck}
                          size={12}
                          color="#fff"
                        />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.createPlaylistForm}>
                <TextInput
                  style={[
                    styles.playlistInput,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.border,
                      color: themeColor,
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
                    style={[
                      styles.cancelButton,
                      {backgroundColor: palette.surfaceMuted},
                    ]}>
                    <Text
                      style={[styles.playlistButtonText, {color: themeColor}]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={createNewPlaylistAndAdd}
                    style={[
                      styles.confirmButton,
                      {backgroundColor: palette.accent},
                    ]}>
                    <Text style={styles.playlistButtonText}>Create & Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!isCreatingPlaylist && selectedPlaylists.length > 0 ? (
              <TouchableOpacity
                onPress={addSongToSelectedPlaylists}
                style={[styles.addButton, {backgroundColor: palette.accent}]}>
                <Text style={styles.addButtonText}>
                  Add to {selectedPlaylists.length} Playlist
                  {selectedPlaylists.length !== 1 ? 's' : ''}
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
        }}>
        <Pressable
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          }}
          onPress={() => setModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: isDarkMode ? '#212121' : 'white',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: 20,
                width: '100%',
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}>
              <View
                style={{
                  backgroundColor: '#999',
                  width: 40,
                  borderRadius: 5,
                  height: 5,
                  alignSelf: 'center',
                  marginBottom: 20,
                }}></View>
              <Text
                style={{
                  color: palette.accent,
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginBottom: 20,
                }}>
                Information
              </Text>
              {songItem && (
                <View
                  style={{flexDirection: 'column', gap: 15, marginTop: 10}}
                  {...panResponder.panHandlers}>
                  <View style={{flexDirection: 'row', gap: 15}}>
                    <Text style={[styles.title, {color: themeColor}]}>
                      Title
                    </Text>
                    <Text style={[styles.desc, {color: themeColor}]}>
                      {songItem.title}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row', gap: 15}}>
                    <Text style={[styles.title, {color: themeColor}]}>
                      Album
                    </Text>
                    <Text style={[styles.desc, {color: themeColor}]}>
                      {songItem.album}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row', gap: 15}}>
                    <Text style={[styles.title, {color: themeColor}]}>
                      Artist
                    </Text>
                    <Text style={[styles.desc, {color: themeColor}]}>
                      {songItem.artist}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row', gap: 15}}>
                    <Text style={[styles.title, {color: themeColor}]}>
                      Duration
                    </Text>
                    <Text style={[styles.desc, {color: themeColor}]}>
                      {formatDuration(songItem.duration)}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row', gap: 15}}>
                    <Text style={[styles.title, {color: themeColor}]}>
                      Size
                    </Text>
                    <Text style={[styles.desc, {color: themeColor}]}>
                      {formatFileSize(songsize)}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row', gap: 15}}>
                    <Text style={[styles.title, {color: themeColor}]}>
                      Format
                    </Text>
                    <Text style={[styles.desc, {color: themeColor}]}>
                      audio/{getFileExtension(songItem.url)}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row', gap: 15}}>
                    <Text style={[styles.title, {color: themeColor}]}>
                      Path
                    </Text>
                    <Text style={[styles.desc, {color: themeColor}]}>
                      {songItem.url}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row', gap: 15}}>
                    <Text style={[styles.title, {color: themeColor}]}>
                      Date
                    </Text>
                    <Text style={[styles.desc, {color: themeColor}]}>
                      {songDate}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  desc: {
    flex: 1,
  },

  actionWrap: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
  },
  musicContainer: {
    flex: 1,
    marginBottom: 0,
  },
  playAllButton: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  playAllIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 18,
  },
  shuffleButton: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  shuffleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 140,
  },
  songItemWrap: {
    marginBottom: 10,
  },
  playAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  songRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 20,
  },
  songName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  songInfoText: {
    fontSize: 12,
    marginTop: 4,
  },
  songInfo: {},
  playlistModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  playlistModalContent: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  playlistModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  playlistModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  playlistModalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyPlaylistText: {
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
  playlistButtonText: {
    color: '#fff',
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
});

export default All_songs;
