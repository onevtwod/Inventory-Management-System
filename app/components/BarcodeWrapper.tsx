import React from 'react';
import OriginalBarcode from 'react-native-barcode-svg';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

interface BarcodeProps {
  value: string;
  format?: string;
  singleBarWidth?: number;
  height?: number;
  maxWidth?: number;
  lineColor?: string;
  backgroundColor?: string;
  showText?: boolean;
  textStyle?: any;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  format = 'CODE128',
  singleBarWidth = 2,
  height = 100,
  maxWidth,
  lineColor = '#000000',
  backgroundColor = '#FFFFFF',
  showText = true,
  textStyle,
}) => {
  return (
    <View>
      <OriginalBarcode
        value={value}
        format={format}
        singleBarWidth={singleBarWidth}
        height={height}
        maxWidth={maxWidth}
        lineColor={lineColor}
        backgroundColor={backgroundColor}
      />
      {showText && <ThemedText style={textStyle}>{value}</ThemedText>}
    </View>
  );
};

export default Barcode; 