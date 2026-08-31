/* Слой синхронизации: localStorage остаётся источником правды в рантайме,
   сервер — местом, где всё переживает смену браузера и устройства.
   Приложение продолжает работать без сети: записи копятся локально
   и уезжают на сервер, когда связь появится. Для подвального зала это
   не роскошь, а условие работы. */
(function () {
  "use strict";
  var CFG = window.SYNC_CONFIG || {};
  var DOC = CFG.docKey;              // 'nutrition' | 'tracker'
  var LS  = CFG.lsKey;               // ключ в localStorage
  var BASE = LS + "__base";          // последний снимок, синхронный с сервером
  var REV  = LS + "__rev";
  var PUSH_DEBOUNCE = 900;

  var rev = 0, timer = null, dirty = false, inflight = false;
  var listeners = [];

  /* ---------- утилиты ---------- */
  function readLS(k, fb) { try { return JSON.parse(localStorage.getItem(k)) || fb; } catch (e) { return fb; } }
  function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function stripTs(o) { if (!o || typeof o !== "object") return o; var c = {}; for (var k in o) if (k !== "_ts") c[k] = o[k]; return c; }
  function same(a, b) { return JSON.stringify(stripTs(a)) === JSON.stringify(stripTs(b)); }

  /* Два приложения хранят дни по-разному: у питания они лежат в поле days,
     у журнала тренировок — прямо в корне объекта. daysPath описывает форму,
     всё остальное слияние работает одинаково. */
  var PATH = CFG.daysPath || null;
  function days(o) { return (PATH ? (o || {})[PATH] : o) || {}; }

  /* Метка времени ставится только тем дням, что реально изменились
     с прошлой синхронизации. Без неё слияние не сможет решить,
     чья версия дня новее. */
  function stamp(next) {
    if (!next) return next;
    var base = readLS(BASE, {}), now = Date.now();
    var D = days(next), B = days(base);
    for (var d in D) {
      if (!D[d] || typeof D[d] !== "object") continue;
      if (!B[d] || !same(D[d], B[d])) D[d]._ts = now;
      else if (B[d]._ts) D[d]._ts = B[d]._ts;
    }
    if (PATH && next.settings) {
      if (!base.settings || !same(next.settings, base.settings)) next.settings._ts = now;
      else if (base.settings._ts) next.settings._ts = base.settings._ts;
    }
    return next;
  }

  /* Слияние по дням: день независим от других, поэтому конфликт решается
     на уровне дня, а не всего документа. Ни один день не теряется —
     берётся тот, что изменён позже. */
  function merge(local, remote) {
    local = local || {}; remote = remote || {};
    var L = days(local), R = days(remote), out = {}, keys = {}, k;
    for (k in L) keys[k] = 1;
    for (k in R) keys[k] = 1;
    for (k in keys) {
      var a = L[k], b = R[k];
      if (!a) out[k] = b;
      else if (!b) out[k] = a;
      else out[k] = (a._ts || 0) >= (b._ts || 0) ? a : b;
    }
    if (!PATH) return out;

    var res = {};
    res[PATH] = out;
    var ls = local.settings || {}, rs = remote.settings || {};
    res.settings = (ls._ts || 0) >= (rs._ts || 0) ? ls : rs;
    if (!Object.keys(res.settings).length) res.settings = Object.keys(ls).length ? ls : rs;
    var seen = {}; res.custom = [];
    (local.custom || []).concat(remote.custom || []).forEach(function (c) {
      var id = (c && (c.n + "|" + (c.u || ""))) || JSON.stringify(c);
      if (!seen[id]) { seen[id] = 1; res.custom.push(c); }
    });
    return res;
  }

  /* ---------- индикатор ---------- */
  var pill;
  function ui(state, text) {
    if (!pill) {
      pill = document.createElement("div");
      pill.setAttribute("role", "status");
      pill.style.cssText =
        "position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:9999;" +
        "font:600 12px/1 'IBM Plex Sans',system-ui,sans-serif;letter-spacing:.02em;" +
        "padding:8px 14px;border-radius:99px;pointer-events:none;" +
        "transition:opacity .25s ease;opacity:0;box-shadow:0 2px 12px rgba(0,0,0,.14)";
      document.body.appendChild(pill);
    }
    var c = { ok: ["#1E7A44", "#DCF0E4"], sync: ["#2B4A8C", "#E2E9F8"],
              off: ["#8A6414", "#F7EEDA"], err: ["#96332A", "#F8E3E0"] }[state] || ["#555", "#eee"];
    pill.style.color = c[0]; pill.style.background = c[1];
    pill.textContent = text;
    pill.style.opacity = "1";
    clearTimeout(pill._t);
    if (state === "ok") pill._t = setTimeout(function () { pill.style.opacity = "0"; }, 1400);
    listeners.forEach(function (f) { try { f(state, text); } catch (e) {} });
  }

  /* ---------- сеть ---------- */
  function api(method, body) {
    return fetch("/api/doc/" + DOC, {
      method: method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (r.status === 401) { location.href = "/login?next=" + encodeURIComponent(location.pathname); throw new Error("401"); }
      return r.json().then(function (j) { return { status: r.status, body: j }; });
    });
  }

  function flush() {
    if (inflight || !dirty) return Promise.resolve();
    inflight = true;
    var local = stamp(readLS(LS, {}));
    writeLS(LS, local);
    ui("sync", "сохраняю");
    return api("PUT", { rev: rev, doc: local }).then(function (r) {
      if (r.status === 409) {
        // Кто-то писал с другого устройства. Сливаем по дням и повторяем один раз.
        var merged = merge(local, r.body.doc);
        writeLS(LS, merged);
        rev = r.body.rev;
        return api("PUT", { rev: rev, doc: merged }).then(function (r2) {
          if (r2.status === 200) {
            rev = r2.body.rev; writeLS(REV, rev); writeLS(BASE, merged); dirty = false;
            ui("ok", "слито с другим устройством");
            if (typeof CFG.onRemoteChange === "function") CFG.onRemoteChange(merged);
          }
        });
      }
      if (r.status === 200) {
        rev = r.body.rev; writeLS(REV, rev); writeLS(BASE, local); dirty = false;
        ui("ok", "сохранено");
      }
    }).catch(function (e) {
      if (String(e.message) !== "401") ui("off", "нет сети — сохранено локально");
    }).then(function () {
      inflight = false;
      if (dirty) { clearTimeout(timer); timer = setTimeout(flush, PUSH_DEBOUNCE); }
    });
  }

  /* ---------- публичный интерфейс ---------- */
  window.Sync = {
    boot: function () {
      rev = readLS(REV, 0) || 0;
      return api("GET").then(function (r) {
        var remote = r.body.doc || {};
        var local = readLS(LS, null);
        var merged = local ? merge(stamp(local), remote) : remote;
        writeLS(LS, merged);
        writeLS(BASE, merged);
        rev = r.body.rev; writeLS(REV, rev);
        // Если локальные данные оказались новее — сразу отправляем обратно.
        if (local && JSON.stringify(merged) !== JSON.stringify(remote)) { dirty = true; flush(); }
        ui("ok", "синхронизировано");
      }).catch(function (e) {
        if (String(e.message) !== "401") ui("off", "офлайн — работаю локально");
      });
    },
    push: function (obj) {
      if (obj) writeLS(LS, obj);
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(flush, PUSH_DEBOUNCE);
    },
    onStatus: function (cb) { listeners.push(cb); },
    _merge: merge, _stamp: stamp   // открыты для тестов и отладки
  };

  window.addEventListener("online", function () { if (dirty) flush(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && dirty) flush(); });
  window.addEventListener("beforeunload", function () {
    if (!dirty) return;
    try {
      var blob = new Blob([JSON.stringify({ rev: rev, doc: readLS(LS, {}) })], { type: "application/json" });
      navigator.sendBeacon("/api/doc/" + DOC + "/beacon", blob);
    } catch (e) {}
  });
})();
