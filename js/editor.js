// 프로필 편집기: 서버에 저장하지 않고 이 브라우저(IndexedDB)에만 보관한다
import { esc, toast, buildFields } from "./ui.js";
import { PROFILE_FIELDS, renderProfile, imgStyle, sideFigStyle, packProfile, parseProfile } from "./profile.js";

const FONT = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css";
const BLANK = () => ({ faction: "ww", affil: [{ k: "기관", v: "" }, { k: "소속", v: "" }, { k: "계급", v: "" }], tracks: [] });
let data = null, built = false, timer, fit = false, moving = null, grab = null; // moving: 옮기는 중인 이미지 ("mainImg" | "sideImg")

const idb = () => new Promise((ok, no) => {
  const r = indexedDB.open("afms-editor", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("kv");
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
});
async function load() {
  try { const d = await idb(); return await new Promise(ok => { const q = d.transaction("kv").objectStore("kv").get("draft"); q.onsuccess = () => ok(q.result); q.onerror = () => ok(null); }); }
  catch (e) { return null; }
}
async function save() {
  try { const d = await idb(); d.transaction("kv", "readwrite").objectStore("kv").put(data, "draft"); } catch (e) {}
}

// frame: 빈 칸도 틀을 보여 준다 (내보낼 때는 끈다)
function preview(frame = true) {
  const pv = document.getElementById("ed-pv");
  pv.dataset.faction = document.getElementById("editor").dataset.faction = data.faction;
  pv.innerHTML = renderProfile(data, { frame });
  if (moving) imgOf(moving)?.classList.add("mv");
  applyFit();
}
const IMG_SEL = { mainImg: "#ed-pv .pf-main img", sideImg: "#ed-pv .pf-sfig img" };
const imgOf = k => document.querySelector(IMG_SEL[k]);
const keyOf = el => Object.keys(IMG_SEL).find(k => imgOf(k) === el);
// 맞춤 보기: 미리보기 전체가 한 화면에 들어오도록 줄인다
function applyFit() {
  const pv = document.getElementById("ed-pv"), pf = pv?.querySelector(".pf"); if (!pf) return;
  pf.style.zoom = "";
  if (fit) pf.style.zoom = Math.min(1, (pv.clientHeight - 48) / pf.offsetHeight).toFixed(3);
}
// 상단·전신 이미지: 더블클릭하면 끌어서 옮기고 휠로 확대한다
function syncZoom(k) {
  const side = k === "sideImg", r = document.querySelector(`#ed-form input[data-k="${side ? "sideImgW" : k + "Zoom"}"]`);
  if (r) { r.value = side ? data.sideImgW : data[k + "Zoom"] || 1; r.show ? r.show() : (r.nextSibling.textContent = Math.round(r.value * (side ? 1 : 100)) + "%"); }
}
function paintImg(k) {
  const im = imgOf(k);
  if (im) { if (k === "sideImg") im.parentElement.style.cssText = sideFigStyle(data); else im.style.cssText = imgStyle(data, k); }
  clearTimeout(timer); timer = setTimeout(save, 500);
}
// 전신 이미지의 현재 위치·너비 (저장된 값이 없으면 화면에 그려진 값)
const sideBox = () => { const f = imgOf("sideImg").parentElement; return { x: parseFloat(f.style.left), y: parseFloat(f.style.top), w: parseFloat(f.style.width) }; };
function setMoving(k) {
  document.querySelectorAll("#ed-pv img.mv").forEach(x => x.classList.remove("mv"));
  moving = k; grab = null;
  if (k) imgOf(k)?.classList.add("mv");
  toast(k ? "이미지를 끌어서 옮기고, 휠로 확대합니다. 다시 더블클릭하면 끝납니다." : "이미지 위치를 저장했습니다.");
}
function bindImage(pv) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  pv.addEventListener("dblclick", e => { const k = keyOf(e.target); if (k) { e.preventDefault(); setMoving(moving === k ? null : k); } });
  pv.addEventListener("pointerdown", e => { if (moving && e.target === imgOf(moving)) { e.preventDefault(); grab = { x: e.clientX, y: e.clientY }; } });
  addEventListener("pointermove", e => {
    if (!grab || !moving) return;
    const k = moving, im = imgOf(k); if (!im) return;
    if (k === "sideImg") {
      const reg = im.parentElement.parentElement.getBoundingClientRect(), b = sideBox();
      data.sideImgX = +clamp(b.x + (e.clientX - grab.x) / reg.width * 100, -150, 150).toFixed(1);
      data.sideImgY = +clamp(b.y + (e.clientY - grab.y) / reg.height * 100, -150, 150).toFixed(1);
      data.sideImgW = b.w;
      grab = { x: e.clientX, y: e.clientY }; paintImg(k); return;
    }
    // 확대한 만큼 천천히 움직여야 손가락을 따라오는 느낌이 난다
    const r = im.getBoundingClientRect(), [px, py] = (data[k + "Pos"] || (k === "mainImg" ? "50% 0%" : "50% 50%")).split(" ").map(parseFloat);
    data[k + "Pos"] = `${clamp(px - (e.clientX - grab.x) / r.width * 100, 0, 100).toFixed(1)}% ${clamp(py - (e.clientY - grab.y) / r.height * 100, 0, 100).toFixed(1)}%`;
    grab = { x: e.clientX, y: e.clientY }; paintImg(k);
  });
  addEventListener("pointerup", () => grab = null);
  pv.addEventListener("wheel", e => {
    if (!moving || e.target !== imgOf(moving)) return;
    e.preventDefault();
    const k = moving;
    if (k === "sideImg") { const b = sideBox(); data.sideImgX = b.x; data.sideImgY = b.y; data.sideImgW = +clamp(b.w * (1 - e.deltaY * 0.001), 20, 200).toFixed(1); }
    else data[k + "Zoom"] = +clamp((data[k + "Zoom"] || 1) * (1 - e.deltaY * 0.001), 1, 3).toFixed(2);
    paintImg(k); syncZoom(k);
  }, { passive: false });
  pv.addEventListener("dragstart", e => { if (moving) e.preventDefault(); });
  pv.addEventListener("load", applyFit, true);
  addEventListener("resize", applyFit);
  addEventListener("keydown", e => { if (e.key === "Escape" && moving) setMoving(null); });
}
function changed() {
  preview();
  clearTimeout(timer); timer = setTimeout(save, 500);
}
function form() {
  const box = document.getElementById("ed-form");
  box.innerHTML = `<p class="ed-note">입력한 내용은 이 브라우저에만 자동 저장됩니다. 서버에는 올라가지 않습니다.</p>`;
  box.append(buildFields([
    { k: "faction", label: "포인트 컬러", type: "select", options: [["ww", "레드 (W.W)"], ["milgram", "블루 (MILGRAM)"], ["ledger", "옐로 (LEDGER)"], ["none", "그레이 (무소속)"]] },
    ...PROFILE_FIELDS.filter(f => !f.site)], data, { local: true, change: changed }));
}
function download(name, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const fileName = () => (data.name || data.num || "profile").replace(/[\\/:*?"<>|]/g, "_");

async function exportHtml() {
  const css = (await Promise.all(["css/base.css", "css/profile.css"].map(u => fetch(u).then(r => r.text())))).join("\n");
  const html = `<!doctype html><html lang="ko" data-theme="${document.documentElement.dataset.theme}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(data.name || data.num || "Profile")}</title>
<link rel="stylesheet" href="${FONT}"><style>${css}\nbody{background:var(--bg)}.pf{max-width:760px;margin:0 auto}</style></head>
<body data-faction="${data.faction}">${renderProfile(data, { static: true })}
<script type="application/json" id="afms-data">${packProfile(data).replace(/</g, "\\u003c")}</script></body></html>`;
  download(fileName() + ".html", new Blob([html], { type: "text/html" }));
}
async function exportPng(btn) {
  if (!window.htmlToImage) return toast("이미지 저장 기능을 불러오지 못했습니다.");
  let node = document.querySelector("#ed-pv .pf");
  node.querySelectorAll(".pf-trk.on .pf-vinyl").forEach(h => h.click());
  btn.disabled = true; btn.textContent = "만드는 중…";
  // 내보낼 때는 빈 칸 틀과 맞춤 배율을 끄고 실제 크기로 만든다
  const wasFit = fit; fit = false; moving = null; grab = null; preview(false);
  node = document.querySelector("#ed-pv .pf");
  try {
    const bg = getComputedStyle(node).getPropertyValue("--bg").trim();
    const url = await window.htmlToImage.toPng(node, { pixelRatio: 2, backgroundColor: bg });
    download(fileName() + ".png", await (await fetch(url)).blob());
  } catch (e) { console.error(e); toast("이미지를 만들지 못했습니다."); }
  fit = wasFit; preview();
  btn.disabled = false; btn.textContent = "이미지 저장";
}

async function build() {
  built = true;
  data = { ...BLANK(), ...((await load()) || {}) };
  const el = document.getElementById("editor");
  el.innerHTML = `<div class="ed-bar"><button class="btn" data-a="back">← 돌아가기</button><h3>프로필 편집기</h3>
    <button class="btn" id="ed-fit">맞춤 보기</button><button class="btn" id="ed-reset">새로 쓰기</button><label class="btn" style="cursor:pointer">불러오기<input type="file" id="ed-open" accept=".json,.html,.htm" hidden></label><button class="btn" id="ed-json">파일 저장</button><button class="btn" id="ed-html">HTML 저장</button><button class="btn pri" id="ed-png">이미지 저장</button></div>
    <div class="ed-grid"><div class="ed-pv" id="ed-pv"></div><div class="ed-form" id="ed-form"></div></div>`;
  form(); preview(); bindImage(el.querySelector("#ed-pv"));
  el.querySelector("#ed-fit").onclick = e => { fit = !fit; e.currentTarget.textContent = fit ? "100% 보기" : "맞춤 보기"; applyFit(); };
  el.querySelector("#ed-html").onclick = () => exportHtml().catch(e => { console.error(e); toast("HTML을 만들지 못했습니다."); });
  el.querySelector("#ed-png").onclick = e => exportPng(e.currentTarget);
  // 파일 저장: 나중에 다시 불러오거나 페르소나 페이지에 올릴 수 있는 프로필 파일
  el.querySelector("#ed-json").onclick = () => download(fileName() + ".json", new Blob([packProfile(data)], { type: "application/json" }));
  el.querySelector("#ed-open").onchange = async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    let d;
    try { d = parseProfile(await f.text()); }
    catch (err) { return toast(err.message === "no-data" ? "이 HTML에는 프로필 데이터가 들어 있지 않습니다. 새로 저장한 파일만 불러올 수 있습니다." : "프로필 파일을 읽지 못했습니다."); }
    if (!confirm("작성 중인 내용을 불러온 파일 내용으로 바꿀까요?")) return;
    data = { ...BLANK(), ...d }; moving = null; save(); form(); preview(); toast("프로필을 불러왔습니다.");
  };
  el.querySelector("#ed-reset").onclick = () => {
    if (!confirm("작성 중인 내용을 모두 지우고 새로 시작할까요?")) return;
    data = BLANK(); save(); form(); preview();
  };
}
export async function openEditor() {
  if (!built) await build();
  document.body.classList.add("in-editor");
}
export function closeEditor() { document.body.classList.remove("in-editor"); }
