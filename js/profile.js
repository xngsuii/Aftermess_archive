// 캐릭터 프로필 양식: 사이트의 캐릭터 파일과 프로필 편집기가 같이 쓴다
import { esc, fmt, inl, imgAttr } from "./ui.js";

// site: true 인 항목은 사이트의 캐릭터 편집에서만 쓴다 (프로필 편집기에서는 뺀다)
export const PROFILE_FIELDS = [
  { type: "head", label: "기본 정보", open: true },
  { k: "useProfile", type: "check", def: true, site: true, label: "프로필 사용 (끄면 ASSET과 MEMO만 표시)" },
  { k: "num", label: "코드네임", ph: "7" },
  { k: "serial", label: "일련번호", ph: "2080  004" },
  { k: "clearance", label: "보안 등급 (상단 세 번째, Clearance = 아래)", ph: "Seven" },
  { k: "topRight", label: "상단 맨 오른쪽 글 (두 줄까지)", type: "area", plain: true, ph: "Operational Detachment\nMILGRAM" },
  { k: "mainImg", label: "상단 큰 이미지", type: "img" },
  { k: "mainImgZoom", label: "상단 이미지 확대", type: "range", min: 1, max: 3, step: 0.01, def: 1, hint: "미리보기에서 이미지를 더블클릭하면 끌어서 위치를 옮길 수 있습니다." },
  { k: "mainFadeH", label: "상단 이미지 아래 페이드 범위", type: "range", min: 0, max: 100, step: 1, def: 62, mul: 1 },
  { k: "mainFade", label: "상단 이미지 아래 페이드 강도", type: "range", min: 0, max: 1, step: 0.01, def: 1 },
  { k: "tagline", label: "한 줄 소개 (굵게)", fmt: true },
  { k: "intro", label: "소개글", type: "area" },
  { type: "head", label: "Profile" },
  { k: "profile", label: "프로필 본문", type: "area" },
  { k: "sideImg", label: "옆 전신 이미지", type: "img" },
  { k: "sideImgW", label: "전신 이미지 크기", type: "range", min: 20, max: 200, step: 0.5, def: 64.5, mul: 1, hint: "Profile부터 Record까지가 이미지 자리입니다. 미리보기에서 이미지를 더블클릭하면 끌어서 옮기고 휠로 크기를 바꿀 수 있습니다." },
  { k: "sideFadeW", label: "전신 이미지 왼쪽 페이드 범위", type: "range", min: 0, max: 100, step: 1, def: 55, mul: 1 },
  { k: "sideFade", label: "전신 이미지 왼쪽 페이드 강도", type: "range", min: 0, max: 1, step: 0.01, def: 0.9 },
  { k: "height", label: "키", ph: "189cm" },
  { k: "nation", label: "국적", ph: "홍콩인" },
  { k: "age", label: "나이", ph: "32" },
  { type: "head", label: "Affiliation" },
  { k: "affil", label: "소속 및 계급", type: "list", item: "줄", fields: [{ k: "k", label: "항목", ph: "기관" }, { k: "v", label: "내용", ph: "WORLD'S WORST" }] },
  { type: "head", label: "Record" },
  { k: "record", label: "이력 · 기타", type: "area" },
  { type: "head", label: "Prologue" },
  { k: "tracks", label: "도입부", type: "list", item: "도입부", fields: [
    { k: "title", label: "제목 (크게)", ph: "HONG KONG" },
    { k: "lyric", label: "가사 한 줄" },
    { k: "song", label: "곡명" }, { k: "artist", label: "아티스트" },
    { k: "yt", label: "YouTube 링크 (원판을 누르면 재생)", ph: "https://youtu.be/..." },
    { k: "body", label: "펼쳤을 때 나오는 글", type: "area" }] },
  { type: "head", label: "Secret" },
  { k: "useSecret", type: "check", def: false, label: "Secret 사용 (Prologue 아래에 표시)" },
  { k: "secretIntro", label: "맨 위 줄글", type: "area" },
  { k: "secretImg", label: "이미지", type: "img" },
  { k: "secretBody", label: "본문", type: "area", hint: "줄 맨 앞에 > 를 쓰면 인용구가 됩니다. Enter로 문단을 나눕니다." },
  { k: "secretRecs", label: "RECORD", type: "list", item: "기록", fields: [
    { k: "date", label: "날짜", ph: "2072.10" }, { k: "age", label: "나이", ph: "24" }, { k: "body", label: "내용", type: "area" }] },
  { k: "realName", label: "본명", ph: "악시온 키스" },
  { k: "realNameEn", label: "본명 (영문)", ph: "Axion Keith" },
  { k: "birthday", label: "생일", ph: "2월 9일생" },
  { k: "blood", label: "혈액형", ph: "RH+A" }
];

