module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@screens/*': './src/screens/*',
          '@screens': './src/screens',
          '@assets': './assets',
          '@api': './src/api',
          '@navigation': './src/navigation',
          '@components': './src/components',
          '@appTypes': './src/appTypes',
          '@store': './src/store',
          '@utils': './src/utils',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@providers': './src/providers',
          '@contexts': './src/contexts',
        },
      },
    ],
    "nativewind/babel",
    'react-native-reanimated/plugin',
  ],
};