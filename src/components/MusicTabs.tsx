import React, { useMemo, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCompactDisc, faMusic } from '@fortawesome/free-solid-svg-icons';
import AllSongs from './Tab_screens/All_songs';
import PlaylistsHub from './Tab_screens/Playlists';
import useResonixTheme from '../hooks/useResonixTheme';

const TopTab = createMaterialTopTabNavigator();

const AnimatedTabBar = ({ state, descriptors, navigation, position }) => {
  const palette = useResonixTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const indicatorWidth = useMemo(() => {
    if (!containerWidth) {
      return 0;
    }
    return (containerWidth - 8) / state.routes.length;
  }, [containerWidth, state.routes.length]);

  const translateX = position.interpolate({
    inputRange: state.routes.map((_, index) => index),
    outputRange: state.routes.map((_, index) => 4 + indicatorWidth * index),
  });

  const routeIcons = {
    AllSongs: faMusic,
    PlaylistsHub: faCompactDisc,
  };

  return (
    <View style={[styles.tabBarOuter, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
      <View
        onLayout={handleLayout}
        style={[styles.tabBarShell, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        {indicatorWidth > 0 ? (
          <Animated.View
            style={[
              styles.indicator,
              {
                width: indicatorWidth,
                transform: [{ translateX }],
                backgroundColor: palette.accent,
              },
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const options = descriptors[route.key].options;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tabButton}>
              <View style={styles.tabButtonInner}>
                <FontAwesomeIcon
                  icon={routeIcons[route.name]}
                  size={14}
                  color={isFocused ? '#fff' : palette.subtext}
                />
                <Text style={[styles.tabLabel, { color: isFocused ? '#fff' : palette.subtext }]}>
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const MusicTabs = () => {
  const palette = useResonixTheme();

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <TopTab.Navigator
        initialRouteName="AllSongs"
        tabBar={props => <AnimatedTabBar {...props} />}
        sceneContainerStyle={{ backgroundColor: palette.background }}
        screenOptions={{
          lazy: true,
          swipeEnabled: true,
          animationEnabled: true,
        }}
      >
        <TopTab.Screen
          name="AllSongs"
          component={AllSongs}
          options={{ tabBarLabel: 'All Songs' }}
        />
        <TopTab.Screen
          name="PlaylistsHub"
          component={PlaylistsHub}
          options={{ tabBarLabel: 'Playlists' }}
        />
      </TopTab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarOuter: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  tabBarShell: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 4,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: 18,
  },
  tabButton: {
    flex: 1,
    zIndex: 1,
  },
  tabButtonInner: {
    minHeight: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default MusicTabs;
