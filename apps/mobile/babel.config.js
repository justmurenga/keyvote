module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Strip Flow types and transform Flow syntax
      '@babel/plugin-transform-flow-strip-types',
      'react-native-reanimated/plugin',
    ],
  };
};
