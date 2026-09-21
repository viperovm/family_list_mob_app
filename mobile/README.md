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

Base URL берётся из `EXPO_PUBLIC_API_URL`, по умолчанию `http://10.0.2.2:8000/api/v1`
(эмулятор Android достигает `localhost` хоста через `10.0.2.2`).

Запустите backend в Docker из каталога `backend/` (`docker compose up -d`).

## Локальный запуск (эмулятор Android)

Требуются JDK 17 и Android SDK. Окружение описано в `.envrc`:

```bash
source .envrc          # JAVA_HOME, ANDROID_HOME, PATH, EXPO_PUBLIC_API_URL
```

1. Запустить эмулятор:

   ```bash
   ./scripts/start-emulator.sh
   ```

2. Собрать и установить dev-сборку (сборка идёт через Gradle, только ABI `x86_64`
   для эмулятора — см. `android/gradle.properties`):

   ```bash
   npx expo run:android
   # или уже сгенерированный проект:
   cd android && ./gradlew assembleDebug
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

3. Метро (dev-сервер) запускается автоматически `expo run:android`.
   Если нужно отдельно: `npx expo start --dev-client`.

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
- Тёмная тема, состояния загрузки/пустоты/ошибки, локализация (ru), оптимистичные
  обновления через React Query.

## Ограничения (dev-демо)

- Push (FCM) и чтение контактов не подключены: нет `google-services.json` и реальной книги
  контактов на эмуляторе. Приглашение выполняется вводом номера вручную.
- Автоподстановка номера через SIM недоступна на эмуляторе.
- Билд собран только под `x86_64` (эмулятор). Для устройств верните все ABI в
  `android/gradle.properties` (`reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64`).
