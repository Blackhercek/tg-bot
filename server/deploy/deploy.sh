#!/usr/bin/env bash
# Установка рядом с уже работающими сайтами.
#
# Скрипт НИЧЕГО не удаляет и не трогает чужое:
#   - не меняет правила файрвола (только показывает их)
#   - не удаляет конфиги nginx и не занимает default_server
#   - добавляет отдельный server-блок на свой домен, как любой второй сайт
#   - слушает свободный локальный порт, занятые не трогает
#
#   bash deploy/deploy.sh --domain fit.example.ru --dry-run   # только показать план
#   bash deploy/deploy.sh --domain fit.example.ru             # выполнить
set -euo pipefail

DOMAIN=""; PORT=""; DRY=0; ASSUME_YES=0; WITH_TLS=1
APP_DIR=/opt/fitness
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --port)   PORT="${2:-}";   shift 2 ;;
    --dry-run) DRY=1; shift ;;
    --yes)     ASSUME_YES=1; shift ;;
    --no-tls)  WITH_TLS=0; shift ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "неизвестный аргумент: $1" >&2; exit 2 ;;
  esac
done

bold() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
warn() { printf '\033[33m   ! %s\033[0m\n' "$1"; }
die()  { printf '\033[31mОстановка: %s\033[0m\n' "$1" >&2; exit 1; }
run()  { if [ "$DRY" = 1 ]; then printf '   [dry-run] %s\n' "$*"; else "$@"; fi; }

[ "$(id -u)" = 0 ] || die "нужен root"
[ -n "$DOMAIN" ] || die "укажи --domain fit.example.ru"

# ------------------------------------------------------------ разведка
bold "Что уже есть на сервере"
echo "   ОС: $( (. /etc/os-release && echo "$PRETTY_NAME") 2>/dev/null || uname -s)"

# Определение занятых портов. Python есть всегда (он нужен приложению),
# поэтому основная проверка — попытка привязки, она не зависит от ss/netstat.
# Если определить не удалось — останавливаемся, а не считаем порт свободным:
# молча занять 80 на машине с боевым сайтом дороже, чем не установиться.
port_busy() {
  python3 - "$1" <<'PYEOF' 2>/dev/null
import socket, sys
p = int(sys.argv[1])
for host in ("0.0.0.0", "127.0.0.1"):
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind((host, p))
    except OSError:
        sys.exit(0)      # занят
    finally:
        s.close()
sys.exit(1)              # свободен
PYEOF
}
python3 -c 'import socket' 2>/dev/null || die "нет python3 — нечем проверить занятость портов"

# Кто держит порт: справочно, если есть чем посмотреть.
who_holds() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | grep -E "[:.]$1\b" | grep -oP 'users:\(\("\K[^"]+' | sort -u | tr '\n' ' '
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ltnp 2>/dev/null | grep -E "[:.]$1\b" | awk '{print $NF}' | sort -u | tr '\n' ' '
  elif command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN -F c 2>/dev/null | sed -n 's/^c//p' | sort -u | tr '\n' ' '
  fi
}

WEB=""
for p in 80 443; do
  if port_busy "$p"; then
    holder="$(who_holds "$p")"
    echo "   порт $p: занят${holder:+ — $holder}"
    case "$holder" in
      *nginx*)          [ -z "$WEB" ] && WEB=nginx ;;
      *apache*|*httpd*) WEB=apache ;;
      *caddy*)          WEB=caddy ;;
      "")               [ -z "$WEB" ] && WEB=unidentified ;;
      *)                WEB=other ;;
    esac
  else
    echo "   порт $p: свободен"
  fi
done

case "$WEB" in
  apache|caddy|other)
    die "порт 80/443 держит $WEB, а скрипт умеет только nginx.
Настрой проксирование вручную — образец конфига: deploy/nginx.conf" ;;
  unidentified)
    if [ -d /etc/nginx ]; then
      warn "порт занят, определить процесс нечем (нет ss/netstat/lsof), но /etc/nginx существует"
      warn "исходим из того, что это nginx — если нет, прерви установку"
      WEB=nginx
    else
      die "порт 80/443 занят неизвестным процессом, и nginx не найден.
