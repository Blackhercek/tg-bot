#!/usr/bin/env bash
# Разворачивает приложение на чистом Ubuntu/Debian VPS (Contabo и любой другой).
# Запускать от root:  bash deploy/deploy.sh твой-домен.ru
# Повторный запуск безопасен: скрипт идемпотентный, данные не трогает.
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR=/opt/fitness
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die() { printf '\033[31mОшибка: %s\033[0m\n' "$1" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "нужен root: sudo bash deploy/deploy.sh $DOMAIN"
[ -n "$DOMAIN" ] || die "укажи домен: bash deploy/deploy.sh fit.example.ru
Без домена не выпустить сертификат, а без HTTPS пароль пойдёт открытым текстом
и приложение нельзя будет поставить на телефон как иконку."

say "Пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3-venv python3-pip nginx sqlite3 certbot python3-certbot-nginx curl

say "Пользователь и каталоги"
id -u fitness >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin fitness
mkdir -p "$APP_DIR"/{data,backups}

say "Файлы приложения"
# Данные и .env переживают обновление: копируем только код.
for item in app.py store.py requirements.txt static deploy; do
    rm -rf "${APP_DIR:?}/$item"
    cp -r "$SRC_DIR/$item" "$APP_DIR/"
done

say "Виртуальное окружение"
[ -d "$APP_DIR/.venv" ] || python3 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/pip" install -q --upgrade pip
"$APP_DIR/.venv/bin/pip" install -q -r "$APP_DIR/requirements.txt"

say "Конфигурация"
if [ ! -f "$APP_DIR/.env" ]; then
    echo "Файла .env нет — создаю."
    printf 'Придумай пароль для входа в приложение: '
    read -rs PASS; echo
    [ ${#PASS} -ge 8 ] || die "пароль короче 8 символов"
    SECRET=$(python3 -c 'import secrets;print(secrets.token_hex(32))')
    HASH=$("$APP_DIR/.venv/bin/python" "$APP_DIR/app.py" hash "$PASS")
    cat > "$APP_DIR/.env" <<ENVEOF
SECRET_KEY=$SECRET
APP_PASSWORD_HASH=$HASH
DB_PATH=$APP_DIR/data/fitness.db
SESSION_DAYS=90
SECURE_COOKIE=1
PORT=8000
ENVEOF
    unset PASS
    echo "Пароль сохранён только в виде scrypt-хеша."
else
    echo ".env уже есть — не трогаю."
fi
chown -R fitness:fitness "$APP_DIR"
chmod 600 "$APP_DIR/.env"

say "systemd"
cp "$APP_DIR/deploy/fitness.service" /etc/systemd/system/fitness.service
systemctl daemon-reload
systemctl enable -q fitness
systemctl restart fitness
sleep 2
systemctl is-active --quiet fitness || { journalctl -u fitness -n 30 --no-pager; die "сервис не поднялся"; }
curl -sf http://127.0.0.1:8000/api/health >/dev/null || die "приложение не отвечает на 127.0.0.1:8000"
echo "Сервис работает."

say "nginx"
# Сначала http-только конфиг, иначе certbot не стартует без сертификата.
cat > /etc/nginx/sites-available/fitness <<NGXEOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGXEOF
ln -sf /etc/nginx/sites-available/fitness /etc/nginx/sites-enabled/fitness
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

say "Сертификат Let's Encrypt"
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    certbot certonly --webroot -w /var/www/html -d "$DOMAIN" \
        --non-interactive --agree-tos --register-unsafely-without-email \
        || die "certbot не смог выпустить сертификат.
Проверь, что A-запись $DOMAIN указывает на IP этого сервера и порт 80 открыт."
else
    echo "Сертификат уже есть."
fi

sed "s/DOMAIN/$DOMAIN/g" "$APP_DIR/deploy/nginx.conf" > /etc/nginx/sites-available/fitness
nginx -t && systemctl reload nginx

say "Автопродление сертификата и бэкапы"
systemctl enable -q --now certbot.timer 2>/dev/null || true
cp "$APP_DIR/deploy/backup.sh" /usr/local/bin/fitness-backup
chmod +x /usr/local/bin/fitness-backup
cat > /etc/cron.d/fitness-backup <<'CRONEOF'
17 4 * * * root /usr/local/bin/fitness-backup >/dev/null 2>&1
CRONEOF
/usr/local/bin/fitness-backup && echo "Первый бэкап сделан."

say "Файрвол"
if command -v ufw >/dev/null 2>&1; then
    ufw allow OpenSSH >/dev/null 2>&1 || true
    ufw allow 'Nginx Full' >/dev/null 2>&1 || true
    ufw --force enable >/dev/null 2>&1 || true
    echo "ufw: открыты SSH и 80/443."
fi

say "Готово"
cat <<DONEEOF

  Открывай:  https://$DOMAIN

  На телефоне: открыть в браузере -> «Добавить на главный экран».
  Приложение запустится без адресной строки и будет работать
  даже там, где нет связи — записи уедут на сервер, когда она появится.

  Полезное:
    systemctl status fitness       состояние
    journalctl -u fitness -f       логи
    /usr/local/bin/fitness-backup  бэкап вручную
    ls /opt/fitness/backups        копии базы

DONEEOF
