const SECIDS = [
  "RU000A108P79","RU000A10BBW8","RU000A1082Q4","RU000A10B7J8",
  "RU000A10C9Y2","RU000A10CRC4","RU000A1059Q2","RU000A10CMR3",
  "SU26233RMFS5","SU26235RMFS0","SU26238RMFS4","SU26243RMFS4",
  "SU26244RMFS2","SU26247RMFS5","SU26248RMFS3","SU26249RMFS1",
  "SU26252RMFS5","RU000A10DQB6","RU000A10DQA8"
];

const content = document.getElementById("content");
const title = document.getElementById("title");
const menu = document.getElementById("menu");

document.getElementById("menuBtn").onclick = () =>
  menu.classList.toggle("hidden");

/* ================= UTIL ================= */

const today = new Date();

const parseDate = d => new Date(d + "T00:00:00");

const daysDiff = d =>
  (parseDate(d) - today) / 86400000;

/* ================= PRICE ================= */

async function loadPrices() {
  const r = await fetch(
    "https://iss.moex.com/iss/engines/stock/markets/bonds/securities.json"
  );
  const j = await r.json();

  const cols = j.marketdata.columns;
  const data = j.marketdata.data;

  const iSECID = cols.indexOf("SECID");
  const iLAST = cols.indexOf("LAST");

  const map = {};

  for (const row of data) {
    const secid = row[iSECID];
    const last = row[iLAST];
    if (!SECIDS.includes(secid) || last == null) continue;
    map[secid] = Math.max(map[secid] ?? 0, last);
  }

  return map;
}

/* ================= COUPON + FACE ================= */

async function loadBondData(secid) {
  const r = await fetch(
    `https://iss.moex.com/iss/securities/${secid}/bondization.json`
  );
  const j = await r.json();

  /* ---------- FACE ---------- */
  let face = null;
  let faceUnit = null;

  const amort = j.amortizations?.data ?? [];
  const coupons = j.coupons?.data ?? [];

  const faceRow =
    amort.length ? amort[0] :
    coupons.length ? coupons[0] : null;

  if (faceRow) {
    const cols = amort.length
      ? j.amortizations.columns
      : j.coupons.columns;

    face = faceRow[cols.indexOf("initialfacevalue")];
    faceUnit = faceRow[cols.indexOf("faceunit")];
  }

  /* ---------- NEXT COUPON ---------- */
  let nextCoupon = null;

  if (coupons.length) {
    const cols = j.coupons.columns;
    const iDate = cols.indexOf("coupondate");
    const iVal = cols.indexOf("value");

    const future = coupons
      .map(r => ({
        date: r[iDate],
        value: r[iVal]
      }))
      .filter(r => parseDate(r.date) >= today)
      .sort((a,b) => parseDate(a.date) - parseDate(b.date));

    if (future.length) nextCoupon = future[0];
  }

  return { face, faceUnit, nextCoupon };
}

/* ================= UI ================= */

async function showBonds() {
  title.textContent = "Облигации";
  menu.classList.add("hidden");
  content.innerHTML = "Загрузка…";

  const prices = await loadPrices();
  content.innerHTML = "";

  for (const secid of SECIDS) {
    const { face, faceUnit, nextCoupon } =
      await loadBondData(secid);

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <strong>${secid}</strong>
      Номинал: ${face ?? "—"} ${faceUnit ?? ""}<br>
      Цена: ${prices[secid] ?? "—"}<br>
      Купон: ${nextCoupon?.value ?? "—"}<br>
      Следующий купон: ${nextCoupon?.date ?? "—"}
    `;

    content.appendChild(card);
  }
}

async function showCoupons() {
  title.textContent = "Предстоящие купоны";
  menu.classList.add("hidden");
  content.innerHTML = "";

  for (const secid of SECIDS) {
    const { nextCoupon } = await loadBondData(secid);
    if (!nextCoupon) continue;

    const d = daysDiff(nextCoupon.date);
    if (d < -7 || d > 7) continue;

    const card = document.createElement("div");
    card.className = "card payout";
    card.innerHTML = `
      <strong>${secid}</strong>
      Дата: ${nextCoupon.date}<br>
      Купон: ${nextCoupon.value}
    `;
    content.appendChild(card);
  }
}

showBonds();
