#!/usr/bin/env bash
# Установка и запуск PostgreSQL + Redis НАТИВНО (без Docker) и создание БД/пользователя.
#
# Использование:
#   bash backend/deploy/setup-db.sh
#
# Можно переопределить переменные окружения:
#   DB_NAME=lists DB_USER=lists DB_PASSWORD='сильный_пароль' bash backend/deploy/setup-db.sh

set -euo pipefail

DB_NAME="${DB_NAME:-lists}"
DB_USER="${DB_USER:-listsadmin}"
DB_PASSWORD="${DB_PASSWORD:-listssecret}"   # ОБЯЗАТЕЛЬНО смените на сильный пароль в продакшене

echo "==> Обновляем пакеты и устанавливаем PostgreSQL + Redis"
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib redis-server

echo "==> Запускаем и включаем автозапуск служб"
sudo systemctl enable --now postgresql
sudo systemctl enable --now redis-server

echo "==> Создаём роль '${DB_USER}' (идемпотентно)"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';"
else
  sudo -u postgres psql -c "ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';"
fi

echo "==> Создаём базу '${DB_NAME}' (идемпотентно)"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
fi

echo
echo "==> Готово. Проверка:"
sudo systemctl --no-pager status postgresql redis-server || true
echo
echo "Пропишите в backend/.env:"
echo "  DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"
echo "  REDIS_URL=redis://127.0.0.1:6379/0"
echo "  CELERY_BROKER_URL=redis://127.0.0.1:6379/0"
echo "  CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/1"
