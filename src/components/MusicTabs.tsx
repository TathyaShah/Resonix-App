import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Album from './Tab_screens/Album';
import Artist from './Tab_screens/Artist';
import All_songs from './Tab_screens/All_songs';
import FavSongs from './Tab_screens/favsongs';
import Playlists from './Tab_screens/Playlists';
import { StyleSheet, View } from 'react-native';
import useTheme from '../hooks/useTheme';
import { Colors } from 'react-native/Libraries/NewAppScreen';

const TopTab = createMaterialTopTabNavigator();

const MusicTabs = () => {
  const { isDarkMode } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? Colors.black : Colors.white }}>
      <TopTab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
            elevation: 0,
            paddingLeft: 15,
            paddingRight: 10,
            paddingTop: 30,
            borderBottomWidth: 1,
            borderColor: isDarkMode ? Colors.darker : Colors.lighter,
          },
          tabBarGap: 0,
          tabBarInactiveTintColor: 'grey',
          tabBarActiveTintColor: '#E82255',
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: { width: 'auto', left: -15 },
        }}
      >
        <TopTab.Screen
          name="Songs"
          component={All_songs}
          options={{
            tabBarIndicatorStyle: styles.tabBarIndicator,
          }}
        />
        <TopTab.Screen
          name="Artist"
          component={Artist}
          options={{
            tabBarIndicatorStyle: styles.tabBarIndicator,
          }}
        />
        <TopTab.Screen
          name="Album"
          component={Album}
          options={{
            tabBarIndicatorStyle: styles.tabBarIndicator,
          }}
        />
        <TopTab.Screen
          name="Favourites"
          component={FavSongs}
          options={{
            tabBarIndicatorStyle: styles.tabBarIndicator,
          }}
        />
        <TopTab.Screen
          name="Playlists"
          component={Playlists}
          options={{
            tabBarIndicatorStyle: styles.tabBarIndicator,
          }}
        />
      </TopTab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarIndicator: {
    backgroundColor: 'transparent',
  },
  tabBarLabel: {
    textTransform: 'capitalize',
    fontWeight: 'bold',
  },
});

export default MusicTabs;
