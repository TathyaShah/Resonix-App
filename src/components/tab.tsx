

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
    useColorScheme,
} from 'react-native';
import {
    Colors
} from 'react-native/Libraries/NewAppScreen';
import { faSearch, faPlay, faHome, faUser, faMusic } from '@fortawesome/free-solid-svg-icons';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    const isDarkMode = useColorScheme() === 'dark';
    const navigation = useNavigation();
    return (
        <View style={{ flex: 1, backgroundColor: isDarkMode ? Colors.black : Colors.white }}>
            {/* header bar */}
            <View style={styles.titleContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                        backgroundColor: '#E82255',
                        width: 35,
                        height: 35,
                        borderRadius: 25,
                        padding: 8,
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <FontAwesomeIcon icon={faPlay} size={16} style={{ color: 'white' }} />
                    </View>
                    <Text style={[styles.titleStyle, { color: isDarkMode ? Colors.white : Colors.black }]}>
                        <Text style={{ color: '#e82255', fontWeight: 'bold' }}>Resonix</Text>
                    </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.SearchIconContainer}>
                    <FontAwesomeIcon icon={faSearch} size={18} style={{ color: isDarkMode ? Colors.white : Colors.black }} />
                </TouchableOpacity>
            </View>
            <Tab.Navigator
                sceneContainerStyle={{ paddingBottom: 120 }}
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: isDarkMode ? Colors.black : Colors.white,
                    },
                    tabBarIcon: ({ color, size }) => {
                        let icon;
                        if (route.name === 'Home') icon = faHome;
                        else if (route.name === 'Search') icon = faSearch;
                        else if (route.name === 'Music') icon = faMusic;
                        else if (route.name === 'Account') icon = faUser;
                        return <FontAwesomeIcon icon={icon} size={size} style={{ color }} />;
                    },
                    tabBarActiveTintColor: '#E82255',
                    tabBarInactiveTintColor: 'grey',
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
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        marginTop: 10

    },
    titleStyle: {
        fontSize: 20,
        textAlign: 'left',
        fontWeight: 'bold',

    },
    SearchIconContainer: {
        borderRadius: 50,
        padding: 8
    },
    tabBarIndicator: {
        backgroundColor: 'transparent',

    },
    tabBarLabel: {
        textTransform: 'capitalize',
        fontWeight: 'bold',


    }

});

export default TabNavigator;