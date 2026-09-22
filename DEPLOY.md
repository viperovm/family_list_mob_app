# Семейные списки — развёртывание (deploy) и сборка

Инструкция по развёртыванию backend на боевом сервере **без Docker** (нативно через
systemd), подготовке APK для Android, настройке Nginx и Jenkins, а также загрузке
проекта в GitHub.

---

## 1. Состав проекта

```
lists_app/
├── backend/                       # Django + DRF API
│   ├── config/                    # settings, urls, wsgi/asgi, celery
│   ├── common/                    # общий код (ошибки, телефон, утилиты)
│   ├── apps/                      # users, authentication, groups, lists, notifications
│   ├── deploy/
│   │   ├── nginx/nginx.conf       # конфиг хостового nginx
│   │   ├── systemd/               # юниты: web, celery-worker, celery-beat
│   │   ├── setup-db.sh            # установка/запуск PostgreSQL + Redis и создание БД
│   │   ├── deploy.sh              # нативный деплой (migrate + collectstatic + restart)
│   │   └── remove-docker.sh       # полное удаление Docker
│   ├── .env.example               # образец переменных окружения
│   └── requirements.txt
└── mobile/                        # React Native (Expo SDK 57) приложение
    ├── src/
    ├── app.json
    ├── scripts/start-emulator.sh
    └── android/                   # генерируется (в git НЕ хранится)
```

> Примечание: `mobile/android/` и `mobile/ios/` игнорируются git-ом — они генерируются
> командой `npx expo prebuild` / `expo run:android`.
>
> Файлы `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml` остались в репозитории
> только как опциональный способ локальной разработки. **Боевой сервер работает без Docker.**

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

## 3. Backend — развёртывание БЕЗ Docker (нативно, через systemd)

### 3.1. Требования на сервере

- Linux (Ubuntu/Debian)
- Python 3.12, `python3-venv`, `python3-dev`, `build-essential`, `libpq-dev`
- PostgreSQL (родной сервис `postgresql`)
- Redis (родной сервис `redis-server`)
- Nginx (хостовый, проксирует на `127.0.0.1:8000`)
- Открытые порты: 80 (HTTP) и 443 (HTTPS)
- Домен `listsapp.djangopirate.ru` (A-запись на IP сервера)

### 3.2. Установка системных зависимостей

```bash
sudo apt-get update
sudo apt-get install -y \
  python3 python3-venv python3-dev build-essential libpq-dev \
  postgresql postgresql-contrib redis-server nginx git rsync
```

### 3.3. Запуск базы данных (отдельная команда)

Запустить/включить **PostgreSQL** и **Redis** одной командой (это уже системные
systemd-сервисы):

```bash
sudo systemctl enable --now postgresql redis-server
```

> Отдельно только БД: `sudo systemctl start postgresql`
> Отдельно только Redis: `sudo systemctl start redis-server`

Либо всё сразу — установить пакеты, запустить службы и создать базу/пользователя
(идемпотентно) готовым скриптом:

```bash
cd backend
DB_PASSWORD='сильный_пароль' bash deploy/setup-db.sh
```

Скрипт создаст роль `lists` и базу `lists` (владелец `lists`) и выведет готовые
строки для `.env`. Если база/роль уже есть — ничего не сломает.

### 3.4. Клонирование и конфигурация окружения

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

# --- БД/Redis теперь на localhost (НЕ docker-имена db/redis) ---
DATABASE_URL=postgres://lists:СИЛЬНЫЙ_ПАРОЛЬ@127.0.0.1:5432/lists
REDIS_URL=redis://127.0.0.1:6379/0
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/1
CELERY_TASK_ALWAYS_EAGER=false

# --- Email (Mail.ru) ---
EMAIL_BACKEND_URL=smtp://family_mob_app@mail.ru:ПАРОЛЬ_ПРИЛОЖЕНИЯ@smtp.mail.ru:465/?ssl=true
DEFAULT_FROM_EMAIL=Семейные списки <family_mob_app@mail.ru>

CORS_ALLOWED_ORIGINS=
```

### 3.5. Виртуальное окружение и зависимости

```bash
cd ~/family_list_mob_app/backend
python3 -m venv .venv
./.venv/bin/pip install --upgrade pip
./.venv/bin/pip install -r requirements.txt
```

### 3.6. systemd-юниты (web, celery-worker, celery-beat)

Юниты лежат в `backend/deploy/systemd/`. Скопировать и включить:

```bash
cd ~/family_list_mob_app/backend

sudo cp deploy/systemd/listsapp-web.service /etc/systemd/system/
sudo cp deploy/systemd/listsapp-celery-worker.service /etc/systemd/system/
sudo cp deploy/systemd/listsapp-celery-beat.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now listsapp-web listsapp-celery-worker listsapp-celery-beat
```

> В юнитах прописан путь `/home/viperovm/family_list_mob_app/backend` и пользователь
> `viperovm`. Если у вас другой путь/пользователь — поправьте `User=`, `Group=`,
> `WorkingDirectory=`, `EnvironmentFile=` и `ExecStart=` перед копированием.

Что запускается как systemd-сервисы:

| Юнит | Процесс |
|------|---------|
| `postgresql` | база данных (системный юнит, ставится с пакетом) |
| `redis-server` | Redis-брокер/кэш (системный юнит) |
| `listsapp-web` | gunicorn `config.wsgi:application` на `127.0.0.1:8000` |
| `listsapp-celery-worker` | `celery -A config worker` |
| `listsapp-celery-beat` | `celery -A config beat` (периодическая очистка) |

### 3.7. Миграции, статика, суперпользователь

```bash
cd ~/family_list_mob_app/backend

