import { buildDino } from './dino/dino-svg.js';
import { State, StateMachine } from './dino/states.js';
import { Animator } from './dino/animator.js';
import { Bubble } from './bubble.js';
import { Movement } from './movement.js';
import { Drag } from './drag.js';
import { Click } from './click.js';
import { Weather } from './features/weather.js';
import { SysMon } from './features/sysmon.js';
import { Greeting } from './features/greeting.js';
import { Stats } from './features/stats.js';
import { UIPanel } from './ui.js';

const svg = document.getElementById('dino-svg');
const wrapper = document.getElementById('dino-wrapper');

// 画恐龙
const parts = buildDino(svg);

// 状态机
const sm = new StateMachine();

// 气泡
const bubble = new Bubble();

// 动画引擎
new Animator(parts, sm);

// 屏幕尺寸
let bounds = { width: window.innerWidth, height: window.innerHeight };
if (window.dinoAPI) {
  bounds = await window.dinoAPI.getScreenBounds();
}

// 朝向：翻转 SVG
function setFacing(f) {
  svg.style.transform = f < 0 ? 'scaleX(-1)' : '';
}

// 移动
const movement = new Movement(wrapper, sm, bounds, setFacing);

// 拖拽
const drag = new Drag(wrapper, sm, movement, bounds);

// 点击
new Click(svg, sm, bubble);

// --- UI 面板：右键恐龙弹出（始终初始化，不依赖 Electron） ---
const stats = new Stats(sm, bubble);
const ui = new UIPanel(stats, bubble, wrapper);

// 点击面板外部收起
document.addEventListener('click', (e) => {
  if (ui.visible && !ui.panel.contains(e.target)) {
    ui.hide();
  }
});

// 右键恐龙 -> 弹出面板
wrapper.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();

  // 定位面板：恐龙正上方居中
  const r = wrapper.getBoundingClientRect();
  const panelW = 320;
  let left = r.left + r.width / 2 - panelW / 2;
  let top = r.top - 20;

  // 超出屏幕右边界则右对齐
  if (left + panelW > window.innerWidth - 16) {
    left = window.innerWidth - panelW - 16;
  }
  // 超出左边界则左对齐
  if (left < 16) left = 16;
  // 面板不能超出屏幕上方，如果恐龙在屏幕上方则显示在恐龙上方
  if (top < 16) top = r.bottom + 16;

  ui.panel.style.left = `${left}px`;
  ui.panel.style.top = `${top}px`;

  ui.toggle();
});

// 功能模块
if (window.dinoAPI) {
  // 天气模块：同时更新 UI 面板
  const weather = new Weather(bubble, sm);
  weather.onWeatherChange && weather.onWeatherChange((info) => {
    if (info.city && info.city !== '未知') {
      ui.setWeather(`${info.icon} ${info.city}`);
    } else if (info.icon) {
      ui.setWeather(info.icon);
    }
  });

  // 系统监控
  new SysMon(sm, bubble);

  // 问候语
  const greeting = new Greeting(sm, bubble);
  setTimeout(() => greeting.greet(), 1800);

} else {
  // 浏览器预览模式：不启动需要 Electron API 的功能
  console.log('浏览器预览模式');
}

// 点击穿透：鼠标在恐龙上→可交互，离开→穿透
let overDino = false;
document.addEventListener('mousemove', (e) => {
  const r = wrapper.getBoundingClientRect();
  const inside =
    e.clientX >= r.left && e.clientX <= r.right &&
    e.clientY >= r.top && e.clientY <= r.bottom;
  if (inside !== overDino) {
    overDino = inside;
    // UI 面板打开时不启用穿透，否则面板无法响应点击
    if (window.dinoAPI && !ui.visible) window.dinoAPI.setIgnoreMouse(!inside);
  }
});

// 主循环：移动 + 拖拽物理 + 气泡跟随
let lastT = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;

  movement.update(dt);
  drag.update(dt);

  // 气泡跟随恐龙
  const r = wrapper.getBoundingClientRect();
  bubble.follow(r.left + r.width / 2, r.top);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 窗口关闭时保存记忆
window.addEventListener('beforeunload', () => {
  stats._saveToLocalStorage();
});
