const BONDS = [
  "RU000A108P79","RU000A10BBW8","RU000A1082Q4","RU000A10B7J8",
  "RU000A10C9Y2","RU000A10CRC4","RU000A1059Q2","RU000A10CMR3",
  "SU26233RMFS5","SU26235RMFS0","SU26238RMFS4","SU26243RMFS4",
  "SU26244RMFS2","SU26247RMFS5","SU26248RMFS3","SU26249RMFS1",
  "SU26252RMFS5","RU000A10DQB6","RU000A10DQA8"
];

const content = document.getElementById("content");
const menu = document.getElementById("menu");
const title = document.getElementById("title");

document.getElementById("menuBtn").onclick = () => {
  menu.classList.toggle("hidden");
};

function showBonds() {
  title.textContent = "Облигации";
  menu.classList.add("hidden");
  loadBonds();
}

function showCoupons() {
  title.textContent = "Предстоящие купоны";
  menu.classList.add("hidden");
  loadCouponsView();
}

async function loadBonds() {
  content.innerHTML = "Загрузка...";
  const res = await fetch(
    "https://iss.moex.com/iss/engines/stock/markets/bonds/securities.json"
  );
  const json = await res.json();
  const rows = json.securities.data.filter(r => BONDS.includes(r[0]));

  content.innerHTML = "";
  for (const r of rows) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <strong>${r[2]}</strong>
      ISIN: ${r[0]}<br>
      Номинал: ${r[10]} ${r[11]}<br>
      Цена: ${r[3]}<br>
      Купон: ${r[18]}<br>
      Следующий купон: ${r[27]}
    `;
    content.appendChild(card);
  }
}

function getBuffer() {
  return JSON.parse(localStorage.getItem("couponBuffer") || "{}");
}

function saveBuffer(buf) {
  localStorage.setItem("couponBuffer", JSON.stringify(buf));
}

function inWindow(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  const diff = (d - today) / 86400000;
  return diff >= -7 && diff <= 7;
}

async function loadCouponsView() {
  content.innerHTML = "Загрузка...";
  const buffer = getBuffer();
  content.innerHTML = "";

  for (const secid of BONDS) {
    const res = await fetch(
      `https://iss.moex.com/iss/securities/${secid}/bondization.json`
    );
    const json = await res.json();
    const coupons = json.coupons.data;
    if (!coupons.length) continue;

    const last = coupons[coupons.length - 1];
    const date = last[3];
    const value = last[5];
    const qty = 1; // TODO: количество

    if (inWindow(date)) {
      buffer[secid] ??= {
        payout: value * qty,
        date
      };

      const card = document.createElement("div");
      card.className = "card payout";
      card.innerHTML = `
        ${secid}<br>
        Дата выплаты: ${buffer[secid].date}<br>
        Сумма: ${buffer[secid].payout}
      `;
      content.appendChild(card);
    }
  }
  saveBuffer(buffer);
}

showBonds();
