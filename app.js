const SECIDS = [
  "RU000A108P79","RU000A10BBW8","RU000A1082Q4","RU000A10B7J8",
  "RU000A10C9Y2","RU000A10CRC4","RU000A1059Q2","RU000A10CMR3",
  "SU26233RMFS5","SU26235RMFS0","SU26238RMFS4","SU26243RMFS4",
  "SU26244RMFS2","SU26247RMFS5","SU26248RMFS3","SU26249RMFS1",
  "SU26252RMFS5","RU000A10DQB6","RU000A10DQA8"
];

const content = document.getElementById("content");
let bondsCache = [];

function parseDate(s) {
  return new Date(s + "T00:00:00");
}

async function loadAll() {
  const priceResp = await fetch(
    "https://iss.moex.com/iss/engines/stock/markets/bonds/securities.json"
  );
  const priceJson = await priceResp.json();
  const pCols = priceJson.marketdata.columns;
  const pData = priceJson.marketdata.data;

  const iSec = pCols.indexOf("SECID");
  const iLast = pCols.indexOf("LAST");

  const prices = {};
  pData.forEach(r => {
    if (SECIDS.includes(r[iSec]) && r[iLast] != null) {
      prices[r[iSec]] = r[iLast];
    }
  });

  const today = new Date();

  const results = [];

  for (const secid of SECIDS) {
    if (!prices[secid]) continue;

    const resp = await fetch(
      `https://iss.moex.com/iss/securities/${secid}/bondization.json`
    );
    const j = await resp.json();

    let face = null;
    let faceUnit = null;

    if (j.amortizations?.data?.length) {
      const c = j.amortizations.columns;
      const r = j.amortizations.data[0];
      face = r[c.indexOf("initialfacevalue")];
      faceUnit = r[c.indexOf("faceunit")];
    }

    const coupons = j.coupons?.data || [];
    const cc = j.coupons?.columns || [];
    const iDate = cc.indexOf("coupondate");
    const iVal = cc.indexOf("value");

    let nextCoupon = null;

    const future = coupons
      .map(r => ({
        date: r[iDate],
        value: r[iVal]
      }))
      .filter(r =>
        r.date &&
        r.value != null &&
        parseDate(r.date) >= today
      )
      .sort((a,b) =>
        parseDate(a.date) - parseDate(b.date)
      );

    if (future.length) nextCoupon = future[0];
    if (!nextCoupon) continue;

    results.push({
      secid,
      price: prices[secid],
      face,
      faceUnit,
      couponValue: nextCoupon.value,
      couponDate: nextCoupon.date
    });
  }

  bondsCache = results;
  showBonds();
}

function showBonds() {
  content.innerHTML = "";
  bondsCache.forEach(b => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <a class="bond-title"
         href="https://www.moex.com/ru/issue.aspx?code=${b.secid}"
         target="_blank">
        ${b.secid}
      </a>

      <div class="row"><span>Цена</span><b>${b.price}</b></div>
      <div class="row"><span>Купон</span><b>${b.couponValue}</b></div>
      <div class="row"><span>Следующий купон</span><b>${b.couponDate}</b></div>
      <div class="muted">Номинал: ${b.face} ${b.faceUnit}</div>
    `;

    content.appendChild(card);
  });
}

function showUpcoming() {
  content.innerHTML = "";
  const today = new Date();

  bondsCache
    .filter(b => {
      const d = parseDate(b.couponDate);
      const diff = (d - today) / 86400000;
      return diff >= 0 && diff <= 7;
    })
    .forEach(b => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <a class="bond-title"
           href="https://www.moex.com/ru/issue.aspx?code=${b.secid}"
           target="_blank">
          ${b.secid}
        </a>

        <div class="row">
          <span>Дата выплаты</span>
          <b>${b.couponDate}</b>
        </div>

        <div class="row">
          <span>Размер купона</span>
          <b>${b.couponValue}</b>
        </div>
      `;

      content.appendChild(card);
    });
}

loadAll();
