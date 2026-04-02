import React, { useEffect, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  FlatList,
  ToastAndroid,
  Modal, TouchableWithoutFeedback, Pressable
} from 'react-native';
import useTheme from '../../hooks/useTheme';
import useResonixTheme from '../../hooks/useResonixTheme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { faEllipsisVertical, faMusic, faPlay } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux'
import { selectedSong, setIsSongPlaying, setFavouritesSongs } from '../../redux/action';
import TrackPlayer from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongThumbnail from '../SongThumbnail';
import MoodAssignmentModal from '../MoodAssignmentModal';
import { getAssignedMoodsForSong, getSongMoodAssignments, setSongMoods } from '../../utils/moods';


const FavSongs = ({ navigation }) => {
  const dispatch = useDispatch()
  const selectedItem = useSelector((state) => state.selectedSongReducer);
  const favSongs = useSelector((state) => state.favSongsReducer);
  const isSongPlaying = useSelector((state) => state.isSongPlaying);
  const { isDarkMode } = useTheme();
  const palette = useResonixTheme();
  const [rmSongItem, setrmSongItem] = useState();
  const themeColor = isDarkMode ? Colors.white : Colors.black;
  const bgTheme = isDarkMode ? Colors.black : Colors.white;
  const dimColorTheme = isDarkMode ? Colors.light : Colors.darker;
  const [openRemovefromFav, setopenRemovefromFav] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [selectedMoods, setSelectedMoods] = useState([]);

  useEffect(() => {

  }, [favSongs]);


  const handleSongItem = async (item) => {
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


  const openBottomSheetOption = (songItem) => {
    setrmSongItem(songItem);
    setopenRemovefromFav(true);
  }

  const openMoodAssignment = async (songItem) => {
    try {
      const assignments = await getSongMoodAssignments();
      setSelectedMoods(getAssignedMoodsForSong(assignments, songItem));
      setrmSongItem(songItem);
      setopenRemovefromFav(false);
      setMoodModalVisible(true);
    } catch (error) {
      console.error('Failed to open mood assignment', error);
    }
  };

  const saveMoodAssignment = async moodKeys => {
    try {
      await setSongMoods(rmSongItem, moodKeys);
      setSelectedMoods(moodKeys);
      setMoodModalVisible(false);
      ToastAndroid.show('Mood assignment updated.', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Failed to save mood assignment', error);
      ToastAndroid.show('Unable to update moods.', ToastAndroid.SHORT);
    }
  };
  const addMoreSongs = () => {
    navigation.navigate('AddToFavourites');
  }

  const removeFromfav = async () => {
    try {
      if (!rmSongItem || !rmSongItem.url) {
        console.error('Invalid song object:', rmSongItem);
        return;
      }
      let favSongsArray = [];
      const existingSongs = await AsyncStorage.getItem('favSongs');

      if (existingSongs !== null) {
        favSongsArray = JSON.parse(existingSongs);
        const existingIndex = favSongsArray.findIndex(item => item.url === rmSongItem.url);
        if (existingIndex !== -1) {
          favSongsArray.splice(existingIndex, 1);
          await AsyncStorage.setItem('favSongs', JSON.stringify(favSongsArray));
          ToastAndroid.show('Removed from favourites.', ToastAndroid.SHORT);
          setopenRemovefromFav(false);
        }
      }
      dispatch(setFavouritesSongs(favSongsArray));

    } catch (e) {
      console.error('Failed to add item to array:', e);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItem && selectedItem.url === item.url;

    return (
      <View style={{ marginBottom: 10 }}>
        <View style={[styles.songRow, { backgroundColor: palette.surface, borderColor: isSelected ? palette.accent : palette.border }]}>
          <TouchableOpacity
            style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 }}
            onPress={() => handleSongItem(item)}
            onLongPress={() => openBottomSheetOption(item)}
          >
            <SongThumbnail song={item} width={56} height={42} radius={14} textSize={16} />
            <View style={{ flexDirection: 'column', gap: 5, alignContent: 'center', flex: 1 }}>
              <Text style={[styles.songName, { color: isSelected ? palette.accent : themeColor }]} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
              <View style={[styles.songInfo, { flexDirection: 'row', gap: 4, alignItems: 'center' }]}>
                <Text style={{ color: isSelected ? palette.accent : dimColorTheme, fontSize: 10 }}>{item.artist}</Text>
                <Text style={{ color: isSelected ? palette.accent : dimColorTheme, fontSize: 10 }}>-</Text>
                <Text style={{ color: isSelected ? palette.accent : dimColorTheme, fontSize: 10 }}>{item.album}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openBottomSheetOption(item)} >
            <FontAwesomeIcon icon={faEllipsisVertical} size={16} style={{ color: palette.subtext }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={[styles.frequentlyUsedContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700' }}>Favourites</Text>
        </View>
        <TouchableOpacity style={[styles.addPill, { backgroundColor: palette.surfaceMuted }]} onPress={addMoreSongs}>
          <Text style={{ color: palette.success, fontSize: 12, fontWeight: '700' }}>Add songs</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.countText, { color: palette.subtext }]}>{favSongs.length} songs saved</Text>


      <View style={[styles.musicContainer, { backgroundColor: palette.background }]}>
        {favSongs.length > 0 ? (
          <FlatList
            data={favSongs}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
          />

        ) : (

          <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={{ backgroundColor: palette.accent, padding: 10, borderRadius: 50 }}>
              <FontAwesomeIcon icon={faMusic} size={30} color='white' />
            </View>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>No songs yet</Text>
            <TouchableOpacity style={{ color: palette.accent }} onPress={addMoreSongs}>
              <Text style={{ color: palette.accent }}>Add Songs</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={openRemovefromFav}
        onRequestClose={() => {
          setopenRemovefromFav(!openRemovefromFav);
        }}

      >
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onPress={() => setopenRemovefromFav(false)}
        >
          <TouchableWithoutFeedback >
            <View style={{
              backgroundColor: isDarkMode ? '#212121' : 'white',
              padding: 20,
              borderRadius: 30,
              width: '92%',
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              margin: 10


            }}  >
              <View>
                <View style={{ backgroundColor: '#999', width: 40, borderRadius: 5, height: 5, alignSelf: 'center', marginBottom: 20 }}></View>
                <View style={{ flexDirection: 'column', gap: 15 }} >
                  <TouchableOpacity style={{ flexDirection: 'row', gap: 15, justifyContent: 'center', alignItems: 'center', padding: 15 }} onPress={() => openMoodAssignment(rmSongItem)}>
                    <Text style={{ color: palette.text, fontSize: 16 }}>Assign to mood</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ flexDirection: 'row', gap: 15, justifyContent: 'center', alignItems: 'center', padding: 15 }} onPress={removeFromfav}>
                    <Text style={{ color: palette.accent, fontSize: 16, }}>Remove from favourite</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ flexDirection: 'row', gap: 15, justifyContent: 'center', alignItems: 'center', padding: 15 }} onPress={() => setopenRemovefromFav(false)}>
                    <Text style={{ color: 'lightgreen', fontSize: 14 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>

      <MoodAssignmentModal
        visible={moodModalVisible}
        title={`Assign "${rmSongItem?.title || 'song'}"`}
        selectedMoods={selectedMoods}
        onClose={() => setMoodModalVisible(false)}
        onSave={saveMoodAssignment}
      />
    </View >

  )

}

const styles = StyleSheet.create({
  frequentlyUsedContainer: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 18,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countText: { paddingHorizontal: 20, marginTop: 10, marginBottom: 6, fontSize: 12 },
  musicContainer: {
    flex: 1,
    marginBottom: 55,
  },
  addPill: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16 },
  songRow: {
    flexDirection: 'row',
    gap: 5,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 20,
  },
  emptyCard: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

});

export default FavSongs;

