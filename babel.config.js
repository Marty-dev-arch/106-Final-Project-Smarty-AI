module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated plugin MUST be last
      require.resolve('react-native-reanimated/plugin'),
    ],
  };
};
