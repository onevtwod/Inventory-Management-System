import React, { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export const ThemedView = forwardRef<View, ThemedViewProps>(
  ({ style, lightColor, darkColor, ...otherProps }, ref) => {
    const backgroundColor = useThemeColor(
      { light: lightColor, dark: darkColor },
      'background'
    );

    return (
      <View
        ref={ref}  // 关键修复：添加ref转发
        style={[{ backgroundColor }, style]}
        {...otherProps}
      />
    );
  }
);

// 添加displayName便于调试
ThemedView.displayName = 'ThemedView';
