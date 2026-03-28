import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import useResonixTheme from '../../hooks/useResonixTheme';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleRight, faFolder } from '@fortawesome/free-solid-svg-icons';
const Album = ({ navigation }) => {
    const Songs = useSelector((state) => state.allSongsReducer);
    const [albumSong, setalbumSong] = useState([]);
    const [albumCount, setalbumCount] = useState(0);
    const palette = useResonixTheme();
    useEffect(() => {
        const albums = [...new Set(Songs.map(song =>
            song.album
        ))];
        setalbumSong(albums);
        setalbumCount(albums.length);
    }, [Songs]);

    const openSelectedAlbumSong = (album) => {
        navigation.navigate('albumbasesongs', { albumName: album });
    }
    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft }]}>
                    <FontAwesomeIcon icon={faFolder} size={16} color={palette.accent} />
                </View>
                <Text style={[styles.title, { color: palette.text }]}>Albums</Text>
                <Text style={[styles.subtitle, { color: palette.subtext }]}>
                    {albumCount} albums available in your collection.
                </Text>
            </View>
            <FlatList
                data={albumSong}
                contentContainerStyle={styles.list}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => openSelectedAlbumSong(item)} style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                        <View style={styles.rowLeft}>
                        <View style={[styles.rowIcon, { backgroundColor: palette.surfaceMuted }]}>
                        <FontAwesomeIcon icon={faFolder} size={16} style={{ color: palette.success }} />
                        </View>
                        <Text style={[styles.rowText, { color: palette.text }]} numberOfLines={1} ellipsizeMode='tail'>{item}</Text>
                        </View>
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
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 16 },
    rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowText: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize', flex: 1 },
});

export default Album;
