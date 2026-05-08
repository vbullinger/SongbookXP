require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoIosSecureCopy'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'MIT'
  s.author         = 'Songbook'
  s.homepage       = 'https://github.com/vbullinger/SongbookXP'
  s.platforms      = {
    :ios => '15.5'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/vbullinger/SongbookXP.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "#{s.name}/**/*.{h,m,swift}"
end