Поставь iproute2 (apt install iproute2) и запусти снова, либо разберись вручную."
    fi ;;
esac

if [ -d /etc/nginx/sites-enabled ]; then
  echo "   сайты nginx: $(ls -1 /etc/nginx/sites-enabled 2>/dev/null | tr '\n' ' ')"
fi
if [ "$WEB" = apache ] || [ "$WEB" = caddy ]; then
  die "порт 80/443 держит $WEB, а скрипт умеет только nginx.
Настрой проксирование вручную — конфиг для образца: deploy/nginx.conf"
fi
if [ "$WEB" = unknown ]; then
  die "порт 80/443 занят неизвестным процессом. Разберись вручную, чтобы не уронить сайт."
fi

# свободный локальный порт под приложение
if [ -z "$PORT" ]; then
  PORT=8765
  while port_busy "$PORT"; do
    PORT=$((PORT+1))
    [ "$PORT" -gt 8825 ] && die "не нашёл свободный порт в диапазоне 8765-8825"
  done
else
  port_busy "$PORT" && die "порт $PORT занят, выбери другой через --port"
fi
echo "   приложение займёт локальный порт: $PORT (только 127.0.0.1)"

FW="файрвол не обнаружен"
command -v ufw >/dev/null 2>&1 && FW="ufw: $(ufw status 2>/dev/null | head -1)"
command -v firewall-cmd >/dev/null 2>&1 && FW="firewalld: $(firewall-cmd --state 2>/dev/null || echo '?')"
echo "   $FW"
warn "правила файрвола скрипт НЕ меняет — если он включён, убедись сам, что 80/443 открыты"

if [ -e "$APP_DIR" ]; then echo "   $APP_DIR уже существует — код обновится, данные и .env сохранятся"; fi
if [ -e /etc/nginx/sites-enabled/fitness ]; then echo "   свой сайт nginx уже подключён — будет перезаписан"; fi

# ------------------------------------------------------------ план
bold "Что будет сделано"
cat <<PLAN
   1. пакеты: python3-venv, sqlite3$([ "$WEB" = nginx ] || echo ", nginx")$([ "$WITH_TLS" = 1 ] && echo ", certbot")
   2. системный пользователь fitness (без входа в систему)
   3. код в $APP_DIR, окружение в $APP_DIR/.venv
   4. служба systemd fitness на 127.0.0.1:$PORT
   5. НОВЫЙ файл /etc/nginx/sites-available/fitness + симлинк, server_name $DOMAIN
   6. $([ "$WITH_TLS" = 1 ] && echo "сертификат certbot --nginx только для $DOMAIN" || echo "без TLS (--no-tls)")
   7. ежедневный бэкап базы в /etc/cron.d/fitness-backup

   НЕ будет сделано: изменение файрвола, удаление чужих конфигов,
   назначение default_server, правка существующих сайтов.
PLAN

[ "$DRY" = 1 ] && { echo; echo "Это был --dry-run. Ничего не изменено."; exit 0; }

if [ "$ASSUME_YES" != 1 ]; then
  printf '\nПродолжить? [y/N] '
  read -r a; case "$a" in y|Y|yes|да) ;; *) die "отменено пользователем" ;; esac
fi

# ------------------------------------------------------------ установка
bold "Пакеты"
export DEBIAN_FRONTEND=noninteractive
PKGS="python3-venv python3-pip sqlite3"
[ "$WEB" = nginx ] || PKGS="$PKGS nginx"
[ "$WITH_TLS" = 1 ] && PKGS="$PKGS certbot python3-certbot-nginx"
run apt-get update -qq
run apt-get install -y -qq $PKGS

bold "Пользователь и каталоги"
id -u fitness >/dev/null 2>&1 || run useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin fitness
run mkdir -p "$APP_DIR/data" "$APP_DIR/backups"

