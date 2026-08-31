const {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback
} = React;

/* ---------- ПРОГРАММА (из WEEK.md) ---------- */
const ANCHOR = {
  delt: "Кабельный мах с опорой",
  lat: "Подтягивания средним хватом",
  chest: "Жим гантелей на наклоне 30°",
  legs: "Жим ногами"
};
const DAYS = [{
  id: "w0",
  short: "Н0",
  name: "Неделя 0",
  sub: "Калибровка — замер L0",
  cal: true,
  ex: [{
    n: "Жим гантелей на наклоне 30°",
    s: 1,
    r: "8 @ RIR 2",
    rir: "2",
    t: "3-0-1",
    rest: "180",
    note: "L0"
  }, {
    n: "Подтягивания средним хватом",
    s: 1,
    r: "8 @ RIR 2",
    rir: "2",
    t: "3-0-1",
    rest: "180",
    note: "L0"
  }, {
    n: "Верхняя тяга нейтральным хватом",
    s: 1,
    r: "10 @ RIR 2",
    rir: "2",
    t: "2-1-2",
    rest: "120",
    note: "L0"
  }, {
    n: "Пуловер на блоке",
    s: 1,
    r: "12 @ RIR 2",
    rir: "2",
    t: "3-0-2",
    rest: "90",
    note: "L0"
  }, {
    n: "Горизонтальная тяга сидя",
    s: 1,
    r: "10 @ RIR 2",
    rir: "2",
    t: "2-1-2",
    rest: "150",
    note: "L0"
  }, {
    n: "Кабельный мах с опорой",
    s: 1,
    r: "20 @ RIR 2",
    rir: "2",
    t: "2-1-2",
    rest: "60",
    note: "L0"
  }, {
    n: "Гантельный мах в плоскости лопатки",
    s: 1,
    r: "20 @ RIR 2",
    rir: "2",
    t: "2-0-2",
    rest: "75",
    note: "L0"
  }, {
    n: "Кроссовер за спиной",
    s: 1,
    r: "20 @ RIR 2",
    rir: "2",
    t: "2-0-2",
    rest: "60",
    note: "L0"
  }, {
    n: "Жим ногами",
    s: 1,
    r: "12 @ RIR 2",
    rir: "2",
    t: "2-0-1",
    rest: "180",
    note: "L0"
  }, {
    n: "Румынская тяга с гантелями",
    s: 1,
    r: "12 @ RIR 2",
    rir: "2",
    t: "3-1-1",
    rest: "150",
    note: "L0"
  }, {
    n: "Сгибания на бицепс",
    s: 1,
    r: "15 @ RIR 2",
    rir: "2",
    t: "3-0-1",
    rest: "75",
    note: "L0"
  }, {
    n: "Разгибания на трицепс на блоке",
    s: 1,
    r: "15 @ RIR 2",
    rir: "2",
    t: "2-0-2",
    rest: "75",
    note: "L0"
  }, {
    n: "Подъём на носки",
    s: 1,
    r: "15 @ RIR 2",
    rir: "2",
    t: "2-1-1",
    rest: "60",
    note: "L0"
  }, {
    n: "ВЫХОД СИЛОЙ — тест X (до отказа, на видео)",
    s: 1,
    r: "макс",
    rir: "0",
    t: "—",
    rest: "300",
    note: "фаза отказа!"
  }]
}, {
  id: "mon",
  short: "Пн",
  name: "Понедельник",
  sub: "Верх груди · дельты тяжёлые · трицепс",
  ex: [{
    n: "Жим гантелей на наклоне 30°",
    s: 4,
    r: "6–8",
    rir: "1–2",
    t: "3-0-1",
    rest: "180",
    grp: "Верх груди"
  }, {
    n: "Кроссовер снизу-вверх",
    s: 3,
    r: "10–12",
    rir: "1",
    t: "2-0-2",
    rest: "90",
    grp: "Верх груди"
  }, {
    n: "Гантельный мах в плоскости лопатки",
    s: 3,
    r: "12–15",
    rir: "2",
    t: "2-0-2",
    rest: "75",
    grp: "Ср. дельта"
  }, {
    n: "Кабельный мах с опорой",
    s: 2,
    r: "15–20",
    rir: "1 → 0–1",
    t: "2-1-2",
    rest: "60",
    grp: "Ср. дельта"
  }, {
    n: "Разгибания на трицепс на блоке",
    s: 3,
    r: "10–15",
    rir: "1",
    t: "2-0-2",
    rest: "75",
    grp: "Трицепс"
  }, {
    n: "Разгибание из-за головы на блоке",
    s: 2,
    r: "10–12",
    rir: "1",
    t: "3-0-1",
    rest: "75",
    grp: "Трицепс"
  }, {
    n: "Подъём на носки",
    s: 2,
    r: "12–15",
    rir: "1",
    t: "2-1-1",
    rest: "60",
    grp: "Икры"
  }]
}, {
  id: "tue",
  short: "Вт",
  name: "Вторник",
  sub: "Ширина спины · задняя дельта · бицепс",
  ex: [{
    n: "ВЫХОД СИЛОЙ — блок по ветке",
    s: 4,
    r: "по ветке",
    rir: "≥3",
    t: "—",
    rest: "180–300",
    grp: "Навык",
    first: true
  }, {
    n: "Подтягивания средним хватом",
    s: 3,
    r: "6–8",
    rir: "1–2",
    t: "3-0-1",
    rest: "180",
    grp: "Ширина"
  }, {
    n: "Верхняя тяга нейтральным хватом",
    s: 3,
    r: "8–12",
    rir: "1–2",
    t: "2-1-2",
    rest: "120",
    grp: "Ширина"
  }, {
    n: "Пуловер на блоке, наклон 30–45°",
    s: 3,
    r: "12–15",
    rir: "1",
    t: "3-0-2",
    rest: "90",
    grp: "Ширина"
  }, {
    n: "Задняя дельта на блоке",
    s: 3,
    r: "15–20",
    rir: "1",
    t: "2-1-2",
    rest: "60",
    grp: "Задн. дельта"
  }, {
    n: "Сгибания на бицепс",
    s: 3,
    r: "8–12",
    rir: "1",
    t: "3-0-1",
    rest: "75",
    grp: "Бицепс"
  }, {
    n: "Суставной блок",
    s: 6,
    r: "12–20",
    rir: "3",
    t: "—",
    rest: "45",
    grp: "Суставы"
  }]
}, {
  id: "wed",
  short: "Ср",
  name: "Среда",
  sub: "Ноги · дельты лёгкие · пресс A",
  ex: [{
    n: "Жим ногами",
    s: 4,
    r: "8–12",
    rir: "2",
    t: "2-0-1",
    rest: "180",
    grp: "Квадрицепс"
  }, {
    n: "Румынская тяга с гантелями",
    s: 3,
    r: "10–12",
    rir: "2",
    t: "3-1-1",
    rest: "150",
    grp: "Задн. цепь"
  }, {
    n: "Разгибания ног в тренажёре",
    s: 2,
    r: "12–15",
    rir: "1",
    t: "2-1-2",
    rest: "90",
    grp: "Квадрицепс"
  }, {
    n: "Нордические сгибания",
    s: 2,
    r: "4–6",
    rir: "—",
    t: "4-0-X",
    rest: "120",
    grp: "Задн. цепь"
  }, {
    n: "Кабельный мах с опорой",
    s: 4,
    r: "15–20",
    rir: "2",
    t: "2-0-2",
    rest: "60",
    grp: "Ср. дельта"
  }, {
    n: "Пресс A: подъём ног в висе",
    s: 3,
    r: "8–12",
    rir: "2",
    t: "2-0-2",
    rest: "60",
    grp: "Пресс"
  }, {
    n: "Пресс A: ролик из колен",
    s: 3,
    r: "8–12",
    rir: "2",
    t: "контроль",
    rest: "60",
    grp: "Пресс"
  }, {
    n: "Пресс A: дэд-баг",
    s: 2,
    r: "10/стор.",
    rir: "2",
    t: "2-0-2",
    rest: "45",
    grp: "Пресс"
  }]
}, {
  id: "thu",
  short: "Чт",
  name: "Четверг",
  sub: "Дельты тяжёлые · верх груди · задняя дельта",
  ex: [{
    n: "Кабельный мах с опорой",
    s: 3,
    r: "12–15",
    rir: "1–2",
    t: "2-1-2",
    rest: "90",
    grp: "Ср. дельта",
    first: true
  }, {
    n: "Кроссовер за спиной",
    s: 2,
    r: "15–20",
    rir: "1 → 0–1",
    t: "2-0-2",
    rest: "60",
    grp: "Ср. дельта"
  }, {
    n: "Жим штанги на наклоне 30°",
    s: 3,
    r: "8–10",
    rir: "1–2",
    t: "3-0-1",
    rest: "150",
    grp: "Верх груди"
  }, {
    n: "Разведения в наклоне лёжа",
    s: 3,
    r: "15–20",
    rir: "1",
    t: "2-1-2",
    rest: "60",
    grp: "Задн. дельта"
  }, {
    n: "Подъём на носки",
    s: 2,
    r: "12–15",
    rir: "1",
    t: "2-1-1",
    rest: "60",
    grp: "Икры"
  }]
}, {
  id: "fri",
  short: "Пт",
  name: "Пятница",
  sub: "Толщина спины · руки · пресс B",
  ex: [{
    n: "ВЫХОД СИЛОЙ — блок по ветке",
    s: 4,
    r: "по ветке",
    rir: "≥3",
    t: "—",
    rest: "180–300",
    grp: "Навык",
    first: true
  }, {
    n: "Горизонтальная тяга сидя",
    s: 4,
    r: "8–12",
    rir: "1–2",
    t: "2-1-2",
    rest: "150",
    grp: "Толщина"
  }, {
    n: "Тяга гантели в упоре грудью",
    s: 3,
    r: "8–12",
    rir: "1–2",
    t: "2-1-2",
    rest: "120",
    grp: "Толщина"
  }, {
    n: "Верхняя тяга широким хватом",
    s: 2,
    r: "10–12",
    rir: "1–2",
    t: "2-1-2",
    rest: "120",
    grp: "Ширина"
  }, {
    n: "Сгибания на бицепс (молот)",
    s: 3,
    r: "8–12",
    rir: "1",
    t: "3-0-1",
    rest: "75",
    grp: "Бицепс"
  }, {
    n: "Разгибания на трицепс на блоке",
    s: 3,
    r: "10–15",
    rir: "1",
    t: "2-0-2",
    rest: "75",
    grp: "Трицепс"
  }, {
    n: "Суставной блок",
    s: 6,
    r: "12–20",
    rir: "3",
    t: "—",
    rest: "45",
    grp: "Суставы"
  }, {
    n: "Пресс B: обратные скручивания",
    s: 3,
    r: "12–15",
    rir: "2",
    t: "2-0-2",
    rest: "60",
    grp: "Пресс"
  }, {
    n: "Пресс B: планка с блином",
    s: 3,
    r: "30–40 с",
    rir: "2",
    t: "—",
    rest: "60",
    grp: "Пресс"
  }, {
    n: "Пресс B: чемоданная переноска ≤10 кг",
    s: 2,
    r: "20 м/стор.",
    rir: "2",
    t: "—",
    rest: "60",
    grp: "Пресс"
  }]
}, {
  id: "sat",
  short: "Сб",
  name: "Суббота",
  sub: "Отдых · укеми 7 мин",
  rest: true,
  ex: []
}, {
  id: "sun",
  short: "Вс",
  name: "Воскресенье",
  sub: "Ходьба 30–40 мин · разбор недели",
  rest: true,
  ex: []
}];
const GIRTHS = [{
  k: "waistWho",
  label: "Талия (ВОЗ)"
}, {
  k: "waistNarrow",
  label: "Талия узкая"
}, {
  k: "shoulders",
  label: "Плечи"
}, {
  k: "deltL",
  label: "Дельта L"
}, {
  k: "deltR",
  label: "Дельта R"
}, {
  k: "chest",
  label: "Грудь под мышками"
}, {
  k: "armL",
  label: "Рука L"
}, {
  k: "armR",
  label: "Рука R"
}, {
  k: "thigh",
  label: "Бедро"
}];
const HOOPER = [{
  k: "sleep",
  l: "Сон"
}, {
  k: "fatigue",
  l: "Усталость"
}, {
  k: "doms",
  l: "Болезненность"
}, {
  k: "stress",
  l: "Стресс"
}];
const GIRTH_DAYS = [1, 3, 5, 0]; // Пн Ср Пт Вс

