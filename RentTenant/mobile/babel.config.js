/**
 * @file babel.config.js
 * @description Babel configuration for Expo React Native.
 * - babel-preset-expo: Handles JSX, TypeScript, and React Native transforms
 * - react-native-reanimated/plugin: MUST be last — required for Reanimated 3
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin must always be listed last
      'react-native-reanimated/plugin',
    ],
  };
};
