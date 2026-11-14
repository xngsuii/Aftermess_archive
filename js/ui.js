// 공용 도구: 글자 변환, 이미지 지연 로딩, 편집 양식, 알림
import { getImage, saveImage, delImage, compress, collectIds } from "./store.js";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// **굵게**, __밑줄 강조__
export const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<u>$1</u>").replace(/\n/g, "<br>");
export const fmt = s => String(s ?? "").trim() ? String(s).trim().split(/\n{2,}/).map(p => `<p>${inl(p)}</p>`).join("") : "";
export const FMT_HINT = "**굵게**, __밑줄 강조__ 를 쓸 수 있고, 빈 줄로 문단을 나눕니다.";

// 이미지: data URL이면 바로, 아니면 화면 근처에 왔을 때 Firestore에서 불러온다
export const imgAttr = v => !v ? "" : v.startsWith("data:") ? `src="${v}"` : `data-img="${esc(v)}"`;
export const bgAttr = v => !v ? "" : v.startsWith("data:") ? `style="background-image:url('${v}')"` : `data-img="${esc(v)}"`;
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
export async function lightbox(id) {
  const lb = document.getElementById("lb");
  lb.innerHTML = ""; lb.classList.add("on");
  const url = id.startsWith("data:") ? id : await getImage(id);
  lb.innerHTML = `<img src="${url}" alt="">`;
}

const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// schema 항목: {k, label, type: text|area|select|img|inline|list|head, ...}
export function buildFields(schema, obj, ctx = {}) {
  const frag = document.createDocumentFragment();
  const ch = () => ctx.change && ctx.change();
  for (const f of schema) {
    if (f.type === "head") { frag.append(h("div", "fhd", f.label)); continue; }
    const w = h("div", "fld");
    w.append(h("label", "", f.label));
    if (f.type === "list") {
      if (!Array.isArray(obj[f.k])) obj[f.k] = [];
      const box = h("div");
      const draw = () => {
        box.innerHTML = "";
        obj[f.k].forEach((it, i) => {
          const row = h("div", "lst-it"), head = h("div", "lst-h");
          head.append(h("span", "", `${f.item || "항목"} ${i + 1}`));
          const mk = (txt, fn) => { const b = h("button", "", txt); b.type = "button"; b.onclick = () => { fn(); draw(); ch(); }; head.append(b); };
          mk("↑", () => { if (i > 0) [obj[f.k][i - 1], obj[f.k][i]] = [obj[f.k][i], obj[f.k][i - 1]]; });
          mk("↓", () => { if (i < obj[f.k].length - 1) [obj[f.k][i + 1], obj[f.k][i]] = [obj[f.k][i], obj[f.k][i + 1]]; });
          mk("✕", () => obj[f.k].splice(i, 1));
          row.append(head, buildFields(f.fields, it, ctx));
          box.append(row);
        });
        const add = h("button", "btn", `+ ${f.item || "항목"} 추가`); add.type = "button";
        add.onclick = () => { obj[f.k].push({}); draw(); ch(); };
        box.append(add);
      };
      draw(); w.append(box);
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
    } else {
      const i = h(f.type === "area" ? "textarea" : "input");
      i.value = obj[f.k] ?? ""; if (f.ph) i.placeholder = f.ph;
      i.oninput = () => { obj[f.k] = i.value; ch(); };
      w.append(i);
    }
    if (f.hint || f.type === "area") w.append(h("div", "hint", f.hint || FMT_HINT));
    frag.append(w);
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
