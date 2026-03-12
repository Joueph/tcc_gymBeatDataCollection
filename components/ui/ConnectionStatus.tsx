import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ConnectionStatusProps {
    deviceName: string;
    isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ deviceName, isConnected }) => {
    return (
        <View style={styles.container}>
            <View style={[styles.dot, { backgroundColor: isConnected ? '#4cd964' : '#ff3b30' }]} />
            <Text style={styles.text}>{deviceName}: {isConnected ? 'Conectado' : 'Desconectado'}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    text: {
        color: '#ECEDEE',
        fontSize: 14,
    },
});
