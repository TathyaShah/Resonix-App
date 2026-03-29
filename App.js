
import React, { useEffect, createContext, useState } from 'react';
import SplashScreen from 'react-native-splash-screen';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import TabNavigator from './src/components/tab';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PermissionsAndroid,
  StatusBar,
  View,
  useColorScheme,
} from 'react-native';
import TrackPlayer from 'react-native-track-player';
import {setAllSongs} from './src/redux/action';
import {getAll} from 'react-native-get-music-files';
import {useDispatch} from 'react-redux'
import FavouritesSongs from './src/components/Tab_screens/favsongs';
import AddToFavourites from './src/components/Audio_screens/AddToFavourite';
import SearchMusic from './src/components/Audio_screens/AudioSearch';
import AudioPlayer from './src/components/Player/AudioPlayer';
import ArtisBasedSongs from './src/components/Audio_screens/artistBasedSongs';
import AlbumSongs from './src/components/Audio_screens/albumSong';
import PlaylistDetail from './src/components/Tab_screens/PlaylistDetail';
import RecentHistory from './src/components/RecentHistory';
import MoodSongs from './src/components/MoodSongs';
import { PLAYLIST_MOOD_STORAGE_KEY, SONG_MOOD_STORAGE_KEY } from './src/utils/moods';
import BottomPlayer from './src/components/Player/BottomPlayer';

const Stack = createStackNavigator();
export const AppContext = createContext();
const App = () => {
  const systemColorScheme = useColorScheme();
  const [appTheme, setAppTheme] = useState('system');
  const [colorTheme, setColorTheme] = useState('red');
  const [useDefaultColorTheme, setUseDefaultColorTheme] = useState(true);

  const isDarkMode = appTheme === 'system' ? systemColorScheme === 'dark' : appTheme === 'dark';
  const themeBase = isDarkMode ? DarkTheme : DefaultTheme;
  const theme = {
    ...themeBase,
    colors: {
      ...themeBase.colors,
      primary: useDefaultColorTheme
        ? '#E82255'
        : colorTheme === 'sunset'
          ? '#F57C00'
          : colorTheme === 'green'
            ? '#2E7D32'
            : colorTheme === 'blue'
              ? '#1565C0'
              : '#E53935',
    },
  };
  const effectiveTheme = isDarkMode ? 'dark' : 'light';

  const dispatch = useDispatch()
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hide();
    }, 500);
  });

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const [storedTheme, storedColorTheme, storedUseDefaultColorTheme] = await Promise.all([
          AsyncStorage.getItem('appTheme'),
          AsyncStorage.getItem('colorTheme'),
          AsyncStorage.getItem('useDefaultColorTheme'),
        ]);
        if (storedTheme) setAppTheme(storedTheme);
        if (storedColorTheme) setColorTheme(storedColorTheme);
        if (storedUseDefaultColorTheme !== null) {
          setUseDefaultColorTheme(storedUseDefaultColorTheme === 'true');
        }
      } catch (e) {
        console.error('Failed to load theme', e);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const initializePlayer = async () => {
      try {
        // check state first—getState may throw if player not set up
        await TrackPlayer.getState();
      } catch (e) {
        if (
          !(
            e &&
            e.message &&
            e.message.includes('already been initialized')
          )
        ) {
          try {
            await TrackPlayer.setupPlayer();
          } catch (error) {
            // ignore duplicate initialization error
            if (
              !(
                error &&
                error.message &&
                error.message.includes('already been initialized')
              )
            ) {
              console.error('Failed to initialize TrackPlayer', error);
            }
          }
        }
      }
    };

    const initializeFavSongs = async () => {
      try {
        const [existingSongs, existingSongMoods, existingPlaylistMoods] = await Promise.all([
          AsyncStorage.getItem('favSongs'),
          AsyncStorage.getItem(SONG_MOOD_STORAGE_KEY),
          AsyncStorage.getItem(PLAYLIST_MOOD_STORAGE_KEY),
        ]);
        if (!existingSongs) {
          await AsyncStorage.setItem('favSongs', JSON.stringify([]));
        }
        if (!existingSongMoods) {
          await AsyncStorage.setItem(SONG_MOOD_STORAGE_KEY, JSON.stringify({}));
        }
        if (!existingPlaylistMoods) {
          await AsyncStorage.setItem(PLAYLIST_MOOD_STORAGE_KEY, JSON.stringify({}));
        }
      } catch (e) {
        console.error('Failed to initialize favSongs:', e);
      }
    };
    initializeFavSongs();
    initializePlayer();

    return () => {
      TrackPlayer.stop();
    };
  }, []);


  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const grantedStorage = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'Your app needs access to storage to store audio and video files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        const grantedWriteStorage = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'Your app needs access to storage to store audio and video files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (
          grantedStorage === PermissionsAndroid.RESULTS.GRANTED &&
          grantedWriteStorage === PermissionsAndroid.RESULTS.GRANTED

        ) {
          fetechAllSongs();
        } else {
          requestPermissions();
        }
      } catch (err) {
        console.warn(err);
      }
    };
    requestPermissions();
  }, []);

  const fetechAllSongs = async () => {
    await getAll({
      // Use a large finite integer instead of Infinity to avoid native bridge errors
      limit: 200,
    })
      .then((filesOrError) => {
        if (typeof filesOrError === 'string') {
          console.error(filesOrError);
          return;
        }
        const reversedFiles = filesOrError.reverse();
        dispatch(setAllSongs(reversedFiles));
      })
      .catch((error) => {
        console.error(error);
      });

  }



  return (
    <AppContext.Provider
      value={{
        fetechAllSongs,
        appTheme,
        setAppTheme,
        effectiveTheme,
        isDarkMode,
        colorTheme,
        setColorTheme,
        useDefaultColorTheme,
        setUseDefaultColorTheme,
      }}
    >
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#000' : '#fff' }}>
        <StatusBar translucent backgroundColor="transparent"
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        />

        <NavigationContainer theme={theme}>
          <View style={{ flex: 1 }}>
            <Stack.Navigator>
              <Stack.Screen
                name="Tabs"
                component={TabNavigator}
                options={{
                  headerShown: false,

                }}

              />
              <Stack.Screen
                name="Favourites"
                component={FavouritesSongs}
                options={{
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                }}
              />
              <Stack.Screen
                name="AddToFavourites"
                component={AddToFavourites}
                options={{
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                }}
              />
              <Stack.Screen
                name="SearchMusic"
                component={SearchMusic}
                options={{
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                }}
              />
              <Stack.Screen
                name="AudioPlayer"
                component={AudioPlayer}
                options={{
                  headerShown: false,
                  ...TransitionPresets.ModalSlideFromBottomIOS,
                }}
              />
              <Stack.Screen
                name="artistBasedSongs"
                component={ArtisBasedSongs}
                options={{
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                }}
              />
              <Stack.Screen
                name="albumbasesongs"
                component={AlbumSongs}
                options={{
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                }}
              />
              <Stack.Screen
                name="PlaylistDetail"
                component={PlaylistDetail}
                options={{
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                }}
              />
              <Stack.Screen
                name="RecentHistory"
                component={RecentHistory}
                options={{
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                }}
              />
              <Stack.Screen
                name="MoodSongs"
                component={MoodSongs}
                options={{
                  headerShown: false,
                  ...TransitionPresets.SlideFromRightIOS,
                }}
              />
            </Stack.Navigator>
            <BottomPlayer />
          </View>
        </NavigationContainer>
      </View>
    </AppContext.Provider>
  );
};

export default App;
