const grid = document.getElementById("grid");
const q = document.getElementById("q");
const groupSel = document.getElementById("group");
const colsSel = document.getElementById("cols");

const users = [
  { username: "Faris", password: "1234", name: "Faris", showMpcInCart: true },
  { username: "Arnel", password: "111", name: "Arnel Škiljo", showMpcInCart: false },
  { username: "Muris", password: "321", name: "Muris Bekrić", showMpcInCart: false },
  { username: "Edin", password: "123", name: "Edin Zukanović", showMpcInCart: false },
  { username: "Samir", password: "1", name: "Samir Salkanović", showMpcInCart: true }
];

const DISCOUNT_21_CODES = new Set([
  "26"
]);

const DISCOUNT_18_5_CODES = new Set([
  "27", "36", "42", "J27", "J36", "J42"
]);

const DISCOUNT_18_CODES = new Set([
  "28", "29", "30", "31", "32", "34", "35",
  "37", "43", "44", "45", "47",
  "J28", "J29", "J30", "J31", "J32", "J34", "J35",
  "J44", "J47"
]);

const DISCOUNT_15_CODES = new Set([
  "17", "59", "46", "26P", "38"
]);

const DISCOUNT_0_CODES = new Set([
  "55", "67", "52B", "52BK", "21B", "21VB",
  "98", "00226", "39", "01272", "00735", "02134",
  "22B", "02", "12", "23", "13", "25"
]);

function getDiscountRate(sifra) {
  const code = String(sifra).trim().toUpperCase();

  if (DISCOUNT_0_CODES.has(code)) return 0;
  if (DISCOUNT_21_CODES.has(code)) return 0.21;
  if (DISCOUNT_18_5_CODES.has(code)) return 0.185;
  if (DISCOUNT_18_CODES.has(code)) return 0.18;
  if (DISCOUNT_15_CODES.has(code)) return 0.15;

  return 0.05;
}

function formatDiscountPercent(rate) {
  if (rate === 0) return "0";
  if (rate === 0.185) return "18,50";
  return String((rate * 100).toFixed(0)).replace(".", ",");
}

function getLoggedUser() {
  return JSON.parse(sessionStorage.getItem("loggedUser") || "null");
}

function canShowMpcInCart() {
  const user = getLoggedUser();
  const placanjeEl = document.getElementById("placanje");
  const isGotovina = placanjeEl && placanjeEl.value === "Gotovina";

  return Boolean(user?.showMpcInCart) && isGotovina;
}

function parsePrice(value) {
  if (value === null || value === undefined) return 0;

  const normalized = String(value)
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function showWelcomeToast(name) {
  const oldToast = document.getElementById("welcomeToast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.id = "welcomeToast";
  toast.textContent = `Dobrodošao, ${name}`;
  toast.style.position = "fixed";
  toast.style.top = "12px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.zIndex = "20000";
  toast.style.background = "rgba(17,17,17,0.6)";
  toast.style.color = "#fff";
  toast.style.padding = "12px 18px";
  toast.style.borderRadius = "16px";
  toast.style.boxShadow = "0 8px 20px rgba(0,0,0,.16)";
  toast.style.fontWeight = "800";
  toast.style.fontSize = "16px";
  toast.style.width = "fit-content";
  toast.style.maxWidth = "calc(100vw - 24px)";
  toast.style.textAlign = "center";
  toast.style.opacity = "0";
  toast.style.transition = "opacity .25s ease";

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 250);
  }, 2200);
}

function findItemBySifra(sifra) {
  return items.find(x => String(x.sifra) === String(sifra)) || null;
}


function getDiscountedMpc(sifra, mpc) {
  const basePrice = parsePrice(mpc);
  const discountRate = getDiscountRate(sifra);
  return basePrice * (1 - discountRate);
}

function login() {
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();

  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    document.getElementById("loginError").textContent = "Pogrešan username ili password";
    return;
  }

  sessionStorage.setItem("loggedUser", JSON.stringify(user));
  document.getElementById("loginScreen").style.display = "none";
  showWelcomeToast(user.name);
  renderCart();
}

function logout() {
  sessionStorage.removeItem("loggedUser");
  location.reload();
}

window.addEventListener("DOMContentLoaded", () => {
  const user = getLoggedUser();

  if (user) {
    document.getElementById("loginScreen").style.display = "none";
  }
});

let items = [];
let filtered = [];
let prikazano = 0;
const KORAK = 30;

/* ===================== KORPA ===================== */
function getCart() {
  return JSON.parse(localStorage.getItem("korpa") || "{}");
}

function saveCart(cart) {
  localStorage.setItem("korpa", JSON.stringify(cart));
}

/* ===== PROMJENA IZGLEDA KARTICE ===== */

