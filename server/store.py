"""Хранилище документов на SQLite.

Одна строка на приложение плюс история версий: если слияние однажды
пойдёт не так, данные не исчезнут — их можно достать из audit.
"""
import json
import os
import sqlite3
import threading
from datetime import datetime, timezone

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "data", "fitness.db"))
AUDIT_KEEP = 200  # версий на каждый документ

_local = threading.local()


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def conn():
    c = getattr(_local, "conn", None)
    if c is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        c = sqlite3.connect(DB_PATH, timeout=10)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA journal_mode=WAL")      # читатель не блокирует писателя
        c.execute("PRAGMA synchronous=FULL")      # данные важнее скорости
        c.execute("PRAGMA foreign_keys=ON")
        _local.conn = c
    return c


def init():
    c = conn()
    c.executescript(
        """
        CREATE TABLE IF NOT EXISTS docs (
            key        TEXT PRIMARY KEY,
            rev        INTEGER NOT NULL,
            doc        TEXT    NOT NULL,
            updated_at TEXT    NOT NULL
        );
        CREATE TABLE IF NOT EXISTS audit (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            key        TEXT    NOT NULL,
            rev        INTEGER NOT NULL,
            doc        TEXT    NOT NULL,
            created_at TEXT    NOT NULL
        );
        CREATE INDEX IF NOT EXISTS audit_key_rev ON audit(key, rev DESC);
        """
    )
    c.commit()


def get(key):
    row = conn().execute("SELECT rev, doc FROM docs WHERE key=?", (key,)).fetchone()
    if row is None:
        return 0, {}
    return row["rev"], json.loads(row["doc"])


def put(key, rev, doc):
    """Оптимистичная блокировка.

    Возвращает (True, new_rev, None) при успехе и
    (False, current_rev, current_doc) если ревизия устарела —
    клиент сольёт по дням и повторит.
    """
    c = conn()
    payload = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    try:
        c.execute("BEGIN IMMEDIATE")
        row = c.execute("SELECT rev, doc FROM docs WHERE key=?", (key,)).fetchone()
        cur_rev = row["rev"] if row else 0
        if int(rev) != cur_rev:
            c.rollback()
            return False, cur_rev, json.loads(row["doc"]) if row else {}
        new_rev = cur_rev + 1
        now = _now()
        if row:
            c.execute("UPDATE docs SET rev=?, doc=?, updated_at=? WHERE key=?", (new_rev, payload, now, key))
        else:
            c.execute("INSERT INTO docs(key, rev, doc, updated_at) VALUES(?,?,?,?)", (key, new_rev, payload, now))
        c.execute("INSERT INTO audit(key, rev, doc, created_at) VALUES(?,?,?,?)", (key, new_rev, payload, now))
        c.execute(
            "DELETE FROM audit WHERE key=? AND id NOT IN "
            "(SELECT id FROM audit WHERE key=? ORDER BY id DESC LIMIT ?)",
            (key, key, AUDIT_KEEP),
        )
        c.commit()
        return True, new_rev, None
    except Exception:
        c.rollback()
        raise


def force_put(key, doc):
    """Запись без проверки ревизии — для sendBeacon при закрытии вкладки."""
    cur_rev, _ = get(key)
    return put(key, cur_rev, doc)


def history(key, limit=30):
    rows = conn().execute(
        "SELECT rev, created_at, length(doc) AS size FROM audit WHERE key=? ORDER BY id DESC LIMIT ?",
        (key, limit),
    ).fetchall()
    return [dict(r) for r in rows]


def version(key, rev):
    row = conn().execute("SELECT doc FROM audit WHERE key=? AND rev=?", (key, rev)).fetchone()
    return json.loads(row["doc"]) if row else None


def stats():
    c = conn()
    out = {}
    for row in c.execute("SELECT key, rev, updated_at, length(doc) AS size FROM docs"):
        out[row["key"]] = {"rev": row["rev"], "updated_at": row["updated_at"], "size": row["size"]}
    return out
