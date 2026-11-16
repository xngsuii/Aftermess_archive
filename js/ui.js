// 공용 도구: 글자 변환, 이미지 지연 로딩, 편집 양식, 알림
import { getImage, saveImage, delImage, compress, collectIds, thumbId } from "./store.js";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// **굵게**, __밑줄 강조__, {i:기울임}, {g:회색} {w:흰색} {r:진영 색}. 중괄호 표시는 한 번 겹쳐 쓸 수 있다.
const mark = s => s.replace(/\{([gwri]):([^{}]+)\}/g, (m, k, t) => k === "i" ? `<em class="ti">${t}</em>` : `<span class="tc-${k}">${t}</span>`);
export const inl = s => mark(mark(esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<u>$1</u>"))).replace(/\n/g, "<br>");
// Enter(줄바꿈)마다 문단. 줄 끝의 ↵ (Shift+Enter)는 문단을 나누지 않는 줄바꿈.
// 빈 줄을 두면 간격이 더 벌어지고, > 로 시작하는 줄은 인용구.
export const fmt = s => {
  let out = "", gap = false, quote = [], quoteGap = false;
  const flush = () => { if (quote.length) { out += `<blockquote class="bq${quoteGap ? " sp" : ""}">${quote.join("<br>")}</blockquote>`; quote = []; } };
  for (const raw of String(s ?? "").replace(/\r/g, "").replace(/[ \t]*↵[ \t]*\n/g, "\u0001").replace(/↵/g, "").split("\n")) {
    const l = raw.trim();
    if (!l) { flush(); gap = true; continue; }
    if (l.startsWith(">")) { if (!quote.length) quoteGap = gap && !!out; quote.push(inl(l.replace(/^>\s?/, ""))); gap = false; continue; }
    flush(); out += `<p${gap && out ? ' class="sp"' : ""}>${inl(l)}</p>`; gap = false;
  }
  flush();
  return out.replaceAll("\u0001", "<br>");
};
export const FMT_HINT = "Enter는 문단 나눔, Shift+Enter는 줄바꿈(↵ 표시)입니다. 빈 줄을 넣으면 간격이 더 벌어집니다.";

// 이미지: data URL이면 바로, 아니면 화면 근처에 왔을 때 Firestore에서 불러온다
export const imgAttr = v => !v ? "" : v.startsWith("data:") ? `src="${v}"` : `data-img="${esc(v)}"`;
export const bgAttr = (v, pos) => {
  if (!v) return "";
  const p = pos ? `background-position:${esc(pos)};` : "";
  return v.startsWith("data:") ? `style="background-image:url('${v}');${p}"` : `data-img="${esc(v)}"${p ? ` style="${p}"` : ""}`;
};
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  io.unobserve(e.target); fill(e.target);
}), { rootMargin: "400px" });
async function fill(el) {
  const url = await getImage(el.dataset.img);
  if (!url) return;
  if (el.tagName === "IMG") el.src = url; else el.style.backgroundImage = `url("${url}")`;
}
export function hydrate(root = document) {
  root.querySelectorAll("[data-img]:not([data-h])").forEach(el => { el.dataset.h = 1; if (el.dataset.img) io.observe(el); });
}

