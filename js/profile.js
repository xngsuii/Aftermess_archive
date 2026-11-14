// 캐릭터 프로필 양식: 사이트의 캐릭터 파일과 프로필 편집기가 같이 쓴다
import { esc, fmt, imgAttr } from "./ui.js";

export const PROFILE_FIELDS = [
  { type: "head", label: "기본 정보" },
  { k: "num", label: "코드네임", ph: "7" },
  { k: "serial", label: "일련번호", ph: "2080  004" },
  { k: "clearance", label: "보안 등급 (우측 상단)", ph: "Seven" },
  { k: "mainImg", label: "상단 큰 이미지", type: "img" },
  { k: "tagline", label: "한 줄 소개 (굵게)" },
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
  { k: "tracks", label: "테마곡", type: "list", item: "곡", fields: [
    { k: "title", label: "제목 (크게)", ph: "HONG KONG" },
    { k: "lyric", label: "가사 한 줄" },
    { k: "song", label: "곡명" }, { k: "artist", label: "아티스트" },
    { k: "yt", label: "YouTube 링크", ph: "https://youtu.be/..." }] }
];

export const ytId = u => (String(u || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1] || "";

const sec = (title, sub, body) => body ? `<section class="pf-sec"><header><h2>${title}</h2><span>${sub}</span></header>${body}</section>` : "";

// opt.static: 내보내기용. 스크립트 없이 동작하도록 테마곡을 링크로 만든다.
export function renderProfile(c, opt = {}) {
  const affil = (c.affil || []).filter(r => r.k || r.v);
  const tracks = (c.tracks || []).filter(t => t.title || t.song);
  const chip = (l, v, dot) => v ? `<span class="pf-chip">${dot ? "<i></i>" : ""}${l}<b>${esc(v)}</b></span>` : "";
  const side = c.sideImg || c.height || c.nation || c.age;
  const trk = t => {
    const id = ytId(t.yt);
    const inner = `<span class="pf-vinyl"></span><span class="pf-trk-t"><small>${esc(t.lyric)}</small><b>${esc(t.title)}</b><em>♪ ${esc(t.song)}${t.artist ? "<br>— " + esc(t.artist) : ""}</em></span><span class="pf-plus">+</span>`;
    return opt.static
      ? `<div class="pf-trk"><a class="pf-trk-h" ${id ? `href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener"` : ""}>${inner}</a></div>`
      : `<div class="pf-trk"><div class="pf-trk-h" data-a="trk" data-yt="${id}">${inner}</div></div>`;
  };
  const left = sec("Profile", "프로필", fmt(c.profile))
    + sec("Affiliation", "소속 및 계급", affil.length ? `<dl class="pf-dl">${affil.map(r => `<div><dt>${esc(r.k)}</dt><dd>${esc(r.v)}</dd></div>`).join("")}</dl>` : "")
    + sec("Record", "이력 · ETC", fmt(c.record));
  return `<div class="pf">
    <div class="pf-top"><span>AFTERMESS<br>PERSONNEL FILE</span><span>${c.clearance ? "Clearance =<br>" + esc(c.clearance) : ""}</span></div>
    <div class="pf-hero">${c.mainImg ? `<img ${imgAttr(c.mainImg)} ${opt.pos ? `data-pos="${opt.pos}"` : ""} ${c.mainImgPos ? `style="object-position:${esc(c.mainImgPos)}"` : ""} alt="">` : ""}
      <div class="pf-id">${c.serial ? `<small>serial no. ${esc(c.serial)}</small>` : ""}
        <h1>${esc(c.num || c.name || "—")}</h1>
        <i class="pf-rule"></i>${c.tagline ? `<strong class="pf-tag">${esc(c.tagline)}</strong>` : ""}${fmt(c.intro)}
      </div>
    </div>
    <div class="pf-cols"${side ? "" : ' style="grid-template-columns:1fr"'}><div>${left}</div>
      ${side ? `<aside class="pf-side">${c.sideImg ? `<img ${imgAttr(c.sideImg)} alt="">` : ""}${chip("HEIGHT", c.height)}${chip("NATION", c.nation, 1)}${chip("AGE", c.age)}</aside>` : ""}
    </div>
    ${sec("Prologue", opt.static ? "도입부 · 원반을 누르면 테마곡으로 이동" : "도입부 · 원반을 누르면 테마곡 재생", tracks.map(trk).join(""))}
    <div class="pf-foot"></div>
  </div>`;
}

// 원반 클릭: 플레이어 열기/닫기
export function toggleTrack(head) {
  const box = head.parentElement, on = box.classList.toggle("on");
  box.querySelector(".pf-player")?.remove();
  head.querySelector(".pf-plus").textContent = on ? "−" : "+";
  if (!on) return;
  const id = head.dataset.yt;
  const p = document.createElement("div");
  p.className = "pf-player";
  p.innerHTML = id ? `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>` : "";
  if (id) box.append(p);
}
