import React, { useRef, useState } from 'react';
import { StyleSheet, View, Button, Pressable } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function ScanBarcodeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Handle barcode scan event
  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    console.log('Scanned data:', data);
    
    // Pass scanned data back to AddItemScreen
    router.replace({
      pathname: '/inventory/add',
      params: { scannedBarcode: data }
    });
  };

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Requesting camera permission...</ThemedText>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>No access to camera</ThemedText>
        <Button title="Grant Permission" onPress={requestPermission} />
        <Button title="Go Back" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={"back"}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr',
            'upc_a',
            'upc_e',
            'ean8',
            'ean13',
            'code39',
            'code93',
            'code128',
          ],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <ThemedText style={styles.instructions}>
            Position the barcode within the frame
          </ThemedText>
        </View>
      </CameraView>
      
      {scanned && (
        <Pressable 
          style={styles.scanAgainButton}
          onPress={() => setScanned(false)}
        >
          <ThemedText style={styles.scanAgainText}>Tap to Scan Again</ThemedText>
        </Pressable>
      )}
      
      <Button title="Go Back" onPress={() => router.back()} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
  },
  instructions: {
    position: 'absolute',
    bottom: 50,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  scanAgainButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    marginVertical: 20,
  },
  scanAgainText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});