./.venv/bin/python manage.py migrate --noinput
./.venv/bin/python manage.py collectstatic --noinput
./.venv/bin/python manage.py createsuperuser
```

### 3.8. Nginx

Положить конфиг и включить сайт:

```bash
sudo cp ~/family_list_mob_app/backend/deploy/nginx/nginx.conf \
  /etc/nginx/sites-available/listsapp.djangopirate.ru
sudo ln -s /etc/nginx/sites-available/listsapp.djangopirate.ru \
  /etc/nginx/sites-enabled/listsapp.djangopirate.ru

sudo nginx -t
sudo systemctl reload nginx
```

> В `nginx.conf` поправьте `alias` на свой реальный путь к `backend/staticfiles/` и
> `backend/media/` (команда `cd ~/family_list_mob_app/backend && pwd`).

### 3.9. HTTPS (TLS) на домене

1. Получить сертификаты (Let's Encrypt/certbot) и положить:
   - `backend/deploy/certs/listsapp.djangopirate.ru.pem` — сертификат (+ цепочка)
   - `backend/deploy/certs/listsapp.djangopirate.ru.key` — приватный ключ
2. Раскомментировать HTTPS-блок в `backend/deploy/nginx/nginx.conf`.
3. Перезапустить nginx: `sudo systemctl reload nginx`.
4. Убедиться, что в `.env`: `DEBUG=false`, строгий `ALLOWED_HOSTS`, случайный `SECRET_KEY`.

### 3.10. Деплой обновлений (migrate + collectstatic + restart)

Готовый скрипт делает `git pull`, ставит зависимости, применяет миграции, собирает
статику и перезапускает сервисы:

```bash
bash ~/family_list_mob_app/backend/deploy/deploy.sh
```
---

## 4. Jenkins (CI/CD)

### 4.1. Требования к агенту

Node.js 20+, JDK 17 (Android Gradle), Android SDK (сборка APK), Python 3.12 + venv
(тесты backend). Для деплоя — доступ по SSH к боевому серверу.

### 4.2. Credentials в Jenkins

| ID | Тип | Назначение |
|----|-----|-----------|
| `github-ssh-key` | SSH private key | клонирование из GitHub |
| `deploy-ssh-key` | SSH private key | SSH-доступ к боевому серверу для деплоя |
| `mail-app-password` | Secret text | пароль приложения Mail.ru |
| `android-keystore` | Secret file | keystore для подписи release-APK |

### 4.3. Jenkinsfile

`Jenkinsfile` в корне репозитория: тесты backend через venv, деплой через
`rsync` + `ssh` (запуск `deploy.sh` на сервере), сборка APK.

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
sudo systemctl status listsapp-web listsapp-celery-worker listsapp-celery-beat
sudo journalctl -u listsapp-web -f          # логи web
sudo journalctl -u listsapp-celery-worker -f

curl -s https://listsapp.djangopirate.ru/api/schema/      # JSON OpenAPI

cd ~/family_list_mob_app/backend
./.venv/bin/python manage.py check
./.venv/bin/python manage.py migrate --plan
```

---

## 7. Шпаргалка команд

```bash
# БД и Redis (родные systemd-сервисы)
sudo systemctl start postgresql redis-server
sudo systemctl enable --now postgresql redis-server

# приложение
sudo systemctl restart listsapp-web listsapp-celery-worker listsapp-celery-beat
sudo systemctl status listsapp-web
sudo journalctl -u listsapp-web -f

# деплой обновлений
bash ~/family_list_mob_app/backend/deploy/deploy.sh

# git
git add -A && git commit -m "..." && git push

# mobile dev
cd mobile && source .envrc && ./scripts/start-emulator.sh && npx expo run:android
```
---

## 8. Удаление Docker (полная очистка)

Если Docker на сервере больше не нужен, его можно полностью удалить вместе со всеми
контейнерами, образами, томами, сетями, build-кэшем и каталогами данных.

### 8.1. Остановить и удалить всё одной командой

```bash
bash ~/family_list_mob_app/backend/deploy/remove-docker.sh
```

Скрипт делает (безопасно, с проверками на отсутствие Docker):

1. останавливает и удаляет все контейнеры: `docker rm -f $(docker ps -aq)`
2. удаляет все образы: `docker rmi -f $(docker images -aq)`
3. удаляет все тома: `docker volume rm -f $(docker volume ls -q)`
4. удаляет пользовательские сети: `docker network rm $(docker network ls -q)`
5. чистит build-кэш: `docker builder prune -a -f` + `docker system prune -a --volumes -f`
6. останавливает и отключает службы `docker`, `docker.socket`, `containerd`
7. удаляет пакеты: `docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-compose docker.io`
8. удаляет каталоги: `/var/lib/docker`, `/var/lib/containerd`, `/etc/docker`, `~/.docker`

### 8.2. То же вручную

```bash
# 1. контейнеры
sudo docker rm -f $(sudo docker ps -aq)

# 2. образы
sudo docker rmi -f $(sudo docker images -aq)

# 3. тома
sudo docker volume rm -f $(sudo docker volume ls -q)

# 4. сети (пользовательские; bridge/host/none — системные, их не трогаем)
sudo docker network rm $(sudo docker network ls -q)

# 5. build-кэш и мусор
sudo docker builder prune -a -f
sudo docker system prune -a --volumes -f

# 6. остановить и отключить службы
sudo systemctl stop docker docker.socket containerd
sudo systemctl disable docker docker.socket containerd

# 7. удалить пакеты
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin docker-compose docker.io
sudo apt-get autoremove -y && sudo apt-get autoclean

# 8. удалить каталоги данных
sudo rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/containerd ~/.docker
```