/* ---------- ХРАНИЛИЩЕ ---------- */
const KEY = "podval-log-v1";
function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch (e) {
    return {};
  }
}
function saveAll(d) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch (e) {}
  if (window.Sync) window.Sync.push(d);
}
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const ruDate = s => {
  const [y, m, dd] = s.split("-");
  return `${dd}.${m}`;
};

/* ---------- МЕЛКИЕ КОМПОНЕНТЫ ---------- */
function Stat({
  label,
  value,
  unit,
  tone
}) {
  const c = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--bad)" : "var(--ink)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 0",
      minWidth: 78
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 2
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "num",
    style: {
      fontSize: 21,
      fontWeight: 600,
      color: c,
      lineHeight: 1.15
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--faint)",
      marginLeft: 3,
      fontWeight: 500
    }
  }, unit)));
}
function SetChip({
  done,
  idx,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    className: "chip num",
    onClick: onClick,
    "aria-label": `Подход ${idx + 1}`,
    style: {
      minWidth: 38,
      height: 38,
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      border: `1px solid ${done ? "var(--accent)" : "var(--line)"}`,
      background: done ? "var(--accent)" : "var(--raised)",
      color: done ? "var(--accent-ink)" : "var(--faint)"
    }
  }, done ? `${done.w || "—"}×${done.r || "—"}` : idx + 1);
}

