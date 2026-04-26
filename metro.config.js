const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure JPG images from free-exercise-db are served as assets
config.resolver.assetExts.push('jpg', 'jpeg', 'png', 'gif');

module.exports = config;
