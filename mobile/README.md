# Семейные списки — мобильное приложение (React Native / Expo)

Приложение по ТЗ № 2: React Native, Android-first, TypeScript strict, современный дизайн,
тёмная тема, списки покупок, группы и приглашения.

## Стек

- Expo SDK 57 (React Native 0.86) + development build (`expo run:android`), TypeScript strict
- Навигация: `@react-navigation/native`, `native-stack`, `bottom-tabs`
- Данные: `@tanstack/react-query`, `axios`
- Состояние и хранение: `zustand`, `react-native-mmkv`
- UI/анимации: `react-native-reanimated`, `react-native-gesture-handler`, `react-native-svg`,
  `react-native-haptic-feedback`, `@shopify/flash-list`
- Ввод кода: `react-native-confirmation-code-field`
- Push: `expo-notifications` (Expo Push API + FCM — см. `PUSH_SETUP.md`)
- Утилиты: `libphonenumber-js`, `date-fns`, `i18next` + `react-i18next`

## Структура

```text
src/
├── core/                     # оболочка приложения (бывший app/)
│   ├── navigation/           # RootNavigator, типы экранов
│   └── providers/            # AppProviders (Query, Navigation, Theme, GestureHandler)
├── features/
│   ├── auth/                 # вход/регистрация, стор, query-хуки
│   ├── groups/               # группы, создание, добавление друзей, детали группы
│   ├── invitations/          # входящие приглашения
│   ├── lists/                # списки: главный экран, детали, создание
│   ├── settings/             # настройки, смена номера, тема, выход
│   └── phone-change/         # (в settings)
└── shared/
    ├── api/                  # axios-клиент + эндпоинты
    ├── design-system/        # тема, типографика, отступы, ThemeProvider
    ├── ui/                   # Button, Input, Card, Badge, SegmentedControl, ...
    ├── lib/                  # типы, phone-утилиты
    ├── storage/              # MMKV (токены, тема, device_id)
    └── i18n/                 # русская локализация (i18next)
```

> Примечание: папка верхнего уровня называется `src/core` (а не `src/app`),
> чтобы Expo не принимал её за каталог файлового роутера `expo-router`.

## Подключение к backend

Base URL берётся из `EXPO_PUBLIC_API_URL`; если переменная не задана, используется
боевой сервер `https://listsapp.djangopirate.ru/api/v1` (см. `src/shared/api/client.ts`).

Для локальной разработки на Android-эмуляторе раскомментируйте строку в `.envrc`:

```bash
export EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
```

(эмулятор Android достигает `localhost` хоста через `10.0.2.2`).

Запустите backend в Docker из каталога `backend/` (`docker compose up -d`).

## Локальный запуск (эмулятор Android)

Требуются JDK 17 и Android SDK. Окружение описано в `.envrc`:

```bash
source .envrc          # JAVA_HOME, ANDROID_HOME, PATH
```

1. Запустить эмулятор:

   ```bash
   ./scripts/start-emulator.sh
   ```

2. Собрать и установить dev-сборку. Для эмулятора можно оставить только ABI `x86_64`,
   переопределив из CLI (`android/gradle.properties` по умолчанию собирает все ABI):

   ```bash
   npx expo run:android
   # или уже сгенерированный проект:
   cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

3. Метро (dev-сервер) запускается автоматически `expo run:android`.
   Если нужно отдельно: `npx expo start --dev-client`.

## Сборка боевого APK (release)

Собирается локально через Gradle, без EAS. Перед сборкой убедитесь, что переменная
`EXPO_PUBLIC_API_URL` НЕ экспортирована (иначе в бандл попадёт dev-URL); по умолчанию
используется `https://listsapp.djangopirate.ru/api/v1`.

1. Сгенерировать keystore для боевой подписи (однократно, хранить в секрете):

   ```bash
   cd android
   keytool -genkeypair -v \
     -storetype PKCS12 \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -keystore app/release.keystore \
     -alias listsapp \
     -storepass CHANGE_ME_STORE_PASS \
     -keypass CHANGE_ME_KEY_PASS \
     -dname "CN=FamilyLists, OU=Mobile, O=FamilyLists, L=City, S=State, C=RU"
   ```

2. Создать `android/keystore.properties` (файл в `.gitignore`, не коммитится):

   ```properties
   storeFile=app/release.keystore
   storePassword=CHANGE_ME_STORE_PASS
   keyAlias=listsapp
   keyPassword=CHANGE_ME_KEY_PASS
   ```

   Если `keystore.properties` отсутствует, release-сборка падает не будет, а подпишется
   debug-ключом (для локального теста).

3. Собрать APK под все ABI:

   ```bash
   cd android
   ./gradlew assembleRelease
   ```

   Результат: `android/app/build/outputs/apk/release/app-release.apk`
   (универсальный APK, если включён `enableSeparateBuildPerCPUArchitecture=false`).

> Примечание: каталог `android/` генерируется (`npx expo prebuild`) и НЕ хранится в git.
> После перегенерации заново задайте ABI в `android/gradle.properties` и подпись в
> `android/app/build.gradle` (см. выше).

## Скрипты

- `scripts/start-emulator.sh` — запуск AVD `family_app`
- `scripts/*.plist` — launchd-агенты для эмулятора, Metro и Gradle (использовались
  при настройке окружения)

## Что реализовано

- Вход/регистрация: телефон с маской `+7 (___) ___-__-__`, экран email, экран кода (6 ячеек),
  таймер повторной отправки; вход существующего пользователя по телефону.
- Группы: список, создание, детали, участники, выход из группы (с подтверждением),
  приглашение по номеру.
- Приглашения: входящие, принять/отклонить.
- Списки: главный экран (сегменты Общие/Мои, фильтр Активные/Архив), карточки с прогрессом,
  создание, детали: позиции (тап — выполнено, долгий тап — шторка действий), добавление
  позиции закреплённым полем, завершение/восстановление, дублирование, переименование.
- Позиции: активная / выполненная (зачёркнуто) / невыполненная (красный) — сортировка
  активных сверху, закрытых снизу.
- Настройки: профиль (телефон/почта), смена номера через email-код, тема (светлая/тёмная/
  системная), выход.
- Светлая тема по умолчанию (плюс тёмная и системная), современный глассморфизм
  (полупрозрачные карточки, градиентные кнопки и фон, safe-area отступы из-за edge-to-edge),
  состояния загрузки/пустоты/ошибки, локализация (ru), оптимистичные обновления через
  React Query.
- Иконки приложения генерируются скриптами `scripts/generate_icons.py` (assets/) и
  `scripts/generate_android_res.py` (android/res/).

## Ограничения (dev-демо)

- Push-уведомления: код готов (`expo-notifications` + Expo Push, см. `PUSH_SETUP.md`),
  но для реальной доставки нужны регистрация на Expo и Firebase (`google-services.json`,
  Project ID) и токен `EXPO_ACCESS_TOKEN` на бэкенде. Чтение контактов не подключено —
  приглашение выполняется вводом номера вручную.
- Автоподстановка номера через SIM недоступна на эмуляторе.
- Билд собран под все ABI (`armeabi-v7a,arm64-v8a,x86,x86_64`). Для эмулятора можно
  ограничить до `x86_64`, переопределив из CLI (`-PreactNativeArchitectures=x86_64`).
