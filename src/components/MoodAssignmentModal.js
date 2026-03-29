import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import useResonixTheme from '../hooks/useResonixTheme';
import { MOOD_OPTIONS } from '../utils/moods';

const MoodAssignmentModal = ({
  visible,
  title = 'Assign to mood',
  selectedMoods = [],
  onClose,
  onSave,
}) => {
  const palette = useResonixTheme();
  const [draftMoods, setDraftMoods] = useState(selectedMoods);

  useEffect(() => {
    setDraftMoods(selectedMoods);
  }, [selectedMoods, visible]);

  const toggleMood = moodKey => {
    setDraftMoods(current =>
      current.includes(moodKey)
        ? current.filter(item => item !== moodKey)
        : [...current, moodKey],
    );
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: palette.subtext }]}>
                Pick one or more moods for this item.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: palette.surfaceMuted }]}
            >
              <FontAwesomeIcon icon={faTimes} size={14} color={palette.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.moodList}>
            {MOOD_OPTIONS.map(mood => {
              const active = draftMoods.includes(mood.key);

              return (
                <TouchableOpacity
                  key={mood.key}
                  onPress={() => toggleMood(mood.key)}
                  activeOpacity={0.88}
                  style={[
                    styles.moodRow,
                    {
                      backgroundColor: active ? palette.accentSoft : palette.surfaceMuted,
                      borderColor: active ? palette.accent : palette.border,
                    },
                  ]}
                >
                  <View style={styles.moodRowLeft}>
                    <Text style={styles.emoji}>{mood.emoji}</Text>
                    <Text style={[styles.moodLabel, { color: palette.text }]}>{mood.label}</Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: active ? palette.accent : 'transparent',
                        borderColor: active ? palette.accent : palette.subtext,
                      },
                    ]}
                  >
                    {active ? <FontAwesomeIcon icon={faCheck} size={12} color="#fff" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => onSave?.(draftMoods)}
            style={[styles.saveButton, { backgroundColor: palette.accent }]}
          >
            <Text style={styles.saveText}>Save moods</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  sheet: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  moodList: {
    gap: 12,
  },
  moodRow: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moodRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 20,
    marginRight: 10,
  },
  moodLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default MoodAssignmentModal;
