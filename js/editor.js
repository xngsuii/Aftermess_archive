// 프로필 편집기: 서버에 저장하지 않고 이 브라우저(IndexedDB)에만 보관한다
import { esc, toast, buildFields } from "./ui.js";
import { PROFILE_FIELDS, renderProfile } from "./profile.js";

const FONT = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css";
const BLANK = () => ({ faction: "ww", affil: [], tracks: [] });
let data = null, built = false, timer;

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

function preview() {
  const pv = document.getElementById("ed-pv");
  pv.dataset.faction = document.getElementById("editor").dataset.faction = data.faction;
  pv.innerHTML = renderProfile(data);
}
function changed() {
  preview();
  clearTimeout(timer); timer = setTimeout(save, 500);
}
function form() {
  const box = document.getElementById("ed-form");
  box.innerHTML = `<p class="ed-note">입력한 내용은 이 브라우저에만 자동 저장됩니다. 서버에는 올라가지 않습니다.</p>`;
  box.append(buildFields([
    { k: "faction", label: "포인트 컬러", type: "select", options: [["ww", "레드 (W.W)"], ["milgram", "블루 (MILGRAM)"], ["ledger", "옐로 (LEDGER)"]] },
    ...PROFILE_FIELDS], data, { local: true, change: changed }));
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
<body data-faction="${data.faction}">${renderProfile(data, { static: true })}</body></html>`;
  download(fileName() + ".html", new Blob([html], { type: "text/html" }));
}
async function exportPng(btn) {
  if (!window.htmlToImage) return toast("이미지 저장 기능을 불러오지 못했습니다.");
  const node = document.querySelector("#ed-pv .pf");
  node.querySelectorAll(".pf-trk.on .pf-trk-h").forEach(h => h.click());
  btn.disabled = true; btn.textContent = "만드는 중…";
  try {
    const bg = getComputedStyle(node).getPropertyValue("--bg").trim();
    const url = await window.htmlToImage.toPng(node, { pixelRatio: 2, backgroundColor: bg });
    download(fileName() + ".png", await (await fetch(url)).blob());
  } catch (e) { console.error(e); toast("이미지를 만들지 못했습니다."); }
  btn.disabled = false; btn.textContent = "이미지 저장";
}

async function build() {
  built = true;
  data = { ...BLANK(), ...((await load()) || {}) };
  const el = document.getElementById("editor");
  el.innerHTML = `<div class="ed-bar"><button class="btn" data-a="back">← 돌아가기</button><h3>프로필 편집기</h3>
    <button class="btn" id="ed-reset">새로 쓰기</button><button class="btn" id="ed-html">HTML 저장</button><button class="btn pri" id="ed-png">이미지 저장</button></div>
    <div class="ed-grid"><div class="ed-pv" id="ed-pv"></div><div class="ed-form" id="ed-form"></div></div>`;
  form(); preview();
  el.querySelector("#ed-html").onclick = () => exportHtml().catch(e => { console.error(e); toast("HTML을 만들지 못했습니다."); });
  el.querySelector("#ed-png").onclick = e => exportPng(e.currentTarget);
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
