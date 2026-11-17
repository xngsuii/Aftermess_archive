import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { S, FAC, loadAll, useDefaults, getImage, saveImage, delImage, thumbId, newId, saveSite, saveFaction, saveChar, delChar, saveMemo, delMemo } from "./store.js";
import { esc, inl, fmt, bgAttr, hydrate, toast, lightbox, lbStep, lbClose, openForm, why } from "./ui.js";
import { PROFILE_FIELDS, renderProfile, toggleTrack, toggleTrackText, toggleSecret, dragAxis, imgDelta } from "./profile.js";
import { openEditor, closeEditor } from "./editor.js";
import { PACT, hooks, drawPersona, openPersona, closePersona } from "./persona.js";

const app = document.getElementById("app");
S.fold = { people: false, chron: false };
S.view = null; // null: 메인 화면만. "world" | "faction" | "trivia": 메인 아래에 그 화면 하나만 붙는다
const ed = (what, label = "편집") => `<button class="ed" data-a="edit:${what}">${label}</button>`;
const SIL = `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><path d="M50 14c-13 0-21 10-21 24 0 9 3 17 8 22-2 4-6 6-14 9C10 74 4 84 2 100h96c-2-16-8-26-21-31-8-3-12-5-14-9 5-5 8-13 8-22 0-14-8-24-21-24z"/></svg>`;
// 태그 정렬: 숫자로 시작하는 것을 앞에(0 → 11 순), 나머지는 알파벳·가나다순
const tagCmp = (a, b) => { const na = /^\d/.test(a), nb = /^\d/.test(b); return na !== nb ? (na ? -1 : 1) : a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }); };
const charTag = c => c.num || c.name || "";
S.tags = []; // Trivia에서 고른 태그들 (하나라도 붙은 메모가 보인다)
S.q = ""; S.memoP = 0; // Trivia 검색어와 현재 쪽(0부터)
const MEMO_PER = 15;
const facChars = () => S.chars.filter(c => c.faction === S.fac);
const anyChar = id => S.chars.find(x => x.id === id) || S.personas.find(x => x.id === id);
const redraw = () => { drawFile(); drawPersona(); };

