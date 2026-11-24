// 페르소나 페이지: 사이트 왼쪽에 숨겨 둔 화면. 페르소나는 characters에 persona: true 로 저장한다.
import { S, FAC, newId, saveChar, delChar, saveImage, delImage, collectIds } from "./store.js";
import { esc, inl, bgAttr, hydrate, toast, openForm, why } from "./ui.js";
import { PROFILE_FIELDS, renderProfile, parseProfile } from "./profile.js";

const SIL = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><path d="M50 14c-13 0-21 10-21 24 0 9 3 17 8 22-2 4-6 6-14 9C10 74 4 84 2 100h96c-2-16-8-26-21-31-8-3-12-5-14-9 5-5 8-13 8-22 0-14-8-24-21-24z"/></svg>`;
const GROUPS = [...FAC, "none"];
const facName = k => k === "none" ? ["UNAFFILIATED", "NO RECORD"] : [S.factions[k].short || S.factions[k].name, S.factions[k].name];
const nameOf = c => c.name || c.num || "";
const pairOf = p => S.chars.find(c => c.id === p.pairId);
// 페어 프로필이 아직 없으면 Secret File로 보여 준다
const hasProfile = c => !!c && c.useProfile !== false && !!(c.mainImg || c.sideImg || c.profile || c.intro || c.record || c.tagline);
// 프로필 파일을 불러와도 남겨 두는 값 (카드 설정과 페어)
const CARD_KEYS = ["id", "pfac", "pairId", "order", "name", "cardNo", "frontSub", "frontMain", "assets", "assetGroups", "front", "frontPos", "thumb", "thumbPos", "gender", "role", "brief"];
let built = false, open = null, side = "me"; // open: 열린 페르소나, side: "me" | "pair" | "asset"
export const hooks = {}; // app.js가 ASSET 탭 그리는 함수를 넣어 준다

// 카드 앞면은 진영의 Personnel 양식을 따른다: W.W는 번호, MILGRAM은 소속과 DIV, 그 밖에는 글 없음
const card = p => `<div class="pcard ${p.id === open ? "flip" : ""}" data-id="${p.id}" data-a="pchar:${p.id}"><div class="pc-in">
    <div class="pc-f ${p.front ? "img" : ""}" data-pos="char|${p.id}|frontPos" ${bgAttr(p.front, p.frontPos)}>${p.pfac === "ww" ? `<b>${esc(p.cardNo || p.num)}</b>` : ""}${p.front ? "" : SIL}
      ${p.pfac === "milgram" ? `<div class="ft"><small>${esc(p.frontSub)}</small><strong>${esc(p.frontMain)}</strong></div>` : ""}</div>
    <div class="pc-b" data-pos="char|${p.id}|thumbPos" ${bgAttr(p.thumb, p.thumbPos)}><b>${esc(p.name)}</b><i></i><span>${esc(p.gender)}</span><span>${esc(p.role)}</span></div>
  </div></div>`;

// LEDGER 페르소나는 본편 LEDGER 인물처럼 가로 카드
const lcard = (p, i) => `<article class="lcard ${p.id === open ? "sel" : ""}" data-id="${p.id}" data-a="pchar:${p.id}">
    <span class="no">PERSONA ${String(i + 1).padStart(2, "0")}</span><div class="lc-img" data-pos="char|${p.id}|thumbPos" ${bgAttr(p.thumb, p.thumbPos)}></div>
    <div class="lc-t"><h4>${esc(p.name)}</h4><p class="meta"><span><small>AGE</small>${esc(p.age)}</span><span><small>HEIGHT</small>${esc(p.height)}</span><span><small>AFFIL.</small>${esc(p.role)}</span></p>
    ${p.brief ? `<div class="brief">${inl(p.brief)}</div>` : ""}</div></article>`;

function fileHtml(p) {
  const pr = pairOf(p), me = side === "me";
  const tab = (k, l) => `<button class="${side === k ? "on" : ""}" data-a="pside:${k}">${l}</button>`;
  const body = side === "asset" ? hooks.assets(p) : me ? renderProfile(p, { pos: `char|${p.id}|mainImgPos`, spos: `char|${p.id}|sideImg` })
    : hasProfile(pr) ? renderProfile(pr, {})
    : `<div class="psecret"><small>AFTERMESS · PERSONNEL FILE</small><p>${pr ? esc(nameOf(pr)) : "UNKNOWN"}</p><div class="stamp"><b>SECRET FILE</b></div><span>ACCESS DENIED · 아직 열람할 수 없는 기록입니다</span></div>`;
  return `<div class="file" data-faction="${side === "pair" ? pr?.faction || "none" : p.pfac || "none"}"><div class="tabs">${tab("me", esc(p.num || p.name || "PERSONA"))}${tab("pair", pr ? esc(pr.num || pr.name || "PAIR") : "SECRET")}${tab("asset", "ASSET")}<span class="sp"></span>
      ${side === "pair" && pr ? `<button class="btn ps-go" data-a="parch:${pr.id}">ARCHIVE FILE ↗</button>` : ""}
      <label class="ed" style="cursor:pointer">프로필 파일 불러오기<input type="file" class="ps-file" data-id="${p.id}" accept=".json,.html,.htm" hidden></label>
      <button class="ed" data-a="pedit:${p.id}">페르소나 편집</button></div>
    <div class="pflip"><div class="file-b">${body}</div></div></div>`;
}
function drawFile(scroll) {
  const box = document.getElementById("pfile"); if (!box) return;
  const p = S.personas.find(x => x.id === open);
  box.innerHTML = p ? fileHtml(p) : "";
  hydrate(box);
  if (p && scroll) setTimeout(() => box.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
}
export function drawPersona() {
  if (!built) return;
  const el = document.getElementById("persona"), y = el.querySelector(".ps-body")?.scrollTop || 0;
  if (!S.personas.some(p => p.id === open)) open = null;
  const groups = GROUPS.map(k => {
    const ps = S.personas.filter(p => (GROUPS.includes(p.pfac) ? p.pfac : "none") === k); if (!ps.length) return "";
    const [n, en] = facName(k);
    return `<div data-faction="${k}"><div class="grp"><b>${esc(n)}</b><small>${esc(en)}</small><i></i><span>${String(ps.length).padStart(2, "0")}</span></div>${k === "ledger" ? `<div class="lgrid">${ps.map(lcard).join("")}</div>` : `<div class="pgrid">${ps.map(card).join("")}</div>`}</div>`;
  }).join("");
  el.innerHTML = `<div class="ed-bar ps-bar"><h3>PERSONA</h3><div class="ed-acts">
      ${S.user ? `<button class="btn" data-a="pnew">ADD PROFILE</button><label class="btn" style="cursor:pointer">IMPORT PROFILE<input type="file" class="ps-file" accept=".json,.html,.htm" hidden></label>` : ""}
      <button class="btn" data-a="pback">ARCHIVE →</button></div></div>
    <div class="ps-body"><section class="sec wrap">
      <p class="kicker">AFTERMESS<br>PERSONA FILE</p>
      <h2 class="fname">Persona</h2><p class="fsub">// personal record · ${String(S.personas.length).padStart(2, "0")} subjects · 카드를 누르면 정보 열람</p>
      ${groups || `<p class="empty" style="margin-top:40px">등록된 페르소나가 없습니다.</p>`}
      <div id="pfile"></div>
      <footer class="end"><div class="barcode"></div><span>© AFTERMESS</span></footer></section></div>`;
  drawFile();
  hydrate(el);
  el.querySelector(".ps-body").scrollTop = y;
}
export function openPersona() {
  built = true; drawPersona();
  document.body.classList.add("in-persona");
  try { history.replaceState(null, "", "#persona"); } catch (e) {}
}
export function closePersona() {
  document.body.classList.remove("in-persona");
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}

// ---------- 편집 ----------
const T = (k, label, ph) => ({ k, label, ph });
const schema = () => [
  { type: "head", label: "목록 카드", open: true },
  T("name", "이름 (카드에 표시)", "SEVEN"),
  { k: "pfac", label: "진영", type: "select", options: GROUPS.map(k => [k, k === "none" ? "무소속" : facName(k)[0]]) },
  { k: "pairId", label: "페어 캐릭터 (프로필이 없으면 Secret File로 표시)", type: "select",
    options: [["", "(없음)"], ...[...S.chars].sort((a, b) => FAC.indexOf(a.faction) - FAC.indexOf(b.faction)).map(c => [c.id, `${facName(c.faction)[0]} · ${nameOf(c) || "이름 없음"}`])] },
  T("order", "순서 (작은 수가 앞)", "0"),
  T("cardNo", "NUMBER (W.W일 때 카드 앞면 좌상단)", "07"),
  T("frontSub", "소속 (MILGRAM일 때 카드 앞면 작은 글)", "MAIN ELEMENT"), T("frontMain", "DIV (MILGRAM일 때 카드 앞면 굵은 글)", "HIGH COMMAND"),
  { k: "front", label: "카드 앞면 이미지", type: "inline", max: 480, limit: 90000, hint: "비워 두면 기본 실루엣이 나옵니다. 저장한 뒤 카드 이미지를 더블클릭하면 위치를 조정할 수 있습니다." },
  { k: "thumb", label: "카드 뒷면 이미지 (LEDGER는 가로 카드 왼쪽 이미지)", type: "inline", max: 480, limit: 90000 },
  T("gender", "성별 · 신장 · 국적 (카드 뒷면)", "Male · 189cm · HKG"),
  T("role", "직무 (카드 뒷면 · LEDGER는 AFFIL.)", "Entry-Fragger"),
  { k: "brief", label: "한 줄 설명 (LEDGER 가로 카드에 표시)", type: "area" },
  ...PROFILE_FIELDS.filter(f => f.k !== "useProfile")];
const nextOrder = () => S.personas.reduce((m, c) => Math.max(m, Number(c.order) || 0), -1) + 1;
const blank = () => ({ id: newId("p"), persona: true, faction: "persona", pfac: "ww", pairId: "", order: nextOrder(), affil: [{ k: "기관", v: "" }, { k: "소속", v: "" }, { k: "직무", v: "" }], tracks: [], assets: [] });

// 파일 안의 이미지(data URL)를 서버 이미지로 올리고 id로 바꾼다
async function upload(o) {
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === "string" && v.startsWith("data:image")) o[k] = await saveImage(await (await fetch(v)).blob());
    else if (v && typeof v === "object") await upload(v);
  }
}
// 프로필 편집기에서 저장한 파일(JSON · HTML)로 프로필을 채운다. id가 없으면 새 페르소나를 만든다.
async function importFile(file, id) {
  let d;
  try { d = parseProfile(await file.text()); }
  catch (e) { return toast(e.message === "no-data" ? "이 HTML에는 프로필 데이터가 들어 있지 않습니다. 프로필 편집기에서 다시 저장한 파일을 올려 주세요." : "프로필 파일을 읽지 못했습니다."); }
  const old = id && S.personas.find(x => x.id === id);
  if (old && !confirm("이 페르소나의 프로필 내용을 파일 내용으로 바꿀까요?\n카드 설정과 페어는 그대로 둡니다.")) return;
  toast("프로필을 올리는 중입니다…");
  try {
    const { faction, id: _x, persona: _p, ...prof } = structuredClone(d);
    await upload(prof);
    const keep = old ? Object.fromEntries(CARD_KEYS.filter(k => k in old).map(k => [k, old[k]]))
      : { id: newId("p"), pfac: GROUPS.includes(faction) ? faction : "none", pairId: "", order: nextOrder(), name: prof.num || "" };
    const v = { ...prof, ...keep, persona: true, faction: "persona" };
    await saveChar(v);
    if (old) { const now = collectIds(v); [...collectIds(old)].filter(i => !now.has(i)).forEach(delImage); }
    open = v.id; side = "me"; drawPersona(); toast("프로필을 채웠습니다");
  } catch (e) { console.error(e); toast("프로필을 올리지 못했습니다. " + why(e)); }
}
document.addEventListener("change", e => {
  const inp = e.target.closest?.(".ps-file"); if (!inp || !inp.files[0]) return;
  const f = inp.files[0]; inp.value = "";
  importFile(f, inp.dataset.id);
});

// ---------- 동작 (app.js의 ACT에 합쳐진다) ----------
export const PACT = {
  persona: openPersona, pback: closePersona,
  // 페어 캐릭터의 아카이브 파일로 바로 간다
  parch(id) { hooks.openChar?.(id); },
  pchar(id) {
    open = open === id ? null : id; side = "me";
    document.querySelectorAll("#persona .pcard").forEach(el => el.classList.toggle("flip", el.dataset.id === open));
    document.querySelectorAll("#persona .lcard").forEach(el => el.classList.toggle("sel", el.dataset.id === open));
    drawFile(true);
  },
  // 서류를 뒤집듯이 페르소나 ↔ 페어 프로필을 바꾼다
  pside(k) {
    if (k === side) return;
    side = k;
    const f = document.querySelector("#pfile .pflip"); if (!f) return drawFile();
    f.classList.add("out");
    setTimeout(() => {
      drawFile();
      const n = document.querySelector("#pfile .pflip"); if (!n) return;
      n.classList.add("in");
      requestAnimationFrame(() => requestAnimationFrame(() => n.classList.remove("in")));
    }, 230);
  },
  pnew() { openForm({ title: "페르소나 추가", schema: schema(), data: blank(), onSave: async v => { await saveChar(v); open = v.id; side = "me"; drawPersona(); } }); },
  pedit(id) {
    const p = S.personas.find(x => x.id === id);
    openForm({ title: `페르소나 편집 · ${nameOf(p)}`, schema: schema(), data: p, onSave: async v => { await saveChar(v); drawPersona(); },
      onDelete: async () => { await delChar(id); open = null; drawPersona(); } });
  }
};
