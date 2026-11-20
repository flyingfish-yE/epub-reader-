// ===== 找到页面上的各个元素 =====
const img = document.getElementById("test-img");
const box = document.getElementById("img-box"); // 图片外框：宽度百分比设在这里
const wrap = document.getElementById("img-wrap"); // 图片所在的一整行
const handle = document.getElementById("resize-handle");
const panel = document.getElementById("panel");
const slider = document.getElementById("size-slider");
const sizeValue = document.getElementById("size-value");
const alignButtons = document.querySelectorAll(".align-group button");
const toast = document.getElementById("toast");
const savedInfo = document.getElementById("saved-info");

const fontBtn = document.getElementById("font-btn");
const fontPanel = document.getElementById("font-panel");
const fontSlider = document.getElementById("font-slider");
const fontValue = document.getElementById("font-value");
const reader = document.getElementById("reader");

// ===== 常量 =====
const IMAGE_KEY = "images/insert01.jpg"; // 图片的"名字"，以后换成真实图片路径
const STORAGE_KEY = "lnreader-image-overrides"; // 保存在浏览器本地的名字
const MIN_PERCENT = 30;
const MAX_PERCENT = 100;
const FIT_VIEWPORT = 0.85; // "适应屏幕"：图片高度最多占屏幕高度的 85%

// ===== 数据：一张图的设置（以后和队友约定的数据格式就是它）=====
// widthPercent：图片宽度占"这一行"宽度的百分比；高度永远按原比例自动算
function loadSaved() {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return all[IMAGE_KEY] || null;
  } catch (e) {
    return null;
  }
}

function writeSaved(cfg) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (cfg) all[IMAGE_KEY] = cfg;
    else delete all[IMAGE_KEY];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn("本地保存失败：", e);
  }
}

const clamp = (v) => Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, Math.round(v)));
const isPortrait = () => window.matchMedia("(orientation: portrait)").matches;

// 算出"适应屏幕"对应的百分比：让整张图的高度不超过屏幕高度的 85%
function fitPercent() {
  const rowW = wrap.clientWidth;
  if (!rowW || !img.naturalWidth || !img.naturalHeight) return MAX_PERCENT;
  const aspect = img.naturalWidth / img.naturalHeight;
  return clamp(((window.innerHeight * FIT_VIEWPORT * aspect) / rowW) * 100);
}

let hasSaved = false; // 这张图有没有被用户保存过
let savedConfig = { widthPercent: MAX_PERCENT, align: "center" };
let config = { ...savedConfig };

// ===== 把设置应用到图片上 =====
const alignNames = { left: "靠左", center: "居中", right: "靠右" };
const describe = (cfg) => cfg.widthPercent + "% · " + alignNames[cfg.align];

function applyConfig() {
  box.style.width = config.widthPercent + "%"; // 只改宽度，高度跟着等比变化
  const map = { left: "flex-start", center: "center", right: "flex-end" };
  wrap.style.justifyContent = map[config.align];
  box.classList.toggle("align-right", config.align === "right");

  slider.value = config.widthPercent;
  sizeValue.textContent = config.widthPercent;
  alignButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.align === config.align);
  });
}

function updateSavedInfo() {
  const s = loadSaved();
  savedInfo.textContent = s
    ? "已保存：" + describe(s) + "（存在这台设备的浏览器里）"
    : "尚未保存（当前为智能默认大小）";
}

// ===== 初始化：有保存的就用保存的，没有就用"适应屏幕"当默认 =====
function init() {
  const s = loadSaved();
  hasSaved = !!s;
  config = s
    ? { widthPercent: clamp(s.widthPercent), align: s.align || "center" }
    : { widthPercent: fitPercent(), align: "center" };
  savedConfig = { ...config };
  applyConfig();
}

if (img.complete && img.naturalWidth) init();
else {
  applyConfig();
  img.addEventListener("load", init);
}

