# Сервер трекеров

Два приложения — «Дневной баланс» (питание) и «Журнал подвала» (тренировки) —
с хранением данных на своём сервере. Локальное хранилище браузера остаётся
кэшем: приложение работает без связи, а записи уезжают на сервер, когда она появится.

## Что нужно

- VPS на Ubuntu 22.04 / 24.04 или Debian 12 (подойдёт минимальный тариф Contabo)
- Домен, A-запись которого указывает на IP сервера

**Домен обязателен.** Без него нельзя выпустить сертификат, а без HTTPS пароль
уйдёт открытым текстом и приложение не поставится на телефон иконкой.
Если своего домена нет — бесплатно подойдёт поддомен на duckdns.org
или аналогичном сервисе динамического DNS.

## Установка

```sh
ssh root@IP-сервера
apt update && apt install -y git
git clone https://github.com/Blackhercek/tg-bot.git
cd tg-bot
bash server/deploy/deploy.sh fit.example.ru
```

Скрипт спросит пароль для входа и дальше сделает всё сам: поставит пакеты,
создаст отдельного системного пользователя, развернёт окружение, настроит
systemd и nginx, выпустит сертификат, включит автопродление, поставит
ежедневный бэкап и закроет файрвол.

Запускать повторно безопасно — база, `.env` и бэкапы не затрагиваются.

## Обновление

```sh
cd ~/tg-bot && git pull
bash server/deploy/deploy.sh fit.example.ru
```

## На телефоне

Открыть адрес в браузере → «Добавить на главный экран». Приложение
запустится в полный экран без адресной строки. Шрифты, скрипты и оболочка
закэшированы, поэтому в подвале без сети оно откроется и будет писать
в локальное хранилище; синхронизация догонит позже.

## Устройство

```
браузер ──── localStorage (источник правды в рантайме)
   │
   └── sync.js ──HTTPS──> nginx ──> gunicorn ──> Flask ──> SQLite
```

- **Аутентификация.** Один пароль, хранится как scrypt-хеш. Сессия —
  подписанная HMAC кука, httpOnly, 90 дней. Восемь неудачных попыток
  с одного адреса за 15 минут — блокировка.
- **Конфликты.** У документа есть номер версии. Если с другого устройства
  успели записать раньше, сервер отвечает 409 и отдаёт актуальную копию;
  клиент сливает **по дням** — день независим от других, поэтому берётся
  та его версия, что изменена позже. Ни один день не теряется.
- **История.** Каждая запись попадает в таблицу `audit`, хранятся
  последние 200 версий каждого документа. Достать старую:
  `GET /api/history/nutrition` и `GET /api/history/nutrition/<rev>`.
- **Бэкапы.** Ежедневно в 04:17 через `sqlite3 .backup` (обычное копирование
  файла при WAL может дать битый снимок), хранятся 30 копий в `/opt/fitness/backups`.

## API

| Метод | Путь | Что делает |
|---|---|---|
| POST | `/api/login` | `{"password": "..."}` → кука сессии |
| POST | `/api/logout` | сбросить сессию |
| GET | `/api/doc/<nutrition\|tracker>` | `{rev, doc}` |
| PUT | `/api/doc/<key>` | `{rev, doc}` → `{rev}` либо 409 с актуальной копией |
| GET | `/api/history/<key>` | список версий |
| GET | `/api/history/<key>/<rev>` | конкретная версия |
| GET | `/api/health` | состояние, без авторизации |

## Локальная разработка

```sh
cd server
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
export SECRET_KEY=$(python3 -c 'import secrets;print(secrets.token_hex(32))')
export APP_PASSWORD_HASH=$(.venv/bin/python app.py hash 'test123')
export SECURE_COOKIE=0            # без него кука не встанет по http
.venv/bin/python app.py           # http://127.0.0.1:8000
```

## Пересборка фронтенда

Исходники приложений — JSX в `src/`. В `static/js/` лежат уже собранные файлы,
поэтому на сервере node не нужен. Пересобрать после правок:

```sh
npm i @babel/cli @babel/core @babel/preset-react
npx babel --presets @babel/preset-react src/nutrition.jsx -o static/js/nutrition.js
npx babel --presets @babel/preset-react src/tracker.jsx   -o static/js/tracker.js
```

Нужен classic-режим JSX (`React.createElement`). Если Babel соберёт
в automatic, в выводе появится `import ... from "react/jsx-runtime"`,
и браузер упадёт с `Cannot use import statement outside a module`.

## Проверка после установки

```sh
curl -s https://fit.example.ru/api/health          # {"ok":true,...}
systemctl status fitness
journalctl -u fitness -n 50
```
