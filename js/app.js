import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { S, FAC, loadAll, useDefaults, getImage, saveImage, delImage, thumbId, newId, saveSite, saveFaction, saveChar, delChar, saveMemo, delMemo } from "./store.js";
import { esc, inl, fmt, bgAttr, hydrate, toast, lightbox, lbStep, lbClose, openForm, why } from "./ui.js";
import { PROFILE_FIELDS, renderProfile, toggleTrack, toggleTrackText, toggleSecret } from "./profile.js";
import { openEditor, closeEditor } from "./editor.js";

const app = document.getElementById("app");
const ed = (what, label = "편집") => `<button class="ed" data-a="edit:${what}">${label}</button>`;
const SIL = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><path d="M50 14c-13 0-21 10-21 24 0 9 3 17 8 22-2 4-6 6-14 9C10 74 4 84 2 100h96c-2-16-8-26-21-31-8-3-12-5-14-9 5-5 8-13 8-22 0-14-8-24-21-24z"/></svg>`;
S.q = ""; S.memoN = 20;
const facChars = () => S.chars.filter(c => c.faction === S.fac);

// ---------- 화면 ----------
function hero(s) {
  return `<section id="top" class="hero" data-pos="site|heroImgPos"><div class="hero-bg pos-t" ${bgAttr(s.heroImg, s.heroImgPos)}></div>${ed("hero", "메인 편집")}
    <p class="kicker">${inl(s.kicker)}</p>
    ${s.logo ? `<img class="hero-logo" alt="${esc(s.title)}" data-img="${esc(s.logo)}" data-pos="site|logo" style="left:${s.logoX ?? 50}%;top:${s.logoY ?? 60}%;width:${s.logoW ?? 60}%">` : ""}</section>`;
}
function world(s) {
  const orgs = FAC.map((k, i) => { const f = S.factions[k]; return `
    <article class="org tg" data-faction="${k}">
      <button class="org-h tg-h" data-a="tog"><b>${esc(f.short || f.name)}</b><small>ORG. 0${i + 1}</small><span class="plus">+</span></button>
      <div class="tg-b"><div class="org-ban" data-pos="fac|${k}|bannerPos" ${bgAttr(f.banner, f.bannerPos)}><small>${esc(f.tagline)}</small><strong>${esc(f.name)}</strong><span>${esc(f.est)}</span></div>
        <div class="org-txt">${fmt(f.summary)}<button class="org-go" data-a="go:${k}">진영 페이지 보기 →</button> ${ed("forg:" + k)}</div></div>
    </article>`; }).join("");
  const day = d => { const [y, ...r] = String(d || "").trim().split(/\s+/); return `<b>${esc(y)}</b> ${esc(r.join(" "))}`; };
  const eras = (s.eras || []).map((e, i) => `
    <div class="era ${i % 2 ? "r" : ""}" data-pos="site|eras.${i}.imgPos"><div class="era-img pos-t" ${bgAttr(e.img, e.imgPos)}></div>
      <h4>${esc(e.name)}<small>${esc(e.en)} · ${esc(e.range)}</small></h4>
      <ol class="tl">${(e.events || []).map(v => `<li class="${v.dot ? "d-" + esc(v.dot) : ""}"><time>${day(v.date)}</time><div class="tl-t"><strong>${esc(v.title)}</strong>${fmt(v.desc)}</div></li>`).join("")}</ol></div>`).join("");
  const syn = (s.syn || []).map(r => `<div class="syn-row ${/^[—–-]/.test(r.year || "") ? "gap" : ""}"><div class="syn-y"><b>${esc(r.year)}</b><small>${esc(r.label)}</small></div><div class="syn-t">${fmt(r.body)}</div></div>`).join("");
  return `<section id="world" class="sec wrap">
    <div class="sec-h"><div><h2>Synopsis</h2></div><div class="r">시놉시스 ${ed("syn")}</div></div>
    <div class="syn">${syn}</div>
    <div class="sec-h"><div><h2>Timeline</h2><small>세계관 연표 · 2030 — 2080</small></div><div class="r">${ed("timeline")}</div></div>
    ${eras}
    <div class="orgs">${orgs}</div></section>`;
}
function faction(f) {
  const k = S.fac;
  const chron = k === "ww" ? "" : `<div class="sec-h"><div><h2>${esc(f.chronTitle)}</h2><small>${esc(f.chronSub)}</small></div>
      <div class="r">눌러서 열기 / 닫기 <button class="plus" data-a="togall">+</button> ${ed("fchron")}</div></div>
    <div class="chrs">${(f.chron || []).map(c => `<article class="chr tg"><button class="tg-h" data-a="tog"><time>${esc(c.date)}</time><span class="tag">${esc(c.tag)}</span><h4>${esc(c.title)}</h4></button>
      <div class="tg-b">${fmt(c.body)}</div></article>`).join("") || `<p class="empty">연표 항목이 없습니다.</p>`}</div>`;
  return `<section id="faction" class="sec wrap">
    <nav class="fsel">${FAC.map(x => `<button data-faction="${x}" class="${x === k ? "on" : ""}" data-a="fac:${x}">${esc(S.factions[x].short || S.factions[x].name)}</button>`).join("")}</nav>
    <p class="kicker">AFTERMESS<br>2080 NEW ERA</p>
    <h2 class="fname">${esc(f.name)}</h2><p class="fsub">${esc(f.sub)} ${ed("fhead")}</p>
    ${f.quote || f.quoteKo ? `<blockquote class="quote"><div class="en">${fmt(f.quote)}</div><div class="ko">${fmt(f.quoteKo)}</div><cite>${esc(f.quoteSrc)}</cite></blockquote>` : ""}
    <div class="sec-h"><div><h2>Overview</h2></div><div class="r">조직 개요 ${ed("fov")}</div></div>
    ${(f.overview || []).map(o => `<div class="ov"><h4>${esc(o.title)}<small>${esc(o.en)}</small></h4>${fmt(o.body)}</div>`).join("") || `<p class="empty">개요 항목이 없습니다.</p>`}
    <div class="sec-h"><div><h2>${esc(f.mapTitle)}</h2><small>${esc(f.mapSub)}</small></div><div class="r">${ed("fmap")}</div></div>
    <div class="map ${f.mapImg ? "has" : ""}">${f.mapImg ? `<img data-img="${esc(f.mapImg)}" alt="">` : "MAP · 이미지 준비 중"}</div>
    <div class="sec-h"><div><h2>${esc(f.unitsTitle)}</h2><small>${esc(f.unitsSub)}</small></div><div class="r">${esc(f.unitsLabel || (f.units || []).length + " UNITS")} ${ed("funits")}</div></div>
    <div class="units">${(f.units || []).map((u, i) => `<article class="unit tg" data-pos="fac|${k}|units.${i}.imgPos"><div class="unit-img pos-t" ${bgAttr(u.img, u.imgPos)}></div>
      <button class="unit-top tg-h" data-a="tog"><span class="code">${esc(u.code)}</span><span class="tag">${esc(u.tag)}</span><h4>${esc(u.name)}</h4><p class="sub">${esc(u.sub)}</p><span class="plus">+</span></button>
      <div class="tg-b"><div>${fmt(u.body)}</div></div></article>`).join("")}</div>
    ${(f.units || []).length ? "" : `<p class="empty">등록된 조직이 없습니다.</p>`}
    ${chron}
  </section>`;
}
function people() {
  const list = facChars(), f = S.factions[S.fac], led = S.fac === "ledger";
  const none = `<p class="empty">등록된 캐릭터가 없습니다.</p>`;
  const drag = S.user ? 'draggable="true"' : "";
  const info = c => !c.gender || (!c.gender.includes("·") && (c.height || c.nation)) ? [c.gender, c.height, c.nation].filter(Boolean).join(" · ") : c.gender;
  const lcard = (c, i) => `<article ${drag} class="lcard ${c.id === S.openChar ? "sel" : ""}" data-id="${c.id}" data-a="char:${c.id}">
      <span class="no">NPC ${String(i + 1).padStart(2, "0")}</span><div class="lc-img" data-pos="char|${c.id}|thumbPos" ${bgAttr(c.thumb, c.thumbPos)}></div>
      <div class="lc-t"><h4>${esc(c.name)}</h4><p class="meta"><span><small>AGE</small>${esc(c.age)}</span><span><small>HEIGHT</small>${esc(c.height)}</span><span><small>AFFIL.</small>${esc(c.role)}</span></p>
      ${c.brief ? `<div class="brief">${inl(c.brief)}</div>` : ""}</div></article>`;
  const pcard = c => `<div ${drag} class="pcard ${c.id === S.openChar ? "flip" : ""}" data-id="${c.id}" data-a="char:${c.id}"><div class="pc-in">
      <div class="pc-f ${c.front ? "img" : ""}" data-pos="char|${c.id}|frontPos" ${bgAttr(c.front, c.frontPos)}>${S.fac === "ww" ? `<b>${esc(c.cardNo || c.num)}</b>` : ""}${c.front ? "" : SIL}
        ${S.fac === "milgram" ? `<div class="ft"><small>${esc(c.frontSub)}</small><strong>${esc(c.frontMain)}</strong></div>` : ""}</div>
      <div class="pc-b" data-pos="char|${c.id}|thumbPos" ${bgAttr(c.thumb, c.thumbPos)}><b>${esc(c.name)}</b><i></i><span>${esc(info(c))}</span><span>${esc(c.role)}</span></div>
    </div></div>`;
  const block = (cs, g) => `<div class="${led ? "lgrid" : "pgrid"}" ${g == null ? "" : `data-group="${esc(g)}"`}>${cs.map(led ? lcard : pcard).join("")}${cs.length ? "" : none}</div>`;
  const head = (name, en, n) => `<div class="grp"><b>${esc(name)}</b><small>${esc(en)}</small><i></i><span>${String(n).padStart(2, "0")}</span></div>`;
  const groups = (f.groups || []).filter(g => g.name);
  let body;
  if (groups.length) {
    const names = groups.map(g => g.name), rest = list.filter(c => !names.includes(c.group));
    body = groups.map(g => { const cs = list.filter(c => c.group === g.name); return head(g.name, g.en, cs.length) + block(cs, g.name); }).join("")
      + (rest.length ? head("미분류", "", rest.length) + block(rest, "") : "");
  } else body = list.length ? block(list, null) : none;
  return `<section id="people" class="sec wrap">
    <div class="sec-h"><div><h2>Personnel</h2><small>주요 인물 · ${list.length} · 카드를 누르면 정보 열람${S.user ? " · 드래그로 순서 변경" : ""}</small></div><div class="r">${ed("fgroups", "그룹 편집")} ${ed("newchar", "+ 캐릭터 추가")}</div></div>
    ${body}
    <div id="file"></div></section>`;
}
const memoTags = m => [...new Set([...(m.charIds || []).map(id => { const c = S.chars.find(x => x.id === id); return c ? (c.name || c.num) : null; }), ...(m.tags || [])].filter(Boolean))];
const memoDate = m => m.at ? new Date(m.at).toLocaleDateString("sv").replaceAll("-", ".") : "";
const memoHtml = m => `<article class="memo tg"><button class="memo-h tg-h" data-a="tog"><h4>${esc(m.title || String(m.body || "").slice(0, 40) || "제목 없음")}</h4>
    <span class="tags">${memoTags(m).map(t => `<span>#${esc(t)}</span>`).join("")}</span><time>${memoDate(m)}</time><span class="plus">+</span></button>
  <div class="tg-b">${fmt(m.body)}
    ${(m.imgs || []).some(x => x.img) ? `<div class="agrid">${m.imgs.filter(x => x.img).map(x => `<figure data-a="full:${x.img}"><div data-img="${thumbId(x.img)}"></div></figure>`).join("")}</div>` : ""}
    <p>${ed("memo:" + m.id)}</p></div></article>`;
function memoList() {
  const q = (S.q || "").trim().toLowerCase();
  const list = S.memos.filter(m => (!S.tag || memoTags(m).includes(S.tag)) && (!q || ((m.title || "") + " " + (m.body || "")).toLowerCase().includes(q)));
  return (list.slice(0, S.memoN).map(memoHtml).join("") || `<p class="empty">메모가 없습니다.</p>`)
    + (list.length > S.memoN ? `<button class="btn more" data-a="more">더 보기 (${list.length - S.memoN})</button>` : "");
}
function drawMemos() { const box = document.getElementById("memos"); box.innerHTML = memoList(); hydrate(box); }
function trivia() {
  const tags = [...new Set(S.memos.flatMap(memoTags))];
  if (S.tag && !tags.includes(S.tag)) S.tag = "";
  return `<section id="trivia" class="sec wrap">
    <div class="sec-h"><div><h2>Trivia</h2><small>작가 메모 · ${S.memos.length} · 제목을 누르면 펼쳐집니다</small></div><div class="r">${ed("newmemo", "+ 메모 추가")}</div></div>
    <input id="memo-q" class="memo-q" placeholder="제목 · 내용 검색" value="${esc(S.q)}">
    <div class="chips"><button class="${S.tag ? "" : "on"}" data-a="tag:">전체</button>${tags.map(t => `<button class="${t === S.tag ? "on" : ""}" data-a="tag:${esc(t)}">#${esc(t)}</button>`).join("")}</div>
    <div id="memos">${memoList()}</div>
    <footer class="end"><div class="barcode"></div><span>© AFTERMESS</span></footer></section>`;
}
function fileHtml(c) {
  const has = c.useProfile !== false, cur = !has && S.tab === "profile" ? "assets" : S.tab;
  const tab = (k, l) => `<button class="${cur === k ? "on" : ""}" data-a="tab:${k}">${l}</button>`;
  let body;
  if (cur === "assets") {
    const a = (c.assets || []).filter(x => x.img);
    body = `<div class="file-pad"><div class="agrid">${a.map(x => `<figure ${S.user ? 'draggable="true"' : ""} class="asset" data-asset="${x.img}" data-a="full:${x.img}"><div data-img="${thumbId(x.img)}"></div><button class="ax" data-a="delasset:${c.id}:${x.img}" title="삭제">✕</button></figure>`).join("")}</div>
      ${a.length ? "" : `<p class="empty">등록된 에셋이 없습니다.</p>`}
      <p class="adm" style="margin-top:14px"><label class="btn" style="cursor:pointer">+ 사진 추가 (여러 장 선택 가능)<input type="file" id="asset-add" data-char="${c.id}" accept="image/*" multiple hidden></label> <span style="font-size:11px;color:var(--fg3);margin-left:8px">드래그로 순서 변경 · ✕로 삭제</span></p></div>`;
  } else if (cur === "memo") {
    const ms = S.memos.filter(m => (m.charIds || []).includes(c.id));
    body = `<div class="file-pad">${ms.map(memoHtml).join("") || `<p class="empty">이 캐릭터의 메모가 없습니다. Trivia에서 메모에 이 캐릭터 태그를 붙이면 여기에 나옵니다.</p>`}</div>`;
  } else body = renderProfile(c, { pos: `char|${c.id}|mainImgPos` });
  return `<div class="file"><div class="tabs">${has ? tab("profile", esc(c.num || c.name || "PROFILE")) : ""}${tab("assets", "ASSET")}${tab("memo", "MEMO")}<span class="sp"></span>${ed("char:" + c.id, "캐릭터 편집")}</div><div class="file-b">${body}</div></div>`;
}
function drawFile(scroll) {
  const box = document.getElementById("file"); if (!box) return;
  const c = S.chars.find(x => x.id === S.openChar);
  box.innerHTML = c ? fileHtml(c) : "";
  hydrate(box);
  if (c && scroll) setTimeout(() => box.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
}
function render() {
  document.body.dataset.faction = S.fac;
  app.innerHTML = hero(S.site) + world(S.site) + faction(S.factions[S.fac]) + people() + trivia();
  drawFile();
  hydrate(app);
}

// ---------- 편집 ----------
const T = (k, label, ph) => ({ k, label, ph });
const A = (k, label) => ({ k, label, type: "area" });
const facForm = (title, schema) => openForm({ title, schema, data: S.factions[S.fac], onSave: async v => { await saveFaction(S.fac, v); render(); } });
const charSchema = () => {
  const fac = S.fac, led = fac === "ledger";
  const gs = (S.factions[fac].groups || []).filter(g => g.name);
  const posHint = "저장한 뒤 카드 이미지를 더블클릭하면 위치를 조정할 수 있습니다.";
  return [
    { type: "head", label: "목록 카드", open: true },
    T("name", "이름 (카드에 표시)", "SEVEN"),
    ...(gs.length ? [{ k: "group", label: "그룹", type: "select", options: [["", "(미분류)"], ...gs.map(g => [g.name, g.name])] }] : []),
    ...(fac === "ww" ? [T("cardNo", "NUMBER (카드 앞면 좌상단)", "07")] : []),
    ...(fac === "milgram" ? [T("frontSub", "소속 (카드 앞면 작은 글)", "MAIN ELEMENT"), T("frontMain", "DIV (카드 앞면 굵은 글)", "HIGH COMMAND")] : []),
    ...(led ? [] : [{ k: "front", label: "카드 앞면 이미지", type: "inline", max: 480, limit: 90000, hint: "비워 두면 기본 실루엣이 나옵니다. " + posHint }]),
    { k: "thumb", label: led ? "카드 이미지" : "카드 뒷면 이미지", type: "inline", max: led ? 960 : 480, limit: led ? 160000 : 90000, hint: posHint },
    ...(led ? [] : [T("gender", "성별 · 신장 · 국적 (카드 뒷면)", "Male · 189cm · HKG")]),
    T("role", led ? "소속 (카드에 표시)" : "직무 (카드 뒷면)", led ? "현장운영국 국장 · D-2 Director" : "Entry-Fragger"),
    ...(led ? [{ k: "brief", label: "한 줄 설명 (카드에 표시)", type: "area" }] : []),
    ...PROFILE_FIELDS];
};
const memoSchema = () => [T("title", "제목"), A("body", "내용"),
  { k: "imgs", label: "이미지", type: "list", item: "이미지", fields: [{ k: "img", label: "이미지", type: "img", thumb: true }] },
  { k: "charIds", label: "캐릭터 태그 (붙인 캐릭터의 MEMO 탭에도 들어갑니다)", type: "pills", all: true, options: S.chars.map(c => [c.id, c.name || c.num || "이름 없음"]) },
  { k: "tags", label: "태그", type: "pills", add: true, options: [...new Set(["세계관", ...S.memos.flatMap(m => m.tags || [])])].map(t => [t, t]) }];
function editMemo(m, isNew) {
  openForm({ title: isNew ? "메모 추가" : "메모 편집", schema: memoSchema(), data: m,
    onSave: async v => { await saveMemo(v); render(); },
    onDelete: isNew ? null : async () => { await delMemo(m.id); render(); } });
}
const EDIT = {
  hero: () => openForm({ title: "메인 화면", schema: [{ k: "kicker", label: "좌측 상단 작은 문구", type: "area", hint: "줄바꿈 가능" }, { k: "heroImg", label: "대표 사진", type: "img", hint: "저장한 뒤 사진을 더블클릭하면 위치를 조정할 수 있습니다." }, { k: "logo", label: "로고 이미지", type: "img", hint: "저장한 뒤 로고를 더블클릭하면 드래그로 위치, 휠로 크기를 조정할 수 있습니다." }], data: S.site, onSave: async v => { await saveSite(v); render(); } }),
  syn: () => openForm({ title: "시놉시스", schema: [{ k: "syn", label: "연도별 칸", type: "list", item: "칸", fields: [T("year", "연도", "2030"), T("label", "연도 아래 작은 글", "핵전쟁 발발"), A("body", "옆에 들어갈 글")] }], data: S.site, onSave: async v => { await saveSite(v); render(); } }),
  timeline: () => openForm({ title: "타임라인", schema: [{ k: "eras", label: "시대", type: "list", item: "시대", fold: ["name", "range"], fields: [T("name", "이름", "붕괴기"), T("en", "영문", "COLLAPSE"), T("range", "기간", "2030 — 2038"), { k: "img", label: "이미지", type: "img" },
    { k: "events", label: "사건", type: "list", item: "사건", fold: ["date", "title"], fields: [T("date", "날짜", "2030 03.02"), T("title", "제목"), A("desc", "설명 (선택)"), { k: "dot", label: "점 색", type: "select", options: [["", "자동 (처음과 끝만 진영 색)"], ["white", "흰색"], ["accent", "진영 색"], ["hollow", "빈 네모"]] }] }] }], data: S.site, onSave: async v => { await saveSite(v); render(); } }),
  forg: k => openForm({ title: `${S.factions[k].name} · World 요약`, schema: [T("short", "짧은 이름", "W.W"), { k: "tagline", label: "좌측 상단 문구", type: "area", hint: "예: Dead Zone / Insurgent Cell" }, { k: "est", label: "설립 정보", type: "area", hint: "예: EST. 2071. 12. 25 / Volgograd, Russia" }, { k: "banner", label: "배너 이미지", type: "img" }, A("summary", "요약 설명")], data: S.factions[k], onSave: async v => { await saveFaction(k, v); render(); } }),
  fgroups: () => facForm("캐릭터 그룹", [{ k: "groups", label: "그룹 (비워 두면 구분 없이 한 목록으로 표시)", type: "list", item: "그룹", fields: [T("name", "이름", "본대"), T("en", "영문", "MAIN ELEMENT")] }]),
  fhead: () => facForm("진영 머리말", [T("name", "진영 이름"), T("sub", "부제", "// classified, HQ COMMANDER"), A("quote", "인용문 (영문)"), A("quoteKo", "인용문 (번역)"), T("quoteSrc", "출처", "INTERCEPT 2078 / UNVERIFIED")]),
  fov: () => facForm("Overview", [{ k: "overview", label: "항목", type: "list", fields: [T("title", "제목", "연혁"), T("en", "영문", "ORIGIN"), A("body", "내용")] }]),
  fmap: () => facForm("지도 · 도면", [T("mapTitle", "섹션 제목", "Territory"), T("mapSub", "설명"), { k: "mapImg", label: "지도 이미지", type: "img" }]),
  funits: () => facForm("조직 구성", [T("unitsTitle", "섹션 제목", "Squad"), T("unitsSub", "설명"), T("unitsLabel", "우측 표시 글 (비우면 개수 자동 표시)", "3 SQD"), { k: "units", label: "조직", type: "list", item: "조직", fields: [T("code", "코드", "SQD. 01"), T("tag", "우측 태그", "ASSAULT"), T("name", "이름", "강습타격대"), T("sub", "부가 설명"), { k: "img", label: "이미지", type: "img" }, A("body", "펼쳤을 때 내용")] }]),
  fchron: () => facForm("Chronicle", [T("chronTitle", "섹션 제목"), T("chronSub", "설명", "주요 작전 연표 · 2071 — 2080"), { k: "chron", label: "사건", type: "list", item: "사건", fields: [T("date", "날짜", "2071. 11. 09"), T("tag", "우측 태그", "FIRST RECORD"), T("title", "제목"), A("body", "내용")] }]),
  newchar: () => {
    const c = { id: newId("c"), faction: S.fac, order: facChars().reduce((m, c) => Math.max(m, Number(c.order) || 0), -1) + 1, affil: [], tracks: [], assets: [] };
    openForm({ title: `캐릭터 추가 · ${S.factions[S.fac].name}`, schema: charSchema(), data: c, onSave: async v => { await saveChar(v); S.openChar = v.id; S.tab = "profile"; render(); } });
  },
  char: id => {
    const c = S.chars.find(x => x.id === id);
    openForm({ title: `캐릭터 편집 · ${c.name || ""}`, schema: charSchema(), data: c, onSave: async v => { await saveChar(v); render(); },
      onDelete: async () => { await delChar(id); S.openChar = null; render(); } });
  },
  assets: id => {
    const c = S.chars.find(x => x.id === id);
    openForm({ title: `에셋 · ${c.name || ""}`, schema: [{ k: "assets", label: "이미지", type: "list", item: "이미지", fields: [{ k: "img", label: "이미지", type: "img", thumb: true }, T("cap", "설명 (선택)")] }], data: c, onSave: async v => { await saveChar(v); render(); } });
  },
  memo: id => editMemo(S.memos.find(m => m.id === id)),
  newmemo: () => editMemo({ id: newId("m"), title: "", body: "", imgs: [], charIds: [], tags: [], at: Date.now() }, true)
};

// ---------- 동작 ----------
const ACT = {
  theme() {
    const t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("afms-theme", t); } catch (e) {}
    themeLabel();
  },
  async login() {
    if (S.user) { await signOut(auth).catch(() => {}); return toast("로그아웃했습니다"); }
    const m = document.getElementById("modal");
    m.innerHTML = `<form class="mbox" style="width:min(360px,100%)"><header><h3>로그인</h3><button type="button" class="btn" data-x>닫기</button></header>
      <div class="mbody"><div class="fld"><label>이메일</label><input type="email" name="email" autocomplete="username" required></div>
      <div class="fld"><label>비밀번호</label><input type="password" name="pw" autocomplete="current-password" required></div>
      <div class="hint" id="login-msg" style="color:var(--c-ww);font-size:12px"></div></div>
      <footer><span style="flex:1"></span><button class="btn pri">로그인</button></footer></form>`;
    m.classList.add("on");
    const close = () => { m.classList.remove("on"); m.innerHTML = ""; };
    m.querySelector("[data-x]").onclick = close;
    m.querySelector("form").onsubmit = async e => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector(".pri");
      btn.disabled = true;
      try { await signInWithEmailAndPassword(auth, f.email.value.trim(), f.pw.value); close(); toast("로그인했습니다"); }
      catch (err) {
        console.error(err); btn.disabled = false;
        f.querySelector("#login-msg").textContent = "로그인하지 못했습니다. 이메일과 비밀번호를 확인하세요.";
      }
    };
    m.querySelector("input").focus();
  },
  editor: openEditor, back: closeEditor,
  fac(k) { S.fac = k; S.openChar = null; render(); },
  go(k) { S.fac = k; S.openChar = null; render(); document.getElementById("faction").scrollIntoView(); },
  tog(_, el) { el.closest(".tg").classList.toggle("open"); },
  togall(_, el) {
    const all = [...el.closest("section").querySelectorAll(".chr")], open = all.every(x => x.classList.contains("open"));
    all.forEach(x => x.classList.toggle("open", !open));
  },
  char(id) {
    S.openChar = S.openChar === id ? null : id;
    S.tab = S.chars.find(c => c.id === id)?.useProfile === false ? "assets" : "profile";
    document.querySelectorAll(".pcard").forEach(el => el.classList.toggle("flip", el.dataset.id === S.openChar));
    document.querySelectorAll(".lcard").forEach(el => el.classList.toggle("sel", el.dataset.id === S.openChar));
    drawFile();
  },
  tab(k) { S.tab = k; drawFile(); },
  tag(t, el) {
    S.tag = t; S.memoN = 20;
    el.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === el));
    drawMemos();
  },
  more() { S.memoN += 20; drawMemos(); },
  secret(_, el) { toggleSecret(el); },
  full(id, el) {
    const ids = [...(el.closest(".agrid")?.querySelectorAll("[data-a^='full:']") || [el])].map(x => x.dataset.a.slice(5));
    lightbox(ids, Math.max(0, ids.indexOf(id)));
  },
  async delasset(arg) {
    const [cid, img] = arg.split(":"), c = S.chars.find(x => x.id === cid);
    if (!c || !confirm("이 사진을 삭제할까요? 되돌릴 수 없습니다.")) return;
    try { await saveChar({ ...c, assets: (c.assets || []).filter(x => x.img !== img) }); delImage(img); toast("삭제했습니다"); }
    catch (e) { console.error(e); toast("삭제하지 못했습니다. " + why(e)); }
    drawFile();
  },
  trk(_, el) { toggleTrack(el); },
  trkopen(_, el) { toggleTrackText(el); },
  edit(arg) { const i = arg.indexOf(":"), k = i < 0 ? arg : arg.slice(0, i); EDIT[k](i < 0 ? undefined : arg.slice(i + 1)); }
};
document.addEventListener("click", e => {
  if (e.target.closest("#lb")) { const b = e.target.closest("[data-lb]"); return b ? lbStep(+b.dataset.lb) : lbClose(); }
  const el = e.target.closest("[data-a]"); if (!el) return;
  const a = el.dataset.a, i = a.indexOf(":"), name = i < 0 ? a : a.slice(0, i);
  if (name === "edit") e.stopPropagation();
  ACT[name]?.(i < 0 ? "" : a.slice(i + 1), el);
});
const themeLabel = () => document.getElementById("btn-theme").textContent = document.documentElement.dataset.theme === "light" ? "Dark" : "Light";
themeLabel();
onAuthStateChanged(auth, u => {
  S.user = u; document.body.classList.toggle("admin", !!u);
  if (S.site) render();
  document.getElementById("btn-login").textContent = u ? "Logout" : "Login";
});

// ---------- 로딩 화면 ----------
const ldN = document.getElementById("ld-n"), ldF = document.getElementById("ld-fill"), ldS = document.getElementById("ld-s");
let goal = 6, cur = 0;
(function tick() {
  cur += Math.max(0.4, (goal - cur) * 0.1); if (cur > goal) cur = goal;
  ldN.textContent = Math.round(cur); ldF.setAttribute("width", (132 * cur / 100).toFixed(1));
  ldS.textContent = cur < 40 ? "AIR INTAKE" : cur < 80 ? "FILTERING PARTICLES" : cur < 100 ? "SEAL CHECK" : "CLEAR";
  if (cur < 100) requestAnimationFrame(tick);
  else setTimeout(() => document.getElementById("loader").classList.add("done"), 350);
})();
(async () => {
  let failed = false;
  try { await loadAll(() => goal = Math.min(85, goal + 20)); }
  catch (e) { console.error(e); failed = true; useDefaults(); }
  render();
  await Promise.race([getImage(S.site.heroImg), new Promise(r => setTimeout(r, 6000))]);
  goal = 100;
  if (failed) toast("데이터를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.");
})();

// ---------- 메인 화면 넘김: 메인에서 아래로 굴리면 한 번에 다음 화면으로 넘어간다 ----------
let sliding = false;
const heroH = () => document.getElementById("top")?.offsetHeight || innerHeight;
const blocked = () => document.body.classList.contains("in-editor") || document.getElementById("modal").classList.contains("on") || document.body.classList.contains("adjusting") || document.getElementById("lb").classList.contains("on") || !document.getElementById("loader").classList.contains("done");
function slideTo(to) {
  sliding = true;
  const from = scrollY, t0 = performance.now(), dur = 550;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  (function step(now) {
    const t = Math.min(1, (now - t0) / dur);
    scrollTo({ top: from + (to - from) * ease(t), behavior: "instant" });
    if (t < 1) requestAnimationFrame(step); else setTimeout(() => sliding = false, 150);
  })(t0);
}
// dir > 0: 아래로. 넘김을 처리했으면 true
function pageTurn(dir) {
  if (blocked()) return false;
  if (sliding) return true;
  const h = heroH(), y = scrollY;
  if (dir > 0 && y < h - 2) { slideTo(h); return true; }
  if (dir < 0 && y > 0 && y <= h + 2) { slideTo(0); return true; }
  return false;
}
addEventListener("wheel", e => { if (!e.ctrlKey && pageTurn(e.deltaY)) e.preventDefault(); }, { passive: false });
addEventListener("keydown", e => {
  if (e.target.closest("input,textarea,select")) return;
  const d = ["ArrowDown", "PageDown", " "].includes(e.key) ? 1 : ["ArrowUp", "PageUp"].includes(e.key) ? -1 : 0;
  if (d && pageTurn(d)) e.preventDefault();
});
let ty = null;
addEventListener("touchstart", e => { ty = e.touches[0].clientY; }, { passive: true });
addEventListener("touchmove", e => {
  if (ty == null || blocked()) return;
  const d = ty - e.touches[0].clientY, h = heroH();
  if (sliding || (d > 0 && scrollY < h - 2) || (d < 0 && scrollY > 0 && scrollY <= h + 2)) {
    if (e.cancelable) e.preventDefault();
    if (Math.abs(d) > 30 && pageTurn(d)) ty = null;
  }
}, { passive: false });

// ---------- 이미지 위치 조정: 로그인 상태에서 이미지를 더블클릭 ----------
let adj = null, drag = null;
const adjBar = document.getElementById("adj");
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
function applyAdj() {
  const { t, move, x, y, w } = adj;
  if (move) { t.style.left = x + "%"; t.style.top = y + "%"; t.style.width = w + "%"; }
  else if (t.tagName === "IMG") t.style.objectPosition = `${x}% ${y}%`;
  else t.style.backgroundPosition = `${x}% ${y}%`;
}
function startAdjust(box) {
  const move = box.classList.contains("hero-logo");
  const t = box.querySelector(":scope > .pos-t") || box, cs = getComputedStyle(t);
  const cur = move ? [parseFloat(t.style.left), parseFloat(t.style.top)]
    : (t.tagName === "IMG" ? cs.objectPosition : cs.backgroundPosition).split(" ").map(parseFloat);
  adj = { box, t, move, path: box.dataset.pos, x: isNaN(cur[0]) ? 50 : cur[0], y: isNaN(cur[1]) ? 50 : cur[1], w: parseFloat(t.style.width) || 60 };
  document.body.classList.add("adjusting"); box.classList.add("adj-on");
  box.closest(".pcard")?.classList.toggle("flip", box.classList.contains("pc-b"));
  getSelection()?.removeAllRanges();
  adjBar.innerHTML = `<span>${move ? "드래그로 이동 · 휠로 크기 조절" : "드래그해서 이미지 위치 조정"}</span><button data-adj="save">저장</button><button data-adj="cancel">취소</button>`;
  adjBar.classList.add("on");
}
async function endAdjust(save) {
  const a = adj; adj = null; drag = null;
  document.body.classList.remove("adjusting"); a.box.classList.remove("adj-on"); adjBar.classList.remove("on");
  if (save) {
    const [kind, p1, p2] = a.path.split("|");
    const src = kind === "site" ? S.site : kind === "fac" ? S.factions[p1] : S.chars.find(c => c.id === p1);
    const v = structuredClone(src), key = kind === "site" ? p1 : p2;
    if (a.move) { v.logoX = +a.x.toFixed(1); v.logoY = +a.y.toFixed(1); v.logoW = +a.w.toFixed(1); }
    else { const ks = key.split("."); let o = v; ks.slice(0, -1).forEach(k => o = o[k]); o[ks.at(-1)] = `${a.x.toFixed(1)}% ${a.y.toFixed(1)}%`; }
    try { await (kind === "site" ? saveSite(v) : kind === "fac" ? saveFaction(p1, v) : saveChar(v)); toast("위치를 저장했습니다"); }
    catch (e) { console.error(e); toast("저장하지 못했습니다. " + why(e)); }
  }
  render();
}
document.addEventListener("dblclick", e => {
  if (!S.user || adj) return;
  const box = e.target.closest("[data-pos]");
  if (box) { e.preventDefault(); startAdjust(box); }
});
document.addEventListener("pointerdown", e => {
  if (!adj || e.target.closest("#adj") || !adj.box.contains(e.target)) return;
  e.preventDefault(); drag = { px: e.clientX, py: e.clientY };
}, true);
document.addEventListener("pointermove", e => {
  if (!adj || !drag) return;
  const r = (adj.move ? adj.box.parentElement : adj.box).getBoundingClientRect();
  const dx = (e.clientX - drag.px) / r.width * 100, dy = (e.clientY - drag.py) / r.height * 100;
  drag = { px: e.clientX, py: e.clientY };
  adj.x = clamp(adj.x + (adj.move ? dx : -dx)); adj.y = clamp(adj.y + (adj.move ? dy : -dy));
  applyAdj();
});
document.addEventListener("pointerup", () => drag = null);
document.addEventListener("dragstart", e => { if (adj) e.preventDefault(); });
document.addEventListener("click", e => {
  if (!adj) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const b = e.target.closest("[data-adj]");
  if (b) endAdjust(b.dataset.adj === "save");
}, true);
addEventListener("wheel", e => {
  if (!adj?.move) return;
  e.preventDefault(); adj.w = clamp(adj.w * (1 - e.deltaY * 0.001), 5, 100); applyAdj();
}, { passive: false });

// ---------- 캐릭터 순서: 로그인 상태에서 카드를 끌면 다른 카드가 밀려나고, 놓으면 저장된다 ----------
let dragEl = null, dragLock = 0;
const CARD = ".pcard,.lcard,.asset";
function flip(change) {
  const els = [...document.querySelectorAll("#people .pcard, #people .lcard, #people .asset")];
  const before = new Map(els.map(el => [el, el.getBoundingClientRect()]));
  change();
  els.forEach(el => {
    const a = before.get(el), b = el.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
    if (!dx && !dy) return;
    el.style.transition = "none"; el.style.transform = `translate(${dx}px,${dy}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = "transform .25s ease"; el.style.transform = ""; }));
  });
  dragLock = performance.now() + 260;
}
document.addEventListener("dragstart", e => {
  const el = e.target.closest?.(CARD);
  if (adj || !el || !S.user) return;
  dragEl = el; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", el.dataset.id);
  setTimeout(() => el.classList.add("dragging"));
});
document.addEventListener("dragover", e => {
  if (!dragEl) return;
  const over = e.target.closest(CARD), box = e.target.closest("#people .pgrid, #people .lgrid");
  const asset = dragEl.matches(".asset");
  if (asset ? !over?.matches(".asset") : (over?.matches(".asset") || (!over && !box))) return;
  e.preventDefault();
  if (performance.now() < dragLock) return;
  if (over && over !== dragEl) {
    const r = over.getBoundingClientRect();
    const after = over.matches(".lcard") ? e.clientY > r.top + r.height / 2 : e.clientX > r.left + r.width / 2;
    if (after ? over.nextElementSibling === dragEl : over.previousElementSibling === dragEl) return;
    flip(() => over.parentNode.insertBefore(dragEl, after ? over.nextElementSibling : over));
  } else if (!over && box && !box.contains(dragEl)) flip(() => box.prepend(dragEl));
});
document.addEventListener("drop", e => { if (dragEl) e.preventDefault(); });
document.addEventListener("dragend", async () => {
  if (!dragEl) return;
  const asset = dragEl.matches(".asset");
  dragEl.classList.remove("dragging"); dragEl = null;
  if (asset) {
    // 에셋: 화면에 놓인 순서대로 저장
    const c = S.chars.find(x => x.id === S.openChar); if (!c) return;
    const order = [...document.querySelectorAll("#file .asset")].map(el => el.dataset.asset);
    const next = order.map(id => (c.assets || []).find(x => x.img === id)).filter(Boolean);
    if (next.map(x => x.img).join() === (c.assets || []).filter(x => x.img).map(x => x.img).join()) return;
    try { await saveChar({ ...c, assets: next }); toast("순서를 저장했습니다"); }
    catch (err) { console.error(err); toast("순서를 저장하지 못했습니다. " + why(err)); drawFile(); }
    return;
  }
  // 화면에 놓인 순서와 그룹을 그대로 저장한다
  const changed = [];
  document.querySelectorAll("#people .pcard, #people .lcard").forEach((el, n) => {
    const c = S.chars.find(x => x.id === el.dataset.id); if (!c) return;
    const g = el.closest("[data-group]")?.dataset.group ?? (c.group || "");
    if (String(c.order) !== String(n) || (c.group || "") !== g) changed.push({ ...c, order: n, group: g });
  });
  if (!changed.length) return;
  try { for (const c of changed) await saveChar(c); toast("순서를 저장했습니다"); }
  catch (err) { console.error(err); toast("순서를 저장하지 못했습니다. " + why(err)); }
  render();
});