function setAddedView(card, sifra, naziv) {
  const box = card.querySelector(".qtybox");

  box.innerHTML = `
    <div class="addedLabel" onclick="editItem('${sifra}','${naziv.replace(/'/g, "")}')">
      ✔ Dodano (klik za izmjenu)
    </div>
  `;
}

function setEditView(card, sifra, naziv, kolicina = "") {
  const box = card.querySelector(".qtybox");

  box.innerHTML = `
    <input class="qtyInput" type="number" min="1" value="${kolicina}" placeholder="kol"
      onkeydown="if(event.key==='Enter'){addToCart('${sifra}','${naziv.replace(/'/g, "")}')}">
    <button onclick="addToCart('${sifra}','${naziv.replace(/'/g, "")}')">Dodaj</button>
  `;
}

function restoreCards() {
  const cart = getCart();

  document.querySelectorAll("[data-sifra]").forEach(card => {
    const sifra = card.dataset.sifra;
    const naziv = card.dataset.naziv;

    if (cart[sifra]) {
      setAddedView(card, sifra, naziv);
    } else {
      setEditView(card, sifra, naziv);
    }
  });
}

function editItem(sifra, naziv) {
  const card = document.querySelector(`[data-sifra="${sifra}"]`);
  const cart = getCart();
  setEditView(card, sifra, naziv, cart[sifra]?.kolicina || "");
}

function addToCart(sifra, naziv) {
  const card = document.querySelector(`[data-sifra="${sifra}"]`);
  const input = card.querySelector(".qtyInput");

  const k = parseInt(input.value, 10);
  if (!k || k <= 0) return;

  const item = findItemBySifra(sifra);
  const mpc = parsePrice(item?.mpc);

  const cart = getCart();
  cart[sifra] = {
    naziv,
    kolicina: k,
    mpc
  };

  saveCart(cart);
  setAddedView(card, sifra, naziv);
  renderCart();
}

function updateCartQty(sifra, val) {
  const cart = getCart();
  const qty = parseInt(val, 10);

  if (!qty || qty <= 0) {
    delete cart[sifra];
  } else {
    cart[sifra].kolicina = qty;

    if (cart[sifra].mpc === undefined) {
      const item = findItemBySifra(sifra);
      cart[sifra].mpc = parsePrice(item?.mpc);
    }
  }

  saveCart(cart);
  renderCart();
  restoreCards();
}

function removeItemCart(sifra) {
  const cart = getCart();
  delete cart[sifra];
  saveCart(cart);

  renderCart();
  restoreCards();
}

function renderCart() {
  const box = document.getElementById("cartItems");
  if (!box) return;

  const cart = getCart();
  const showMpc = canShowMpcInCart();

  let html = "";
  let total = 0;

  for (const s in cart) {
    const stavka = cart[s];
    const qty = parseInt(stavka.kolicina, 10) || 0;

    let itemMpc = parsePrice(stavka.mpc);

    if (!itemMpc) {
      const found = findItemBySifra(s);
      itemMpc = parsePrice(found?.mpc);
    }

    const discountRate = getDiscountRate(s);
    const discountedMpc = getDiscountedMpc(s, itemMpc);
    const lineTotal = discountedMpc * qty;

    total += lineTotal;

    html += `
      <div class="cartItem" style="display:block;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span>${stavka.naziv}</span>
          <button onclick="removeItemCart('${s}')">❌</button>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;">
          <input
            type="number"
            min="0"
            value="${qty}"
            style="width:70px"
            onchange="updateCartQty('${s}', this.value)"
          >
          ${showMpc
        ? `<div style="font-weight:700;white-space:nowrap;text-align:right;">
                   Rabat ${formatDiscountPercent(discountRate)}%<br>
                   ${formatPrice(discountedMpc)} KM × ${qty} = ${formatPrice(lineTotal)} KM
                 </div>`
        : ``
      }
        </div>
      </div>
    `;
  }

  if (!html) {
    box.innerHTML = "Korpa je prazna";
    return;
  }

  if (showMpc) {
    html += `
      <div style="margin-top:12px;padding:12px;border-top:1px solid #ddd;font-weight:800;text-align:right;">
        Ukupno MPC: ${formatPrice(total)} KM
      </div>
    `;
  }

  box.innerHTML = html;
}

document.getElementById("placanje")?.addEventListener("change", renderCart);

/* GRID - Prikaz */
function setCols(n) {
  n = parseInt(n, 10);

  let minWidth = 170;

  if (window.innerWidth < 900) minWidth = 150;
  if (window.innerWidth < 700) minWidth = 140;
  if (window.innerWidth < 550) minWidth = 130;
  if (window.innerWidth < 420) minWidth = 120;

  const maxCols = Math.floor(grid.clientWidth / minWidth) || 1;
  const finalCols = Math.min(n, maxCols);

  grid.style.gridTemplateColumns = `repeat(${finalCols}, minmax(${minWidth}px,1fr))`;
  localStorage.setItem("cols", n);
}

