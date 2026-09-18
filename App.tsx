import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initDb } from './src/db/index';

function AppContent() {
  const { theme } = useTheme();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    initDb()
      .then(() => {
        if (isMounted) setDbReady(true);
      })
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        if (isMounted) setDbReady(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!dbReady) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <StatusBar style={theme.statusBar} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.statusBar} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