document.addEventListener("input", e => {
  if (e.target.id !== "memo-q") return;
  S.q = e.target.value; S.memoN = 20; drawMemos();
});

// ---------- 에셋: 사진을 고르면 바로 올린다 (여러 장 가능) ----------
document.addEventListener("change", async e => {
  const inp = e.target;
  if (inp.id !== "asset-add") return;
  const files = [...inp.files], c = S.chars.find(x => x.id === inp.dataset.char);
  if (!files.length || !c) return;
  const added = [];
  try {
    for (let i = 0; i < files.length; i++) {
      toast(`사진 올리는 중… ${i + 1} / ${files.length}`);
      added.push({ img: await saveImage(files[i], { thumb: true }) });
    }
  } catch (err) { console.error(err); toast("일부 사진을 올리지 못했습니다. " + why(err)); }
  if (added.length) {
    try { await saveChar({ ...c, assets: [...(c.assets || []), ...added] }); if (added.length === files.length) toast(`사진 ${added.length}장을 추가했습니다`); }
    catch (err) { console.error(err); added.forEach(x => delImage(x.img)); toast("저장하지 못했습니다. " + why(err)); }
  }
  drawFile();
});
document.addEventListener("keydown", e => {
  if (!document.getElementById("lb").classList.contains("on")) return;
  if (e.key === "ArrowRight") lbStep(1); else if (e.key === "ArrowLeft") lbStep(-1); else if (e.key === "Escape") lbClose();
});
