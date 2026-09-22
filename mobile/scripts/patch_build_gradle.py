#!/usr/bin/env python3
"""Подключает боевую подпись (keystore.properties) к release-сборке Android.

Запускается после `expo prebuild`, т.к. prebuild пересоздаёт android/app/build.gradle
и стирает кастомный signing-блок. Скрипт идемпотентен: повторный запуск ничего не
меняет, если блок уже добавлен.
"""
import sys


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: patch_build_gradle.py <path-to-app-build.gradle>", file=sys.stderr)
        return 2

    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        source = f.read()

    # Уже пропатчено — ничего не делаем.
    if "storePassword keystoreProperties['storePassword']" in source:
        print("build.gradle уже содержит production-подпись — пропускаю.")
        return 0

    # Добавляем signingConfig `release`, читающий keystore.properties.
    signing_configs = """    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }"""
    signing_configs_patched = """    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // Боевая подпись: параметры читаются из android/keystore.properties.
            // Файл НЕ коммитится (см. .gitignore).
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            def keystoreProperties = new Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }"""
    if signing_configs not in source:
        print("Не удалось найти signingConfigs-блок в build.gradle.", file=sys.stderr)
        return 1
    source = source.replace(signing_configs, signing_configs_patched, 1)

    # Подменяем подпись в release-блоке на условную: keystore.properties или debug.
    release_block = """        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug"""
    release_block_patched = """        release {
            // Боевая подпись, если keystore.properties задан; иначе debug-подпись.
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug"""
    if release_block not in source:
        print("Не удалось найти release-блок в build.gradle.", file=sys.stderr)
        return 1
    source = source.replace(release_block, release_block_patched, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(source)
    print("Production-подпись подключена к release-сборке.")
    return 0


if __name__ == "__main__":
    sys.exit(main())