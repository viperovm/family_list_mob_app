#!/bin/bash
export ANDROID_HOME=/Users/admin/Projects/lists_app/.android-tools/sdk
exec "$ANDROID_HOME/emulator/emulator" -avd family_app -no-snapshot -no-boot-anim -gpu swiftshader_indirect -no-audio -no-metrics "$@"