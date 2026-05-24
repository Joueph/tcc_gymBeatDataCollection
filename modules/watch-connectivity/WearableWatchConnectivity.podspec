Pod::Spec.new do |s|
  s.name           = 'WearableWatchConnectivity'
  s.version        = '1.0.0'
  s.summary        = 'Local Expo module for iPhone to Apple Watch communication.'
  s.description    = 'Local Expo module for iPhone to Apple Watch communication.'
  s.author         = 'Wearable Workout'
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
end
