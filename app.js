/**
 * 一步一屏｜岗位执行支持器
 * - 一步一屏 SOP
 * - 沟通卡片（全屏展示）
 * - 记录导出 CSV
 * - 本地持久化（可断网/刷新后恢复）
 */

// ========= 示例岗位数据（可按需扩展） =========
const JOBS = [
  {
    id: "store_restock",
    name: "便利店补货（8步）",
    steps: [
      { id: 1, title: "看货架，找空位置", tip: "慢慢看一整排" },
      { id: 2, title: "从后仓拿货出来", tip: "一次拿不多" },
      { id: 3, title: "对比条码，确认一样", tip: "看清数字和名字" },
      { id: 4, title: "旧货放前，新货放后", tip: "先旧后新" },
      { id: 5, title: "把货排整齐，面朝外", tip: "标签朝同一方向" },
      { id: 6, title: "检查破损和过期", tip: "发现问题就求助" },
      { id: 7, title: "清理货架灰尘碎屑", tip: "用抹布轻轻擦" },
      { id: 8, title: "拍照给店长确认", tip: "拍清楚整排货架" },
    ],
  },
  {
    id: "desk_clean",
    name: "清洁桌面（6步）",
    steps: [
      { id: 1, title: "把物品先放一边", tip: "小心不要掉落" },
      { id: 2, title: "抹布沾一点清洁剂", tip: "不要太湿" },
      { id: 3, title: "从左到右擦桌面", tip: "一块块慢慢擦" },
      { id: 4, title: "擦桌边和角落", tip: "注意桌角" },
      { id: 5, title: "用干布再擦一遍", tip: "擦干水迹" },
      { id: 6, title: "物品按原样放回", tip: "对照之前的样子" },
    ],
  },
];

// ========= 示例沟通卡片 =========
const COMM_CARDS = {
  need: [
    { text: "我需要休息3分钟", type: "休息" },
    { text: "我需要你示范一次", type: "示范" },
    { text: "我需要你说慢一点", type: "节奏" },
    { text: "我需要你告诉我下一步", type: "支持" },
  ],
  feel: [
    { text: "这里有点吵，我不舒服", type: "环境" },
    { text: "我有点紧张", type: "情绪" },
    { text: "我有点累", type: "情绪" },
    { text: "灯太亮了，我不舒服", type: "环境" },
  ],
  ask: [
    { text: "请你重复刚才那句话", type: "沟通" },
    { text: "请你说短一点", type: "沟通" },
    { text: "请你陪我做这一遍", type: "陪伴" },
    { text: "请你用手指给我看位置", type: "指引" },
  ],
};

// ========= 本地存储键 =========
const LS_KEYS = {
  state: "job_helper_state_v1",
  history: "job_helper_history_v1",
};

// ========= 状态 =========
let state = {
  currentJobId: null,
  currentStepIndex: 0,
  session: null, // { jobId, jobName, startTime, helpClicks, lastStepId }
};
let sessionHistory = [];

// ========= DOM =========
function $(sel) {
  return document.querySelector(sel);
}
function $all(sel) {
  return Array.from(document.querySelectorAll(sel));
}

// ========= 持久化 =========
function saveState() {
  localStorage.setItem(LS_KEYS.state, JSON.stringify(state));
}
function saveHistory() {
  localStorage.setItem(LS_KEYS.history, JSON.stringify(sessionHistory));
}
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEYS.state);
    if (raw) state = JSON.parse(raw);
  } catch (_) {}
  try {
    const rawH = localStorage.getItem(LS_KEYS.history);
    if (rawH) sessionHistory = JSON.parse(rawH);
  } catch (_) {}
}

// ========= 渲染 =========
function renderJobs() {
  const jobList = $("#job-list");
  jobList.innerHTML = "";
  JOBS.forEach((job) => {
    const div = document.createElement("div");
    div.className = "job-item";
    div.textContent = job.name;
    div.dataset.jobId = job.id;
    div.addEventListener("click", () => selectJob(job.id));
    jobList.appendChild(div);
  });
  updateJobActiveState();
}

