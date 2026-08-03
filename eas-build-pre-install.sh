#!/bin/bash
set -e

echo "[GymBeat] Building Watch app and embedding into iOS bundle..."

xcodebuild \
  -workspace ios/gymBeatDataCollection.xcworkspace \
  -scheme "gymBeatDataCollection" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath /tmp/gymBeat.xcarchive \
  archive \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=$APPLE_TEAM_ID