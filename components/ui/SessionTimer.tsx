import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

interface SessionTimerProps {
    seconds: number;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({ seconds }) => {
    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>TEMPO DE SESSÃO</Text>
            <Text style={styles.timer}>{formatTime(seconds)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: Colors.dark.background,
        borderRadius: 15,
        marginVertical: 10,
    },
    label: {
        color: '#9BA1A6',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    timer: {
        color: '#fff',
        fontSize: 48,
        fontWeight: '300',
        fontVariant: ['tabular-nums'],
    },
});
