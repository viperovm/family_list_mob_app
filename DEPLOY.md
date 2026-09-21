# Семейные списки — развёртывание (deploy) и сборка

Инструкция по развёртыванию backend на боевом сервере, подготовке APK для Android,
настройке Docker, Nginx и Jenkins, а также загрузке проекта в GitHub.

---

## 1. Состав проекта

```
lists_app/
├── backend/                 # Django + DRF API
│   ├── config/              # settings, urls, wsgi/asgi, celery
│   ├── common/              # общий код (ошибки, телефон, утилиты)
│   ├── apps/                # users, authentication, groups, lists, notifications
│   ├── deploy/              # nginx конфиг, сертификаты
│   ├── Dockerfile
│   ├── docker-compose.yml           # локальная разработка (runserver)
│   ├── docker-compose.prod.yml     # боевой (gunicorn + nginx + celery)
│   ├── .env.example                # образец переменных окружения
│   └── requirements.txt
└── mobile/                  # React Native (Expo SDK 57) приложение
    ├── src/
    ├── app.json
    ├── scripts/start-emulator.sh
    └── android/             # генерируется (в git НЕ хранится)
```

> Примечание: `mobile/android/` и `mobile/ios/` игнорируются git-ом — они генерируются
> командой `npx expo prebuild` / `expo run:android`.

---

## 2. GitHub

### 2.1. Репозиторий

Проект лежит в монорепозитории:

```
https://github.com/viperovm/family_list_mob_app
```

Клонирование:

```bash
git clone git@github.com:viperovm/family_list_mob_app.git
# или по HTTPS:
git clone https://github.com/viperovm/family_list_mob_app.git
```

### 2.2. SSH-ключ для GitHub (если ещё не настроен)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub   # скопировать в GitHub → Settings → SSH and GPG keys
ssh -T git@github.com       # проверка: "Hi <user>!"
```

### 2.3. Первый пуш проекта

```bash
cd /path/to/lists_app
git init -b main
git add .
git commit -m "Initial commit: backend (Django DRF) + mobile (Expo)"
git remote add origin git@github.com:viperovm/family_list_mob_app.git
git push -u origin main
```

### 2.4. Ежедневный рабочий цикл

```bash
git pull
git add -A
git commit -m "описание изменений"
git push
```

---

## 3. Backend — развёртывание на боевом сервере

### 3.1. Требования на сервере

- Linux (Ubuntu/Debian), Docker Engine + Docker Compose v2
- Открытые порты: 80 (HTTP) и 443 (HTTPS) для nginx
- Домен `listsapp.djangopirate.ru` (A-запись на IP сервера)

### 3.2. Установка Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # перезайти в систему
docker compose version
```

### 3.3. Клонирование и конфигурация окружения

```bash
git clone git@github.com:viperovm/family_list_mob_app.git
cd family_list_mob_app/backend

cp .env.example .env
nano .env
```

**Обязательно изменить в `.env` для боевой среды:**

```ini
SECRET_KEY=сгенерируйте_длинный_случайный_ключ   # openssl rand -hex 48
DEBUG=false
ALLOWED_HOSTS=listsapp.djangopirate.ru,localhost
DATABASE_URL=postgres://lists:СИЛЬНЫЙ_ПАРОЛЬ@db:5432/lists
REDIS_URL=redis://redis:6379/0

# --- Email (Mail.ru) ---
EMAIL_BACKEND_URL=smtp://family_mob_app@mail.ru:ПАРОЛЬ_ПРИЛОЖЕНИЯ@smtp.mail.ru:465/?ssl=true
DEFAULT_FROM_EMAIL=Семейные списки <family_mob_app@mail.ru>

CORS_ALLOWED_ORIGINS=
### 3.4. Пароль приложения Mail.ru

Для отправки писем используется SMTP Mail.ru. Основной пароль почты для SMTP **не подходит** —
нужен отдельный «пароль для внешних приложений»:

1. Войти в [Mail.ru](https://mail.ru) → **Настройки** → **Безопасность** → **«Пароли для внешних приложений»**.
2. Создать пароль для приложения (отображается один раз).
3. Подставить его в `EMAIL_BACKEND_URL` вместо `ПАРОЛЬ_ПРИЛОЖЕНИЯ`.

Параметры SMTP Mail.ru:

| Параметр | Значение |
|----------|----------|
| host     | `smtp.mail.ru` |
| порт SSL | `465` (SMTP_SSL) |
| порт TLS | `587` (STARTTLS) |
| логин    | полный адрес `family_mob_app@mail.ru` |

> В `settings.py`: `?ssl=true` → `EMAIL_USE_SSL` (порт 465), `?tls=true` → `EMAIL_USE_TLS` (порт 587).

### 3.5. Запуск

```bash
cd backend

# локально (dev, runserver + auto-reload)
docker compose up -d --build

# боевой режим (gunicorn + nginx + celery worker/beat)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web
```

### 3.6. Суперпользователь (Django admin)

```bash
docker compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

