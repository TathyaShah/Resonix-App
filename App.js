import React, {useEffect, createContext, useState} from 'react';
import SplashScreen from 'react-native-splash-screen';
import {
  DefaultTheme,
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';
import {createStackNavigator, TransitionPresets} from '@react-navigation/stack';
import TabNavigator from './src/components/tab';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PermissionsAndroid,
  Platform,
  StatusBar,
  View,
  useColorScheme,
} from 'react-native';
import TrackPlayer from 'react-native-track-player';
import {setAllSongs} from './src/redux/action';
import {getAll} from 'react-native-get-music-files';
import {useDispatch} from 'react-redux';
import AudioPlayer from './src/components/Player/AudioPlayer';
import {
  PLAYLIST_MOOD_STORAGE_KEY,
  SONG_MOOD_STORAGE_KEY,
} from './src/utils/moods';
import {ONLINE_LYRICS_STORAGE_KEY} from './src/utils/lyrics';
import BottomPlayer from './src/components/Player/BottomPlayer';
import {
  ensurePlayerInitialized,
  normalizeTracks,
} from './src/utils/trackPlayer';

const Stack = createStackNavigator();
export const AppContext = createContext();

const App = () => {
  const systemColorScheme = useColorScheme();
  const [appTheme, setAppTheme] = useState('system');
  const [colorTheme, setColorTheme] = useState('red');
  const [useDefaultColorTheme, setUseDefaultColorTheme] = useState(true);
  const [onlineLyricsEnabled, setOnlineLyricsEnabled] = useState(false);

  const isDarkMode =
    appTheme === 'system' ? systemColorScheme === 'dark' : appTheme === 'dark';
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

  const dispatch = useDispatch();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      SplashScreen.hide();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const [
          storedTheme,
          storedColorTheme,
          storedUseDefaultColorTheme,
          storedOnlineLyricsPreference,
        ] = await Promise.all([
          AsyncStorage.getItem('appTheme'),
          AsyncStorage.getItem('colorTheme'),
          AsyncStorage.getItem('useDefaultColorTheme'),
          AsyncStorage.getItem(ONLINE_LYRICS_STORAGE_KEY),
        ]);

        if (storedTheme) {
          setAppTheme(storedTheme);
        }
        if (storedColorTheme) {
          setColorTheme(storedColorTheme);
        }
        if (storedUseDefaultColorTheme !== null) {
          setUseDefaultColorTheme(storedUseDefaultColorTheme === 'true');
        }
        if (storedOnlineLyricsPreference !== null) {
          setOnlineLyricsEnabled(storedOnlineLyricsPreference === 'true');
        }
      } catch (error) {
        console.error('Failed to load theme', error);
      }
    };

    loadTheme();
  }, []);

  useEffect(() => {
    const initializePlayer = async () => {
      try {
        await ensurePlayerInitialized();
      } catch (error) {
        console.error('Failed to initialize TrackPlayer', error);
      }
    };

    const initializeFavSongs = async () => {
      try {
        const [existingSongs, existingSongMoods, existingPlaylistMoods] =
          await Promise.all([
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
          await AsyncStorage.setItem(
            PLAYLIST_MOOD_STORAGE_KEY,
            JSON.stringify({}),
          );
        }
      } catch (error) {
        console.error('Failed to initialize favSongs:', error);
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
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message:
                'Resonix uses notifications for lock screen and notification bar playback controls.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
        }

        const readPermission =
          Platform.OS === 'android' && Platform.Version >= 33
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

        const grantedStorage = await PermissionsAndroid.request(
          readPermission,
          {
            title: 'Audio Permission',
            message:
              'Resonix needs access to your device audio files to build your library.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        let grantedWriteStorage = PermissionsAndroid.RESULTS.GRANTED;
        if (Platform.OS === 'android' && Platform.Version < 33) {
          grantedWriteStorage = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission',
              message:
                'Resonix needs storage access to manage audio files on your device.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
        }

        if (
          grantedStorage === PermissionsAndroid.RESULTS.GRANTED &&
          grantedWriteStorage === PermissionsAndroid.RESULTS.GRANTED
        ) {
          fetechAllSongs();
        } else {
          requestPermissions();
        }
      } catch (error) {
        console.warn(error);
      }
    };

    requestPermissions();
  }, []);

  const fetechAllSongs = async () => {
    await getAll({
      limit: 200,
      coverQuality: 80,
    })
      .then(filesOrError => {
        if (typeof filesOrError === 'string') {
          console.error(filesOrError);
          return;
        }

        const reversedFiles = normalizeTracks(filesOrError.reverse());
        dispatch(setAllSongs(reversedFiles));
      })
      .catch(error => {
        console.error(error);
      });
  };

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
        onlineLyricsEnabled,
        setOnlineLyricsEnabled,
      }}>
      <View style={{flex: 1, backgroundColor: isDarkMode ? '#000' : '#fff'}}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        />

        <NavigationContainer theme={theme}>
          <View style={{flex: 1}}>
            <Stack.Navigator>
              <Stack.Screen
                name="Tabs"
                component={TabNavigator}
                options={{
                  headerShown: false,
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
            </Stack.Navigator>
            <BottomPlayer />
          </View>
        </NavigationContainer>
      </View>
    </AppContext.Provider>
  );
};

export default App;