// 转屏 / 改变窗口大小：没保存过的图，默认大小重新适应屏幕
window.addEventListener("resize", () => {
  if (!hasSaved && !panel.classList.contains("open")) {
    config.widthPercent = fitPercent();
    savedConfig = { ...config };
    applyConfig();
  }
});

// ===== 打开 / 关闭图片面板 =====
function openImagePanel() {
  fontPanel.classList.remove("show");
  panel.classList.add("open");
  img.classList.add("editing");
  box.classList.add("editing");
  wrap.classList.add("editing");
  document.body.classList.add("editing");
  updateSavedInfo();

  // 竖屏时面板在底部，把图片滚到屏幕上半部分，免得被面板盖住
  if (isPortrait()) {
    setTimeout(() => {
      const top = box.getBoundingClientRect().top;
      window.scrollBy({ top: top - 70, behavior: "smooth" });
    }, 60);
  }
}

function closePanel() {
  panel.classList.remove("open");
  img.classList.remove("editing");
  box.classList.remove("editing");
  wrap.classList.remove("editing");
  document.body.classList.remove("editing");
}

img.addEventListener("click", openImagePanel);
document.getElementById("edit-btn").addEventListener("click", openImagePanel);

// 保存当前设置（保存按钮、点 ✕、点空白处关闭，都走这里）
function commitSave() {
  savedConfig = { ...config };
  hasSaved = true;
  writeSaved(savedConfig);

  // 这就是以后和队友对接的数据格式
  console.log("保存的设置：", JSON.stringify({ [IMAGE_KEY]: savedConfig }));

  toast.textContent = "已保存：" + describe(savedConfig);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1500);
}

// 关闭面板：改过的话自动保存（所以不用每次都点"保存"）；没改过就直接关
function finishEditing() {
  const changed =
    config.widthPercent !== savedConfig.widthPercent || config.align !== savedConfig.align;
  if (changed) commitSave();
  closePanel();
}

document.getElementById("close-btn").addEventListener("click", finishEditing);

// 点面板和图片以外的任何地方（空白、文字），也会关闭
const editBtn = document.getElementById("edit-btn");
const inEditor = (t) => panel.contains(t) || box.contains(t) || editBtn.contains(t);
let downInEditor = false;

document.addEventListener("pointerdown", (e) => {
  downInEditor = inEditor(e.target);
});

document.addEventListener("click", (e) => {
  if (!panel.classList.contains("open")) return;
  // 按下或松开在编辑区里（比如拖滑块时手指滑出了面板）都不算"点空白"
  if (downInEditor || inEditor(e.target)) return;
  finishEditing();
});

// ===== 滑块 =====
slider.addEventListener("input", () => {
  config.widthPercent = clamp(Number(slider.value));
  applyConfig();
});

// ===== 滑块两边的 − / + ：点一下 ±1%，按住不放会连续变化 =====
function stepPercent(delta) {
  config.widthPercent = clamp(config.widthPercent + delta);
  applyConfig();
}

function bindStepButton(id, delta) {
  const btn = document.getElementById(id);
  let holdTimer = null;
  let repeatTimer = null;

  const stop = () => {
    clearTimeout(holdTimer);
    clearInterval(repeatTimer);
  };

  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    stepPercent(delta); // 先立刻变 1%
    holdTimer = setTimeout(() => {
      repeatTimer = setInterval(() => stepPercent(delta), 70); // 按住 0.4 秒后开始连续变
    }, 400);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, stop));

  // 键盘操作（Tab 选中后按回车/空格）
  btn.addEventListener("click", (e) => {
    if (e.detail === 0) stepPercent(delta);
  });
  btn.addEventListener("contextmenu", (e) => e.preventDefault()); // 手机长按不弹菜单
}

bindStepButton("size-minus", -1);
bindStepButton("size-plus", 1);

// ===== 对齐按钮 =====
alignButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    config.align = btn.dataset.align;
    // 图片占满整行时，靠左/靠右看不出区别，所以自动缩小一点
    if (config.align !== "center" && config.widthPercent >= MAX_PERCENT) {
      config.widthPercent = 70;
    }
    applyConfig();
  });
});

