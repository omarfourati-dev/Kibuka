module.exports = function (api) {
  // Cache based on NODE_ENV so test env gets a separate cache entry
  api.cache.using(() => process.env.NODE_ENV)

  const isTest = api.env('test')

  // In test environment, skip nativewind/babel to avoid Jest incompatibility
  if (isTest) {
    return {
      presets: ['babel-preset-expo'],
    }
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  }
}