setCols(localStorage.getItem("cols") || "3");
colsSel.value = localStorage.getItem("cols") || "3";
colsSel.onchange = () => setCols(colsSel.value);

function renderBadge(x) {
  if (!x.oznaka) return "";

  const o = x.oznaka.toUpperCase();

  if (o === "AKCIJA") {
    return `<div class="badge badge-akcija">AKCIJA ${x.akcija_postotak ? "- " + x.akcija_postotak + "%" : ""}</div>`;
  }
  if (o === "NOVO") {
    return `<div class="badge badge-novo">NOVO</div>`;
  }
  if (o === "1+1") {
    return `<div class="badge badge-11">1+1 GRATIS</div>`;
  }
  if (o === "ISTEK") {
    return `<div class="badge badge-istek">PRI ISTEKU</div>`;
  }
  if (o === "STIZE") {
    return `<div class="badge badge-stize">STIŽE USKORO</div>`;
  }

  return "";
}

function cardClass(x) {
  if (!x.oznaka) return "card";
  if (x.oznaka.toUpperCase() === "AKCIJA") return "card card-akcija";
  if (x.oznaka.toUpperCase() === "1+1") return "card card-11";
  return "card";
}

function ucitajJos() {
  const kraj = Math.min(prikazano + KORAK, filtered.length);
  let html = "";

  for (let i = prikazano; i < kraj; i++) {
    const x = filtered[i];

    html += `
      <div class="${cardClass(x)}" data-sifra="${x.sifra}" data-naziv="${x.naziv.replace(/"/g, "")}">
        ${renderBadge(x)}
        <img class="img" loading="lazy" decoding="async" src="${imageBase + x.slika}" onerror="this.src='no-image.png'">
        <div class="t">${x.naziv}</div>
        <div class="meta">
          Šifra: <b>${x.sifra}</b><br>
          VPC: <b>${x.vpc}</b> KM | MPC: <b>${x.mpc}</b> KM<br>
          Pakovanje: <b>${x.pakovanje}</b>
        </div>
        <div class="qtybox"></div>
      </div>
    `;
  }

  grid.insertAdjacentHTML("beforeend", html);
  prikazano = kraj;

  restoreCards();
  document.getElementById("loadingOverlay")?.remove();
}

function render() {
  const term = q.value.toLowerCase();
  const g = groupSel.value;

  filtered = items
    .filter(x => x && x.sifra && x.naziv)
    .filter(x => {
      const a = String(x.aktivno ?? "").trim().toUpperCase();
      return a === "" || a === "DA";
    })
    .filter(x => !g || x.grupa === g)
    .filter(x => !term || (`${x.naziv} ${x.sifra}`).toLowerCase().includes(term))
    .sort((a, b) => Number(a.redoslijed || 0) - Number(b.redoslijed || 0));

  grid.innerHTML = "";
  prikazano = 0;
  ucitajJos();
}

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    ucitajJos();
  }
});

function fillGroups() {
  const groups = [...new Set(items.map(x => x.grupa).filter(Boolean))];
  groupSel.innerHTML =
    `<option value="">Sve grupe</option>` +
    groups.map(g => `<option>${g}</option>`).join("");
}

q.oninput = render;
groupSel.onchange = render;

let jsonUrl;

if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  jsonUrl = "/katalog/katalog/data/products.json";
} else {
  jsonUrl = "https://raw.githubusercontent.com/doosubasic-byte/katalog/main/data/products.json";
}

let imageBase;

if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  imageBase = "/katalog/katalog/images/";
} else {
  imageBase = "https://raw.githubusercontent.com/doosubasic-byte/katalog/main/images/";
}

fetch(jsonUrl + "?nocache=" + Date.now())
  .then(res => res.json())
  .then(data => {
    items = data
      .filter(x => {
        const a = String(x.aktivno ?? "").trim().toUpperCase();
        return a === "" || a === "DA";
      })
      .map(r => ({
        sifra: r.sifra,
        naziv: r.naziv,
        vpc: r.vpc,
        mpc: r.mpc,
        pakovanje: r.pakovanje,
        grupa: r.grupa,
        redoslijed: r.redoslijed,
        slika: r.slika,
        oznaka: r.oznaka,
        akcija_postotak: r.akcija_postotak,
        aktivno: r.aktivno
      }));

    fillGroups();
    render();
    renderCart();
  })
  .catch(err => console.error("Greška učitavanja JSON:", err));