bold "Код"
for item in app.py store.py requirements.txt static deploy; do
  run rm -rf "${APP_DIR:?}/$item"
  run cp -r "$SRC_DIR/$item" "$APP_DIR/"
done

bold "Окружение"
[ -d "$APP_DIR/.venv" ] || run python3 -m venv "$APP_DIR/.venv"
run "$APP_DIR/.venv/bin/pip" install -q --upgrade pip
run "$APP_DIR/.venv/bin/pip" install -q -r "$APP_DIR/requirements.txt"

bold "Конфигурация"
if [ ! -f "$APP_DIR/.env" ]; then
  printf '   Пароль для входа в приложение: '; read -rs PASS; echo
  [ ${#PASS} -ge 8 ] || die "пароль короче 8 символов"
  SECRET=$(python3 -c 'import secrets;print(secrets.token_hex(32))')
  HASH=$("$APP_DIR/.venv/bin/python" "$APP_DIR/app.py" hash "$PASS"); unset PASS
  cat > "$APP_DIR/.env" <<ENV
SECRET_KEY=$SECRET
APP_PASSWORD_HASH=$HASH
DB_PATH=$APP_DIR/data/fitness.db
SESSION_DAYS=90
SECURE_COOKIE=$WITH_TLS
PORT=$PORT
ENV
  echo "   .env создан, пароль хранится только хешем"
else
  sed -i "s/^PORT=.*/PORT=$PORT/" "$APP_DIR/.env"
  echo "   .env уже был — сохранён, обновлён только порт"
fi
run chown -R fitness:fitness "$APP_DIR"
run chmod 600 "$APP_DIR/.env"

bold "Служба"
sed "s|127.0.0.1:8000|127.0.0.1:$PORT|" "$APP_DIR/deploy/fitness.service" > /etc/systemd/system/fitness.service
run systemctl daemon-reload
run systemctl enable -q fitness
run systemctl restart fitness
sleep 2
systemctl is-active --quiet fitness || { journalctl -u fitness -n 30 --no-pager; die "служба не поднялась"; }
curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null || die "приложение не отвечает на 127.0.0.1:$PORT"
echo "   работает на 127.0.0.1:$PORT"

bold "nginx"
# Отдельный файл. Чужие сайты не читаются и не изменяются.
cat > /etc/nginx/sites-available/fitness <<NGX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
    }
}
NGX
run ln -sf /etc/nginx/sites-available/fitness /etc/nginx/sites-enabled/fitness
if ! nginx -t 2>/dev/null; then
  rm -f /etc/nginx/sites-enabled/fitness
  nginx -t
  die "конфиг nginx не прошёл проверку — свой сайт отключён, чужие не затронуты"
fi
run systemctl reload nginx
echo "   добавлен server-блок для $DOMAIN, остальные сайты не тронуты"

if [ "$WITH_TLS" = 1 ]; then
  bold "Сертификат"
  # Плагин --nginx правит только блок с нужным server_name.
  if ! certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
        --register-unsafely-without-email --redirect 2>&1 | tail -5; then
    warn "certbot не выпустил сертификат"
    warn "проверь A-запись $DOMAIN на IP этого сервера и доступность порта 80 снаружи"
    warn "сайт пока работает по http; повторить: certbot --nginx -d $DOMAIN"
  fi
fi

bold "Бэкапы"
run cp "$APP_DIR/deploy/backup.sh" /usr/local/bin/fitness-backup
run chmod +x /usr/local/bin/fitness-backup
echo '17 4 * * * root /usr/local/bin/fitness-backup >/dev/null 2>&1' > /etc/cron.d/fitness-backup
run /usr/local/bin/fitness-backup

bold "Готово"
cat <<DONE

   Адрес:  $([ "$WITH_TLS" = 1 ] && echo https || echo http)://$DOMAIN

   Чужие сайты не затронуты: файрвол не менялся, конфиги не удалялись,
   default_server не переназначался.

   systemctl status fitness        состояние
   journalctl -u fitness -f        логи
   bash $APP_DIR/deploy/uninstall.sh   полное удаление

DONE
