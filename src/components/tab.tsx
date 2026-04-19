

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import MusicTabs from './MusicTabs';
import Home from './Home';
import Account from './Account';
import SearchMusic from './Audio_screens/AudioSearch';
import FavouritesSongs from './Tab_screens/favsongs';
import AddToFavourites from './Audio_screens/AddToFavourite';
import ArtisBasedSongs from './Audio_screens/artistBasedSongs';
import AlbumSongs from './Audio_screens/albumSong';
import PlaylistDetail from './Tab_screens/PlaylistDetail';
import RecentHistory from './RecentHistory';
import MoodSongs from './MoodSongs';
import ArtistsLibraryScreen from './Tab_screens/ArtistsLibraryScreen';
import AlbumsLibraryScreen from './Tab_screens/AlbumsLibraryScreen';

import {
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import useTheme from '../hooks/useTheme';
import useResonixTheme from '../hooks/useResonixTheme';
import { faSearch, faPlay, faHome, faUser, faMusic } from '@fortawesome/free-solid-svg-icons';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack
const HomeStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeScreen" component={Home} />
            <Stack.Screen
                name="MoodSongs"
                component={MoodSongs}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="RecentHistory"
                component={RecentHistory}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="PlaylistDetail"
                component={PlaylistDetail}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
        </Stack.Navigator>
    );
};

// Search Stack
const SearchStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SearchScreen" component={SearchMusic} />
            <Stack.Screen
                name="artistBasedSongs"
                component={ArtisBasedSongs}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="albumbasesongs"
                component={AlbumSongs}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="PlaylistDetail"
                component={PlaylistDetail}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
        </Stack.Navigator>
    );
};

// Music Stack
const MusicStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MusicScreen" component={MusicTabs} />
            <Stack.Screen
                name="Favourites"
                component={FavouritesSongs}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="AddToFavourites"
                component={AddToFavourites}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="ArtistsLibrary"
                component={ArtistsLibraryScreen}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="AlbumsLibrary"
                component={AlbumsLibraryScreen}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="artistBasedSongs"
                component={ArtisBasedSongs}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="albumbasesongs"
                component={AlbumSongs}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="PlaylistDetail"
                component={PlaylistDetail}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
        </Stack.Navigator>
    );
};

// Account Stack
const AccountStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AccountScreen" component={Account} />
            <Stack.Screen
                name="Favourites"
                component={FavouritesSongs}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="RecentHistory"
                component={RecentHistory}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
            <Stack.Screen
                name="AddToFavourites"
                component={AddToFavourites}
                options={{ ...TransitionPresets.SlideFromRightIOS }}
            />
        </Stack.Navigator>
    );
};

const TabNavigator = () => {
    const { isDarkMode } = useTheme();
    const palette = useResonixTheme();
    const navigation = useNavigation();
    return (
        <View style={{ flex: 1, backgroundColor: palette.background }}>
            <View style={[styles.titleContainer, { backgroundColor: palette.background }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                        backgroundColor: palette.accent,
                        width: 42,
                        height: 42,
                        borderRadius: 16,
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <FontAwesomeIcon icon={faPlay} size={16} style={{ color: 'white' }} />
                    </View>
                    <View>
                        {/* <Text style={[styles.eyebrow, { color: palette.subtext }]}>Your music space</Text> */}
                        <Text style={[styles.titleStyle, { color: palette.text }]}>
                            <Text style={{ color: palette.accent, fontWeight: 'bold' }}>Resonix</Text>
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('SearchTab')} style={[styles.SearchIconContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <FontAwesomeIcon icon={faSearch} size={18} style={{ color: palette.text }} />
                </TouchableOpacity>
            </View>
            <Tab.Navigator
                sceneContainerStyle={{ paddingBottom: 120 }}
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: palette.surface,
                        borderTopColor: palette.border,
                        borderTopWidth: 1,
                        height: 68,
                        paddingBottom: 8,
                        paddingTop: 8,
                    },
                    tabBarIcon: ({ color, size }) => {
                        let icon;
                        if (route.name === 'HomeTab') icon = faHome;
                        else if (route.name === 'SearchTab') icon = faSearch;
                        else if (route.name === 'MusicTab') icon = faMusic;
                        else if (route.name === 'AccountTab') icon = faUser;
                        return <FontAwesomeIcon icon={icon} size={size} style={{ color }} />;
                    },
                    tabBarActiveTintColor: palette.accent,
                    tabBarInactiveTintColor: palette.subtext,
                    tabBarLabelStyle: styles.tabBarLabel,
                })}
            >
                <Tab.Screen 
                    name="HomeTab" 
                    component={HomeStack}
                    options={{ title: 'Home' }}
                />
                <Tab.Screen 
                    name="SearchTab" 
                    component={SearchStack}
                    options={{ title: 'Search' }}
                />
                <Tab.Screen 
                    name="MusicTab" 
                    component={MusicStack}
                    options={{ title: 'Music' }}
                />
                <Tab.Screen 
                    name="AccountTab" 
                    component={AccountStack}
                    options={{ title: 'Account' }}
                />
            </Tab.Navigator>
        </View>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        marginTop: 10,
        marginBottom: 4,
    },
    eyebrow: {
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    titleStyle: {
        fontSize: 26,
        textAlign: 'left',
        fontWeight: 'bold',
    },
    SearchIconContainer: {
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
    },
    tabBarIndicator: {
        backgroundColor: 'transparent',

    },
    tabBarLabel: {
        textTransform: 'capitalize',
        fontWeight: '700',
        fontSize: 12,
    }

});

export default TabNavigator;