let tt;
export function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 5000);
}
// 실패 원인을 사람이 읽을 수 있는 말로
export const why = e => {
  const c = String(e?.code || e?.message || e);
  if (c.includes("permission-denied")) return "Firestore 보안 규칙이 이 계정의 쓰기를 막고 있습니다 (permission-denied).";
  if (c.includes("unavailable") || c.includes("network")) return "네트워크 연결을 확인하세요.";
  if (c.includes("image too large")) return "이미지가 너무 큽니다.";
  return "원인: " + c;
};
// 이미지 크게 보기. 여러 장이면 화살표로 넘긴다.
// opt.caps: {이미지 id: 설명}, opt.onCap(id, 글): 있으면 아래쪽에서 설명을 고칠 수 있다
let lbIds = [], lbI = 0, lbOpt = {};
async function lbShow() {
  const lb = document.getElementById("lb"), id = lbIds[lbI], n = lb.querySelector(".lb-n");
  if (n) n.textContent = `${lbI + 1} / ${lbIds.length}`;
  const cap = lb.querySelector(".lb-cap"), t = (lbOpt.caps || {})[id] || "";
  cap.className = "lb-cap" + (t ? " has" : "") + (lbOpt.onCap ? " edit" : "");
  if (lbOpt.onCap) {
    cap.innerHTML = '<input maxlength="200" placeholder="설명 추가 (Enter로 저장)">';
    const inp = cap.firstChild; inp.value = t;
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") inp.blur(); };
    inp.onchange = () => {
      const v = inp.value.trim();
      (lbOpt.caps = lbOpt.caps || {})[id] = v; cap.classList.toggle("has", !!v); lbOpt.onCap(id, v);
    };
  } else cap.textContent = t;
  const url = id.startsWith("data:") ? id : await getImage(id);
  if (lbIds[lbI] === id) lb.querySelector("img").src = url;
}
export function lightbox(ids, i = 0, opt = {}) {
  lbIds = [].concat(ids); lbI = i; lbOpt = opt;
  const lb = document.getElementById("lb"), many = lbIds.length > 1;
  lb.innerHTML = `${many ? '<button class="lb-nav l" data-lb="-1">‹</button>' : ""}<div class="lb-fig"><img alt=""><div class="lb-cap"></div></div>${many ? '<button class="lb-nav r" data-lb="1">›</button><span class="lb-n"></span>' : ""}`;
  lb.classList.add("on");
  lbShow();
}
export function lbStep(d) { if (lbIds.length) { lbI = (lbI + d + lbIds.length) % lbIds.length; lbShow(); } }
export function lbClose() { document.getElementById("lb").classList.remove("on"); lbIds = []; }

const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// 글 입력 칸 위의 서식 버튼: 선택한 글자를 마커로 감싼다
function formatBar(input, onChange, withQuote) {
  const bar = h("div", "fbar");
  // 글을 바꿔 넣으면 브라우저가 입력 칸을 맨 아래로 내려 버리므로, 보던 위치를 기억했다가 되돌린다
  const set = (v, a, b) => {
    const st = input.scrollTop, ups = [];
    for (let p = input.parentElement; p; p = p.parentElement) ups.push([p, p.scrollTop]);
    input.value = v; input.focus({ preventScroll: true }); input.setSelectionRange(a, b);
    input.scrollTop = st; ups.forEach(([p, t]) => { if (p.scrollTop !== t) p.scrollTop = t; });
    onChange();
  };
  const wrap = (a, b = a) => {
    const s = input.selectionStart, e = input.selectionEnd, v = input.value, sel = v.slice(s, e) || "텍스트";
    set(v.slice(0, s) + a + sel + b + v.slice(e), s + a.length, s + a.length + sel.length);
  };
  const quote = () => {
    const v = input.value, s = v.lastIndexOf("\n", input.selectionStart - 1) + 1, e = input.selectionEnd;
    const block = v.slice(s, e).split("\n").map(l => l.startsWith(">") ? l : "> " + l).join("\n");
    set(v.slice(0, s) + block + v.slice(e), s, s + block.length);
  };
  const mk = (txt, title, fn, cls) => { const b = h("button", cls || "", txt); b.type = "button"; b.title = title; b.onclick = fn; bar.append(b); };
  mk("B", "굵게", () => wrap("**"), "fb-b");
  mk("I", "기울임", () => wrap("{i:", "}"), "fb-i");
  mk("U", "밑줄 강조", () => wrap("__"), "fb-u");
  mk("회색", "글자색: 회색", () => wrap("{g:", "}"));
  mk("흰색", "글자색: 흰색", () => wrap("{w:", "}"));
  mk("진영 색", "글자색: 진영 색 (W.W 빨강 / MILGRAM 파랑 / LEDGER 노랑)", () => wrap("{r:", "}"));
  if (withQuote) mk("❝ 인용", "인용구", quote);
  return bar;
}