// ---------- 화면 ----------
// 메인 메뉴 글자 (BBH Bartle). data-t는 글리치 때 겹치는 빨간 글자
const mw = t => `<span class="mw" data-t="${esc(t)}">${esc(t)}</span>`;
// 큰 메뉴 오른쪽 위의 작은 번호 (보고 있는 진영 색)
const mn = n => `<sup class="mn" aria-hidden="true">${n}</sup>`;
function hero(s) {
  return `<section id="top" class="hero" data-pos="site|heroImgPos"><div class="hero-bg pos-t" ${bgAttr(s.heroImg, s.heroImgPos)}></div>${ed("hero", "메인 편집")}
    <p class="kicker">${inl(s.kicker)}</p>
    <nav class="hmenu open">
      <button class="${S.view === "world" ? "on" : ""}" data-a="view:world">${mw("WORLD")}${mn("01")}</button>
      <button class="${S.view === "faction" ? "on" : ""}" data-a="hmf">${mw("FACTION")}${mn("02")}</button>
      <div class="hm-sub"><div>${FAC.map(k => `<button data-faction="${k}" class="${S.view === "faction" && S.fac === k ? "on" : ""}" data-a="go:${k}">${mw(S.factions[k].short || S.factions[k].name)}</button>`).join("")}</div></div>
      <button class="${S.view === "trivia" ? "on" : ""}" data-a="view:trivia">${mw("TRIVIA")}${mn("03")}</button>
    </nav>
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
  const k = S.fac, pts = f.points || [], stats = (f.mapStats || []).filter(s => s.k || s.v);
  const note = String(f.mapNote || "").split("\n").map(l => esc(l.replace(/↵\s*$/, "").trim())).filter(Boolean).slice(0, 2).join("<br>");
  const chron = k === "ww" ? "" : `<div class="sec-h fold-h" id="s-chron" data-a="fold:chron"><div><h2>${esc(f.chronTitle)}</h2><small>${esc(f.chronSub)}</small></div>
      <div class="r">눌러서 열기 / 닫기 <button class="plus">${S.fold.chron ? "+" : "−"}</button> ${ed("fchron")}</div></div>
    <div class="chrs ${S.fold.chron ? "shut" : ""}" data-fold="chron">${(f.chron || []).map(c => `<article class="chr tg ${c.hot ? "hot" : ""}"><button class="tg-h" data-a="tog"><time>${esc(c.date)}</time><span class="tag">${esc(c.tag)}</span><i class="arr">↘</i><h4>${esc(c.title)}</h4></button>
      ${c.body ? `<div class="tg-b"><div>${fmt(c.body)}</div></div>` : ""}</article>`).join("") || `<p class="empty">연표 항목이 없습니다.</p>`}</div>`;
  return `<section id="faction" class="sec wrap">
    <nav class="fsel">${FAC.map(x => `<button data-faction="${x}" class="${x === k ? "on" : ""}" data-a="fac:${x}">${esc(S.factions[x].short || S.factions[x].name)}</button>`).join("")}</nav>
    <p class="kicker">AFTERMESS<br>2080 NEW ERA</p>
    <h2 class="fname">${esc(f.name)}</h2><p class="fsub">${esc(f.sub)} ${ed("fhead")}</p>
    ${f.quote || f.quoteKo ? `<blockquote class="quote"><div class="en">${fmt(f.quote)}</div><div class="ko">${fmt(f.quoteKo)}</div><cite>${esc(f.quoteSrc)}</cite></blockquote>` : ""}
    <div class="sec-h" id="s-ov"><div><h2>Overview</h2></div><div class="r">조직 개요 ${ed("fov")}</div></div>
    ${(f.overview || []).map(o => `<div class="ov"><h4>${esc(o.title)}<small>${esc(o.en)}</small></h4>${fmt(o.body)}</div>`).join("") || `<p class="empty">개요 항목이 없습니다.</p>`}
    <div class="sec-h" id="s-map"><div><h2>${esc(f.mapTitle)}</h2><small>${esc(f.mapSub)}</small></div><div class="r">${esc(f.mapLabel || (pts.length ? pts.length + " SITES" : ""))} ${ed("fmap")}</div></div>
    <div class="map ${f.mapImg ? "has" : ""}">${f.mapImg ? `<img data-img="${esc(f.mapImg)}" alt="">` : "MAP · 이미지 준비 중"}
      ${k === "milgram" ? "" : note ? `<p class="map-note">${note}</p>` : `<p class="map-note adm ph" data-a="edit:fmap">좌측 상단 글 1줄<br>좌측 상단 글 2줄 (눌러서 입력)</p>`}
      ${pts.map((p, i) => `<button class="pt ${p.hot ? "hot" : ""} ${p.side === "l" ? "l" : ""}" style="left:${Number(p.x ?? 50)}%;top:${Number(p.y ?? 50)}%" data-a="pt:${i}"><i></i><b>${esc(p.label)}</b></button>`).join("")}</div>
    ${stats.length ? `<div class="mstats">${stats.map(s => `<span>${esc(s.k)}<b>${esc(s.v)}</b></span>`).join("")}</div>` : ""}
    ${chron}
    <div class="sec-h" id="s-units"><div><h2>${esc(f.unitsTitle)}</h2><small>${esc(f.unitsSub)}</small></div><div class="r">${k === "milgram" ? "" : esc(f.unitsLabel || (f.units || []).length + " UNITS")} ${ed("funits")}</div></div>
    <div class="units">${(f.units || []).map((u, i) => `<article class="unit tg" data-pos="fac|${k}|units.${i}.imgPos"><div class="unit-img pos-t" ${bgAttr(u.img, u.imgPos)}></div>
      <button class="unit-top tg-h" data-a="tog"><span class="code">${esc(u.code)}</span><span class="tag">${esc(u.tag)}</span><h4>${esc(u.name)}</h4><p class="sub">${esc(u.sub)}</p><span class="plus">+</span></button>
      <div class="tg-b"><div>${fmt(u.body)}</div></div></article>`).join("")}</div>
    ${(f.units || []).length ? "" : `<p class="empty">등록된 조직이 없습니다.</p>`}
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
  const rest = groups.length ? list.filter(c => !groups.some(g => g.name === c.group)).length : 0;
  const count = groups.length ? [...groups.map(g => `${esc(g.name)} ${list.filter(c => c.group === g.name).length}`), ...(rest ? [`미분류 ${rest}`] : [])].join(" / ") : list.length;
  return `<section id="people" class="sec wrap">
    <div class="sec-h fold-h" id="s-people" data-a="fold:people"><div><h2>Personnel</h2><small>주요 인물 · ${count} · ${S.fac === "milgram" ? "칸을" : "카드를"} 누르면 정보 열람${S.user ? " · 드래그로 순서 변경" : ""}</small></div><div class="r">눌러서 열기 / 닫기 <button class="plus">${S.fold.people ? "+" : "−"}</button> ${ed("fgroups", "그룹 편집")} ${ed("newchar", "+ 캐릭터 추가")}</div></div>
    <div class="${S.fold.people ? "shut" : ""}" data-fold="people">${body}
    <div id="file"></div></div></section>`;
}
const memoTags = m => [...new Set([...(m.charIds || []).map(id => S.chars.find(x => x.id === id)).filter(Boolean)
  .sort((a, b) => FAC.indexOf(a.faction) - FAC.indexOf(b.faction) || tagCmp(charTag(a), charTag(b))).map(charTag), ...(m.tags || [])].filter(Boolean))];
