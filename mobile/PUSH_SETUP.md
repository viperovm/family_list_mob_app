# Push-уведомления (Expo Push + FCM)

Приложение получает push-токен через `expo-notifications`
(см. `src/shared/lib/pushNotifications.ts`) и регистрирует его на бэкенде
(`POST /api/v1/devices/`). Бэкенд рассылает уведомления через **Expo Push API**
(`backend/apps/notifications/services.py`), а на Android доставку выполняет
**Firebase Cloud Messaging (FCM)**.

## Куда регистрироваться

### 1. Expo — сервис push-рассылки
1. Регистрация: **https://expo.dev/signup**
2. Создайте проект: **https://expo.dev/accounts/[ваш-аккаунт]/projects**
   → «Create a project», slug `family-shopping-lists` (как в `app.json`).
3. Скопируйте **Project ID**: Project → Settings → General → «Project ID» (UUID).
4. Создайте **Access token**:
   **https://expo.dev/accounts/[ваш-аккаунт]/settings/access-tokens**
   → «Create token». Это секрет для бэкенда.

### 2. Firebase — транспорт FCM для Android
Нужен для Android (release-сборки используется FCM как канал доставки).
1. Консоль: **https://console.firebase.google.com**
2. «Add project» → создайте проект.
3. В проекте: «Add app» → **Android** → package name `com.familylists.app`.
4. Скачайте **`google-services.json`** и положите в `mobile/` (для локальной
   Gradle-сборки — в `mobile/android/app/`).
5. Прокиньте FCM-креденшелы в Expo: `npx eas credentials` (Android → FCM v1)
   **или** загрузите сервисный ключ в настройках проекта Expo.

## Настройка

### Бэкенд
В `backend/.env`:
```
EXPO_ACCESS_TOKEN=<токен из шага 1.4>
```
Пустой токен = dev-режим: уведомления не отправляются, а логируются
(`PUSH (stub, no EXPO_ACCESS_TOKEN)`).

### Мобильное приложение
1. В `mobile/app.json` укажите Project ID (шаг 1.3):
   ```json
   "extra": { "eas": { "projectId": "<Project ID>" } }
   ```
2. Положите `google-services.json` (шаг 2.4).
3. Для локальной Gradle-сборки подключите Google Services plugin:
   classpath `com.google.gms:google-services:<версия>` в
   `android/build.gradle` и `apply plugin: 'com.google.gms.google-services'`
   в `android/app/build.gradle` (EAS-сборка делает это автоматически).
4. Пересоберите APK (см. `README.md`).

## Проверка
- Устройство: после входа приложение запросит разрешение и вызовет
  `POST /devices/` (токен виден в логах Metro).
- Бэкенд: `docker compose -f docker-compose.prod.yml logs --tail 50 celery-worker`.
- Expo: **https://expo.dev/notifications** — тестовая отправка по токену.

## Без регистрации (текущее состояние)
Пока `extra.eas.projectId` и `google-services.json` не заданы,
`registerForPushNotifications()` молча ничего не делает: приложение работает
как обычно, push просто не приходят. Никаких падений.
