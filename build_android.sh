#!/usr/bin/env bash
#
# Сборка боевого Android-APK приложения «Семейные списки».
#
# Что делает:
#   1. Находит JDK 17 и Android SDK.
#   2. Устанавливает npm-зависимости (если нужно).
#   3. Генерирует нативный проект (`expo prebuild`) — подтягивает expo-contacts
#      и разрешения из app.json (READ_CONTACTS / WRITE_CONTACTS и т.д.).
#   4. Собирает release-APK (Hermes, минификация) через Gradle.
#   5. Кладёт готовый APK в корень проекта — рядом со скриптом.
#
# Использование:
#     ./build_android.sh                  # все ABI (arm64-v8a, armeabi-v7a, x86, x86_64)
#     ABIS=arm64-v8a ./build_android.sh   # один ABI (намного быстрее)
#
# Подпись:
#   По умолчанию release подписывается debug-ключом (пригодно для теста). Чтобы
#   включить боевую подпись, положите в mobile/android/ файлы keystore.properties
#   и app/release.keystore (см. mobile/README.md) до запуска — скрипт сохранит их
#   при перегенерации android/ и подключит к сборке автоматически.
#
# Требования: Node.js, npm, JDK 17, Android SDK (по умолчанию .android-tools/sdk).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
APK_SRC="$MOBILE_DIR/android/app/build/outputs/apk/release/app-release.apk"
OUT_APK="$ROOT_DIR/app-release.apk"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
step() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m==> ОШИБКА:\033[0m %s\n' "$*" >&2; exit 1; }
warn() { printf '\033[1;33m==> ВНИМАНИЕ:\033[0m %s\n' "$*" >&2; }

command -v node >/dev/null 2>&1 || die "Node.js не найден (нужен для Expo)."
command -v npm  >/dev/null 2>&1 || die "npm не найден."

# --- JDK 17 -------------------------------------------------------------
if [[ -z "${JAVA_HOME:-}" || ! -x "$JAVA_HOME/bin/java" ]]; then
  for jdk in \
    /usr/local/opt/openjdk@17 /usr/local/opt/openjdk \
    /opt/homebrew/opt/openjdk@17 /opt/homebrew/opt/openjdk \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home"; do
    if [[ -x "$jdk/bin/java" ]]; then
      export JAVA_HOME="$jdk"
      break
    fi
  done
fi
[[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]] || die "JDK 17 не найден. Установите: brew install openjdk@17"
info "JAVA_HOME = $JAVA_HOME"

# --- Android SDK --------------------------------------------------------
ANDROID_SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$ROOT_DIR/.android-tools/sdk}}"
export ANDROID_HOME="$ANDROID_SDK"
export ANDROID_SDK_ROOT="$ANDROID_SDK"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
[[ -d "$ANDROID_HOME/platform-tools" ]] || die "Android SDK не найден в $ANDROID_HOME"
info "ANDROID_HOME = $ANDROID_HOME"

ABIS="${ABIS:-armeabi-v7a,arm64-v8a,x86,x86_64}"

cd "$MOBILE_DIR"

# --- npm-зависимости ----------------------------------------------------
if [[ ! -d node_modules ]]; then
  step "Устанавливаю npm-зависимости (npm ci)…"
  npm ci
else
  info "node_modules уже установлены."
fi

# --- Сохраняем подпись перед перегенерацией android/ --------------------
# `expo prebuild` пересоздаёт каталог android/ целиком, поэтому подписывающие
# файлы нужно временно сохранить и вернуть обратно.
TMP_KEYSTORE="$(mktemp -d)"
trap 'rm -rf "$TMP_KEYSTORE"' EXIT
if [[ -f android/keystore.properties ]]; then
  cp android/keystore.properties "$TMP_KEYSTORE/"
fi
if [[ -f android/app/release.keystore ]]; then
  cp android/app/release.keystore "$TMP_KEYSTORE/"
fi

# --- Генерация нативного проекта ----------------------------------------
step "Генерирую нативный проект (npx expo prebuild)…"
rm -rf android
npx expo prebuild --platform android

# --- Возвращаем подпись -------------------------------------------------
if [[ -f "$TMP_KEYSTORE/keystore.properties" ]]; then
  cp "$TMP_KEYSTORE/keystore.properties" android/keystore.properties
fi
if [[ -f "$TMP_KEYSTORE/release.keystore" ]]; then
  cp "$TMP_KEYSTORE/release.keystore" android/app/release.keystore
fi

# --- sdk.dir для Gradle -------------------------------------------------
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties

# --- ABI -----------------------------------------------------------------
if grep -q '^reactNativeArchitectures=' android/gradle.properties; then
  sed -i.bak -E "s/^reactNativeArchitectures=.*/reactNativeArchitectures=$ABIS/" android/gradle.properties
  rm -f android/gradle.properties.bak
else
  printf 'reactNativeArchitectures=%s\n' "$ABIS" >> android/gradle.properties
fi
info "ABI = $ABIS"

# --- Боевая подпись -----------------------------------------------------
if [[ -f android/keystore.properties && -f android/app/release.keystore ]]; then
  step "Подключаю production-подпись к release-сборке…"
  python3 "$MOBILE_DIR/scripts/patch_build_gradle.py" android/app/build.gradle
else
  warn "keystore.properties / release.keystore не найдены — release будет подписан debug-ключом (для теста)."
fi

# --- Сборка -------------------------------------------------------------
step "Собираю release-APK…"
(cd android && ./gradlew assembleRelease)

# --- Копирование результата --------------------------------------------
[[ -f "$APK_SRC" ]] || die "APK не найден: $APK_SRC"
cp -f "$APK_SRC" "$OUT_APK"
step "Готово: $OUT_APK"
ls -lh "$OUT_APK"