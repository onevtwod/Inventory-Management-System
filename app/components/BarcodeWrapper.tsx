import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
// @ts-ignore
import barcodes from 'jsbarcode/src/barcodes';
import { ThemedText } from '@/components/ThemedText';

// Define types for our helper functions
interface Encoding {
  data: string;
  text?: string;
  [key: string]: any;
}

interface BarcodeOptions {
  singleBarWidth: number;
  height: number;
  format?: string;
  lineColor?: string;
  backgroundColor?: string;
  [key: string]: any;
}

// Helper functions copied from the library
const getTotalWidthOfEncodings = (encodings: Encoding[]): number => {
  let totalWidth = 0;
  for (let i = 0; i < encodings.length; i += 1) {
    totalWidth += encodings[i].data.length;
  }
  return totalWidth;
};

const drawRect = (x: number, y: number, width: number, height: number): string => {
  return `M${x},${y}h${width}v${height}h-${width}z`;
};

const drawSvgBar = (encoding: Encoding, paddingLeft: number = 0, options: BarcodeOptions): string[] => {
  const rects: string[] = [];
  const { data } = encoding;
  const yFrom = 0;

  let barWidth = 0;
  let x = paddingLeft;
  for (let b = 0; b < data.length; b += 1) {
    x += options.singleBarWidth;
    if (data[b] === '1') {
      barWidth += 1;
    } else if (barWidth > 0) {
      rects.push(
        drawRect(
          x - options.singleBarWidth * barWidth,
          yFrom,
          options.singleBarWidth * barWidth,
          options.height,
        ),
      );
      barWidth = 0;
    }
  }

  // Last draw is needed since the barcode ends with 1
  if (barWidth > 0) {
    rects.push(
      drawRect(
        x - options.singleBarWidth * (barWidth - 1),
        yFrom,
        options.singleBarWidth * barWidth,
        options.height,
      ),
    );
  }

  return rects;
};

const drawSvgBars = (encodings: Encoding[], options: BarcodeOptions): string[] => {
  const results: string[][] = [];
  let barPaddingLeft = 0;

  Array.from(encodings).forEach((encoding) => {
    const bar = drawSvgBar(encoding, barPaddingLeft, options);
    results.push(bar);
    barPaddingLeft += encoding.data.length * 2;
  });
  return results.flat();
};

// This encode() handles the Encoder call and builds the binary string to be rendered
const encode = (text: string, Encoder: any, options: BarcodeOptions): Encoding[] => {
  // If text is not a non-empty string, throw error.
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('Barcode value must be a non-empty string');
  }

  let encoder: any;
  try {
    encoder = new Encoder(text, options);
  } catch (error) {
    // If the encoder could not be instantiated, throw error.
    throw new Error('Invalid barcode format.');
  }

  // Encode the text
  const encoded = encoder.encode();

  // Prepare the encodings
  const encodings = [encoded];
  // Get the linear encodings
  const linearEncodings = encodings;
  
  return linearEncodings;
};

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
  onError?: (error: Error) => void;
}

// Updated component without defaultProps
export const Barcode: React.FC<BarcodeProps> = ({
  value = '',
  format = 'CODE128',
  singleBarWidth = 2,
  height = 100,
  maxWidth,
  lineColor = '#000000',
  backgroundColor = '#FFFFFF',
  showText = true,
  textStyle,
  onError,
}) => {
  const [bars, setBars] = React.useState<string[]>([]);
  const [barcodeWidth, setBarcodeWidth] = React.useState(0);
  const [barcodeContainerWidth, setBarcodeContainerWidth] = React.useState(0);
  const [barcodeError, setBarcodeError] = React.useState('');

  React.useEffect(() => {
    try {
      const encoder = barcodes[format as keyof typeof barcodes];
      if (!encoder) {
        throw new Error(`Invalid barcode format: ${format}`);
      }

      const options: BarcodeOptions = {
        singleBarWidth,
        height,
        format,
        lineColor,
        backgroundColor
      };

      const linearEncodings = encode(value, encoder, options);

      const barcodeTotalWidth = getTotalWidthOfEncodings(linearEncodings) * singleBarWidth;
      const theBars = drawSvgBars(linearEncodings, options);

      if (linearEncodings.length > 0) {
        setBars(theBars);
        setBarcodeWidth(barcodeTotalWidth);
        setBarcodeContainerWidth((maxWidth && barcodeTotalWidth > maxWidth) ? maxWidth : barcodeTotalWidth);
      }
      setBarcodeError('');
    } catch (e) {
      const error = e as Error;
      setBarcodeError(error.message);
      setBarcodeContainerWidth(200);
      onError && onError(error);
    }
  }, [value, format, singleBarWidth, maxWidth, height, lineColor, backgroundColor, onError]);

  const containerStyle = { width: barcodeContainerWidth, height, backgroundColor };
  
  return (
    <View>
      <View style={containerStyle}>
        {barcodeError ? (
          <View style={styles.errorMessage}>
            <Text>{barcodeError}</Text>
          </View>
        ) : (
          <Svg
            width="100%"
            height="100%"
            fill={lineColor}
            viewBox={`0 0 ${barcodeWidth} ${height}`}
            preserveAspectRatio="none"
          >
            <Path d={bars.join(' ')} />
          </Svg>
        )}
      </View>
      {showText && !barcodeError && <ThemedText style={textStyle}>{value}</ThemedText>}
    </View>
  );
};

const styles = StyleSheet.create({
  errorMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
});

export default Barcode; 