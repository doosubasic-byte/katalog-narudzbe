const grid = document.getElementById("grid");
const q = document.getElementById("q");
const groupSel = document.getElementById("group");
const colsSel = document.getElementById("cols");

const users = [
  { username: "Faris", password: "1234", name: "Faris" },
  { username: "Arnel", password: "111", name: "Arnel Škiljo" },
  { username: "Muris", password: "321", name: "Muris Bekrić" },
  { username: "Edin", password: "123", name: "Komercijalista 2" }
];

function getLoggedUser() {
  return JSON.parse(sessionStorage.getItem("loggedUser") || "null");
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

/* vrati sve kartice nakon rendera */
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

/* klik na ✔ Dodano */
function editItem(sifra, naziv) {
  const card = document.querySelector(`[data-sifra="${sifra}"]`);
  const cart = getCart();
  setEditView(card, sifra, naziv, cart[sifra]?.kolicina || "");
}

/* DODAJ */
function addToCart(sifra, naziv) {
  const card = document.querySelector(`[data-sifra="${sifra}"]`);
  const input = card.querySelector(".qtyInput");

  let k = parseInt(input.value);
  if (!k || k <= 0) return;

  let cart = getCart();
  cart[sifra] = { naziv: naziv, kolicina: k };
  saveCart(cart);

  setAddedView(card, sifra, naziv);
  renderCart();
}

/* PROMJENA U POPUPU */
function updateCartQty(sifra, val) {
  let cart = getCart();

  if (val <= 0) {
    delete cart[sifra];
  } else {
    cart[sifra].kolicina = val;
  }

  saveCart(cart);
  renderCart();
  restoreCards();
}

/* BRISANJE */
function removeItemCart(sifra) {
  let cart = getCart();
  delete cart[sifra];
  saveCart(cart);

  renderCart();
  restoreCards();
}

/* POPUP */
function renderCart() {
  const box = document.getElementById("cartItems");
  if (!box) return;

  const cart = getCart();
  let html = "";

  for (let s in cart) {
    html += `
      <div class="cartItem">
        <span>${cart[s].naziv}</span>

        <input type="number" min="0" value="${cart[s].kolicina}"
          style="width:60px"
          onchange="updateCartQty('${s}',this.value)">

        <button onclick="removeItemCart('${s}')">❌</button>
      </div>
    `;
  }

  box.innerHTML = html || "Korpa je prazna";
}

/* GRID - Prikaz */
function setCols(n) {

  n = parseInt(n);

  let minWidth = 170; // desktop normal

  if (window.innerWidth < 900) minWidth = 150;
  if (window.innerWidth < 700) minWidth = 140;
  if (window.innerWidth < 550) minWidth = 130;
  if (window.innerWidth < 420) minWidth = 120;

  // maksimalan broj kolona koji stane
  const maxCols = Math.floor(grid.clientWidth / minWidth) || 1;

  // ako korisnik izabere 4 na telefonu — ograniči
  const finalCols = Math.min(n, maxCols);

  grid.style.gridTemplateColumns =
    `repeat(${finalCols}, minmax(${minWidth}px,1fr))`;

  localStorage.setItem("cols", n);
}

setCols(localStorage.getItem("cols") || "3");
colsSel.value = localStorage.getItem("cols") || "3";
colsSel.onchange = () => setCols(colsSel.value);

/* BADGE */
function renderBadge(x) {
  if (!x.oznaka) return "";
  const o = x.oznaka.toUpperCase();
  if (o === "AKCIJA") return `<div class="badge badge-akcija">AKCIJA ${x.akcija_postotak ? "- " + x.akcija_postotak + "%" : ""}</div>`;
  if (o === "NOVO") return `<div class="badge badge-novo">NOVO</div>`;
  if (o === "1+1") return `<div class="badge badge-11">1+1 GRATIS</div>`;
  if (o === "ISTEK") return `<div class="badge badge-istek">PRI ISTEKU</div>`;
  if (o === "STIZE") return `<div class="badge badge-stize">STIŽE USKORO</div>`;
  return "";
}

function cardClass(x) {
  if (!x.oznaka) return "card";
  if (x.oznaka.toUpperCase() === "AKCIJA") return "card card-akcija";
  if (x.oznaka.toUpperCase() === "1+1") return "card card-11";
  return "card";
}

/* UCITAJ */
function ucitajJos() {
  let kraj = Math.min(prikazano + KORAK, filtered.length);
  let html = "";

  for (let i = prikazano; i < kraj; i++) {
    const x = filtered[i];

    html += `
      <div class="${cardClass(x)}" data-sifra="${x.sifra}" data-naziv="${x.naziv.replace(/"/g, '')}">
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

/* RENDER */
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
  groupSel.innerHTML = `<option value="">Sve grupe</option>` +
    groups.map(g => `<option>${g}</option>`).join("");
}

q.oninput = render;
groupSel.onchange = render;


/* CSV 
Papa.parse("data/products.csv",{
  download:true,
  header:true,
  delimiter:";",
  skipEmptyLines:true,
  complete:(res)=>{
    items=res.data.map(r=>({
      sifra:r.sifra,
      naziv:r.naziv,
      vpc:r.vpc,
      mpc:r.mpc,
      pakovanje:r.pakovanje,
      grupa:r.grupa,
      redoslijed:r.redoslijed,
      slika:r.slika,
      oznaka:r.oznaka,
      akcija_postotak:r.akcija_postotak,
      aktivno:r.aktivno
    }));
    fillGroups();
    render();
  }
});
*/

/* JSON */

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

  })
  .catch(err => console.error("Greška učitavanja JSON:", err));