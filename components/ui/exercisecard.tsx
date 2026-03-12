import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Exercise } from '../../constants/exercises';

interface ExerciseCardProps {
    exercise: Exercise;
    onPress: () => void;
    selected?: boolean;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onPress, selected }) => {
    return (
        <TouchableOpacity
            style={[styles.card, selected && styles.selectedCard]}
            onPress={onPress}
        >
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.category}>{exercise.category.toUpperCase()}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#2c2c2e',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectedCard: {
        borderColor: '#0a7ea4',
        backgroundColor: '#3a3a3c',
    },
    name: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    category: {
        color: '#9BA1A6',
        fontSize: 12,
        marginTop: 4,
    },
});