const memoDate = m => m.at ? new Date(m.at).toLocaleDateString("sv").replaceAll("-", ".") : "";
const memoHtml = m => `<article class="memo tg"><button class="memo-h tg-h" data-a="tog"><h4>${esc(m.title || String(m.body || "").slice(0, 40) || "제목 없음")}</h4>
    <time>${memoDate(m)}</time><span class="plus">+</span></button>
  <div class="tg-b">${fmt(m.body)}
    ${(m.imgs || []).some(x => x.img) ? `<div class="agrid">${m.imgs.filter(x => x.img).map(x => `<figure data-a="full:${x.img}"><div data-img="${thumbId(x.img)}"></div></figure>`).join("")}</div>` : ""}
    <div class="tags">${memoTags(m).map(t => `<span>#${esc(t)}</span>`).join("")}</div>
    <p>${ed("memo:" + m.id)}</p></div></article>`;
function memoList() {
  const q = (S.q || "").trim().toLowerCase();
  const list = S.memos.filter(m => (!S.tags.length || S.tags.some(t => memoTags(m).includes(t))) && (!q || ((m.title || "") + " " + (m.body || "")).toLowerCase().includes(q)));
  // 한 쪽에 15개씩. 쪽이 많으면 처음·끝과 현재 쪽 주변만 번호를 보여 준다.
  const pages = Math.max(1, Math.ceil(list.length / MEMO_PER)), p = S.memoP = Math.min(Math.max(0, S.memoP), pages - 1);
  const nums = [...Array(pages).keys()].filter(i => pages <= 9 || i === 0 || i === pages - 1 || Math.abs(i - p) <= 2);
  const pager = pages < 2 ? "" : `<nav class="pager"><button data-a="page:${p - 1}" ${p ? "" : "disabled"}>‹</button>${nums.map((i, n) => (n && i - nums[n - 1] > 1 ? "<i>…</i>" : "") + `<button class="${i === p ? "on" : ""}" data-a="page:${i}">${i + 1}</button>`).join("")}<button data-a="page:${p + 1}" ${p < pages - 1 ? "" : "disabled"}>›</button></nav>`;
  return (list.slice(p * MEMO_PER, (p + 1) * MEMO_PER).map(memoHtml).join("") || `<p class="empty">메모가 없습니다.</p>`) + pager;
}
function drawMemos() { const box = document.getElementById("memos"); box.innerHTML = memoList(); hydrate(box); }
function trivia() {
  // 캐릭터 태그는 진영 순서대로(진영 안에서는 숫자 → 알파벳), 그 뒤에 일반 태그
  const used = new Set(S.memos.flatMap(memoTags));
  const chars = FAC.flatMap(k => S.chars.filter(c => c.faction === k).map(charTag).filter(t => used.has(t)).sort(tagCmp));
  const tags = [...new Set([...chars, ...[...used].filter(t => !chars.includes(t)).sort(tagCmp)])];
  S.tags = S.tags.filter(t => used.has(t));
  return `<section id="trivia" class="sec wrap">
    <div class="sec-h"><div><h2>Trivia</h2><small>작가 메모 · ${S.memos.length} · 제목을 누르면 펼쳐집니다</small></div><div class="r">${ed("newmemo", "+ 메모 추가")}</div></div>
    <input id="memo-q" class="memo-q" placeholder="제목 · 내용 검색" value="${esc(S.q)}">
    <div class="chips"><button class="${S.tags.length ? "" : "on"}" data-a="tag:">전체</button>${tags.map(t => `<button class="${S.tags.includes(t) ? "on" : ""}" data-a="tag:${esc(t)}">#${esc(t)}</button>`).join("")}</div>
    <div id="memos">${memoList()}</div>
    <footer class="end"><div class="barcode"></div><span>© AFTERMESS</span></footer></section>`;
}
// ASSET 탭 내용 (캐릭터 파일과 페르소나 파일이 같이 쓴다)
function assetsHtml(c) {
  const a = (c.assets || []).filter(x => x.img), groups = (c.assetGroups || []).filter(g => g.name), names = groups.map(g => g.name);
  const fig = x => `<figure ${S.user ? 'draggable="true"' : ""} class="asset" data-asset="${x.img}" data-a="full:${x.img}"><div data-img="${thumbId(x.img)}"></div><button class="ax" data-a="delasset:${c.id}:${x.img}" title="삭제">✕</button></figure>`;
  const add = (g, txt) => `<label class="btn adm" style="cursor:pointer">${txt}<input type="file" class="asset-add" data-char="${c.id}" data-g="${esc(g)}" accept="image/*" multiple hidden></label>`;
  const sect = (g, label) => { const xs = a.filter(x => g ? x.g === g : !names.includes(x.g));
    return `<div class="agsec ${xs.length ? "" : "adm"}"><div class="grp"><b>${esc(label)}</b><i></i><span>${String(xs.length).padStart(2, "0")}</span>${add(g, "+ 추가")}</div><div class="agrid" data-agroup="${esc(g)}">${xs.map(fig).join("")}</div></div>`; };
  return `<div class="file-pad" data-achar="${c.id}">${groups.length ? names.map(n => sect(n, n)).join("") + sect("", "미분류") : `<div class="agrid">${a.map(fig).join("")}</div>`}
    ${a.length ? "" : `<p class="empty">등록된 에셋이 없습니다.</p>`}
    <p class="adm" style="margin-top:14px">${groups.length ? "" : add("", "+ 사진 추가")} ${ed("agroups:" + c.id, "그룹 편집")} <span style="font-size:11px;color:var(--fg3);margin-left:8px">사진 파일을 끌어다 놓아도 추가됩니다 · 드래그로 순서${groups.length ? "·그룹" : ""} 변경 · ✕로 삭제 · 사진을 크게 연 뒤 아래쪽에서 설명 입력</span></p></div>`;
}
function fileHtml(c) {
  const has = c.useProfile !== false, cur = !has && S.tab === "profile" ? "assets" : S.tab;
  const tab = (k, l) => `<button class="${cur === k ? "on" : ""}" data-a="tab:${k}">${l}</button>`;
  let body;
  if (cur === "assets") body = assetsHtml(c);
  else if (cur === "memo") {
    const ms = S.memos.filter(m => (m.charIds || []).includes(c.id));
    body = `<div class="file-pad">${ms.map(memoHtml).join("") || `<p class="empty">이 캐릭터의 메모가 없습니다. Trivia에서 메모에 이 캐릭터 태그를 붙이면 여기에 나옵니다.</p>`}</div>`;
  } else body = renderProfile(c, { pos: `char|${c.id}|mainImgPos`, spos: `char|${c.id}|sideImg` });
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
  document.body.dataset.faction = document.documentElement.dataset.faction = S.fac;
  document.body.dataset.view = S.view || "";
  document.getElementById("facsw").innerHTML = FAC.map(k => { const f = S.factions[k];
    const toc = [["s-ov", "Overview"], ["s-map", f.mapTitle || "Territory"], ...(k === "ww" ? [] : [["s-chron", f.chronTitle || "Chronicle"]]), ["s-units", f.unitsTitle || "Squad"], ["s-people", "Personnel"]];
    return `<div class="fsw ${S.fac === k ? "on" : ""}" data-faction="${k}"><button class="${S.fac === k ? "on" : ""}" data-a="go:${k}">${esc(f.short || f.name)}</button>
      ${S.fac === k ? `<nav class="toc">${toc.map(([id, l]) => `<button data-a="jump:${id}" data-toc="${id}">${esc(l)}</button>`).join("")}</nav>` : ""}</div>`; }).join("");
  app.innerHTML = hero(S.site) + (S.view === "world" ? world(S.site) : S.view === "faction" ? faction(S.factions[S.fac]) + people() : S.view === "trivia" ? trivia() : "");
  drawFile();
  hydrate(app);
  drawPersona();
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
const memoSchema = () => [T("title", "제목"), { k: "body", label: "내용", type: "area", rows: 18 },
  { k: "imgs", label: "이미지", type: "imgs" },
  { type: "head", label: "태그" },
  { k: "charIds", label: "캐릭터 태그 (붙인 캐릭터의 MEMO 탭에도 들어갑니다)", type: "pills", all: true,
    groups: FAC.map(k => [k, S.factions[k]?.short || S.factions[k]?.name || k]),
    options: [...S.chars].sort((a, b) => FAC.indexOf(a.faction) - FAC.indexOf(b.faction) || tagCmp(charTag(a), charTag(b))).map(c => [c.id, charTag(c) || "이름 없음", c.faction]) },
  { k: "tags", label: "태그", type: "pills", add: true, options: [...new Set(["세계관", ...S.memos.flatMap(m => m.tags || []).sort(tagCmp)])].map(t => [t, t]) }];
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
  fmap: () => facForm("지도 · 도면", [T("mapTitle", "섹션 제목", "Territory"), T("mapSub", "설명"), { k: "mapImg", label: "지도 이미지", type: "img" },
    { k: "mapNote", label: "지도 좌측 상단 글 (두 줄까지, Enter로 줄 나눔)", type: "area", hint: "예: LEDGER HQ · B2F / FIELD OPERATIONS" },
    T("mapLabel", "우측 표시 글 (비우면 지점 수 자동 표시)", "5 SITES"),
    { k: "points", label: "지점 (위치는 저장한 뒤 지도에서 지점을 끌어서 옮깁니다)", type: "list", item: "지점", fold: ["label", "title"], fields: [
      T("label", "지도 위 이름", "VOLGOGRAD"), { k: "side", label: "이름 위치", type: "select", options: [["", "점 오른쪽"], ["l", "점 왼쪽"]] },
      { k: "hot", type: "check", def: false, label: "강조 (점을 진영 색으로)" },
      T("title", "설명 창 제목", "볼고그라드 본영"), T("tag", "제목 옆 태그", "HQ · 본대"), T("sub", "굵은 한 줄", "중앙지휘소 · 통신탑 · 보급창 3호"), A("desc", "설명")] },
    { k: "mapStats", label: "지도 아래 수치", type: "list", item: "수치", fields: [T("k", "항목", "실효 지배"), T("v", "값", "341,000 km²")] }]),
  funits: () => facForm("조직 구성", [T("unitsTitle", "섹션 제목", "Squad"), T("unitsSub", "설명"), T("unitsLabel", "우측 표시 글 (비우면 개수 자동 표시)", "3 SQD"), { k: "units", label: "조직", type: "list", item: "조직", fields: [T("code", "코드", "SQD. 01"), T("tag", "우측 태그", "ASSAULT"), T("name", "이름", "강습타격대"), T("sub", "부가 설명"), { k: "img", label: "이미지", type: "img" }, A("body", "펼쳤을 때 내용")] }]),
  fchron: () => facForm("Chronicle", [T("chronTitle", "섹션 제목"), T("chronSub", "설명", "주요 작전 연표 · 2071 — 2080"), { k: "chron", label: "사건", type: "list", item: "사건", fields: [T("date", "날짜", "2071. 11. 09"), T("tag", "우측 태그", "FIRST RECORD"), T("title", "제목"), { k: "hot", type: "check", def: false, label: "강조 (눈금과 태그를 진영 색으로)" }, A("body", "내용")], fold: ["date", "title"] }]),
  newchar: () => {
    const c = { id: newId("c"), faction: S.fac, order: facChars().reduce((m, c) => Math.max(m, Number(c.order) || 0), -1) + 1, affil: [{ k: "기관", v: "" }, { k: "소속", v: "" }, { k: "계급", v: "" }], tracks: [], assets: [] };
    openForm({ title: `캐릭터 추가 · ${S.factions[S.fac].name}`, schema: charSchema(), data: c, onSave: async v => { await saveChar(v); S.openChar = v.id; S.tab = "profile"; render(); } });
  },
  char: id => {
    const c = S.chars.find(x => x.id === id);
    openForm({ title: `캐릭터 편집 · ${c.name || ""}`, schema: charSchema(), data: c, onSave: async v => { await saveChar(v); render(); },
      onDelete: async () => { await delChar(id); S.openChar = null; render(); } });
  },
  agroups: id => {
    const c = anyChar(id);
    openForm({ title: `에셋 그룹 · ${c.name || c.num || ""}`, schema: [{ k: "assetGroups", label: "그룹 (비워 두면 구분 없이 한 목록으로 표시)", type: "list", item: "그룹", fields: [T("name", "이름", "일러스트")] }], data: c, onSave: async v => { await saveChar(v); redraw(); } });
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
  // 화면 고르기: 메인 아래에 붙이고 페이지 넘김으로 내려간다
  view(k) { S.view = k; S.openChar = null; render(); requestAnimationFrame(() => slideTo(heroH())); },
  go(k) { if (S.fac === k && S.view === "faction") return ACT.jump("s-ov"); S.fac = k; ACT.view("faction"); },
  // 목차: 해당 섹션으로 이동 (접혀 있으면 펼친다)
  jump(id) {
    const el = document.getElementById(id); if (!el) return;
    const k = el.dataset.a?.startsWith("fold:") && el.dataset.a.slice(5);
    if (k && S.fold[k]) ACT.fold(k, el);
    slideTo(el.getBoundingClientRect().top + scrollY - 72);
  },
  hmf(_, el) { el.closest(".hmenu").classList.toggle("open"); },
  top() { slideTo(0); },
  tog(_, el) { el.closest(".tg").classList.toggle("open"); },
  fold(k, el) {
    S.fold[k] = !S.fold[k];
    document.querySelector(`[data-fold="${k}"]`)?.classList.toggle("shut", S.fold[k]);
    el.querySelector(".plus").textContent = S.fold[k] ? "+" : "−";
  },
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
  // 태그를 누르면 켜고 끈다. 여러 개를 켤 수 있고, "전체"는 모두 끈다.
  tag(t, el) {
    S.tags = !t ? [] : S.tags.includes(t) ? S.tags.filter(x => x !== t) : [...S.tags, t];
    S.memoP = 0;
    el.parentElement.querySelectorAll("button").forEach(b => { const v = b.dataset.a.slice(4); b.classList.toggle("on", v ? S.tags.includes(v) : !S.tags.length); });
    drawMemos();
  },
  page(n) { S.memoP = +n; drawMemos(); document.getElementById("trivia")?.scrollIntoView({ behavior: "instant", block: "start" }); },
  secret(_, el) { toggleSecret(el); },
  full(id, el) {
    const pad = el.closest("[data-achar]"), asset = el.matches(".asset") && !!pad, cid = pad?.dataset.achar;
    const ids = [...(asset ? pad.querySelectorAll(".asset") : el.closest(".agrid")?.querySelectorAll("[data-a^='full:']") || [el])].map(x => x.dataset.a.slice(5));
    const c = asset && anyChar(cid), caps = {};
    if (c) (c.assets || []).forEach(x => { if (x.cap) caps[x.img] = x.cap; });
    lightbox(ids, Math.max(0, ids.indexOf(id)), !c ? {} : { caps, onCap: !S.user ? null : async (img, cap) => {
      const cur = anyChar(cid); if (!cur) return;
      try { await saveChar({ ...cur, assets: (cur.assets || []).map(x => x.img === img ? { ...x, cap } : x) }); toast("설명을 저장했습니다"); }
      catch (e) { console.error(e); toast("설명을 저장하지 못했습니다. " + why(e)); }
    } });
  },
  async delasset(arg) {
    const [cid, img] = arg.split(":"), c = anyChar(cid);
    if (!c || !confirm("이 사진을 삭제할까요? 되돌릴 수 없습니다.")) return;
    try { await saveChar({ ...c, assets: (c.assets || []).filter(x => x.img !== img) }); delImage(img); toast("삭제했습니다"); }
    catch (e) { console.error(e); toast("삭제하지 못했습니다. " + why(e)); }
    redraw();
  },
  pt(i, el) {
    if (ptMoved) return;
    const map = el.closest(".map"), old = map.querySelector(".pt-pop"), same = old?.dataset.i === i;
    old?.remove(); map.querySelectorAll(".pt.on").forEach(x => x.classList.remove("on"));
    const p = (S.factions[S.fac].points || [])[i];
    if (same || !p) return;
    el.classList.add("on");
    const pop = document.createElement("div"); pop.className = "pt-pop" + (p.hot ? " hot" : ""); pop.dataset.i = i;
    pop.innerHTML = `<h5>${esc(p.title || p.label)}<small>${esc(p.tag)}</small></h5>${p.sub ? `<strong>${esc(p.sub)}</strong>` : ""}${fmt(p.desc)}`;
    map.append(pop);
    const m = map.getBoundingClientRect(), d = el.querySelector("i").getBoundingClientRect(), w = pop.offsetWidth, hh = pop.offsetHeight;
    const cx = d.left + d.width / 2 - m.left, cy = d.top - m.top;
    let y = cy - hh - 12; if (y < 8) y = cy + d.height + 12;
    pop.style.left = Math.max(8, Math.min(m.width - w - 8, cx - w / 2)) + "px"; pop.style.top = y + "px";
  },
  trk(_, el) { toggleTrack(el); },
  trkopen(_, el) { toggleTrackText(el); },
  edit(arg) { const i = arg.indexOf(":"), k = i < 0 ? arg : arg.slice(0, i); EDIT[k](i < 0 ? undefined : arg.slice(i + 1)); }
};
Object.assign(ACT, PACT); hooks.assets = assetsHtml;
hooks.openChar = id => {
  const c = S.chars.find(x => x.id === id); if (!c) return;
  closePersona();
  S.view = "faction"; S.fac = c.faction; S.openChar = id; S.tab = c.useProfile === false ? "assets" : "profile";
  render(); drawFile(true);
};
document.addEventListener("click", e => {
  if (e.target.closest(".lb-cap.edit")) return;
  if (e.target.closest("#lb")) { const b = e.target.closest("[data-lb]"); return b ? lbStep(+b.dataset.lb) : lbClose(); }
  if (!e.target.closest(".pt,.pt-pop")) { document.querySelector(".pt-pop")?.remove(); document.querySelector(".pt.on")?.classList.remove("on"); }
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
const LD = document.getElementById("loader"), $l = id => document.getElementById(id), ldN = $l("lz-n"), ldS = $l("lz-s");
const ldRows = [...LD.querySelectorAll(".lz-seq li")], ldCells = [...LD.querySelectorAll(".lz-cells span")];
// 지도 위에서 차례로 깜빡이는 지점 [이름, 위도, 경도]
const CITIES = [["VOLGOGRAD", 48.708, 44.513], ["NEW YORK", 40.713, -74.006], ["SHANGHAI", 31.23, 121.474], ["HELSINKI", 60.17, 24.938],
  ["HONG KONG", 22.319, 114.169], ["MOSCOW", 55.756, 37.617], ["KYIV", 50.45, 30.523], ["SEOUL", 37.566, 126.978]];
const cityXY = ([, la, lo]) => [((lo - 5) * 5 / 3).toFixed(1), ((10.5 - la) * 5 / 3).toFixed(1)];
const dms = (v, pos, neg) => { const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60), s = Math.floor(((a - d) * 60 - m) * 60);
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}" ${v >= 0 ? pos : neg}`; };
const cts = $l("lz-cts");
cts.innerHTML = CITIES.map(c => { const [x, y] = cityXY(c); return `<rect class="ct" x="${x - 2.5}" y="${y - 2.5}" width="5" height="5"/>`; }).join("");
const shortCo = (v, w, pos, neg) => String(Math.floor(Math.abs(v))).padStart(w, "0") + "°" + String(Math.floor(Math.abs(v) % 1 * 60)).padStart(2, "0") + "'" + (v >= 0 ? pos : neg);
const cl = $l("lz-cl");
cl.innerHTML = CITIES.map((c, i) => `<text class="cl" x="${i % 2 ? 14 : -214}" y="${162 + (i >> 1) * 13}">${String(i + 1).padStart(2, "0")}  ${c[0]}<tspan x="${i % 2 ? 214 : -14}">${shortCo(c[1], 2, "N", "S")} ${shortCo(c[2], 3, "E", "W")}</tspan></text>`).join("");
// 숫자가 빠르게 바뀌다가 왼쪽부터 차례로 목표 값에 멈춘다
const scramble = (els, target, dur = 750) => {
  const t0 = performance.now();
  clearInterval(els.t);
  els.t = setInterval(() => {
    const k = (performance.now() - t0) / dur, n = Math.floor(k * target.length);
    const s = k >= 1 ? target : target.replace(/\d/g, (d, i) => i < n ? d : Math.floor(Math.random() * 10));
    els.forEach(el => el.textContent = s);
    if (k >= 1) clearInterval(els.t);
  }, 45);
};
const coEls = [$l("lz-big"), $l("lz-co"), $l("lz-co2")], fqEls = [$l("lz-fq")];
let ci = -1;
const cityStep = () => {
  ci = (ci + 1) % CITIES.length;
  const c = CITIES[ci], [x, y] = cityXY(c), no = String(ci + 1).padStart(2, "0");
  [...cl.children].forEach((t, i) => t.classList.toggle("on", i === ci));
  // 십자선과 표시가 같은 경로로 함께 이동한다
  $l("lz-chh").style.transform = `translateY(${y}px)`; $l("lz-chv").style.transform = `translateX(${x}px)`;
  $l("lz-mk").style.transform = `translate(${x}px,${y}px)`;
  scramble(coEls, `${dms(c[1], "N", "S")}, ${dms(c[2], "E", "W")}`);
  scramble(fqEls, (88 + Math.random() * 56).toFixed(2), 500);
  $l("lz-bigc").textContent = `SITE ${no} · ${c[0]}`; $l("lz-city").textContent = $l("lz-mkt").textContent = c[0];
  $l("lz-ix").textContent = `${no} / ${String(CITIES.length).padStart(2, "0")}`;
};
cityStep();
const cityT = setInterval(cityStep, 2400);
const enterSite = () => { LD.classList.add("done"); clearInterval(cityT); if (location.hash === "#persona" && S.site) openPersona(); };
let goal = 6, cur = 0;
(function tick() {
  cur += Math.max(0.4, (goal - cur) * 0.1); if (cur > goal) cur = goal;
  LD.style.setProperty("--p", (cur / 100).toFixed(3));
  ldN.textContent = String(Math.round(cur)).padStart(3, "0");
  ldS.textContent = cur < 40 ? "AIR INTAKE" : cur < 80 ? "FILTERING PARTICLES" : cur < 100 ? "SEAL CHECK" : "CLEAR · READY";
  ldRows.forEach((el, i) => el.classList.toggle("on", cur >= (i + 1) * 20));
  ldCells.forEach((el, i) => el.classList.toggle("on", cur >= (i + 1) * 100 / ldCells.length));
  if (cur < 100) return requestAnimationFrame(tick);
  LD.classList.add("ready"); $l("lz-enter").disabled = false;
  $l("lz-st").textContent = "ONLINE";
  $l("lz-warn").textContent = "□ SEAL CONFIRMED";
})();
$l("lz-enter").onclick = $l("lz-skip").onclick = enterSite;
document.addEventListener("keydown", e => { if (e.key === "Enter" && LD.classList.contains("ready") && !LD.classList.contains("done")) enterSite(); });
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
const blocked = () => document.body.classList.contains("in-editor") || document.body.classList.contains("in-persona") || document.getElementById("modal").classList.contains("on") || document.body.classList.contains("adjusting") || document.getElementById("lb").classList.contains("on") || !document.getElementById("loader").classList.contains("done");
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
  if (blocked() || !S.view) return false;
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
addEventListener("scroll", () => {
  document.body.classList.toggle("scrolled", scrollY > innerHeight * 0.5);
  // 목차: 지금 보고 있는 섹션 표시
  const bs = [...document.querySelectorAll("#facsw [data-toc]")]; if (!bs.length) return;
  let cur = null;
  bs.forEach(b => { const el = document.getElementById(b.dataset.toc); if (el && el.getBoundingClientRect().top < innerHeight * 0.4) cur = b; });
  bs.forEach(b => b.classList.toggle("cur", b === cur));
}, { passive: true });
let ty = null;
addEventListener("touchstart", e => { ty = e.touches[0].clientY; }, { passive: true });
addEventListener("touchmove", e => {
  if (ty == null || blocked() || !S.view) return;
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
  else if (t.tagName === "IMG") { t.style.objectPosition = t.style.transformOrigin = `${x}% ${y}%`; t.style.transform = (adj.tx || adj.ty ? `translate(${adj.tx}%,${adj.ty}%) ` : "") + (adj.scale || ""); }
  else t.style.backgroundPosition = `${x}% ${y}%`;
}
function startAdjust(box) {
  const move = box.classList.contains("hero-logo") || box.classList.contains("pf-sfig");
  const t = box.querySelector(":scope > .pos-t") || box, cs = getComputedStyle(t);
  const cur = move ? [parseFloat(t.style.left), parseFloat(t.style.top)]
    : (t.tagName === "IMG" ? cs.objectPosition : cs.backgroundPosition).split(" ").map(parseFloat);
  const tr = ((t.style.transform || "").match(/translate\(([-\d.]+)%,\s*([-\d.]+)%\)/) || []).slice(1).map(parseFloat), scale = (t.style.transform || "").match(/scale\([^)]*\)/)?.[0] || "";
  adj = { box, t, move, path: box.dataset.pos, x: isNaN(cur[0]) ? 50 : cur[0], y: isNaN(cur[1]) ? 50 : cur[1], w: parseFloat(t.style.width) || 60, tx: tr[0] || 0, ty: tr[1] || 0, scale };
  document.body.classList.add("adjusting"); box.classList.add("adj-on");
  box.closest(".pcard")?.classList.toggle("flip", box.classList.contains("pc-b"));
  getSelection()?.removeAllRanges();
  adjBar.innerHTML = `<span>${move ? "드래그로 이동 · 휠로 크기 조절" : "드래그해서 이미지 위치 조정"}</span><button data-adj="reset">원래대로</button><button data-adj="save">저장</button><button data-adj="cancel">취소</button>`;
  adjBar.classList.add("on");
}
async function endAdjust(save) {
  const a = adj; adj = null; drag = null;
  document.body.classList.remove("adjusting"); a.box.classList.remove("adj-on"); adjBar.classList.remove("on");
  if (save) {
    const [kind, p1, p2] = a.path.split("|");
    const src = kind === "site" ? S.site : kind === "fac" ? S.factions[p1] : [...S.chars, ...S.personas].find(c => c.id === p1);
    const v = structuredClone(src), key = kind === "site" ? p1 : p2;
    if (a.move) { v[key + "X"] = +a.x.toFixed(1); v[key + "Y"] = +a.y.toFixed(1); v[key + "W"] = +a.w.toFixed(1); }
    else { const ks = key.split("."); let o = v; ks.slice(0, -1).forEach(k => o = o[k]); o[ks.at(-1)] = `${a.x.toFixed(1)}% ${a.y.toFixed(1)}%`;
      if (a.t.tagName === "IMG" && /Pos$/.test(key)) { const b = key.slice(0, -3); o[b + "DX"] = +a.tx.toFixed(1); o[b + "DY"] = +a.ty.toFixed(1); } }
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
  const mx = e.clientX - drag.px, my = e.clientY - drag.py, dx = mx / r.width * 100, dy = my / r.height * 100;
  drag = { px: e.clientX, py: e.clientY };
  if (!adj.move && adj.t.tagName === "IMG") {
    // 틀 끝에 닿으면(또는 그 방향으로 여유가 없으면) 이미지를 틀 밖으로 밀어낸다 (틀은 그대로)
    [adj.x, adj.tx] = dragAxis(adj.x, adj.tx, ...imgDelta(adj.t, mx, 0)); [adj.y, adj.ty] = dragAxis(adj.y, adj.ty, ...imgDelta(adj.t, my, 1));
  } else {
    // 전신 이미지는 편집기처럼 영역 밖까지 옮길 수 있다
    const [lo, hi] = adj.box.classList.contains("pf-sfig") ? [-150, 150] : [0, 100];
    adj.x = clamp(adj.x + (adj.move ? dx : -dx), lo, hi); adj.y = clamp(adj.y + (adj.move ? dy : -dy), lo, hi);
  }
  applyAdj();
});
document.addEventListener("pointerup", () => drag = null);
document.addEventListener("dragstart", e => { if (adj) e.preventDefault(); });
document.addEventListener("click", e => {
  if (!adj) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const b = e.target.closest("[data-adj]");
  if (!b) return;
  if (b.dataset.adj !== "reset") return endAdjust(b.dataset.adj === "save");
  // 원래대로: 처음 자리로 돌려 놓는다 (저장을 눌러야 반영)
  const k = adj.path.split("|").pop();
  if (adj.move) Object.assign(adj, k === "logo" ? { x: 50, y: 60, w: 60 } : { x: 35.5, y: 0, w: 64.5 });
  else Object.assign(adj, k === "mainImgPos" ? { x: 50, y: 0 } : { x: 50, y: 50 }, { tx: 0, ty: 0 });
  applyAdj();
}, true);
addEventListener("wheel", e => {
  if (!adj?.move) return;
  e.preventDefault(); adj.w = clamp(adj.w * (1 - e.deltaY * 0.001), 5, adj.box.classList.contains("pf-sfig") ? 200 : 100); applyAdj();
}, { passive: false });

