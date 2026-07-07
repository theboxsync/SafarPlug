const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'src/core/mocks/react-native-maps.web.tsx'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'expo-secure-store') {
      return {
        filePath: path.resolve(__dirname, 'src/core/mocks/expo-secure-store.web.ts'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
