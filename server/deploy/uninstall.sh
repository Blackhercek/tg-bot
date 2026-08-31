#!/usr/bin/env bash
# Полное удаление. Трогает только своё: службу fitness, свой сайт nginx,
# свой cron и /opt/fitness. Чужие конфиги и файрвол не затрагиваются.
#   bash uninstall.sh           # удалить, данные оставить в /opt/fitness-data-backup
#   bash uninstall.sh --purge   # удалить вместе с базой и бэкапами
set -euo pipefail
PURGE=0; [ "${1:-}" = "--purge" ] && PURGE=1
[ "$(id -u)" = 0 ] || { echo "нужен root" >&2; exit 1; }

echo "== служба"
systemctl disable --now fitness 2>/dev/null || true
rm -f /etc/systemd/system/fitness.service
systemctl daemon-reload

echo "== nginx (только свой файл)"
rm -f /etc/nginx/sites-enabled/fitness /etc/nginx/sites-available/fitness
nginx -t && systemctl reload nginx && echo "   конфиг цел, остальные сайты работают"

echo "== cron и бэкап-скрипт"
rm -f /etc/cron.d/fitness-backup /usr/local/bin/fitness-backup

echo "== файлы"
if [ "$PURGE" = 1 ]; then
  rm -rf /opt/fitness
  echo "   удалено вместе с базой"
else
  if [ -d /opt/fitness/data ]; then
    mkdir -p /opt/fitness-data-backup
    cp -r /opt/fitness/data /opt/fitness/backups /opt/fitness-data-backup/ 2>/dev/null || true
    echo "   база сохранена в /opt/fitness-data-backup"
  fi
  rm -rf /opt/fitness
fi
userdel fitness 2>/dev/null || true

echo
echo "Готово. Сертификат Let's Encrypt не удалён — если он больше не нужен:"
echo "  certbot delete --cert-name ДОМЕН"