### 3.7. HTTPS (TLS) на домене

1. Получить сертификаты (Let's Encrypt/certbot) и положить:
   - `backend/deploy/certs/listsapp.djangopirate.ru.pem` — сертификат (+ цепочка)
   - `backend/deploy/certs/listsapp.djangopirate.ru.key` — приватный ключ
2. Раскомментировать HTTPS-блок в `backend/deploy/nginx/nginx.conf`.
3. Перезапустить nginx:

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

4. Убедиться, что в `.env`: `DEBUG=false`, строгий `ALLOWED_HOSTS`, случайный `SECRET_KEY`.

---

## 4. Jenkins (CI/CD)

### 4.1. Требования к агенту

Docker + Docker Compose, Node.js 20+, JDK 17 (Android Gradle), Android SDK (сборка APK).

### 4.2. Credentials в Jenkins

| ID | Тип | Назначение |
|----|-----|-----------|
| `github-ssh-key` | SSH private key | клонирование из GitHub |
| `github-token` | Secret text | GitHub PAT для API |
| `backend-env-prod` | Secret file | содержимое боевого `backend/.env` |
| `mail-app-password` | Secret text | пароль приложения Mail.ru |
| `android-keystore` | Secret file | keystore для подписи release-APK |

### 4.3. Jenkinsfile (пример)

Положить `Jenkinsfile` в корень репозитория:

```groovy
pipeline {
    agent any
    environment { COMPOSE_PROJECT_NAME = 'family-lists' }

    stages {
        stage('Checkout') { steps { checkout scm } }

        stage('Backend tests') {
            steps {
                dir('backend') {
                    sh 'docker compose -f docker-compose.prod.yml run --rm web python manage.py test'
                }
            }
        }

        stage('Build & Deploy backend') {
            steps {
                dir('backend') {
                    withCredentials([file(credentialsId: 'env-production', variable: 'ENV_FILE')]) {
                        sh 'cp $ENV_FILE .env'
                    }
                    sh 'docker compose -f docker-compose.prod.yml up -d --build'
                }
            }
        }

        stage('Build mobile APK') {
            steps {
                dir('mobile') {
                    sh 'npm ci'
                    sh 'npx expo prebuild --platform android --clean'
                    sh 'cd android && ./gradlew assembleRelease'
                }
            }
        }

        stage('Archive APK') {
            steps {
                archiveArtifacts allowEmptyArchive: true,
                    artifacts: 'mobile/android/app/build/outputs/apk/**/app-release.apk'
            }
        }
    }

    post { success { echo 'OK' }; failure { echo 'FAIL' } }
}
```

> Для удалённого сервера используйте `sshagent([...])` + `scp`, либо поднимите агент Jenkins
> прямо на боевом сервере.
---

## 5. Сборка APK для Android

### 5.1. Окружение

Описано в `mobile/.envrc`:

```bash
cd mobile
source .envrc          # JAVA_HOME, ANDROID_HOME, PATH, EXPO_PUBLIC_API_URL
```

### 5.2. Dev-сборка на эмуляторе

```bash
./scripts/start-emulator.sh
npx expo run:android
```

### 5.3. Release-сборка

Сгенерировать keystore (один раз, **не хранить в git**):

```bash
keytool -genkey -v -keystore release.keystore \
  -alias family-lists -keyalg RSA -keysize 2048 -validity 10000
```

Подключить подпись в `mobile/android/app/build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            storeFile file('../../release.keystore')
            storePassword RELEASE_STORE_PASSWORD
            keyAlias 'family-lists'
            keyPassword RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
        }
    }
}
```

Сборка:

```bash
cd mobile/android
./gradlew assembleRelease
```

Итоговый файл: `mobile/android/app/build/outputs/apk/release/app-release.apk`

### 5.4. ABI для всех устройств

В `mobile/android/gradle.properties` по умолчанию стоит только `x86_64` (эмулятор).
Для реальных устройств указать все ABI:

```gradle
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
```

### 5.5. URL backend для продакшена

`mobile/src/shared/api/client.ts` читает `EXPO_PUBLIC_API_URL` на этапе сборки.
Для боевого сервера:

```bash
EXPO_PUBLIC_API_URL=https://listsapp.djangopirate.ru/api/v1 npx expo run:android
```

---

## 6. Проверка после деплоя

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web
curl -s https://listsapp.djangopirate.ru/api/schema/      # JSON OpenAPI
docker compose -f docker-compose.prod.yml exec web python manage.py check
docker compose -f docker-compose.prod.yml exec web python manage.py migrate --plan
```

---

## 7. Шпаргалка команд

```bash
# dev
docker compose up -d --build

# prod
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml restart web celery-worker celery-beat

# git
git add -A && git commit -m "..." && git push

# mobile dev
cd mobile && source .envrc && ./scripts/start-emulator.sh && npx expo run:android
```
```