const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const sdkRoot = path.resolve(__dirname, '..');

/**
 * Le SDK est consommé depuis le dossier parent (`file:..`).
 *
 * Deux réglages sont nécessaires :
 * - `watchFolders` pour que Metro suive les sources du SDK et recharge à chaud ;
 * - `extraNodeModules` pour que `react` et `react-native` soient résolus depuis
 *   l'exemple. Sans cela, le SDK résoudrait sa propre copie de développement et
 *   deux React coexisteraient dans le bundle — un cas qui casse les hooks de
 *   façon très déroutante.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [sdkRoot],
  resolver: {
    extraNodeModules: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
    },
    // Ignore les node_modules du SDK : seules ses sources nous intéressent.
    blockList: [new RegExp(`${sdkRoot.replace(/[\\\\]/g, '\\\\')}/node_modules/.*`)],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