// schema 항목: {k, label, type: text|area|select|check|pills|img|inline|list|head, ...}
// head 는 접었다 펼 수 있는 묶음을 시작한다.
export function buildFields(schema, obj, ctx = {}) {
  const frag = document.createDocumentFragment();
  let target = frag;
  const ch = () => ctx.change && ctx.change();
  for (const f of schema) {
    if (f.type === "head") {
      const d = h("details", "fsec"); d.open = !!f.open;
      d.append(h("summary", "", f.label)); frag.append(d); target = d;
      continue;
    }
    const w = h("div", "fld"), lab = h("label", "", f.label);
    w.append(lab);
    if (f.type === "list") {
      if (!Array.isArray(obj[f.k])) obj[f.k] = [];
      // f.fold: 항목을 접었다 펼 수 있게 한다 (기본은 접힘). 값은 접힌 제목에 보여 줄 칸 이름들.
      const box = h("div"), opened = new WeakSet();
      const draw = () => {
        box.innerHTML = "";
        obj[f.k].forEach((it, i) => {
          const row = h("div", "lst-it"), head = h("div", "lst-h");
          const name = h("span", "", `${f.item || "항목"} ${i + 1}`);
          head.append(name);
          if (f.fold) {
            const sync = () => {
              const on = opened.has(it), t = f.fold.map(k => it[k]).filter(Boolean).join("  ·  ");
              row.classList.toggle("shut", !on);
              name.textContent = `${on ? "▾" : "▸"} ${f.item || "항목"} ${i + 1}${t ? "  ·  " + t : ""}`;
            };
            row.classList.add("fold");
            name.onclick = () => { opened.has(it) ? opened.delete(it) : opened.add(it); sync(); };
            sync();
          }
          const mk = (txt, fn) => { const b = h("button", "", txt); b.type = "button"; b.onclick = () => { fn(); draw(); ch(); }; head.append(b); };
          mk("↑", () => { if (i > 0) [obj[f.k][i - 1], obj[f.k][i]] = [obj[f.k][i], obj[f.k][i - 1]]; });
          mk("↓", () => { if (i < obj[f.k].length - 1) [obj[f.k][i + 1], obj[f.k][i]] = [obj[f.k][i], obj[f.k][i + 1]]; });
          mk("✕", () => obj[f.k].splice(i, 1));
          row.append(head, buildFields(f.fields, it, ctx));
          box.append(row);
        });
        const add = h("button", "btn", `+ ${f.item || "항목"} 추가`); add.type = "button";
        add.onclick = () => { const n = {}; obj[f.k].push(n); opened.add(n); draw(); ch(); };
        box.append(add);
      };
      draw(); w.append(box);
    } else if (f.type === "range") {
      const row = h("div", "rng"), i = h("input"), out = h("span");
      i.type = "range"; i.min = f.min; i.max = f.max; i.step = f.step; i.dataset.k = f.k;
      const show = () => out.textContent = Math.round(i.value * 100) + "%";
      i.value = obj[f.k] ?? f.def; show();
      i.oninput = () => { obj[f.k] = +i.value; show(); ch(); };
      row.append(i, out); w.append(row);
    } else if (f.type === "imgs") {
      // 사진 여러 장: 고르면 바로 올라가고, ✕로 빼고, ◀ ▶로 순서를 바꾼다
      if (!Array.isArray(obj[f.k])) obj[f.k] = [];
      const box = h("div", "imgs"), add = h("label", "btn"), inp = h("input"), txt = h("span", "", "+ 사진 추가 (여러 장 선택 가능)");
      inp.type = "file"; inp.accept = "image/*"; inp.multiple = true; inp.hidden = true; add.style.cursor = "pointer"; add.append(txt, inp);
      const draw = () => {
        box.innerHTML = "";
        obj[f.k] = obj[f.k].filter(x => x && x.img);
        obj[f.k].forEach((x, i) => {
          const it = h("div", "imgs-it"), bar = h("div");
          getImage(thumbId(x.img)).then(u => u || getImage(x.img)).then(u => { if (u) it.style.backgroundImage = `url("${u}")`; });
          const mk = (t, title, fn) => { const b = h("button", "", t); b.type = "button"; b.title = title; b.onclick = () => { fn(); draw(); ch(); }; bar.append(b); };
          mk("◀", "앞으로", () => { if (i > 0) [obj[f.k][i - 1], obj[f.k][i]] = [obj[f.k][i], obj[f.k][i - 1]]; });
          mk("▶", "뒤로", () => { if (i < obj[f.k].length - 1) [obj[f.k][i + 1], obj[f.k][i]] = [obj[f.k][i], obj[f.k][i + 1]]; });
          mk("✕", "빼기", () => obj[f.k].splice(i, 1));
          it.append(bar); box.append(it);
        });
      };
      inp.onchange = async () => {
        const files = [...inp.files]; inp.value = "";
        try {
          for (let i = 0; i < files.length; i++) {
            txt.textContent = `올리는 중… ${i + 1} / ${files.length}`;
            obj[f.k].push({ img: await saveImage(files[i], { thumb: true }) }); draw();
          }
        } catch (e) { console.error(e); toast("일부 사진을 올리지 못했습니다. " + why(e)); }
        txt.textContent = "+ 사진 추가 (여러 장 선택 가능)"; ch();
      };
      draw(); w.append(box, add);
    } else if (f.type === "img" || f.type === "inline") {
      const box = h("div", "imgf"), pv = h("div", "imgf-pv"), inp = h("input"), rm = h("button", "btn", "지우기");
      inp.type = "file"; inp.accept = "image/*"; rm.type = "button";
      const show = async () => {
        const v = obj[f.k];
        pv.textContent = v ? "" : "이미지 없음";
        pv.style.backgroundImage = v ? `url("${v.startsWith("data:") ? v : await getImage(v)}")` : "";
      };
      inp.onchange = async () => {
        const file = inp.files[0]; if (!file) return;
        pv.style.backgroundImage = ""; pv.textContent = "처리 중…";
        try {
          if (ctx.local) obj[f.k] = await compress(file, f.max || 1400, 700000);
          else if (f.type === "inline") obj[f.k] = await compress(file, f.max || 480, f.limit || 120000);
          else obj[f.k] = await saveImage(file, { thumb: f.thumb });
        } catch (e) { console.error(e); toast("이미지를 올리지 못했습니다. " + why(e)); }
        inp.value = ""; show(); ch();
      };
      rm.onclick = () => { obj[f.k] = ""; show(); ch(); };
      show(); box.append(pv, inp, rm); w.append(box);
    } else if (f.type === "select") {
      const s = h("select");
      f.options.forEach(([v, l]) => { const o = h("option", "", l); o.value = v; s.append(o); });
      s.value = obj[f.k] ?? ""; s.onchange = () => { obj[f.k] = s.value; ch(); };
      w.append(s);
    } else if (f.type === "check") {
      const i = h("input"); i.type = "checkbox";
      i.checked = obj[f.k] === undefined ? !!f.def : !!obj[f.k];
      obj[f.k] = i.checked; i.onchange = () => { obj[f.k] = i.checked; ch(); };
      w.classList.add("chk"); lab.prepend(i);
    } else if (f.type === "pills") {
      // 눌러서 켜고 끄는 알약. f.add 면 새 값을 직접 추가할 수 있다.
      if (!Array.isArray(obj[f.k])) obj[f.k] = [];
      const box = h("div", "pills"), opts = [...f.options];
      obj[f.k].forEach(v => { if (!opts.some(o => o[0] === v)) opts.push([v, v]); });
      const draw = () => {
        box.innerHTML = "";
        if (f.all && opts.length) {
          const full = opts.every(o => obj[f.k].includes(o[0]));
          const b = h("button", "pill all", full ? "전원 해제" : "전원 선택"); b.type = "button";
          b.onclick = () => { obj[f.k] = full ? [] : opts.map(o => o[0]); draw(); ch(); };
          box.append(b);
        }
        opts.forEach(([v, l]) => {
          const b = h("button", "pill" + (obj[f.k].includes(v) ? " on" : ""), l); b.type = "button";
          b.onclick = () => { const a = obj[f.k], i = a.indexOf(v); if (i < 0) a.push(v); else a.splice(i, 1); draw(); ch(); };
          box.append(b);
        });
        if (f.add) {
          const inp = h("input", "pill-in"); inp.placeholder = "새 태그 입력 후 Enter";
          inp.onkeydown = e => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const v = inp.value.trim(); if (!v) return;
            if (!opts.some(o => o[0] === v)) opts.push([v, v]);
            if (!obj[f.k].includes(v)) obj[f.k].push(v);
            draw(); ch(); box.querySelector(".pill-in").focus();
          };
          box.append(inp);
        }
        if (!opts.length && !f.add) box.append(h("span", "hint", "선택할 항목이 없습니다."));
      };
      draw(); w.append(box);
    } else {
      const area = f.type === "area", i = h(area ? "textarea" : "input");
      i.value = obj[f.k] ?? ""; if (f.ph) i.placeholder = f.ph;
      if (area && f.rows) { i.rows = f.rows; i.classList.add("tall"); }
      i.oninput = () => { obj[f.k] = i.value; ch(); };
      if (area || f.fmt) w.append(formatBar(i, () => { obj[f.k] = i.value; ch(); }, area));
      // Shift+Enter: 문단을 나누지 않는 줄바꿈 표시(↵)를 넣는다
      if (area) i.onkeydown = e => {
        if (e.key !== "Enter" || !e.shiftKey) return;
        e.preventDefault();
        const s = i.selectionStart;
        i.value = i.value.slice(0, s) + "↵\n" + i.value.slice(i.selectionEnd);
        i.setSelectionRange(s + 2, s + 2); obj[f.k] = i.value; ch();
      };
      w.append(i);
    }
    if (f.hint || f.type === "area") w.append(h("div", "hint", f.hint || FMT_HINT));
    target.append(w);
  }
  return frag;
}

