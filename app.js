const tg = window.Telegram.WebApp;
tg.expand();

const ISINS = [
    "RU000A108P79", "RU000A10BBW8", "RU000A1082Q4", "RU000A10B7J8", 
    "RU000A10C9Y2", "RU000A10CRC4", "RU000A1059Q2", "RU000A10CMR3", 
    "SU26233RMFS5", "SU26235RMFS0", "SU26238RMFS4", "SU26243RMFS4", 
    "SU26244RMFS2", "SU26247RMFS5", "SU26248RMFS3", "SU26249RMFS1", 
    "SU26252RMFS5", "RU000A10DQB6", "RU000A10DQA8"
];

let bondData = [];
let userQuantities = JSON.parse(localStorage.getItem('bondQuantities') || '{}');
let currentPage = 'bonds';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('menuBtn').addEventListener('click', toggleMenu);
    loadAllData();
});

function toggleMenu() {
    const menu = document.getElementById('menu');
    menu.classList.toggle('hidden');
}

async function loadAllData() {
    showLoader();
    try {
        const promises = ISINS.map(isin => fetchBondInfo(isin));
        bondData = await Promise.all(promises);
        renderPage();
    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById('content').innerHTML = `<div class="empty-state">Ошибка загрузки данных. Пожалуйста, попробуйте позже.</div>`;
    }
}

async function fetchBondInfo(isin) {
    try {
        // Fetch security description and current market data
        // We use the 'securities' endpoint to get the name and basic info
        const descUrl = `https://iss.moex.com/iss/securities/${isin}.json`;
        const descRes = await fetch(descUrl);
        const descJson = await descRes.json();
        
        const description = descJson.description.data;
        const getName = (id) => description.find(row => row[0] === id)?.[2] || isin;
        
        const name = getName('NAME');
        const faceValue = getName('FACEVALUE');
        const currency = getName('FACEUNIT') || 'RUB';
        
        // Fetch market data for price and coupon info
        // TQCB is for corporate bonds, TQOB for government bonds (OFZ)
        const board = isin.startsWith('SU') ? 'TQOB' : 'TQCB';
        const marketUrl = `https://iss.moex.com/iss/engines/stock/markets/bonds/boards/${board}/securities/${isin}.json`;
        const marketRes = await fetch(marketUrl);
        const marketJson = await marketRes.json();
        
        const securitiesData = marketJson.securities.data[0];
        const securitiesCols = marketJson.securities.columns;
        const marketData = marketJson.marketdata.data[0];
        const marketCols = marketJson.marketdata.columns;
        
        const getVal = (data, cols, name) => data[cols.indexOf(name)];
        
        const lastPrice = getVal(marketData, marketCols, 'LAST') || getVal(securitiesData, securitiesCols, 'PREVPRICE');
        const nextCouponDate = getVal(securitiesData, securitiesCols, 'NEXTCOUPON');
        const couponValue = getVal(securitiesData, securitiesCols, 'COUPONVALUE');

        return {
            isin,
            name,
            faceValue,
            currency,
            price: lastPrice,
            coupon: couponValue,
            nextCoupon: nextCouponDate,
            board
        };
    } catch (e) {
        console.error(`Error fetching ${isin}:`, e);
        return { isin, name: isin, error: true };
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function showBonds() {
    currentPage = 'bonds';
    document.getElementById('title').innerText = 'Облигации';
    toggleMenu();
    renderPage();
}

function showCoupons() {
    currentPage = 'coupons';
    document.getElementById('title').innerText = 'Предстоящие купоны';
    toggleMenu();
    renderPage();
}

function showLoader() {
    document.getElementById('content').innerHTML = `
        <div class="loader-container">
            <div class="loader"></div>
            <p>Загрузка данных с Мосбиржи...</p>
        </div>`;
}

function updateQuantity(isin) {
    const current = userQuantities[isin] || 0;
    const newVal = prompt(`Введите количество облигаций для ${isin}:`, current);
    if (newVal !== null) {
        const num = parseInt(newVal);
        if (!isNaN(num) && num >= 0) {
            userQuantities[isin] = num;
            localStorage.setItem('bondQuantities', JSON.stringify(userQuantities));
            renderPage();
        } else {
            alert("Пожалуйста, введите корректное число.");
        }
    }
}

function renderPage() {
    const container = document.getElementById('content');
    container.innerHTML = '';

    if (currentPage === 'bonds') {
        bondData.forEach(bond => {
            const qty = userQuantities[bond.isin] || 0;
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-header">
                    <a href="https://www.moex.com/ru/issue.aspx?board=${bond.board}&code=${bond.isin}" target="_blank" class="bond-link">${bond.name}</a>
                    <span class="isin">${bond.isin}</span>
                </div>
                <div class="card-body">
                    <div class="info-item">
                        <span class="label">Номинал</span>
                        <span class="value">${bond.faceValue || '—'} ${bond.currency}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Цена</span>
                        <span class="value">${bond.price || '—'}%</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Купон</span>
                        <span class="value">${bond.coupon || '—'} ${bond.currency}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">След. купон</span>
                        <span class="value">${formatDate(bond.nextCoupon)}</span>
                    </div>
                </div>
                <div class="quantity-section">
                    <div>
                        <span class="label">В портфеле:</span>
                        <span class="value">${qty} шт.</span>
                    </div>
                    <button class="edit-btn" onclick="updateQuantity('${bond.isin}')">Изменить</button>
                </div>
            `;
            container.appendChild(card);
        });
    } else {
        // Upcoming coupons logic
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const upcoming = bondData.filter(bond => {
            if (!bond.nextCoupon) return false;
            const couponDate = new Date(bond.nextCoupon);
            const diffTime = couponDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Logic: 7 days before and 7 days after
            return diffDays >= -7 && diffDays <= 7;
        });

        if (upcoming.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет ближайших выплат (±7 дней от сегодня)</div>';
        } else {
            upcoming.forEach(bond => {
                const qty = userQuantities[bond.isin] || 0;
                const totalPayout = (bond.coupon * qty).toFixed(2);
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div class="card-header">
                        <a href="https://www.moex.com/ru/issue.aspx?board=${bond.board}&code=${bond.isin}" target="_blank" class="bond-link">${bond.name}</a>
                        <span class="isin">${bond.isin}</span>
                    </div>
                    <div class="card-body">
                        <div class="info-item">
                            <span class="label">Дата выплаты</span>
                            <span class="value">${formatDate(bond.nextCoupon)}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Купон на 1 шт.</span>
                            <span class="value">${bond.coupon} ${bond.currency}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Количество</span>
                            <span class="value">${qty} шт.</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Сумма выплаты</span>
                            <span class="value payout">${totalPayout} ${bond.currency}</span>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    }
}
