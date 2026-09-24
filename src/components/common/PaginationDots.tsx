import React from 'react';
import { View, StyleSheet } from 'react-native';
import THEME from '../../config/theme';

interface PaginationDotsProps {
  activeIndex: number;
  total?: number;
}

export const PaginationDots: React.FC<PaginationDotsProps> = ({
  activeIndex,
  total = 4,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              isActive ? styles.dotActive : styles.dotInactive,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 24,
    backgroundColor: THEME.colors.primary,
  },
});

export default PaginationDots;
