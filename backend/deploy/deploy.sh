#!/usr/bin/env bash
# Нативный деплой backend (без Docker): обновить код, поставить зависимости,
# применить миграции, собрать статику и перезапустить systemd-сервисы.
#
# Предполагается, что systemd-юниты (listsapp-web, listsapp-celery-worker,
# listsapp-celery-beat) уже установлены (см. DEPLOY.md).
#
# Использование:
#   bash backend/deploy/deploy.sh

set -euo pipefail

# backend/ (этот скрипт лежит в backend/deploy/deploy.sh)
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(dirname "$APP_DIR")"

cd "$REPO_DIR"

echo "==> Обновляем код из git"
git pull --ff-only

cd "$APP_DIR"

echo "==> Создаём venv (если нет) и ставим зависимости"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
./.venv/bin/pip install --upgrade pip
./.venv/bin/pip install -r requirements.txt

echo "==> Применяем миграции"
./.venv/bin/python manage.py migrate --noinput

echo "==> Чиним права на staticfiles/media (root-файлы могли остаться от Docker)"
sudo chown -R "$(id -u):$(id -g)" "$APP_DIR/staticfiles" "$APP_DIR/media" 2>/dev/null || true

echo "==> Собираем статику"
./.venv/bin/python manage.py collectstatic --noinput

echo "==> Перезапускаем сервисы"
sudo systemctl restart listsapp-web listsapp-celery-worker listsapp-celery-beat

echo "==> Статус сервисов"
sudo systemctl --no-pager status listsapp-web listsapp-celery-worker listsapp-celery-beat || true
