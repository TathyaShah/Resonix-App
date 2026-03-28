

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import BottomPlayer from './Player/BottomPlayer';
import MusicTabs from './MusicTabs';
import Home from './Home';
import Account from './Account';
import SearchMusic from './Audio_screens/AudioSearch';

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
                        <Text style={[styles.eyebrow, { color: palette.subtext }]}>Your music space</Text>
                        <Text style={[styles.titleStyle, { color: palette.text }]}>
                            <Text style={{ color: palette.accent, fontWeight: 'bold' }}>Resonix</Text>
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Search')} style={[styles.SearchIconContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
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
                        if (route.name === 'Home') icon = faHome;
                        else if (route.name === 'Search') icon = faSearch;
                        else if (route.name === 'Music') icon = faMusic;
                        else if (route.name === 'Account') icon = faUser;
                        return <FontAwesomeIcon icon={icon} size={size} style={{ color }} />;
                    },
                    tabBarActiveTintColor: palette.accent,
                    tabBarInactiveTintColor: palette.subtext,
                    tabBarLabelStyle: styles.tabBarLabel,
                })}
            >
                <Tab.Screen name="Home" component={Home} />
                <Tab.Screen name="Search" component={SearchMusic} />
                <Tab.Screen name="Music" component={MusicTabs} />
                <Tab.Screen name="Account" component={Account} />
            </Tab.Navigator>
            <BottomPlayer />
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
