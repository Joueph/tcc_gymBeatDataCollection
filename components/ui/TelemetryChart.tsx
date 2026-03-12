import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const TelemetryChart: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>TELEMETRIA EM TEMPO REAL</Text>
            <View style={styles.placeholderChart}>
                <Text style={styles.placeholderText}>[ Gráfico de Sensores ]</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
        backgroundColor: '#1c1c1e',
        padding: 15,
        borderRadius: 12,
    },
    title: {
        color: '#9BA1A6',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    placeholderChart: {
        height: 150,
        width: width - 70,
        backgroundColor: '#2c2c2e',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#3a3a3c',
    },
    placeholderText: {
        color: '#687076',
        fontSize: 14,
    },
});
