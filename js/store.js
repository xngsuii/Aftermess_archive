// Firestore 읽기/쓰기와 이미지 압축
import { db } from "./firebase.js";
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const FAC = ["ww", "milgram", "ledger"];
export const S = { site: null, factions: {}, chars: [], memos: [], user: null, fac: "ww", openChar: null, tab: "profile", tag: "" };

const rand = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const newId = p => p + "_" + rand();

const ERA = (name, en, range) => ({ name, en, range, img: "", events: [] });
const DEF_SITE = {
  title: "AFTERMESS", kicker: "Aftermess 2080\nReturned", heroImg: "",
  desc: "2030년, 핵전쟁으로 인해 인류는 한 차례 멸망 위기를 겪었다.\n\n2080년 현재, 모든 것이 엉망인 이 시대를 인류는 **애프터메스(Aftermess)** 라고 부르고 있다.",
  synTitle: "2030년, 핵전쟁으로 인해 인류는 한 차례 멸망 위기를 겪었다.", synBody: "",
  eras: [ERA("붕괴기", "COLLAPSE", "2030 — 2038"), ERA("암흑기", "DARK AGE", "2041 — 2051"), ERA("질서기", "ORDER", "2052 — 2070"), ERA("현행", "CURRENT", "2071 — 2080")]
};
const F = (name, short, sub, mapTitle, unitsTitle) => ({
  name, short, sub, quote: "", quoteKo: "", quoteSrc: "", tagline: "", est: "", banner: "", summary: "",
  overview: [], mapTitle, mapSub: "", mapImg: "", unitsTitle, unitsSub: "", units: [],
  chronTitle: "Chronicle", chronSub: "", chron: [], groups: []
});
const DEF_FAC = {
  ww: F("WORLD'S WORST", "W.W", "// ledger-certified PMC", "Facility", "Squad"),
  milgram: { ...F("MILGRAM", "MILGRAM", "// classified", "Territory", "Squad"), groups: [{ name: "본대", en: "MAIN ELEMENT" }, { name: "분견대", en: "1ST DETACHMENT" }] },
  ledger: F("LEDGER", "LEDGER", "// classified", "Floor Plan", "Directorate")
};

export async function loadAll(step) {
  const site = await getDoc(doc(db, "site", "main")); step();
  S.site = { ...DEF_SITE, ...(site.exists() ? site.data() : {}) }; normSite();
  const fs = await getDocs(collection(db, "factions")); step();
  const got = {}; fs.forEach(d => got[d.id] = d.data());
  for (const k of FAC) S.factions[k] = { ...DEF_FAC[k], ...(got[k] || {}) };
  const cs = await getDocs(collection(db, "characters")); step();
  S.chars = cs.docs.map(d => ({ id: d.id, ...d.data() }));
  sortChars();
  const ms = await getDocs(collection(db, "memos")); step();
  S.memos = ms.docs.map(d => normMemo({ id: d.id, ...d.data() })).sort((a, b) => (b.at || 0) - (a.at || 0));
}
export function useDefaults() {
  S.site = S.site || { ...DEF_SITE }; normSite();
  for (const k of FAC) S.factions[k] = S.factions[k] || { ...DEF_FAC[k] };
}
// 시놉시스를 연도별 세 칸 구조로 맞춘다 (예전 저장분은 옮겨 담는다)
function normSite() {
  const s = S.site;
  if (!Array.isArray(s.syn)) s.syn = [
    { year: "2030", label: "핵전쟁 발발", body: s.synTitle || "" },
    { year: "— 50y", label: "멸망 위기", body: s.synBody || "" },
    { year: "2080", label: "현재 · 애프터메스", body: "" }];
}
// 예전 메모(캐릭터 하나 + 쉼표 태그)를 캐릭터 여러 명 + 태그 목록 구조로 맞춘다
function normMemo(m) {
  m.charIds = Array.isArray(m.charIds) ? m.charIds : (m.charId ? [m.charId] : []);
  m.tags = Array.isArray(m.tags) ? m.tags : String(m.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  if (!m.charIds.length && !m.tags.length) m.tags = ["세계관"];
  m.imgs = m.imgs || [];
  delete m.charId;
  return m;
}
function sortChars() { S.chars.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)); }

export async function saveSite(v) { await setDoc(doc(db, "site", "main"), v); S.site = v; }
export async function saveFaction(k, v) { await setDoc(doc(db, "factions", k), v); S.factions[k] = v; }
export async function saveChar(v) {
  const { id, ...rest } = v;
  await setDoc(doc(db, "characters", id), rest);
  const i = S.chars.findIndex(c => c.id === id);
  if (i < 0) S.chars.push(v); else S.chars[i] = v;
  sortChars();
}
export async function delChar(id) {
  const c = S.chars.find(x => x.id === id);
  await deleteDoc(doc(db, "characters", id));
  S.chars = S.chars.filter(x => x.id !== id);
  if (c) collectIds(c).forEach(delImage);
}
export async function saveMemo(v) {
  const { id, ...rest } = v;
  await setDoc(doc(db, "memos", id), rest);
  const i = S.memos.findIndex(m => m.id === id);
  if (i < 0) S.memos.unshift(v); else S.memos[i] = v;
}
export async function delMemo(id) {
  await deleteDoc(doc(db, "memos", id));
  S.memos = S.memos.filter(m => m.id !== id);
}

// ---- 이미지 ----
const cache = new Map();
export function getImage(id) {
  if (!id) return Promise.resolve("");
  if (!cache.has(id)) {
    cache.set(id, getDoc(doc(db, "images", id)).then(d => d.exists() ? d.data().data : "").catch(() => ""));
  }
  return cache.get(id);
}
const thumbId = id => "th_" + id.slice(3);
export async function saveImage(file, { thumb } = {}) {
  const id = newId("im");
  const data = await compress(file, 1600, 900000);
  await setDoc(doc(db, "images", id), { data });
  cache.set(id, Promise.resolve(data));
  if (thumb) {
    const t = await compress(file, 320, 60000);
    await setDoc(doc(db, "images", thumbId(id)), { data: t });
    cache.set(thumbId(id), Promise.resolve(t));
  }
  return id;
}
export function delImage(id) {
  cache.delete(id); cache.delete(thumbId(id));
  deleteDoc(doc(db, "images", id)).catch(() => {});
  deleteDoc(doc(db, "images", thumbId(id))).catch(() => {});
}
export { thumbId };

// 데이터 안에 들어 있는 이미지 id 전부 모으기
export function collectIds(o, out = new Set()) {
  if (typeof o === "string") { if (/^im_[a-z0-9]+$/.test(o)) out.add(o); }
  else if (o && typeof o === "object") Object.values(o).forEach(v => collectIds(v, out));
  return out;
}

async function draw(file, max) {
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * r)); c.height = Math.max(1, Math.round(bmp.height * r));
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}
// 긴 변 max 픽셀 이하, 결과 문자열 limit 글자 이하가 될 때까지 줄인다
export async function compress(file, max = 1600, limit = 900000) {
  let c = await draw(file, max), q = 0.85, type = "image/webp";
  if (!c.toDataURL(type).startsWith("data:image/webp")) type = "image/jpeg";
  for (let i = 0; i < 14; i++) {
    const url = c.toDataURL(type, q);
    if (url.length <= limit) return url;
    q -= 0.12;
    if (q < 0.4) { max = Math.round(max * 0.8); c = await draw(file, max); q = 0.8; }
  }
  throw new Error("image too large");
}
