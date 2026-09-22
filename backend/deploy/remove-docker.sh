#!/usr/bin/env bash
# ПОЛНОЕ удаление Docker: контейнеры, образы, тома, сети, build-кэш и сами пакеты.
#
# ВНИМАНИЕ: необратимо! Все docker-контейнеры/данные будут удалены.
#
# Использование:
#   bash backend/deploy/remove-docker.sh

set -euo pipefail

echo "==> Останавливаем и удаляем все контейнеры"
if command -v docker >/dev/null 2>&1 && docker ps -aq | grep -q .; then
  docker ps -aq | xargs -r docker rm -f
fi

echo "==> Удаляем все образы"
if command -v docker >/dev/null 2>&1 && docker images -aq | grep -q .; then
  docker images -aq | xargs -r docker rmi -f
fi

echo "==> Удаляем все тома"
if command -v docker >/dev/null 2>&1 && docker volume ls -q | grep -q .; then
  docker volume ls -q | xargs -r docker volume rm -f
fi

echo "==> Удаляем все пользовательские сети"
if command -v docker >/dev/null 2>&1 && docker network ls -q | grep -q .; then
  docker network ls -q | xargs -r docker network rm || true
fi

echo "==> Чистим build-кэш и прочий мусор"
if command -v docker >/dev/null 2>&1; then
  docker builder prune -a -f || true
  docker system prune -a --volumes -f || true
fi

echo "==> Останавливаем и отключаем службы docker/containerd"
sudo systemctl stop docker docker.socket containerd 2>/dev/null || true
sudo systemctl disable docker docker.socket containerd 2>/dev/null || true

echo "==> Удаляем пакеты Docker"
sudo apt-get purge -y \
  docker-ce docker-ce-cli containerd.io docker-buildx-plugin \
  docker-compose-plugin docker-compose-v2 docker-compose docker.io 2>/dev/null || true
sudo apt-get autoremove -y
sudo apt-get autoclean

echo "==> Удаляем каталоги с данными Docker"
sudo rm -rf /var/lib/docker /var/lib/containerd /etc/docker /etc/containerd ~/.docker

echo
echo "==> Готово. Docker полностью удалён."
