import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeartRateDisplayProps {
    bpm: number;
}

export const HeartRateDisplay: React.FC<HeartRateDisplayProps> = ({ bpm }) => {
    return (
        <View style={styles.container}>
            <Ionicons name="heart" size={24} color="#ff4b4b" />
            <Text style={styles.bpm}>{bpm}</Text>
            <Text style={styles.unit}>BPM</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'baseline',
        backgroundColor: '#1c1c1e',
        padding: 15,
        borderRadius: 12,
    },
    bpm: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    unit: {
        color: '#ff4b4b',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 4,
    },
});