/* ---------- ГРАФИК (canvas) ---------- */
function Chart({
  series,
  label
}) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const cs = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue("--accent").trim() || "#2F6F7E";
    const line = cs.getPropertyValue("--line-soft").trim() || "#E6ECEF";
    const faint = cs.getPropertyValue("--faint").trim() || "#8595A1";
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth,
      h = 160;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const x = cv.getContext("2d");
    x.scale(dpr, dpr);
    x.clearRect(0, 0, w, h);
    const padL = 34,
      padR = 10,
      padT = 14,
      padB = 22;
    if (series.length < 1) {
      x.fillStyle = faint;
      x.font = '12px "IBM Plex Sans", sans-serif';
      x.textAlign = "center";
      x.fillText("Нет данных — залогируй хотя бы одну сессию", w / 2, h / 2);
      return;
    }
    const vals = series.map(p => p.v);
    let mn = Math.min(...vals),
      mx = Math.max(...vals);
    if (mn === mx) {
      mn = mn - 1;
      mx = mx + 1;
    }
    const pad = (mx - mn) * 0.15;
    mn -= pad;
    mx += pad;
    const X = i => series.length === 1 ? padL + (w - padL - padR) / 2 : padL + i * (w - padL - padR) / (series.length - 1);
    const Y = v => padT + (1 - (v - mn) / (mx - mn)) * (h - padT - padB);
    // сетка
    x.strokeStyle = line;
    x.lineWidth = 1;
    x.font = '10px "IBM Plex Mono", monospace';
    x.fillStyle = faint;
    x.textAlign = "right";
    for (let g = 0; g <= 3; g++) {
      const v = mn + (mx - mn) * g / 3,
        y = Math.round(Y(v)) + .5;
      x.beginPath();
      x.moveTo(padL, y);
      x.lineTo(w - padR, y);
      x.stroke();
      x.fillText(Math.round(v), padL - 6, y + 3);
    }
    if (series.length > 1) {
      // заливка
      const grad = x.createLinearGradient(0, padT, 0, h - padB);
      grad.addColorStop(0, accent + "44");
      grad.addColorStop(1, accent + "05");
      x.beginPath();
      x.moveTo(X(0), Y(series[0].v));
      series.forEach((p, i) => x.lineTo(X(i), Y(p.v)));
      x.lineTo(X(series.length - 1), h - padB);
      x.lineTo(X(0), h - padB);
      x.closePath();
      x.fillStyle = grad;
      x.fill();
      // линия
      x.beginPath();
      series.forEach((p, i) => i ? x.lineTo(X(i), Y(p.v)) : x.moveTo(X(i), Y(p.v)));
      x.strokeStyle = accent;
      x.lineWidth = 2;
      x.lineJoin = "round";
      x.stroke();
    }
    // точки
    series.forEach((p, i) => {
      const last = i === series.length - 1;
      x.beginPath();
      x.arc(X(i), Y(p.v), last ? 4.5 : 2.6, 0, 7);
      x.fillStyle = accent;
      x.fill();
      if (last) {
        x.beginPath();
        x.arc(X(i), Y(p.v), 8, 0, 7);
        x.strokeStyle = accent + "55";
        x.lineWidth = 2;
        x.stroke();
      }
    });
    // подписи дат
    x.fillStyle = faint;
    x.font = '10px "IBM Plex Mono", monospace';
    x.textAlign = "center";
    const step = Math.max(1, Math.ceil(series.length / 5));
    series.forEach((p, i) => {
      if (i % step === 0 || i === series.length - 1) x.fillText(ruDate(p.d), X(i), h - 6);
    });
  }, [series, label]);
  return /*#__PURE__*/React.createElement("canvas", {
    ref: ref,
    style: {
      width: "100%",
      height: 160,
      display: "block"
    },
    role: "img",
    "aria-label": `График: ${label}. Точек: ${series.length}`
  });
}

