import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import useResonixTheme from '../../hooks/useResonixTheme';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleRight, faMicrophoneLines } from '@fortawesome/free-solid-svg-icons';
const Artist = ({ navigation }) => {
    const Songs = useSelector((state) => state.allSongsReducer);
    const [songArtist, setsongArtist] = useState([]);
    const [artistCount, setAristCount] = useState(0);
    const palette = useResonixTheme();
 
    useEffect(() => {
        const artists = [...new Set(Songs.map(song =>
            song.artist
        ))];
        setsongArtist(artists);
        setAristCount(artists.length);
    }, [Songs]);

    const openSelectedArtistSong = (artist) => {
        navigation.navigate('artistBasedSongs', { artistName: artist });
    }
    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft }]}>
                    <FontAwesomeIcon icon={faMicrophoneLines} size={16} color={palette.accent} />
                </View>
                <Text style={[styles.title, { color: palette.text }]}>Artists</Text>
                <Text style={[styles.subtitle, { color: palette.subtext }]}>
                    {artistCount} artists from your library.
                </Text>
            </View>
            <FlatList
                data={songArtist}
                contentContainerStyle={styles.list}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => openSelectedArtistSong(item)}
                        style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}
                    >
                        <Text style={[styles.rowText, { color: palette.text }]} numberOfLines={1} ellipsizeMode='tail'>{item}</Text>
                        <FontAwesomeIcon icon={faAngleRight} size={16} style={{ color: palette.subtext }} />
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    heroCard: { borderWidth: 1, borderRadius: 24, padding: 18, marginBottom: 14 },
    iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
    subtitle: { fontSize: 13, lineHeight: 18 },
    list: { paddingBottom: 120 },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 18,
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 10,
    },
    rowText: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize', flex: 1, paddingRight: 16 },
});

export default Artist;
