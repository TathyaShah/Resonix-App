import React, { useCallback, useContext, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronRight,
  faClockRotateLeft,
  faCompactDisc,
  faPenToSquare,
  faHeart,
  faLayerGroup,
  faMusic,
  faPaintBrush,
  faRotate,
  faShareNodes,
  faSliders,
  faTrashCan,
  faUser,
  faWaveSquare,
} from '@fortawesome/free-solid-svg-icons';
import { useSelector, useDispatch } from 'react-redux';
import { AppContext } from '../../App';
import { setFavouritesSongs } from '../redux/action';
import useResonixTheme from '../hooks/useResonixTheme';
import { ONLINE_LYRICS_STORAGE_KEY } from '../utils/lyrics';

const THEME_OPTIONS = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
];

const COLOR_THEME_OPTIONS = [
  { key: 'sunset', label: 'Sunset', color: '#F57C00' },
  { key: 'green', label: 'Green', color: '#2E7D32' },
  { key: 'red', label: 'Red', color: '#E53935' },
  { key: 'blue', label: 'Blue', color: '#1565C0' },
];

const Account = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {
    appTheme,
    setAppTheme,
    colorTheme,
    setColorTheme,
    useDefaultColorTheme,
    setUseDefaultColorTheme,
    onlineLyricsEnabled,
    setOnlineLyricsEnabled,
    fetechAllSongs,
  } = useContext(AppContext);
  const allSongs = useSelector(state => state.allSongsReducer);
  const palette = useResonixTheme();
  const [name, setName] = useState('');
  const [recentCount, setRecentCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [autoScan, setAutoScan] = useState(true);
  const [isRefreshingLibrary, setIsRefreshingLibrary] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const notify = useCallback(message => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Resonix', message);
    }
  }, []);

  const loadAccountState = useCallback(async () => {
    try {
      const [storedName, storedRecentSongs, storedFavSongs, storedAutoScan] =
        await Promise.all([
          AsyncStorage.getItem('profileName'),
          AsyncStorage.getItem('recentSongs'),
          AsyncStorage.getItem('favSongs'),
          AsyncStorage.getItem('libraryAutoScan'),
        ]);

      setName(storedName || '');
      setIsEditingName(!storedName);

      const recentSongs = storedRecentSongs ? JSON.parse(storedRecentSongs) : [];
      setRecentCount(Array.isArray(recentSongs) ? recentSongs.length : 0);

      const favourites = storedFavSongs ? JSON.parse(storedFavSongs) : [];
      const safeFavourites = Array.isArray(favourites) ? favourites : [];
      setFavCount(safeFavourites.length);
      dispatch(setFavouritesSongs(safeFavourites));

      if (storedAutoScan !== null) {
        setAutoScan(storedAutoScan === 'true');
      }
    } catch (error) {
      console.error('Failed to load account state', error);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadAccountState();
    }, [loadAccountState]),
  );

  const saveName = useCallback(async () => {
    try {
      const trimmedName = name.trim();
      await AsyncStorage.setItem('profileName', trimmedName);
      setName(trimmedName);
      setIsEditingName(!trimmedName);
      notify(trimmedName ? 'Profile updated.' : 'Profile name cleared.');
    } catch (error) {
      console.error('Failed to save profile name', error);
    }
  }, [name, notify]);

  const changeTheme = useCallback(
    async nextTheme => {
      try {
        if (setAppTheme) {
          setAppTheme(nextTheme);
        }
        await AsyncStorage.setItem('appTheme', nextTheme);
        notify(`Theme switched to ${nextTheme}.`);
      } catch (error) {
        console.error('Failed to change theme', error);
      }
    },
    [notify, setAppTheme],
  );

  const handleAutoScanToggle = useCallback(
    async value => {
      try {
        setAutoScan(value);
        await AsyncStorage.setItem('libraryAutoScan', String(value));
      } catch (error) {
        console.error('Failed to update auto scan preference', error);
      }
    },
    [],
  );

  const handleOnlineLyricsToggle = useCallback(
    async value => {
      try {
        setOnlineLyricsEnabled?.(value);
        await AsyncStorage.setItem(ONLINE_LYRICS_STORAGE_KEY, String(value));
        notify(value ? 'Online lyrics enabled.' : 'Online lyrics disabled.');
      } catch (error) {
        console.error('Failed to update lyrics preference', error);
      }
    },
    [notify, setOnlineLyricsEnabled],
  );

  const refreshLibrary = useCallback(async () => {
    try {
      setIsRefreshingLibrary(true);
      await fetechAllSongs?.();
      notify('Music library refreshed.');
    } catch (error) {
      console.error('Failed to refresh library', error);
      notify('Unable to refresh library.');
    } finally {
      setIsRefreshingLibrary(false);
    }
  }, [fetechAllSongs, notify]);

  const clearRecentHistory = useCallback(() => {
    Alert.alert(
      'Clear recent history',
      'This removes your recently played list only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.setItem('recentSongs', JSON.stringify([]));
              setRecentCount(0);
              notify('Recent history cleared.');
            } catch (error) {
              console.error('Failed to clear recent history', error);
            }
          },
        },
      ],
    );
  }, [notify]);

  const clearFavourites = useCallback(() => {
    Alert.alert(
      'Clear favourites',
      'This removes all songs from your favourites list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.setItem('favSongs', JSON.stringify([]));
              dispatch(setFavouritesSongs([]));
              setFavCount(0);
              notify('Favourites cleared.');
            } catch (error) {
              console.error('Failed to clear favourites', error);
            }
          },
        },
      ],
    );
  }, [dispatch, notify]);

  const resetAccountPreferences = useCallback(() => {
    Alert.alert(
      'Reset account preferences',
      'This resets your profile name and theme preferences.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
                await AsyncStorage.multiRemove([
                  'profileName',
                  'appTheme',
                  'libraryAutoScan',
                  'colorTheme',
                  'useDefaultColorTheme',
                  ONLINE_LYRICS_STORAGE_KEY,
                ]);
              setName('');
              setIsEditingName(true);
              setAutoScan(true);
              setOnlineLyricsEnabled?.(false);
                if (setAppTheme) {
                  setAppTheme('system');
                }
                setColorTheme?.('red');
                setUseDefaultColorTheme?.(true);
                notify('Account preferences reset.');
            } catch (error) {
              console.error('Failed to reset preferences', error);
            }
          },
        },
      ],
    );
  }, [notify, setAppTheme, setColorTheme, setOnlineLyricsEnabled, setUseDefaultColorTheme]);

  const shareApp = useCallback(async () => {
    try {
      await Share.share({
        message: 'Listening on Resonix. Check out this music player app.',
        title: 'Resonix',
      });
    } catch (error) {
      console.error('Failed to share app', error);
    }
  }, []);

  const changeColorTheme = useCallback(
    async nextColorTheme => {
      try {
        setColorTheme?.(nextColorTheme);
        await AsyncStorage.setItem('colorTheme', nextColorTheme);
        notify(`${nextColorTheme.charAt(0).toUpperCase() + nextColorTheme.slice(1)} theme applied.`);
      } catch (error) {
        console.error('Failed to change color theme', error);
      }
    },
    [notify, setColorTheme],
  );

  const handleDefaultThemeToggle = useCallback(
    async value => {
      try {
        setUseDefaultColorTheme?.(value);
        await AsyncStorage.setItem('useDefaultColorTheme', String(value));
        notify(value ? 'Default theme enabled.' : 'Custom themes enabled.');
      } catch (error) {
        console.error('Failed to update default theme toggle', error);
      }
    },
    [notify, setUseDefaultColorTheme],
  );

  const displayName = name || 'Your profile';
  const hasSavedName = Boolean(name.trim());
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'R';

  const overviewCards = [
    {
      key: 'songs',
      label: 'Library',
      value: `${allSongs.length}`,
      helper: 'songs',
      icon: faMusic,
      accent: palette.secondary,
    },
    {
      key: 'favourites',
      label: 'Favourites',
      value: `${favCount}`,
      helper: 'saved',
      icon: faHeart,
      accent: palette.accent,
      onPress: () => navigation.navigate('Favourites'),
    },
    {
      key: 'recent',
      label: 'Recents',
      value: `${recentCount}`,
      helper: 'played',
      icon: faClockRotateLeft,
      accent: palette.tertiary,
      onPress: () => navigation.navigate('RecentHistory'),
    },
  ];

  const quickActions = [
    {
      key: 'refresh',
      title: isRefreshingLibrary ? 'Refreshing library...' : 'Refresh music library',
      subtitle: 'Scan device songs again and update the collection',
      icon: faRotate,
      onPress: refreshLibrary,
    },
    {
      key: 'share',
      title: 'Share Resonix',
      subtitle: 'Send the app to a friend',
      icon: faShareNodes,
      onPress: shareApp,
    },
  ];

  const libraryItems = [
    {
      key: 'favourites',
      title: 'Favourite songs',
      subtitle: `${favCount} songs saved`,
      icon: faHeart,
      onPress: () => navigation.navigate('Favourites'),
    },
    {
      key: 'recent',
      title: 'Recently played',
      subtitle: `${recentCount} tracks in history`,
      icon: faClockRotateLeft,
      onPress: () => navigation.navigate('RecentHistory'),
    },
    {
      key: 'discover',
      title: 'Explore music',
      subtitle: 'Jump back into search and discovery',
      icon: faWaveSquare,
      onPress: () => navigation.navigate('Search'),
    },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={palette.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, { borderColor: palette.border }]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={[palette.secondary, palette.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={[styles.eyebrow, { color: palette.subtext }]}>Heyyy</Text>
            <View style={styles.heroNameRow}>
              <Text style={[styles.heroTitle, { color: palette.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              {hasSavedName ? (
                <TouchableOpacity
                  onPress={() => setIsEditingName(true)}
                  activeOpacity={0.85}
                  style={[styles.editButton, { backgroundColor: palette.card }]}
                >
                  <FontAwesomeIcon icon={faPenToSquare} size={14} color={palette.accent} />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={[styles.heroSubtitle, { color: palette.subtext }]}>
              Personalize your music space, preferences, and library shortcuts.
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {overviewCards.map(card => {
            const content = (
              <View
                key={card.key}
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.metricIcon,
                    { backgroundColor: `${card.accent}20` },
                  ]}
                >
                  <FontAwesomeIcon icon={card.icon} color={card.accent} size={15} />
                </View>
                <Text style={[styles.metricValue, { color: palette.text }]}>{card.value}</Text>
                <Text style={[styles.metricLabel, { color: palette.subtext }]}>{card.label}</Text>
                <Text style={[styles.metricHelper, { color: palette.subtext }]}>{card.helper}</Text>
              </View>
            );

            if (!card.onPress) {
              return content;
            }

            return (
              <TouchableOpacity key={card.key} activeOpacity={0.9} onPress={card.onPress}>
                {content}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {isEditingName ? (
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: palette.accentSoft }]}>
              <FontAwesomeIcon icon={faUser} size={14} color={palette.accent} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Profile</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.subtext }]}>
                {hasSavedName
                  ? 'Edit your display name here.'
                  : 'Add your display name once to personalize the app.'}
              </Text>
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: palette.subtext }]}>Display name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            placeholder="Add your name"
            placeholderTextColor={palette.subtext}
            style={[
              styles.input,
              {
                backgroundColor: palette.input,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            returnKeyType="done"
            autoFocus
          />
          <Text style={[styles.inputHint, { color: palette.subtext }]}>
            {hasSavedName
              ? 'Update the name and tap outside the field to save it.'
              : 'Once saved, this card will disappear and your name will stay across the app.'}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: palette.accentSoft }]}>
            <FontAwesomeIcon icon={faLayerGroup} size={14} color={palette.accent} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Library</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.subtext }]}>
              Quick access to the parts of your collection you use most.
            </Text>
          </View>
        </View>

        {libraryItems.map(item => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.88}
            onPress={item.onPress}
            style={[
              styles.listRow,
              {
                backgroundColor: palette.cardMuted,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.listRowLeft}>
              <View style={[styles.listRowIcon, { backgroundColor: palette.card }]}>
                <FontAwesomeIcon icon={item.icon} size={15} color={palette.accent} />
              </View>
              <View style={styles.listRowText}>
                <Text style={[styles.listRowTitle, { color: palette.text }]}>{item.title}</Text>
                <Text style={[styles.listRowSubtitle, { color: palette.subtext }]}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
            <FontAwesomeIcon icon={faChevronRight} size={14} color={palette.subtext} />
          </TouchableOpacity>
        ))}
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: palette.accentSoft }]}>
            <FontAwesomeIcon icon={faPaintBrush} size={14} color={palette.accent} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Themes</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.subtext }]}>
              Change the app&apos;s color system across all screens.
            </Text>
          </View>
        </View>

        <View style={styles.colorThemeGrid}>
          <View
            style={[
              styles.preferenceRow,
              { backgroundColor: palette.cardMuted, borderColor: palette.border, width: '100%' },
            ]}
          >
            <View style={styles.preferenceTextWrap}>
              <Text style={[styles.listRowTitle, { color: palette.text }]}>Show default theme</Text>
              <Text style={[styles.listRowSubtitle, { color: palette.subtext }]}>
                Keep the original pink Resonix colors.
              </Text>
            </View>
            <Switch
              value={useDefaultColorTheme}
              onValueChange={handleDefaultThemeToggle}
              trackColor={{ false: '#8E97A8', true: palette.accentSoft }}
              thumbColor={useDefaultColorTheme ? palette.accent : '#F7F8FB'}
            />
          </View>

          {!useDefaultColorTheme
            ? COLOR_THEME_OPTIONS.map(option => {
                const active = colorTheme === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    activeOpacity={0.9}
                    onPress={() => changeColorTheme(option.key)}
                    style={[
                      styles.colorThemeCard,
                      {
                        backgroundColor: palette.cardMuted,
                        borderColor: active ? palette.accent : palette.border,
                      },
                    ]}
                  >
                    <View style={[styles.colorSwatch, { backgroundColor: option.color }]} />
                    <Text style={[styles.colorThemeLabel, { color: palette.text }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })
            : null}
        </View>
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: palette.accentSoft }]}>
            <FontAwesomeIcon icon={faPaintBrush} size={14} color={palette.accent} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Appearance</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.subtext }]}>
              Match Resonix with your preferred look and feel.
            </Text>
          </View>
        </View>

        <View style={[styles.themeSelector, { backgroundColor: palette.cardMuted }]}>
          {THEME_OPTIONS.map(option => {
            const active = appTheme === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.9}
                onPress={() => changeTheme(option.key)}
                style={[
                  styles.themePill,
                  active && {
                    backgroundColor: palette.accent,
                    borderColor: palette.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.themePillText,
                    { color: active ? '#FFFFFF' : palette.subtext },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: palette.accentSoft }]}>
            <FontAwesomeIcon icon={faSliders} size={14} color={palette.accent} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Preferences</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.subtext }]}>
              Tune how the app behaves around your local music library.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.preferenceRow,
            { backgroundColor: palette.cardMuted, borderColor: palette.border },
          ]}
        >
          <View style={styles.preferenceTextWrap}>
            <Text style={[styles.listRowTitle, { color: palette.text }]}>Auto-scan library</Text>
            <Text style={[styles.listRowSubtitle, { color: palette.subtext }]}>
              Keep your scan preference saved for future library updates.
            </Text>
          </View>
          <Switch
            value={autoScan}
            onValueChange={handleAutoScanToggle}
            trackColor={{ false: '#8E97A8', true: palette.accentSoft }}
            thumbColor={autoScan ? palette.accent : '#F7F8FB'}
          />
        </View>

        <View
          style={[
            styles.preferenceRow,
            { backgroundColor: palette.cardMuted, borderColor: palette.border, marginTop: 12 },
          ]}
        >
          <View style={styles.preferenceTextWrap}>
            <Text style={[styles.listRowTitle, { color: palette.text }]}>Fetch lyrics online</Text>
            <Text style={[styles.listRowSubtitle, { color: palette.subtext }]}>
              Show lyrics on the player screen when an internet connection is available.
            </Text>
          </View>
          <Switch
            value={onlineLyricsEnabled}
            onValueChange={handleOnlineLyricsToggle}
            trackColor={{ false: '#8E97A8', true: palette.accentSoft }}
            thumbColor={onlineLyricsEnabled ? palette.accent : '#F7F8FB'}
          />
        </View>

        {quickActions.map(action => (
          <TouchableOpacity
            key={action.key}
            activeOpacity={0.88}
            onPress={action.onPress}
            style={[
              styles.listRow,
              {
                backgroundColor: palette.cardMuted,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={styles.listRowLeft}>
              <View style={[styles.listRowIcon, { backgroundColor: palette.card }]}>
                <FontAwesomeIcon icon={action.icon} size={15} color={palette.accent} />
              </View>
              <View style={styles.listRowText}>
                <Text style={[styles.listRowTitle, { color: palette.text }]}>{action.title}</Text>
                <Text style={[styles.listRowSubtitle, { color: palette.subtext }]}>
                  {action.subtitle}
                </Text>
              </View>
            </View>
            <FontAwesomeIcon icon={faChevronRight} size={14} color={palette.subtext} />
          </TouchableOpacity>
        ))}
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: palette.accentSoft }]}>
            <FontAwesomeIcon icon={faTrashCan} size={14} color={palette.accent} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Data management</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.subtext }]}>
              Remove specific saved data without affecting your music files.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={clearRecentHistory}
          style={[
            styles.listRow,
            {
              backgroundColor: palette.cardMuted,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.listRowLeft}>
            <View style={[styles.listRowIcon, { backgroundColor: palette.card }]}>
              <FontAwesomeIcon icon={faClockRotateLeft} size={15} color={palette.accent} />
            </View>
            <View style={styles.listRowText}>
              <Text style={[styles.listRowTitle, { color: palette.text }]}>Clear recent history</Text>
              <Text style={[styles.listRowSubtitle, { color: palette.subtext }]}>
                Remove all recently played items.
              </Text>
            </View>
          </View>
          <FontAwesomeIcon icon={faChevronRight} size={14} color={palette.subtext} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={clearFavourites}
          style={[
            styles.listRow,
            {
              backgroundColor: palette.cardMuted,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.listRowLeft}>
            <View style={[styles.listRowIcon, { backgroundColor: palette.card }]}>
              <FontAwesomeIcon icon={faCompactDisc} size={15} color={palette.accent} />
            </View>
            <View style={styles.listRowText}>
              <Text style={[styles.listRowTitle, { color: palette.text }]}>Clear favourites</Text>
              <Text style={[styles.listRowSubtitle, { color: palette.subtext }]}>
                Start over with an empty favourites list.
              </Text>
            </View>
          </View>
          <FontAwesomeIcon icon={faChevronRight} size={14} color={palette.subtext} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={resetAccountPreferences}
          style={[
            styles.listRow,
            {
              backgroundColor: palette.cardMuted,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.listRowLeft}>
            <View style={[styles.listRowIcon, { backgroundColor: palette.card }]}>
              <FontAwesomeIcon icon={faRotate} size={15} color={palette.accent} />
            </View>
            <View style={styles.listRowText}>
              <Text style={[styles.listRowTitle, { color: palette.text }]}>Reset preferences</Text>
              <Text style={[styles.listRowSubtitle, { color: palette.subtext }]}>
                Restore profile name, theme, and account defaults.
              </Text>
            </View>
          </View>
          <FontAwesomeIcon icon={faChevronRight} size={14} color={palette.subtext} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140,
    gap: 16,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    marginRight: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
  },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: 101,
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  metricHelper: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  inputHint: {
    fontSize: 12,
    marginTop: 10,
    lineHeight: 17,
  },
  listRow: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  listRowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listRowText: {
    flex: 1,
  },
  listRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  listRowSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 6,
  },
  colorThemeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  colorThemeCard: {
    width: '48%',
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 12,
    marginBottom: 10,
  },
  colorThemeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  themePill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  preferenceRow: {
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preferenceTextWrap: {
    flex: 1,
    paddingRight: 16,
  },
});

export default Account;
