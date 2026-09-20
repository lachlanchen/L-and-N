set -euo pipefail
cd /home/lachlan/ProjectsLFS/L-And-N
export LANDN_ANDROID_KEYSTORE_FILE=/home/lachlan/.config/l-and-n/android/upload-keystore.jks
export LANDN_ANDROID_KEYSTORE_PASSWORD="$(cat /home/lachlan/.config/l-and-n/android/upload-keystore.password)"
export LANDN_ANDROID_KEY_ALIAS=landn-upload
export LANDN_ANDROID_KEY_PASSWORD="$LANDN_ANDROID_KEYSTORE_PASSWORD"
npx cap sync android
cd android && ./gradlew --no-daemon --max-workers=6 -q :app:testFreeReleaseUnitTest :app:lintFreeRelease :app:assembleRelease :app:bundleRelease
echo BUILD_OK
ls -la app/build/outputs/bundle/*/*.aab app/build/outputs/apk/*/release/*.apk
sha256sum app/build/outputs/bundle/*/*.aab app/build/outputs/apk/*/release/*.apk
