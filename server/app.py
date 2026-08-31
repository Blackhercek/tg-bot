"""Сервер трекеров: аутентификация, документное API, отдача приложений.

Запуск в разработке:  python app.py
Запуск на сервере:    gunicorn -w 1 --threads 4 -b 127.0.0.1:8000 app:app
Сгенерировать хеш:    python app.py hash 'мой-пароль'
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import sys
import time
from functools import wraps

from flask import Flask, jsonify, make_response, redirect, request, send_from_directory

import store

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

if os.path.exists(os.path.join(BASE_DIR, ".env")):
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(BASE_DIR, ".env"))
    except ImportError:
        pass

SECRET_KEY = os.environ.get("SECRET_KEY", "")
PASSWORD_HASH = os.environ.get("APP_PASSWORD_HASH", "")
SESSION_DAYS = int(os.environ.get("SESSION_DAYS", "90"))
SECURE_COOKIE = os.environ.get("SECURE_COOKIE", "1") != "0"
DOCS = {"nutrition", "tracker"}

app = Flask(__name__, static_folder=None)
store.init()


# --------------------------------------------------------------- пароль
def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return "scrypt$%s$%s" % (base64.b64encode(salt).decode(), base64.b64encode(dk).decode())


def verify_password(password, stored):
    try:
        algo, salt_b64, hash_b64 = stored.split("$")
        if algo != "scrypt":
            return False
        expect = hash_password(password, base64.b64decode(salt_b64))
        return hmac.compare_digest(expect, stored)
    except Exception:
        return False


# --------------------------------------------------------------- сессия
def make_token():
    exp = str(int(time.time()) + SESSION_DAYS * 86400)
    sig = hmac.new(SECRET_KEY.encode(), exp.encode(), hashlib.sha256).hexdigest()
    return exp + "." + sig


def token_valid(token):
    if not token or "." not in token:
        return False
    exp, sig = token.rsplit(".", 1)
    good = hmac.new(SECRET_KEY.encode(), exp.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, good):
        return False
    try:
        return int(exp) > time.time()
    except ValueError:
        return False


def authed():
    return token_valid(request.cookies.get("sid", ""))


def require_auth(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if not authed():
            if request.path.startswith("/api/"):
                return jsonify(error="unauthorized"), 401
            return redirect("/login?next=" + request.path)
        return fn(*a, **kw)
    return wrapper


# ----------------------------------------------- ограничение попыток входа
_attempts = {}


def rate_limited(ip):
    now = time.time()
    hits = [t for t in _attempts.get(ip, []) if now - t < 900]
    _attempts[ip] = hits
    return len(hits) >= 8


def note_attempt(ip):
    _attempts.setdefault(ip, []).append(time.time())


# --------------------------------------------------------------- страницы
def page(name):
    return send_from_directory(STATIC_DIR, name)


@app.route("/")
def root():
    return redirect("/app/" if authed() else "/login")


@app.route("/login")
def login_page():
    if authed():
        return redirect("/app/")
    return page("login.html")


@app.route("/app/")
@require_auth
def app_index():
    return page("index.html")


@app.route("/app/nutrition")
@require_auth
def app_nutrition():
    return page("nutrition.html")


@app.route("/app/tracker")
@require_auth
def app_tracker():
    return page("tracker.html")


@app.route("/static/<path:sub>")
def static_files(sub):
    resp = send_from_directory(STATIC_DIR, sub)
    if sub.endswith((".js", ".css")):
        resp.headers["Cache-Control"] = "public, max-age=300"
    return resp


@app.route("/sw.js")
def service_worker():
    resp = send_from_directory(STATIC_DIR, "sw.js")
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(STATIC_DIR, "icon.svg", mimetype="image/svg+xml")


@app.route("/manifest.webmanifest")
def manifest():
    return send_from_directory(STATIC_DIR, "manifest.webmanifest")


# ------------------------------------------------------------------- API
@app.post("/api/login")
def api_login():
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "?").split(",")[0].strip()
    if rate_limited(ip):
        return jsonify(error="too_many_attempts"), 429
    data = request.get_json(silent=True) or {}
    if not PASSWORD_HASH or not verify_password(data.get("password", ""), PASSWORD_HASH):
        note_attempt(ip)
        time.sleep(0.6)
        return jsonify(error="bad_password"), 401
    resp = make_response(jsonify(ok=True))
    resp.set_cookie("sid", make_token(), max_age=SESSION_DAYS * 86400,
                    httponly=True, samesite="Lax", secure=SECURE_COOKIE, path="/")
    return resp


@app.post("/api/logout")
def api_logout():
    resp = make_response(jsonify(ok=True))
    resp.delete_cookie("sid", path="/")
    return resp


@app.get("/api/doc/<key>")
@require_auth
def api_get(key):
    if key not in DOCS:
        return jsonify(error="unknown_doc"), 404
    rev, doc = store.get(key)
    return jsonify(rev=rev, doc=doc)


@app.put("/api/doc/<key>")
@require_auth
def api_put(key):
    if key not in DOCS:
        return jsonify(error="unknown_doc"), 404
    data = request.get_json(silent=True) or {}
    if "doc" not in data:
        return jsonify(error="no_doc"), 400
    ok, rev, current = store.put(key, int(data.get("rev", 0)), data["doc"])
    if ok:
        return jsonify(rev=rev)
    return jsonify(rev=rev, doc=current), 409


@app.post("/api/doc/<key>/beacon")
@require_auth
def api_beacon(key):
    """sendBeacon при закрытии вкладки: дожать последнюю правку без слияния."""
    if key not in DOCS:
        return jsonify(error="unknown_doc"), 404
    try:
        data = json.loads(request.get_data(as_text=True) or "{}")
    except ValueError:
        return jsonify(error="bad_json"), 400
    if "doc" not in data:
        return jsonify(error="no_doc"), 400
    store.force_put(key, data["doc"])
    return jsonify(ok=True)


@app.get("/api/history/<key>")
@require_auth
def api_history(key):
    if key not in DOCS:
        return jsonify(error="unknown_doc"), 404
    return jsonify(versions=store.history(key))


@app.get("/api/history/<key>/<int:rev>")
@require_auth
def api_version(key, rev):
    if key not in DOCS:
        return jsonify(error="unknown_doc"), 404
    doc = store.version(key, rev)
    if doc is None:
        return jsonify(error="no_such_rev"), 404
    return jsonify(rev=rev, doc=doc)


@app.get("/api/health")
def api_health():
    return jsonify(ok=True, docs=store.stats())


# ------------------------------------------------------------------ CLI
def main():
    if len(sys.argv) > 1 and sys.argv[1] == "hash":
        if len(sys.argv) < 3:
            print("Использование: python app.py hash 'пароль'")
            sys.exit(1)
        print(hash_password(sys.argv[2]))
        return
    if not SECRET_KEY:
        print("SECRET_KEY не задан. Сгенерируй:  python -c \"import secrets;print(secrets.token_hex(32))\"")
        sys.exit(1)
    if not PASSWORD_HASH:
        print("APP_PASSWORD_HASH не задан. Сгенерируй:  python app.py hash 'пароль'")
        sys.exit(1)
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "8000")), debug=False)


if __name__ == "__main__":
    main()