export const ytId = u => (String(u || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1] || "";

// ph: 내용이 비었을 때 틀만 보여 줄 자리 표시 (편집기 미리보기에서만 넘긴다)
const sec = (title, sub, body, ph) => body || ph ? `<section class="pf-sec"><header><h2>${title}</h2><span>${sub}</span></header>${body || ph}</section>` : "";
// 이미지의 위치와 확대. key: "mainImg" | "sideImg"
export const imgStyle = (c, key = "mainImg") => {
  const pos = c[key + "Pos"] || (key === "mainImg" ? "50% 0%" : "50% 50%"), z = Math.max(1, +c[key + "Zoom"] || 1);
  return `object-position:${esc(pos)};transform-origin:${esc(pos)};transform:scale(${z})`;
};
export const mainImgStyle = c => imgStyle(c, "mainImg");
// 전신 이미지: Profile~Record 영역 안에서의 왼쪽·위 위치와 너비(영역 대비 %). 처음에는 오른쪽 위.
const num = (v, d) => v === undefined || v === null || v === "" || isNaN(+v) ? d : +v;
export const sideFigStyle = c => `left:${num(c.sideImgX, 100 - num(c.sideImgW, 64.5))}%;top:${num(c.sideImgY, 0)}%;width:${num(c.sideImgW, 64.5)}%`;
const fadeVars = (c, w, a, dw, da) => `--fw:${num(c[w], dw)}%;--fa:${num(c[a], da)}`;
// 반짝이 기호 (위가 짧고 아래가 긴 십자 별)
const STAR = `<svg class="pf-star" viewBox="0 0 24 64" aria-hidden="true"><path d="M12 0C12.6 10.5 14.2 15.4 21 17.5C14.2 19.4 12.7 27 12 64C11.3 27 9.8 19.4 3 17.5C9.8 15.4 11.4 10.5 12 0Z"/></svg>`;

function secret(c, opt) {
  if (!c.useSecret) return "";
  const recs = (c.secretRecs || []).filter(r => r.date || r.body);
  const foot = c.realName || c.realNameEn || c.birthday || c.blood;
  return `<section class="pf-sec pf-secret ${opt.static ? "open" : ""}">
    <header ${opt.static ? "" : 'data-a="secret" style="cursor:pointer"'}><h2>Secret<i class="pf-cls">CLASSIFIED</i></h2>${opt.static ? "" : `<span class="pf-stog">열람 / 닫기 <b class="pf-plus">+</b></span>`}</header>
    <p class="pf-ssub">캐릭터 비밀 설정 스포일러</p>
    <div class="pf-sb">
      ${c.secretIntro ? `<div class="pf-sintro">${fmt(c.secretIntro)}</div>` : ""}
      ${c.secretImg ? `<img class="pf-simg" ${imgAttr(c.secretImg)} alt="">` : ""}
      <div class="pf-sbody">${fmt(c.secretBody)}</div>
      ${recs.length ? `<div class="pf-srec"><h5>RECORD</h5>${recs.map(r => `<div><p class="d"><b>${esc(r.date)}</b>${r.age ? "AGE " + esc(r.age) : ""}</p>${fmt(r.body)}</div>`).join("")}</div>` : ""}
      ${foot ? `<div class="pf-sfoot"><span><b>${esc(c.realName)}</b>${esc(c.realNameEn)}</span><span>${[c.birthday, c.blood].filter(Boolean).map(esc).join('<i class="pf-dot">·</i>')}</span></div>` : ""}
    </div></section>`;
}

// opt.static: 내보내기용. 스크립트 없이 보이도록 글은 펼쳐 두고 원판은 링크로 만든다.
// opt.pos: 상단 이미지 위치 조정용 경로
export function renderProfile(c, opt = {}) {
  const affil = (c.affil || []).filter(r => r.k || r.v);
  const tracks = (c.tracks || []).filter(t => t.title || t.song);
  const F = !!opt.frame, ph = t => F ? `<p class="pf-phx">${t}</p>` : "";
  const chip = (cls, l, v, dot) => (v = v || (F ? "—" : "")) ? `<span class="pf-chip ${cls}">${dot ? "<i></i>" : ""}${l}<b>${esc(v)}</b></span>` : "";
  const chips = chip("c1", "HEIGHT", c.height) + chip("c2", "NATION", c.nation, 1) + chip("c3", "AGE", c.age);
  const side = c.sideImg || chips;
  // 전신 이미지(또는 편집기의 빈 틀)는 Profile~Record 영역 뒤에 깔린다
  const big = !!(c.sideImg || F);
  const fig = c.sideImg ? `<div class="pf-sfig" ${opt.spos ? `data-pos="${opt.spos}"` : ""} style="${sideFigStyle(c)}"><img ${imgAttr(c.sideImg)} alt="">${chips}</div>`
    : `<div class="pf-sfig pf-ph" style="${sideFigStyle(c)}">SIDE IMAGE${chips}</div>`;
  const noTrk = F && !tracks.length ? `<div class="pf-trk pf-phx"><div class="pf-trk-h"><span class="pf-vinyl"></span><span class="pf-trk-m"><span class="pf-trk-t"><small>가사 한 줄</small><b>TITLE</b><em>♪ 곡명<br>— 아티스트</em></span></span></div></div>` : "";
  const trk = t => {
    const id = ytId(t.yt), body = fmt(t.body);
    const text = `<span class="pf-trk-t"><small>${esc(t.lyric)}</small><b>${esc(t.title)}</b><em>♪ ${esc(t.song)}${t.artist ? "<br>— " + esc(t.artist) : ""}</em></span>`;
    const more = body ? `<div class="pf-trk-b"><div>${body}</div></div>` : "";
    if (opt.static) return `<div class="pf-trk open"><div class="pf-trk-h">${id ? `<a class="pf-vinyl" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener"></a>` : `<span class="pf-vinyl"></span>`}<span class="pf-trk-m">${text}</span></div>${more}</div>`;
    return `<div class="pf-trk"><div class="pf-trk-h"><span class="pf-vinyl" data-a="trk" data-yt="${id}"></span>
      <span class="pf-trk-m" data-a="trkopen">${text}${body ? `<span class="pf-plus">+</span>` : ""}</span></div>${more}</div>`;
  };
  const left = sec("Profile", "프로필", fmt(c.profile), ph("프로필 본문"))
    + sec("Affiliation", "소속 및 계급", affil.length ? `<dl class="pf-dl">${affil.map(r => `<div><dt>${esc(r.k)}</dt><dd>${esc(r.v) || (F ? "—" : "")}</dd></div>`).join("")}</dl>` : "", ph("소속 및 계급"))
    + sec("Record", "이력 · ETC", fmt(c.record), ph("이력 · 기타"));
  const main = c.mainImg ? `<div class="pf-main" style="${fadeVars(c, "mainFadeH", "mainFade", 62, 1)}"><img ${imgAttr(c.mainImg)} ${opt.pos ? `data-pos="${opt.pos}"` : ""} style="${mainImgStyle(c)}" alt=""></div>`
    : F ? `<div class="pf-main pf-ph">MAIN IMAGE</div>` : "";
  return `<div class="pf">
    <div class="pf-top"><span>AFTERMESS<br>PERSONNEL FILE</span><span class="mid">FLD // 20_∞</span><span>${c.clearance || F ? "Clearance =<br>" + (esc(c.clearance) || "—") : ""}</span>
      <span>${String(c.topRight || "").split("\n").map(l => esc(l.replace(/↵\s*$/, "").trim())).filter(Boolean).slice(0, 2).join("<br>")}</span></div>
    <div class="pf-sub ${c.mainImg ? "over" : ""}"><span><b>↘</b>SUBJECT FILE<br><i>SUBJECT FILE</i></span>${STAR}</div>
    <div class="pf-hero">${main}
      <div class="pf-id">${c.serial ? `<small>serial no. ${esc(c.serial)}</small>` : ""}
        <h1${F && !(c.num || c.name) ? ' class="pf-phx"' : ""}>${esc(c.num || c.name || (F ? "CODENAME" : "—"))}</h1>
        <i class="pf-rule"></i>${c.tagline ? `<strong class="pf-tag">${inl(c.tagline)}</strong>` : F ? `<strong class="pf-tag pf-phx">한 줄 소개</strong>` : ""}${fmt(c.intro) || ph("소개글")}
      </div>
    </div>
    <div class="pf-cols${big ? " has-side" : ""}"${side ? "" : ' style="grid-template-columns:1fr"'}><div>${left}</div>
      ${side ? `<aside class="pf-side">${big ? `<div class="pf-sidebox" style="${fadeVars(c, "sideFadeW", "sideFade", 55, 0.9)}">${fig}</div>` : chips}</aside>` : ""}
    </div>
    ${sec("Prologue", opt.static ? "도입부 · 원판을 누르면 테마곡으로 이동" : "도입부 · 원판을 누르면 테마곡 재생", tracks.map(trk).join(""), noTrk)}
    ${secret(c, opt)}
    <div class="pf-foot"></div>
  </div>`;
}

// 원판 클릭: 테마곡 재생/정지 (플레이어는 화면에 보이지 않는다)
export function toggleTrack(vinyl) {
  const box = vinyl.closest(".pf-trk"), id = vinyl.dataset.yt, on = !box.classList.contains("on");
  document.querySelectorAll(".pf-trk.on").forEach(b => { b.classList.remove("on"); b.querySelector(".pf-player")?.remove(); });
  if (!on || !id) return;
  box.classList.add("on");
  const p = document.createElement("div");
  p.className = "pf-player";
  p.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media"></iframe>`;
  box.append(p);
}
// 도입부 글 펼치기/접기
export function toggleTrackText(el) {
  const box = el.closest(".pf-trk"), plus = box.querySelector(".pf-plus");
  if (!plus) return;
  plus.textContent = box.classList.toggle("open") ? "−" : "+";
}
// Secret 열람/닫기
export function toggleSecret(el) {
  const box = el.closest(".pf-secret");
  box.querySelector(".pf-plus").textContent = box.classList.toggle("open") ? "−" : "+";
}
