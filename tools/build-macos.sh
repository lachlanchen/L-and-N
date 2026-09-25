#!/usr/bin/env bash
set -euo pipefail
# Run on the existing Xcode host after npm run check and cap copy ios.
# All signing inputs must already exist. Never creates/replaces a keychain.
landn_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
landn_output=${LANDN_MAC_OUTPUT:?Set an absolute private artifact output directory}
landn_keychain=${LANDN_SIGNING_KEYCHAIN:?Set the existing signing keychain path}
landn_password_file=${LANDN_KEYCHAIN_PASSWORD_FILE:?Set the existing private password file}
landn_profile=${LANDN_MAC_PROFILE:?Set the Mac Catalyst App Store profile path}
[[ "$landn_output" == /* && -f "$landn_keychain" && -f "$landn_password_file" && -f "$landn_profile" ]]
landn_password=$(tr -d '\r\n' < "$landn_password_file")
security unlock-keychain -p "$landn_password" "$landn_keychain"
unset landn_password
landn_profile_id=$(security cms -D -i "$landn_profile" | plutil -extract UUID raw -o - -)
mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles" "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles" "$landn_output"
cp "$landn_profile" "$HOME/Library/MobileDevice/Provisioning Profiles/$landn_profile_id.provisionprofile"
cp "$landn_profile" "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/$landn_profile_id.provisionprofile"
cd "$landn_root"
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release \
    -destination 'generic/platform=macOS,variant=Mac Catalyst' \
    -archivePath "$landn_output/LAndN.xcarchive" -derivedDataPath "$landn_output/DerivedData" \
    -jobs 2 ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO COMPILER_INDEX_STORE_ENABLE=NO \
    "OTHER_CODE_SIGN_FLAGS=--keychain $landn_keychain" archive
xcodebuild -exportArchive -archivePath "$landn_output/LAndN.xcarchive" \
    -exportOptionsPlist ios/App/ExportOptions-Mac.plist -exportPath "$landn_output/export"
codesign --verify --deep --strict "$landn_output/LAndN.xcarchive/Products/Applications/App.app"
lipo -archs "$landn_output/LAndN.xcarchive/Products/Applications/App.app/Contents/MacOS/App"
pkgutil --check-signature "$landn_output/export/App.pkg"
shasum -a 256 "$landn_output/export/App.pkg"
