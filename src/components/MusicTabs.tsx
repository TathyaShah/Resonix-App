import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Album from './Tab_screens/Album';
import Artist from './Tab_screens/Artist';
import All_songs from './Tab_screens/All_songs';
import FavSongs from './Tab_screens/favsongs';
import Playlists from './Tab_screens/Playlists';
import { StyleSheet, View } from 'react-native';
import useResonixTheme from '../hooks/useResonixTheme';

const TopTab = createMaterialTopTabNavigator();

const MusicTabs = () => {
  const palette = useResonixTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <TopTab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: palette.background,
            elevation: 0,
            paddingLeft: 16,
            paddingRight: 10,
            paddingTop: 18,
            borderBottomWidth: 1,
            borderColor: palette.border,
          },
          tabBarGap: 0,
          tabBarInactiveTintColor: palette.subtext,
          tabBarActiveTintColor: palette.accent,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: { width: 'auto', left: -15 },
          tabBarIndicatorStyle: {
            backgroundColor: palette.accent,
            height: 3,
            borderRadius: 999,
          },
        }}
      >
        <TopTab.Screen
          name="Songs"
          component={All_songs}
        />
        <TopTab.Screen
          name="Artist"
          component={Artist}
        />
        <TopTab.Screen
          name="Album"
          component={Album}
        />
        <TopTab.Screen
          name="Favourites"
          component={FavSongs}
        />
        <TopTab.Screen
          name="Playlists"
          component={Playlists}
        />
      </TopTab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarLabel: {
    textTransform: 'capitalize',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default MusicTabs;
