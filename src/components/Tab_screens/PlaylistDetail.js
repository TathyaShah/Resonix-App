import React, { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ToastAndroid, Modal, Pressable, TouchableWithoutFeedback, SafeAreaView, PanResponder, PermissionsAndroid, TextInput, ScrollView } from 'react-native';
import TextTicker from 'react-native-text-ticker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faCompactDisc, faPlay, faShuffle, faEllipsisVertical, faTimes, faHeart, faMusic, faShareAlt, faInfoCircle, faTrashCan, faPlus, faCheck } from '@fortawesome/free-solid-svg-icons';
import TrackPlayer from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { selectedSong, setIsSongPlaying, setFavouritesSongs } from '../../redux/action';
import useResonixTheme from '../../hooks/useResonixTheme';
import useTheme from '../../hooks/useTheme';
import SongThumbnail from '../SongThumbnail';
import MoodAssignmentModal from '../MoodAssignmentModal';
import { getAssignedMoodsForSong, getSongMoodAssignments, setSongMoods } from '../../utils/moods';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

const PlaylistDetail = ({ route, navigation }) => {
  const { playlist } = route.params || {};
  const palette = useResonixTheme();
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const selectedItem = useSelector((state) => state.selectedSongReducer);
  const isSongPlaying = useSelector((state) => state.isSongPlaying);
  
  const songs = playlist?.songs || [];
  const themeColor = isDarkMode ? '#fff' : '#000';
  const dimColorTheme = isDarkMode ? '#ccc' : '#666';

  const [songItem, setSongItem] = useState();
  const [optionModalVisible, setOptionModalVisible] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [songSize, setSongSize] = useState(0);
  const [songDate, setSongDate] = useState(0);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [songForPlaylistAdd, setSongForPlaylistAdd] = useState(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy > 50) {
          setOptionModalVisible(false);
          setInfoModalVisible(false);
          setDeleteModalVisible(false);
          setPlaylistModalVisible(false);
        }
      },
    })
  ).current;

  const updateRecent = async (song) => {
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

  const storeSelectedSong = async (song) => {
    try {
      if (song) {
        await AsyncStorage.setItem('lastPlayedSong', JSON.stringify(song));
      }
    } catch (error) {
      console.error('Failed to store selected song:', error);
    }
  };

  const handleSongItem = async (item) => {
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

  const playAllPlaylistSongs = async () => {
    try {
      if (!songs || songs.length === 0) {
        ToastAndroid.show('No songs in playlist', ToastAndroid.SHORT);
        return;
      }
      await TrackPlayer.stop();
      await TrackPlayer.reset();
      await TrackPlayer.add(songs);
      await TrackPlayer.skip(0);
      dispatch(selectedSong(songs[0]));
      await storeSelectedSong(songs[0]);
      dispatch(setIsSongPlaying(true));
      await TrackPlayer.play();
      updateRecent(songs[0]);
    } catch (error) {
      console.error('Play all failed:', error);
      ToastAndroid.show('Failed to play songs', ToastAndroid.SHORT);
    }
  };

  const shufflePlaylistSongs = async () => {
    try {
      if (!songs || songs.length === 0) {
        ToastAndroid.show('No songs in playlist', ToastAndroid.SHORT);
        return;
      }
      const shuffledSongs = [...songs]
        .map(song => ({ song, sortKey: Math.random() }))
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(item => item.song);
      const firstSong = shuffledSongs[0];

      await TrackPlayer.stop();
      await TrackPlayer.reset();
      await TrackPlayer.add(shuffledSongs);
      await TrackPlayer.skip(0);
      dispatch(selectedSong(firstSong));
      await storeSelectedSong(firstSong);
      dispatch(setIsSongPlaying(true));
      await TrackPlayer.play();
      updateRecent(firstSong);
    } catch (error) {
      console.error('Shuffle failed', error);
      ToastAndroid.show('Unable to shuffle songs', ToastAndroid.SHORT);
    }
  };

  const openBottomSheet = (item) => {
    setOptionModalVisible(true);
    setSongItem(item);
  };

  const addFavSongItem = async (favSong) => {
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
        const existingIndex = favSongsArray.findIndex(item => item.url === favSong.url);
        if (existingIndex !== -1) {
          ToastAndroid.show('Already added to favourites', ToastAndroid.SHORT);
        } else {
          favSongsArray.push(favSong);
          await AsyncStorage.setItem('favSongs', JSON.stringify(favSongsArray));
          dispatch(setFavouritesSongs(favSongsArray));
          ToastAndroid.show('Song added to favourites', ToastAndroid.SHORT);
        }
      } else {
        favSongsArray.push(favSong);
        await AsyncStorage.setItem('favSongs', JSON.stringify(favSongsArray));
        dispatch(setFavouritesSongs(favSongsArray));
        ToastAndroid.show('Song added to favourites', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Failed to add favorite:', error);
      ToastAndroid.show('Failed to add to favourites', ToastAndroid.SHORT);
    }
  };

  const openMoodAssignment = async (item) => {
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

  const saveMoodAssignment = async (moodKeys) => {
    try {
      await setSongMoods(songItem, moodKeys);
      setSelectedMoods(moodKeys);
      setMoodModalVisible(false);
      ToastAndroid.show('Mood assignment updated', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Failed to save mood assignment', error);
      ToastAndroid.show('Unable to update moods', ToastAndroid.SHORT);
    }
  };

  const shareSong = async (song) => {
    setOptionModalVisible(false);
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

  const openSongInfoModal = (song) => {
    setOptionModalVisible(false);
    setInfoModalVisible(true);
    setSongItem(song);

    getFileSize(song.url).then((size) => {
      if (size !== null) {
        setSongSize(size);
      }
    });

    getFileDateTime(song.url).then((dateTime) => {
      if (dateTime !== null) {
        setSongDate(dateTime);
      }
    });
  };

  const getFileSize = async (url) => {
    try {
      const fileInfo = await RNFS.stat(url);
      const size = fileInfo.size;
      return formatFileSize(size);
    } catch (error) {
      console.error('Error getting file size:', error);
      return null;
    }
  };

  const deleteSong = () => {
    setDeleteModalVisible(true);
    setOptionModalVisible(false);
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
            console.log('Permission denied');
            return;
          }
        }

        const fileExists = await RNFS.exists(filePath);

        if (fileExists) {
          await RNFS.unlink(filePath);
          console.log('File deleted successfully');
          ToastAndroid.show('Song Deleted', ToastAndroid.SHORT);
          setDeleteModalVisible(false);
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

  const loadAvailablePlaylists = async () => {
    try {
      const stored = await AsyncStorage.getItem('userPlaylists');
      const playlists = stored ? JSON.parse(stored) : [];
      setAvailablePlaylists(playlists);
      setSelectedPlaylists([]);
    } catch (error) {
      console.error('Failed to load playlists:', error);
      setAvailablePlaylists([]);
    }
  };

  const openPlaylistModalForSong = async (song) => {
    setSongForPlaylistAdd(song);
    await loadAvailablePlaylists();
    setPlaylistModalVisible(true);
  };

  const togglePlaylistSelection = (playlistId) => {
    setSelectedPlaylists(current =>
      current.includes(playlistId)
        ? current.filter(id => id !== playlistId)
        : [...current, playlistId]
    );
  };

  const createNewPlaylistAndAddSong = async () => {
    if (!newPlaylistName.trim()) {
      ToastAndroid.show('Please enter a playlist name', ToastAndroid.SHORT);
      return;
    }

    try {
      const newPlaylist = {
        id: Date.now().toString(),
        name: newPlaylistName,
        songs: [songForPlaylistAdd],
        createdAt: new Date().toISOString(),
      };

      const stored = await AsyncStorage.getItem('userPlaylists');
      const playlists = stored ? JSON.parse(stored) : [];
      playlists.push(newPlaylist);
      await AsyncStorage.setItem('userPlaylists', JSON.stringify(playlists));

      ToastAndroid.show(`Playlist "${newPlaylistName}" created and song added!`, ToastAndroid.SHORT);
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
      setPlaylistModalVisible(false);
      await loadAvailablePlaylists();
    } catch (error) {
      console.error('Failed to create playlist:', error);
      ToastAndroid.show('Failed to create playlist', ToastAndroid.SHORT);
    }
  };

  const addSongToSelectedPlaylists = async () => {
    if (selectedPlaylists.length === 0) {
      ToastAndroid.show('Please select at least one playlist', ToastAndroid.SHORT);
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('userPlaylists');
      const playlists = stored ? JSON.parse(stored) : [];
      
      const updatedPlaylists = playlists.map(playlist => {
        if (selectedPlaylists.includes(playlist.id)) {
          const alreadyExists = playlist.songs?.some(song => song.url === songForPlaylistAdd.url);
          if (!alreadyExists) {
            return {
              ...playlist,
              songs: [...(playlist.songs || []), songForPlaylistAdd],
            };
          }
        }
        return playlist;
      });

      await AsyncStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists));
      ToastAndroid.show(`Song added to ${selectedPlaylists.length} playlist${selectedPlaylists.length !== 1 ? 's' : ''}!`, ToastAndroid.SHORT);
      setPlaylistModalVisible(false);
      setSelectedPlaylists([]);
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
    } catch (error) {
      console.error('Failed to add song to playlists:', error);
      ToastAndroid.show('Failed to add song to playlists', ToastAndroid.SHORT);
    }
  };

  const renderItem = ({ item, index }) => {
    const isSelected = selectedItem && selectedItem.url === item.url;
    return (
      <View style={styles.songItemWrap}>
        <View style={[styles.songRow, { backgroundColor: palette.surface, borderColor: isSelected ? palette.accent : palette.border }]}>
          <TouchableOpacity
            style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 }}
            onPress={() => handleSongItem(item)}
            onLongPress={() => openBottomSheet(item)}
          >
            <SongThumbnail song={item} width={56} height={42} radius={14} textSize={16} />
            <View style={{ flex: 1, alignContent: 'center', justifyContent: 'center', minWidth: 0 }}>
              <Text style={[styles.songName, { color: isSelected ? palette.accent : themeColor }]} numberOfLines={1} ellipsizeMode="tail">
                {item.title}
              </Text>
              {isSelected ? (
                <TextTicker
                  style={[styles.songInfoText, { color: dimColorTheme }]}
                  duration={12000}
                  loop
                  bounce={false}
                  repeatSpacer={80}
                  marqueeDelay={1200}
                  scrollSpeed={20}
                  useNativeDriver
                  numberOfLines={1}
                >
                  {`${item.artist || 'Unknown Artist'}  -  ${item.album || 'Unknown Album'}${item.genre ? '  -  ' + item.genre : ''}`}
                </TextTicker>
              ) : (
                <Text style={[styles.songInfoText, { color: dimColorTheme }]} numberOfLines={1} ellipsizeMode="tail">
                  {`${item.artist || 'Unknown Artist'} - ${item.album || 'Unknown Album'}${item.genre ? ' - ' + item.genre : ''}`}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 8, borderRadius: 25 }} onPress={() => openBottomSheet(item)}>
            <FontAwesomeIcon icon={faEllipsisVertical} size={15} style={{ color: palette.subtext }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.headerWrap}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: palette.surfaceMuted }]}>
              <FontAwesomeIcon icon={faArrowLeft} size={16} color={palette.text} />
            </TouchableOpacity>
            <Text style={[styles.playlistTitle, { color: palette.text }]}>{playlist?.name || 'Playlist'}</Text>
          </View>
        </View>

        <View style={styles.actionWrap}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.playAllButton, { backgroundColor: palette.accent }]} onPress={playAllPlaylistSongs}>
              <FontAwesomeIcon icon={faPlay} size={12} style={{ color: 'white' }} />
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shuffleButton, { borderColor: palette.accent }]} onPress={shufflePlaylistSongs}>
              <FontAwesomeIcon icon={faShuffle} size={14} style={{ color: palette.accent }} />
              <Text style={[styles.shuffleButtonText, { color: palette.accent }]}>Shuffle</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.musicContainer, { backgroundColor: palette.background }]}>
          {songs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: palette.subtext }]}>
                No songs in this playlist yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={songs}
              renderItem={renderItem}
              keyExtractor={(item, index) => item.url || `${item.title}-${index}`}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      {/* Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={optionModalVisible}
        onRequestClose={() => {
          setOptionModalVisible(!optionModalVisible);
        }}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          onPress={() => setOptionModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={{
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
                <View style={{ backgroundColor: '#999', width: 40, borderRadius: 5, height: 5, alignSelf: 'center', marginBottom: 20 }}></View>
                <View style={{ flexDirection: 'column', gap: 15 }}>
                  <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => handleSongItem(songItem)}>
                    <FontAwesomeIcon icon={faPlay} size={16} style={{ color: dimColorTheme }} />
                    <Text style={{ color: dimColorTheme, fontSize: 14 }}>Play this song</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => addFavSongItem(songItem)}>
                    <FontAwesomeIcon icon={faHeart} size={16} style={{ color: dimColorTheme }} />
                    <Text style={{ color: dimColorTheme, fontSize: 14 }}>Add to favourites</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => openMoodAssignment(songItem)}>
                    <FontAwesomeIcon icon={faMusic} size={16} style={{ color: dimColorTheme }} />
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
                    <Text style={{ color: themeColor, fontSize: 14 }}>Delete song</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ flexDirection: 'row', gap: 15, alignItems: 'center', padding: 10 }} onPress={() => setOptionModalVisible(false)}>
                    <FontAwesomeIcon icon={faTimes} size={16} style={{ color: palette.accent }} />
                    <Text style={{ color: palette.accent, fontSize: 14 }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>

      {/* Mood Assignment Modal */}
      <MoodAssignmentModal
        visible={moodModalVisible}
        title={`Assign "${songItem?.title || 'song'}"`}
        selectedMoods={selectedMoods}
        onClose={() => setMoodModalVisible(false)}
        onSave={saveMoodAssignment}
      />

      {/* Song Info Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => {
          setInfoModalVisible(!infoModalVisible);
        }}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          onPress={() => setInfoModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={{
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
                <View style={{ backgroundColor: '#999', width: 40, borderRadius: 5, height: 5, alignSelf: 'center', marginBottom: 20 }}></View>
                <Text style={{ color: palette.accent, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Song Details</Text>

                <View style={{ marginBottom: 15 }}>
                  <Text style={{ color: palette.subtext, fontSize: 12, marginBottom: 4 }}>Title</Text>
                  <Text style={{ color: themeColor, fontSize: 14, fontWeight: '500' }}>{songItem?.title}</Text>
                </View>

                <View style={{ marginBottom: 15 }}>
                  <Text style={{ color: palette.subtext, fontSize: 12, marginBottom: 4 }}>Artist</Text>
                  <Text style={{ color: themeColor, fontSize: 14, fontWeight: '500' }}>{songItem?.artist || 'Unknown'}</Text>
                </View>

                <View style={{ marginBottom: 15 }}>
                  <Text style={{ color: palette.subtext, fontSize: 12, marginBottom: 4 }}>Album</Text>
                  <Text style={{ color: themeColor, fontSize: 14, fontWeight: '500' }}>{songItem?.album || 'Unknown'}</Text>
                </View>

                <View style={{ marginBottom: 15 }}>
                  <Text style={{ color: palette.subtext, fontSize: 12, marginBottom: 4 }}>Duration</Text>
                  <Text style={{ color: themeColor, fontSize: 14, fontWeight: '500' }}>{songItem?.duration || 'Unknown'}</Text>
                </View>

                <View style={{ marginBottom: 15 }}>
                  <Text style={{ color: palette.subtext, fontSize: 12, marginBottom: 4 }}>File Size</Text>
                  <Text style={{ color: themeColor, fontSize: 14, fontWeight: '500' }}>{songSize}</Text>
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: palette.subtext, fontSize: 12, marginBottom: 4 }}>Date</Text>
                  <Text style={{ color: themeColor, fontSize: 14, fontWeight: '500' }}>{songDate}</Text>
                </View>

                <TouchableOpacity
                  style={{ padding: 12, backgroundColor: palette.accent, borderRadius: 12, alignItems: 'center' }}
                  onPress={() => setInfoModalVisible(false)}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => {
          setDeleteModalVisible(!deleteModalVisible);
        }}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onPress={() => setDeleteModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={{
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
                <View style={{ backgroundColor: '#999', width: 40, borderRadius: 5, height: 5, alignSelf: 'center', marginBottom: 20 }}></View>
                <View style={{ flexDirection: 'column', gap: 15 }}>
                  <TouchableOpacity style={{ flexDirection: 'row', gap: 15, justifyContent: 'center', alignItems: 'center', padding: 15 }} onPress={deleteSongfromLocal}>
                    <Text style={{ color: palette.accent, fontSize: 16 }}>Delete local file</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ flexDirection: 'row', gap: 15, justifyContent: 'center', alignItems: 'center', padding: 15 }} onPress={() => setDeleteModalVisible(false)}>
                    <Text style={{ color: themeColor, fontSize: 14 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playlistTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  actionWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  playAllButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  playAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  shuffleButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  shuffleButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  musicContainer: {
    flex: 1,
    marginBottom: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 140,
  },
  songItemWrap: {
    marginBottom: 10,
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
  songTextWrap: {
    flex: 1,
    gap: 4,
  },
  songName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  songInfoText: {
    fontSize: 12,
    marginTop: 4,
  },
  songInfo: {
    fontSize: 12,
    lineHeight: 16,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PlaylistDetail;