/* ---------- ПРИЛОЖЕНИЕ ---------- */
function App() {
  const [db, setDb] = useState(loadAll);
  const [date, setDate] = useState(() => iso(new Date()));
  const todayIdx = new Date(date + "T12:00:00").getDay();
  const guess = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][todayIdx];
  const [dayId, setDayId] = useState(guess);
  const [tab, setTab] = useState("train");
  const [open, setOpen] = useState(null);
  useEffect(() => {
    setDayId(["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(date + "T12:00:00").getDay()]);
  }, [date]);
  useEffect(() => {
    saveAll(db);
  }, [db]);
  const day = DAYS.find(d => d.id === dayId) || DAYS[1];
  const entry = db[date] || {};
  const sets = entry.sets && entry.sets[dayId] || {};
  const morning = entry.morning || {};
  const patch = useCallback(fn => setDb(prev => {
    const next = {
      ...prev
    };
    const e = {
      ...(next[date] || {})
    };
    fn(e);
    next[date] = e;
    return next;
  }), [date]);
  const setCell = (exName, i, val) => patch(e => {
    e.sets = {
      ...(e.sets || {})
    };
    e.sets[dayId] = {
      ...(e.sets[dayId] || {})
    };
    const arr = [...(e.sets[dayId][exName] || [])];
    arr[i] = val;
    e.sets[dayId][exName] = arr;
  });
  const setMorning = (k, v) => patch(e => {
    e.morning = {
      ...(e.morning || {}),
      [k]: v
    };
  });

  /* сводка дня */
  const planned = day.ex.reduce((a, x) => a + x.s, 0);
  const doneSets = day.ex.reduce((a, x) => a + (sets[x.n] || []).filter(Boolean).length, 0);
  const tonnage = day.ex.reduce((a, x) => a + (sets[x.n] || []).reduce((s, c) => s + (c && +c.w || 0) * (c && +c.r || 0), 0), 0);
  const pct = planned ? Math.round(doneSets / planned * 100) : 0;

  /* серия по якорю */
  const [anchor, setAnchor] = useState(ANCHOR.delt);
  const series = useMemo(() => {
    const out = [];
    Object.keys(db).sort().forEach(d => {
      const s = db[d].sets || {};
      Object.keys(s).forEach(di => {
        const arr = s[di][anchor];
        if (arr && arr.length) {
          const best = arr.filter(Boolean).reduce((m, c) => Math.max(m, (+c.w || 0) * (+c.r || 0)), 0);
          if (best > 0) out.push({
            d,
            v: best
          });
        }
      });
    });
    return out.slice(-14);
  }, [db, anchor]);

  /* ведомость сетов за 7 дней */
  const ledger = useMemo(() => {
    const g = {};
    const from = new Date(date + "T12:00:00");
    from.setDate(from.getDate() - 6);
    Object.keys(db).forEach(d => {
      if (d < iso(from) || d > date) return;
      const s = db[d].sets || {};
      Object.keys(s).forEach(di => {
        const dd = DAYS.find(x => x.id === di);
        if (!dd) return;
        dd.ex.forEach(x => {
          const c = (s[di][x.n] || []).filter(Boolean).length;
          if (c && x.grp) g[x.grp] = (g[x.grp] || 0) + c;
        });
      });
    });
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  }, [db, date]);
  const ledgerTotal = ledger.reduce((a, [, v]) => a + v, 0);
  const showGirth = GIRTH_DAYS.includes(new Date(date + "T12:00:00").getDay());
  const copyJson = () => {
    const t = JSON.stringify(db, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => alert("Журнал скопирован в буфер"), () => alert("Не удалось скопировать"));else alert("Буфер недоступен в этом браузере");
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      paddingTop: 20,
      paddingBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 27,
      letterSpacing: ".005em"
    }
  }, "Журнал подвала"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const r = document.documentElement;
      const cur = r.getAttribute("data-theme");
      const dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      r.setAttribute("data-theme", dark ? "light" : "dark");
    },
    className: "eyebrow",
    style: {
      border: "1px solid var(--line)",
      borderRadius: 6,
      padding: "5px 8px"
    }
  }, "тема")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      color: "var(--muted)",
      fontSize: 13
    }
  }, "Прогрессия читается по якорным движениям, не по ощущениям. Дневная цифра — шум.")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 12,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value),
    style: {
      flex: "1 1 auto"
    },
    "aria-label": "Дата"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDate(iso(new Date())),
    className: "eyebrow",
    style: {
      border: "1px solid var(--line)",
      borderRadius: 7,
      padding: "8px 10px",
      whiteSpace: "nowrap"
    }
  }, "сегодня")), /*#__PURE__*/React.createElement("div", {
    className: "scroll-x",
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      paddingBottom: 2
    }
  }, DAYS.map(d => /*#__PURE__*/React.createElement("button", {
    key: d.id,
    onClick: () => setDayId(d.id),
    className: "disp",
    style: {
      padding: "7px 13px",
      borderRadius: 7,
      fontSize: 15,
      whiteSpace: "nowrap",
      border: `1px solid ${dayId === d.id ? "var(--accent)" : "var(--line)"}`,
      background: dayId === d.id ? "var(--accent)" : "transparent",
      color: dayId === d.id ? "var(--accent-ink)" : "var(--muted)"
    }
  }, d.short))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 20
    }
  }, day.name), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--muted)",
      fontSize: 12.5,
      marginTop: 1
    }
  }, day.sub)), planned > 0 && /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontSize: 12,
      fontWeight: 600,
      padding: "3px 8px",
      borderRadius: 99,
      background: pct >= 100 ? "var(--ok-wash)" : pct > 0 ? "var(--warn-wash)" : "var(--raised)",
      color: pct >= 100 ? "var(--ok)" : pct > 0 ? "var(--warn)" : "var(--faint)"
    }
  }, pct, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Сеты",
    value: `${doneSets}/${planned}`,
    unit: "",
    tone: pct >= 100 ? "ok" : undefined
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Тоннаж",
    value: tonnage.toLocaleString("ru-RU"),
    unit: "кг"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Вес утром",
    value: morning.weight || "—",
    unit: "кг"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Пульс",
    value: morning.hr || "—",
    unit: "уд"
  })), planned > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      height: 5,
      background: "var(--line-soft)",
      borderRadius: 99,
      marginTop: 12,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: `${Math.min(100, pct)}%`,
      background: "var(--accent)",
      borderRadius: 99
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 10
    }
  }, [["train", "Тренировка"], ["morning", "Утро"], ["chart", "Прогресс"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTab(k),
    className: "disp",
    style: {
      flex: 1,
      padding: "9px 6px",
      borderRadius: 8,
      fontSize: 15,
      border: `1px solid ${tab === k ? "var(--accent)" : "var(--line)"}`,
      background: tab === k ? "var(--accent-wash)" : "var(--card)",
      color: tab === k ? "var(--accent)" : "var(--muted)"
    }
  }, l))), tab === "train" && (day.rest ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 18,
      textAlign: "center",
      color: "var(--muted)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "disp",
    style: {
      fontSize: 19,
      color: "var(--ink)"
    }
  }, "Полный отдых"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      fontSize: 13.5
    }
  }, day.sub)) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, day.ex.map((x, xi) => {
    const arr = sets[x.n] || [];
    const isOpen = open === x.n;
    const filled = arr.filter(Boolean).length;
    return /*#__PURE__*/React.createElement("div", {
      key: xi,
      className: "card",
      style: {
        padding: "12px 13px",
        borderColor: x.first ? "var(--accent)" : "var(--line)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, x.grp && /*#__PURE__*/React.createElement("div", {
      className: "eyebrow",
      style: {
        marginBottom: 2
      }
    }, x.grp, x.first ? " · первым" : ""), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14.5,
        lineHeight: 1.3
      }
    }, x.n)), /*#__PURE__*/React.createElement("span", {
      className: "num",
      style: {
        fontSize: 12,
        color: filled >= x.s ? "var(--ok)" : "var(--faint)",
        whiteSpace: "nowrap"
      }
    }, filled, "/", x.s)), /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 11.5,
        color: "var(--muted)",
        marginTop: 5,
        letterSpacing: ".01em"
      }
    }, x.s, "×", x.r, " · RIR ", x.rir, " · темп ", x.t, " · отдых ", x.rest, x.note ? ` · ${x.note}` : ""), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginTop: 9,
        flexWrap: "wrap"
      }
    }, Array.from({
      length: x.s
    }).map((_, i) => /*#__PURE__*/React.createElement(SetChip, {
      key: i,
      idx: i,
      done: arr[i],
      onClick: () => setOpen(isOpen && open === x.n ? null : x.n)
    }))), isOpen && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid var(--line-soft)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(132px,1fr))",
        gap: 8
      }
    }, Array.from({
      length: x.s
    }).map((_, i) => /*#__PURE__*/React.createElement("div", {
      key: i
    }, /*#__PURE__*/React.createElement("div", {
      className: "eyebrow",
      style: {
        marginBottom: 3
      }
    }, "подход ", i + 1), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      inputMode: "decimal",
      placeholder: "кг",
      value: arr[i] && arr[i].w || "",
      onChange: e => setCell(x.n, i, {
        ...(arr[i] || {}),
        w: e.target.value
      }),
      "aria-label": `Вес, подход ${i + 1}`
    }), /*#__PURE__*/React.createElement("input", {
      type: "number",
      inputMode: "numeric",
      placeholder: "повт",
      value: arr[i] && arr[i].r || "",
      onChange: e => setCell(x.n, i, {
        ...(arr[i] || {}),
        r: e.target.value
      }),
      "aria-label": `Повторы, подход ${i + 1}`
    })))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(null),
      className: "eyebrow",
      style: {
        border: "1px solid var(--line)",
        borderRadius: 7,
        padding: "9px",
        alignSelf: "end"
      }
    }, "свернуть")));
  }))), tab === "morning" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 9
    }
  }, "Ежедневно · натощак, после туалета"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 3
    }
  }, "вес, кг"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    step: "0.1",
    value: morning.weight || "",
    onChange: e => setMorning("weight", e.target.value),
    "aria-label": "Вес натощак"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 3
    }
  }, "пульс лёжа"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    value: morning.hr || "",
    onChange: e => setMorning("hr", e.target.value),
    "aria-label": "Пульс покоя"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "14px 0 7px"
    }
  }, "Опросник Хупера · 1–5, сумма 4–20"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7
    }
  }, HOOPER.map(h => /*#__PURE__*/React.createElement("div", {
    key: h.k,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--muted)",
      width: 104,
      flexShrink: 0
    }
  }, h.l), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5
    }
  }, [1, 2, 3, 4, 5].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setMorning(h.k, v),
    className: "num",
    "aria-label": `${h.l}: ${v}`,
    style: {
      width: 33,
      height: 33,
      borderRadius: 7,
      fontSize: 13,
      border: `1px solid ${morning[h.k] === v ? "var(--accent)" : "var(--line)"}`,
      background: morning[h.k] === v ? "var(--accent)" : "var(--raised)",
      color: morning[h.k] === v ? "var(--accent-ink)" : "var(--faint)"
    }
  }, v)))))), (() => {
    const s = HOOPER.reduce((a, h) => a + (+morning[h.k] || 0), 0);
    return s > 0 ? /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        marginTop: 9,
        fontSize: 12.5,
        color: s >= 14 ? "var(--warn)" : "var(--muted)"
      }
    }, "сумма ", s, "/20 ", s >= 14 ? "— проверь порог: база +4 два дня подряд = −20 % сетов на 3 дня" : "") : null;
  })()), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 3
    }
  }, "Обхваты · только Пн / Ср / Пт / Вс"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 10px",
      fontSize: 12.5,
      color: "var(--muted)"
    }
  }, "Конец спокойного выдоха. Не втягивать. 3 замера, разброс ≤0,3 см → медиана."), showGirth ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
      gap: 9
    }
  }, GIRTHS.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.k
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 3
    }
  }, g.label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    step: "0.1",
    placeholder: "см",
    value: morning.girth && morning.girth[g.k] || "",
    onChange: e => patch(en => {
      en.morning = {
        ...(en.morning || {})
      };
      en.morning.girth = {
        ...(en.morning.girth || {}),
        [g.k]: e.target.value
      };
    }),
    "aria-label": g.label
  })))) : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 0",
      fontSize: 13,
      color: "var(--faint)"
    }
  }, "Сегодня обхваты не меряются. Взвешивание всё равно делается — каскад развязан."))), tab === "chart" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 8
    }
  }, "Якорное движение · лучший сет (вес × повторы)"), /*#__PURE__*/React.createElement("select", {
    value: anchor,
    onChange: e => setAnchor(e.target.value),
    "aria-label": "Якорное движение",
    style: {
      marginBottom: 10,
      fontFamily: '"IBM Plex Sans", sans-serif'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ANCHOR.delt
  }, "Средние дельты — ", ANCHOR.delt), /*#__PURE__*/React.createElement("option", {
    value: ANCHOR.lat
  }, "Широчайшие — ", ANCHOR.lat), /*#__PURE__*/React.createElement("option", {
    value: ANCHOR.chest
  }, "Верх груди — ", ANCHOR.chest), /*#__PURE__*/React.createElement("option", {
    value: ANCHOR.legs
  }, "Ноги — ", ANCHOR.legs)), /*#__PURE__*/React.createElement(Chart, {
    series: series,
    label: anchor
  }), series.length >= 2 && (() => {
    const d = (series[series.length - 1].v / series[0].v - 1) * 100;
    return /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 12.5,
        marginTop: 6,
        color: d >= 5 ? "var(--ok)" : d > 0 ? "var(--muted)" : "var(--warn)"
      }
    }, d >= 0 ? "+" : "", d.toFixed(1), " % за ", series.length, " сессий · порог месяца 1 — не менее +5 %");
  })()), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 9
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Ведомость сетов · 7 дней"), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: ledgerTotal > 100 ? "var(--bad)" : ledgerTotal > 90 ? "var(--warn)" : "var(--ok)"
    }
  }, ledgerTotal, " / 100")), ledger.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, ledger.map(([g, v]) => /*#__PURE__*/React.createElement("div", {
    key: g,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      width: 104,
      flexShrink: 0,
      color: "var(--muted)"
    }
  }, g), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 7,
      background: "var(--line-soft)",
      borderRadius: 99,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: `${Math.min(100, v / 20 * 100)}%`,
      background: "var(--accent)",
      borderRadius: 99
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontSize: 12.5,
      width: 22,
      textAlign: "right"
    }
  }, v)))) : /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--faint)",
      padding: "8px 0"
    }
  }, "Пока пусто."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "11px 0 0",
      fontSize: 12,
      color: "var(--faint)"
    }
  }, "Потолок 100 сетов в неделю на недели 1–4. Превышение вычитается на следующей.")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 8
    }
  }, "Журнал"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: copyJson,
    style: {
      border: "1px solid var(--accent)",
      background: "var(--accent-wash)",
      color: "var(--accent)",
      borderRadius: 7,
      padding: "9px 13px",
      fontSize: 13.5,
      fontWeight: 600
    }
  }, "Скопировать JSON"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("Стереть весь журнал? Это необратимо.")) {
        setDb({});
      }
    },
    style: {
      border: "1px solid var(--line)",
      color: "var(--bad)",
      borderRadius: 7,
      padding: "9px 13px",
      fontSize: 13.5
    }
  }, "Очистить")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "10px 0 0",
      fontSize: 12,
      color: "var(--faint)"
    }
  }, "Дней в журнале: ", /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, Object.keys(db).length), ". Данные хранятся в этом браузере и никуда не отправляются."))), /*#__PURE__*/React.createElement("footer", {
    style: {
      marginTop: 22,
      paddingTop: 14,
      borderTop: "1px solid var(--line-soft)",
      fontSize: 12,
      color: "var(--faint)"
    }
  }, "Записал — закрыл. График смотрится один раз в неделю, в воскресенье."));
}
function start() {
  ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
}
/* Сначала подтягиваем и сливаем серверную копию, потом рисуем — иначе
   первый же save() отправил бы на сервер пустой документ. Если сети нет,
   стартуем на локальных данных. */
if (window.Sync) window.Sync.boot().then(start, start);else start();