function updateJobActiveState() {
  $all(".job-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.jobId === state.currentJobId);
  });
}

function getCurrentJob() {
  return JOBS.find((j) => j.id === state.currentJobId) || null;
}

function renderCurrentStep() {
  const container = $("#step-container");
  const job = getCurrentJob();

  if (!job) {
    container.innerHTML = '<p class="placeholder">请先在左侧选择一个岗位</p>';
    return;
  }

  const step = job.steps[state.currentStepIndex];
  if (!step) {
    container.innerHTML = '<p class="placeholder">步骤不存在</p>';
    return;
  }

  const progress = `${state.currentStepIndex + 1} / ${job.steps.length}`;
  container.innerHTML = `
    <div>
      <div class="step-title">第 ${step.id} 步：${step.title}</div>
      <div class="step-tip">提醒：${step.tip || "无"}</div>
      <div class="step-progress">进度：${progress}</div>
    </div>
  `;
}

function renderCards(tab = "need") {
  const list = $("#card-list");
  list.innerHTML = "";

  (COMM_CARDS[tab] || []).forEach((card) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div>${escapeHtml(card.text)}</div>
      <div class="card-type">${escapeHtml(card.type)}</div>
    `;
    div.addEventListener("click", () => showCardFullscreen(card.text));
    list.appendChild(div);
  });
}

function updateControls() {
  const job = getCurrentJob();

  // 选择岗位后才能开始
  $("#btn-start").disabled = !job || !!state.session;

  // 开始任务后才能上一/下一/完成/重置
  const running = !!state.session;
  $("#btn-prev").disabled = !running;
  $("#btn-next").disabled = !running;
  $("#btn-complete").disabled = !running;
  $("#btn-reset").disabled = !running;

  if (running && job) {
    $("#btn-prev").disabled = state.currentStepIndex === 0;
    $("#btn-next").disabled = state.currentStepIndex >= job.steps.length - 1;
  }
}

function updateSessionInfo() {
  const box = $("#session-info");
  const job = getCurrentJob();

  if (!state.session) {
    box.innerHTML = "<p>当前没有进行中的任务</p>";
    return;
  }

  const now = Date.now();
  const elapsedSec = Math.max(0, Math.floor((now - state.session.startTime) / 1000));
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;

  const stepId =
    job && job.steps[state.currentStepIndex] ? job.steps[state.currentStepIndex].id : state.session.lastStepId;

  box.innerHTML = `
    <p><b>岗位：</b>${escapeHtml(state.session.jobName)}</p>
    <p><b>当前步骤：</b>第 ${stepId} 步</p>
    <p><b>已用时：</b>${minutes} 分 ${seconds} 秒</p>
    <p><b>沟通卡片点击：</b>${state.session.helpClicks} 次</p>
  `;
}

function tick() {
  if (state.session) updateSessionInfo();
  requestAnimationFrame(() => {
    // 降频：每秒刷新一次信息更稳
  });
}

// ========= 行为 =========
function selectJob(jobId) {
  state.currentJobId = jobId;
  state.currentStepIndex = 0;
  // 如果在进行中，切岗位会造成混乱：这里直接重置本次
  state.session = null;
  saveState();

  updateJobActiveState();
  renderCurrentStep();
  updateControls();
  updateSessionInfo();
}

function startSession() {
  const job = getCurrentJob();
  if (!job) return;
  state.session = {
    jobId: job.id,
    jobName: job.name,
    startTime: Date.now(),
    endTime: null,
    finished: false,
    lastStepId: job.steps[state.currentStepIndex]?.id ?? 1,
    helpClicks: 0,
  };
  saveState();
  updateControls();
  updateSessionInfo();
}

function prevStep() {
  const job = getCurrentJob();
  if (!job || !state.session) return;
  if (state.currentStepIndex > 0) {
    state.currentStepIndex -= 1;
    state.session.lastStepId = job.steps[state.currentStepIndex].id;
    saveState();
    renderCurrentStep();
    updateControls();
    updateSessionInfo();
  }
}

function nextStep() {
  const job = getCurrentJob();
  if (!job || !state.session) return;
  if (state.currentStepIndex < job.steps.length - 1) {
    state.currentStepIndex += 1;
    state.session.lastStepId = job.steps[state.currentStepIndex].id;
    saveState();
    renderCurrentStep();
    updateControls();
    updateSessionInfo();
  }
}

function completeSession() {
  const job = getCurrentJob();
  if (!job || !state.session) return;
  const endTime = Date.now();

  const record = {
    jobId: state.session.jobId,
    jobName: state.session.jobName,
    startTime: state.session.startTime,
    endTime,
    durationSec: Math.max(0, Math.floor((endTime - state.session.startTime) / 1000)),
    finished: true,
    lastStepId: job.steps[state.currentStepIndex]?.id ?? state.session.lastStepId,
    helpClicks: state.session.helpClicks,
  };

  sessionHistory.push(record);
  saveHistory();

  // 重置本次，但保留岗位选择
  state.session = null;
  state.currentStepIndex = 0;
  saveState();

  renderCurrentStep();
  updateControls();
  updateSessionInfo();
  alert("本次任务已完成并记录。");
}

function resetCurrentSession() {
  const ok = confirm("确定要重置本次任务吗？本次未导出的过程将丢失。");
  if (!ok) return;

  state.session = null;
  state.currentStepIndex = 0;
  saveState();

  renderCurrentStep();
  updateControls();
  updateSessionInfo();
}

function showCardFullscreen(text) {
  const overlay = document.createElement("div");
  overlay.className = "card-fullscreen";
  overlay.innerHTML = `
    <div class="card-fullscreen-content" role="dialog" aria-modal="true">
      <p>${escapeHtml(text)}</p>
      <button type="button">关闭</button>
    </div>
  `;

  const close = () => overlay.remove();
  overlay.addEventListener("click", close);
  overlay.querySelector("button").addEventListener("click", close);
  document.body.appendChild(overlay);

  // 记录“求助/表达”次数
  if (state.session) {
    state.session.helpClicks += 1;
    saveState();
    updateSessionInfo();
  }
}

function exportCSV() {
  if (!sessionHistory.length) {
    alert("还没有任何记录可导出。");
    return;
  }

  const header = [
    "岗位ID",
    "岗位名称",
    "开始时间(ISO)",
    "结束时间(ISO)",
    "总用时(秒)",
    "是否完成",
    "最后步骤ID",
    "沟通卡片点击次数",
  ];

  const rows = [header];
  for (const r of sessionHistory) {
    rows.push([
      r.jobId,
      r.jobName,
      new Date(r.startTime).toISOString(),
      new Date(r.endTime).toISOString(),
      r.durationSec,
      r.finished ? "是" : "否",
      r.lastStepId,
      r.helpClicks,
    ]);
  }

  const csv = rows
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "job_sessions.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  const ok = confirm("确定要清空所有记录吗？清空后不可恢复。");
  if (!ok) return;
  sessionHistory = [];
  saveHistory();
  alert("已清空所有记录。");
}

// ========= 工具 =========
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function restoreTabAndCards() {
  // 默认tab：need
  renderCards("need");
  $all(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $all(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderCards(btn.dataset.tab);
    });
  });
}

function restoreUIFromState() {
  renderJobs();
  renderCurrentStep();
  updateControls();
  updateSessionInfo();
}

function bindEvents() {
  $("#btn-start").addEventListener("click", startSession);
  $("#btn-prev").addEventListener("click", prevStep);
  $("#btn-next").addEventListener("click", nextStep);
  $("#btn-complete").addEventListener("click", completeSession);
  $("#btn-reset").addEventListener("click", resetCurrentSession);
  $("#btn-export").addEventListener("click", exportCSV);
  $("#btn-clear-history").addEventListener("click", clearHistory);

  // 刷新/关闭前保存
  window.addEventListener("beforeunload", () => {
    saveState();
    saveHistory();
  });
}

// ========= 初始化 =========
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  restoreTabAndCards();
  restoreUIFromState();
  bindEvents();

  // 每秒刷新一次计时显示
  setInterval(() => {
    if (state.session) updateSessionInfo();
  }, 1000);
});

