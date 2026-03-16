import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const Account = () => {
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('system');
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedName = await AsyncStorage.getItem('profileName');
        if (storedName) setName(storedName);
        const storedTheme = await AsyncStorage.getItem('appTheme');
        if (storedTheme) setTheme(storedTheme);
      } catch (e) {
        console.error(e);
      }
    };
    loadProfile();
  }, []);

  const saveName = async () => {
    try {
      await AsyncStorage.setItem('profileName', name);
    } catch (e) {
      console.error(e);
    }
  };

  const changeTheme = async (t) => {
    try {
        setTheme(t);
        await AsyncStorage.setItem('appTheme', t);
    } catch (e) {
        console.error(e);
    }
  };

  const handleLogout = async () => {
    // clear stored profile data
    try {
      await AsyncStorage.removeItem('profileName');
      // additional cleanup: redux store, auth tokens etc.
      // for now just reset name
      setName('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}> 
      <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Profile</Text>
      <TextInput
        style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#555' : '#ccc' }]}
        placeholder="Your name"
        placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
        value={name}
        onChangeText={setName}
        onBlur={saveName}
      />
      {/* login buttons could go here */}

      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('Favourites')}
      >
        <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>Favorites</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Theme</Text>
      <View style={styles.themeOptions}>
        {['light', 'dark', 'system'].map((t) => (
          <TouchableOpacity key={t} onPress={() => changeTheme(t)} style={{ marginRight: 10 }}>
            <Text style={{ color: theme === t ? '#E82255' : isDarkMode ? '#fff' : '#000' }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.logoutButton, { marginTop: 30 }]} onPress={handleLogout}>
        <Text style={{ color: 'white' }}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, padding: 8, borderRadius: 4 },
  row: { paddingVertical: 10 },
  themeOptions: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  logoutButton: { backgroundColor: '#E82255', padding: 10, borderRadius: 4, alignItems: 'center' },
});

export default Account;