// ===== 适应屏幕 =====
document.getElementById("fit-btn").addEventListener("click", () => {
  config = { widthPercent: fitPercent(), align: "center" };
  applyConfig();
});

// ===== 恢复默认：清掉保存的设置 =====
document.getElementById("reset-btn").addEventListener("click", () => {
  writeSaved(null);
  hasSaved = false;
  config = { widthPercent: fitPercent(), align: "center" };
  savedConfig = { ...config };
  applyConfig();
  updateSavedInfo();
});

// ===== 保存按钮 =====
document.getElementById("save-btn").addEventListener("click", () => {
  commitSave();
  closePanel();
});

// ===== 对角线缩放 方式一：拖动角上的圆点 =====
// 原理：把手指移动的 (dx, dy) 换算成"宽度变化量"，
// 因为高度 = 宽度 ÷ 宽高比，所以 dy 对应的宽度变化是 dy × 宽高比，
// 再和 dx 取平均，就是沿对角线拖动的效果。
let drag = null;

handle.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  handle.setPointerCapture(e.pointerId);
  const r = img.getBoundingClientRect();
  drag = {
    x: e.clientX,
    y: e.clientY,
    startPercent: config.widthPercent,
    aspect: r.height ? r.width / r.height : 1,
    rowW: wrap.clientWidth || 1,
  };
});

handle.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  const sign = config.align === "right" ? -1 : 1; // 靠右时圆点在左下角，往左拖才是放大
  const mult = config.align === "center" ? 2 : 1; // 居中时两边同时长，所以要乘 2 才跟手
  const dw = ((sign * dx + dy * drag.aspect) / 2) * mult;
  config.widthPercent = clamp(drag.startPercent + (dw / drag.rowW) * 100);
  applyConfig();
});

const endDrag = () => {
  drag = null;
};
handle.addEventListener("pointerup", endDrag);
handle.addEventListener("pointercancel", endDrag);

// ===== 对角线缩放 方式二：双指捏合（手机 / iPad）=====
const pointers = new Map();
let pinch = null;

box.addEventListener("pointerdown", (e) => {
  if (!box.classList.contains("editing") || e.target === handle) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { startDist: Math.hypot(a.x - b.x, a.y - b.y), startPercent: config.widthPercent };
  }
});

box.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2 && pinch.startDist > 0) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    config.widthPercent = clamp(pinch.startPercent * (dist / pinch.startDist));
    applyConfig();
  }
});

const endPinch = (e) => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
};
box.addEventListener("pointerup", endPinch);
box.addEventListener("pointercancel", endPinch);
box.addEventListener("pointerleave", endPinch);

// ===== 导出设置文件 =====
document.getElementById("export-btn").addEventListener("click", () => {
  const text = localStorage.getItem(STORAGE_KEY) || "{}";
  const pretty = JSON.stringify({ imageOverrides: JSON.parse(text) }, null, 2);
  const blob = new Blob([pretty], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lnreader-image-settings.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

// ===== 日夜切换 =====
const themeBtn = document.getElementById("theme-btn");
themeBtn.addEventListener("click", () => {
  const html = document.documentElement;
  const isDay = html.dataset.theme === "day";
  html.dataset.theme = isDay ? "night" : "day";
  themeBtn.textContent = isDay ? "☀️ 白天" : "🌙 夜间";
});

// ===== 文字大小 =====
fontBtn.addEventListener("click", () => {
  fontPanel.classList.toggle("show");
});

fontSlider.addEventListener("input", () => {
  reader.style.fontSize = fontSlider.value + "px";
  fontValue.textContent = fontSlider.value;
});

// 点字号面板以外的任何地方，字号面板自动收起
document.addEventListener("click", (e) => {
  if (!fontPanel.contains(e.target) && !fontBtn.contains(e.target)) {
    fontPanel.classList.remove("show");
  }
});