// ---------- 지도 지점: 로그인 상태에서 지점을 끌면 위치가 바뀌고, 놓으면 저장된다 ----------
let ptDrag = null, ptMoved = false;
document.addEventListener("pointerdown", e => {
  const el = e.target.closest(".pt"); if (!el || !S.user || adj) return;
  ptDrag = { el, sx: e.clientX, sy: e.clientY, on: false };
});
document.addEventListener("pointermove", e => {
  const d = ptDrag; if (!d) return;
  if (!d.on && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
  d.on = true; document.querySelector(".pt-pop")?.remove();
  const r = d.el.parentElement.getBoundingClientRect(), pc = (v, n) => Math.round(Math.max(0, Math.min(100, v / n * 100)) * 10) / 10;
  d.x = pc(e.clientX - r.left, r.width); d.y = pc(e.clientY - r.top, r.height);
  d.el.style.left = d.x + "%"; d.el.style.top = d.y + "%";
});
document.addEventListener("pointerup", () => {
  const d = ptDrag; ptDrag = null; if (!d?.on) return;
  ptMoved = true; setTimeout(() => ptMoved = false, 0);
  const i = +d.el.dataset.a.slice(3), f = S.factions[S.fac];
  saveFaction(S.fac, { ...f, points: (f.points || []).map((p, j) => j === i ? { ...p, x: d.x, y: d.y } : p) })
    .then(() => toast("지점 위치를 저장했습니다")).catch(e => { console.error(e); toast("저장하지 못했습니다. " + why(e)); });
});

// ---------- 캐릭터 순서: 로그인 상태에서 카드를 끌면 다른 카드가 밀려나고, 놓으면 저장된다 ----------
let dragEl = null, dragLock = 0;
const CARD = ".pcard,.lcard,.asset";
function flip(change) {
  const els = [...document.querySelectorAll("#people .pcard, #people .lcard, .asset")];
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
  const asset = dragEl.matches(".asset");
  const over = e.target.closest(CARD), box = e.target.closest(asset ? ".agrid[data-agroup]" : "#people .pgrid, #people .lgrid");
  if (asset ? (over ? !over.matches(".asset") : !box) : (over?.matches(".asset") || (!over && !box))) return;
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
  const asset = dragEl.matches(".asset"), pad = dragEl.closest("[data-achar]");
  dragEl.classList.remove("dragging"); dragEl = null;
  if (asset) {
    // 에셋: 화면에 놓인 순서대로 저장
    const c = anyChar(pad?.dataset.achar); if (!c) return;
    const next = [...pad.querySelectorAll(".asset")].map(el => {
      const x = (c.assets || []).find(a => a.img === el.dataset.asset), g = el.closest("[data-agroup]")?.dataset.agroup;
      return x && (g == null ? x : { ...x, g });
    }).filter(Boolean);
    const key = xs => xs.filter(x => x.img).map(x => x.img + "|" + (x.g || "")).join();
    if (key(next) === key(c.assets || [])) return;
    try { await saveChar({ ...c, assets: next }); toast("순서를 저장했습니다"); }
    catch (err) { console.error(err); toast("순서를 저장하지 못했습니다. " + why(err)); }
    redraw();
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
  S.q = e.target.value; S.memoP = 0; drawMemos();
});

// ---------- 에셋: 사진을 고르거나 끌어다 놓으면 바로 올린다 (여러 장 가능) ----------
async function addAssets(c, files, g) {
  files = files.filter(f => f.type.startsWith("image/"));
  if (!files.length || !c) return;
  const added = [];
  try {
    for (let i = 0; i < files.length; i++) {
      toast(`사진 올리는 중… ${i + 1} / ${files.length}`);
      added.push({ img: await saveImage(files[i], { thumb: true }), g: g || "" });
    }
  } catch (err) { console.error(err); toast("일부 사진을 올리지 못했습니다. " + why(err)); }
  if (added.length) {
    const cur = anyChar(c.id) || c;
    try { await saveChar({ ...cur, assets: [...(cur.assets || []), ...added] }); if (added.length === files.length) toast(`사진 ${added.length}장을 추가했습니다`); }
    catch (err) { console.error(err); added.forEach(x => delImage(x.img)); toast("저장하지 못했습니다. " + why(err)); }
  }
  redraw();
}
document.addEventListener("change", e => {
  const inp = e.target;
  if (!inp.classList?.contains("asset-add")) return;
  const files = [...inp.files]; inp.value = "";
  addAssets(anyChar(inp.dataset.char), files, inp.dataset.g);
});
// 컴퓨터의 사진 파일을 ASSET 탭 위로 끌어오면 놓을 자리가 표시된다
const fileDrag = e => !dragEl && S.user && [...(e.dataTransfer?.types || [])].includes("Files");
const dropPad = e => e.target.closest?.(".file-pad:has(.asset-add)");
document.addEventListener("dragover", e => {
  if (!fileDrag(e)) return;
  const pad = dropPad(e);
  document.querySelectorAll(".drop-on").forEach(x => x !== pad && x.classList.remove("drop-on"));
  if (!pad) return;
  e.preventDefault(); e.dataTransfer.dropEffect = "copy";
  pad.classList.add("drop-on");
  pad.querySelectorAll(".agrid[data-agroup]").forEach(x => x.classList.toggle("drop-on", x === e.target.closest(".agrid[data-agroup]")));
});
document.addEventListener("dragleave", e => { if (fileDrag(e) && !e.relatedTarget?.closest?.(".file-pad")) document.querySelectorAll(".drop-on").forEach(x => x.classList.remove("drop-on")); });
document.addEventListener("drop", e => {
  if (!fileDrag(e)) return;
  const pad = dropPad(e);
  document.querySelectorAll(".drop-on").forEach(x => x.classList.remove("drop-on"));
  if (!pad) return;
  e.preventDefault();
  addAssets(anyChar(pad.dataset.achar), [...e.dataTransfer.files], e.target.closest(".agrid[data-agroup]")?.dataset.agroup || "");
});
document.addEventListener("keydown", e => {
  if (!document.getElementById("lb").classList.contains("on") || e.target.closest?.("input,textarea")) return;
  if (e.key === "ArrowRight") lbStep(1); else if (e.key === "ArrowLeft") lbStep(-1); else if (e.key === "Escape") lbClose();
});
