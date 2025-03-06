import React from 'react';
import { Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Map SF Symbols to MaterialCommunityIcons
const iconMap: { [key: string]: string } = {
  // Tab Icons
  'house.fill': 'home',
  'shippingbox.fill': 'package-variant',
  'qrcode': 'qrcode-scan',
  'arrow.left.arrow.right': 'swap-horizontal',
  'person.crop.circle': 'account-circle',
  
  // Action Icons
  'square.and.arrow.up': 'export',
  'barcode.viewfinder': 'barcode-scan',
  'plus': 'plus',
  'minus': 'minus',
  'pencil': 'pencil',
  'trash': 'delete',
  'chevron.right': 'chevron-right',
  'arrow.up': 'arrow-up',
  'arrow.down': 'arrow-down',
  'hourglass': 'timer-sand',
  'cube.box.fill': 'cube-outline',
  'exclamationmark.triangle.fill': 'alert',
  'list.clipboard.fill': 'clipboard-list',
  'checkmark.circle.fill': 'check-circle'
};

interface IconSymbolProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export const IconSymbol: React.FC<IconSymbolProps> = ({ 
  name, 
  size = 24, 
  color = '#000000',
  style
}) => {
  // Convert SF Symbol name to MaterialCommunityIcons name
  const materialIconName = iconMap[name] || 'help-circle-outline';

  return (
    <MaterialCommunityIcons
      name={materialIconName}
      size={size}
      color={color}
      style={style}
    />
  );
};

export default IconSymbol; 