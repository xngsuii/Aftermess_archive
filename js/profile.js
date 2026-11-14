// 캐릭터 프로필 양식: 사이트의 캐릭터 파일과 프로필 편집기가 같이 쓴다
import { esc, fmt, inl, imgAttr } from "./ui.js";

export const PROFILE_FIELDS = [
  { type: "head", label: "기본 정보" },
  { k: "num", label: "코드네임", ph: "7" },
  { k: "serial", label: "일련번호", ph: "2080  004" },
  { k: "clearance", label: "보안 등급 (우측 상단)", ph: "Seven" },
  { k: "mainImg", label: "상단 큰 이미지", type: "img" },
  { k: "tagline", label: "한 줄 소개 (굵게)", hint: "__밑줄 강조__ 를 쓸 수 있습니다." },
  { k: "intro", label: "소개글", type: "area" },
  { type: "head", label: "Profile" },
  { k: "profile", label: "프로필 본문", type: "area" },
  { k: "sideImg", label: "옆 전신 이미지", type: "img" },
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
    { k: "body", label: "펼쳤을 때 나오는 글", type: "area" }] }
];

export const ytId = u => (String(u || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1] || "";

const sec = (title, sub, body) => body ? `<section class="pf-sec"><header><h2>${title}</h2><span>${sub}</span></header>${body}</section>` : "";

// opt.static: 내보내기용. 스크립트 없이 보이도록 글은 펼쳐 두고 원판은 링크로 만든다.
// opt.pos: 상단 이미지 위치 조정용 경로
export function renderProfile(c, opt = {}) {
  const affil = (c.affil || []).filter(r => r.k || r.v);
  const tracks = (c.tracks || []).filter(t => t.title || t.song);
  const chip = (cls, l, v, dot) => v ? `<span class="pf-chip ${cls}">${dot ? "<i></i>" : ""}${l}<b>${esc(v)}</b></span>` : "";
  const chips = chip("c1", "HEIGHT", c.height) + chip("c2", "NATION", c.nation, 1) + chip("c3", "AGE", c.age);
  const side = c.sideImg || chips;
  const trk = t => {
    const id = ytId(t.yt), body = fmt(t.body);
    const text = `<span class="pf-trk-t"><small>${esc(t.lyric)}</small><b>${esc(t.title)}</b><em>♪ ${esc(t.song)}${t.artist ? "<br>— " + esc(t.artist) : ""}</em></span>`;
    const more = body ? `<div class="pf-trk-b"><div>${body}</div></div>` : "";
    if (opt.static) return `<div class="pf-trk open"><div class="pf-trk-h">${id ? `<a class="pf-vinyl" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener"></a>` : `<span class="pf-vinyl"></span>`}<span class="pf-trk-m">${text}</span></div>${more}</div>`;
    return `<div class="pf-trk"><div class="pf-trk-h"><span class="pf-vinyl" data-a="trk" data-yt="${id}"></span>
      <span class="pf-trk-m" data-a="trkopen">${text}${body ? `<span class="pf-plus">+</span>` : ""}</span></div>${more}</div>`;
  };
  const left = sec("Profile", "프로필", fmt(c.profile))
    + sec("Affiliation", "소속 및 계급", affil.length ? `<dl class="pf-dl">${affil.map(r => `<div><dt>${esc(r.k)}</dt><dd>${esc(r.v)}</dd></div>`).join("")}</dl>` : "")
    + sec("Record", "이력 · ETC", fmt(c.record));
  const main = c.mainImg ? `<div class="pf-main"><img ${imgAttr(c.mainImg)} ${opt.pos ? `data-pos="${opt.pos}"` : ""} ${c.mainImgPos ? `style="object-position:${esc(c.mainImgPos)}"` : ""} alt=""></div>` : "";
  return `<div class="pf">
    <div class="pf-top"><span>AFTERMESS<br>PERSONNEL FILE</span><span>${c.clearance ? "Clearance =<br>" + esc(c.clearance) : ""}</span></div>
    <div class="pf-hero">${main}
      <div class="pf-id">${c.serial ? `<small>serial no. ${esc(c.serial)}</small>` : ""}
        <h1>${esc(c.num || c.name || "—")}</h1>
        <i class="pf-rule"></i>${c.tagline ? `<strong class="pf-tag">${inl(c.tagline)}</strong>` : ""}${fmt(c.intro)}
      </div>
    </div>
    <div class="pf-cols"${side ? "" : ' style="grid-template-columns:1fr"'}><div>${left}</div>
      ${side ? `<aside class="pf-side">${c.sideImg ? `<div class="pf-sidebox"><img ${imgAttr(c.sideImg)} alt="">${chips}</div>` : chips}</aside>` : ""}
    </div>
    ${sec("Prologue", opt.static ? "도입부 · 원판을 누르면 테마곡으로 이동" : "도입부 · 원판을 누르면 테마곡 재생", tracks.map(trk).join(""))}
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
// 글 펼치기/접기
export function toggleTrackText(el) {
  const box = el.closest(".pf-trk"), plus = box.querySelector(".pf-plus");
  if (!plus) return;
  plus.textContent = box.classList.toggle("open") ? "−" : "+";
}