// 편집 창. 저장하면 안 쓰게 된 이미지를, 취소하면 새로 올린 이미지를 지운다.
export function openForm({ title, schema, data, onSave, onDelete }) {
  const val = structuredClone(data || {});
  const before = collectIds(data || {});
  const m = document.getElementById("modal");
  m.innerHTML = `<div class="mbox"><header><h3>${esc(title)}</h3><button class="btn" data-x>닫기</button></header>
    <div class="mbody"></div>
    <footer>${onDelete ? '<button class="btn danger" data-del>삭제</button>' : ""}<span style="flex:1"></span>
    <button class="btn" data-x>취소</button><button class="btn pri" data-save>저장</button></footer></div>`;
  m.querySelector(".mbody").append(buildFields(schema, val));
  m.classList.add("on");
  const close = () => { m.classList.remove("on"); m.innerHTML = ""; };
  m.querySelectorAll("[data-x]").forEach(b => b.onclick = () => {
    collectIds(val).forEach(id => { if (!before.has(id)) delImage(id); });
    close();
  });
  const saveBtn = m.querySelector("[data-save]");
  saveBtn.onclick = async () => {
    saveBtn.disabled = true; saveBtn.textContent = "저장 중…";
    try {
      await onSave(val);
      const now = collectIds(val);
      before.forEach(id => { if (!now.has(id)) delImage(id); });
      close(); toast("저장했습니다");
    } catch (e) {
      console.error(e);
      saveBtn.disabled = false; saveBtn.textContent = "저장";
      toast("저장하지 못했습니다. " + why(e));
    }
  };
  const del = m.querySelector("[data-del]");
  if (del) del.onclick = async () => {
    if (!confirm("삭제하면 되돌릴 수 없습니다. 삭제할까요?")) return;
    try { await onDelete(); close(); toast("삭제했습니다"); }
    catch (e) { console.error(e); toast("삭제하지 못했습니다. " + why(e)); }
  };
}
