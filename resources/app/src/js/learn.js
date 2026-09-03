import { buildDino } from './dino/dino-svg.js';
import { State, StateMachine } from './dino/states.js';
import { Animator } from './dino/animator.js';
import { Bubble } from './bubble.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const STORAGE = {
  settings: 'pipemode-settings',
  pomodoro: 'pipemode-pomodoro',
  tasks: 'pipemode-tasks',
  bgMode: 'pipemode-bg-mode',
};

const safeJSON = (value, fallback) => {
  try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
};

class SettingsManager {
  constructor() {
    this.defaults = {
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      apiKey: '',
      modelName: 'gpt-4o-mini',
    };
    this.data = { ...this.defaults, ...safeJSON(localStorage.getItem(STORAGE.settings), {}) };
    this.bind();
    this.render();
  }

  bind() {
    $('#settings-toggle')?.addEventListener('click', () => this.toggle());
    $('#settings-close')?.addEventListener('click', () => this.hide());
    $('#settings-save')?.addEventListener('click', () => this.saveFromUI());
    $('#settings-clear-key')?.addEventListener('click', () => {
      $('#api-key').value = '';
      this.saveFromUI('密钥已清除');
    });
  }

  render() {
    $('#api-url').value = this.data.apiUrl;
    $('#api-key').value = this.data.apiKey;
    $('#model-name').value = this.data.modelName;
  }

  saveFromUI(message = '设置已保存') {
    this.data = {
      apiUrl: $('#api-url').value.trim() || this.defaults.apiUrl,
      apiKey: $('#api-key').value.trim(),
      modelName: $('#model-name').value.trim() || this.defaults.modelName,
    };
    localStorage.setItem(STORAGE.settings, JSON.stringify(this.data));
    toast(message);
  }

  get() { return { ...this.data }; }
  toggle() { $('#settings-panel')?.classList.toggle('hidden'); }
  hide() { $('#settings-panel')?.classList.add('hidden'); }
}

class BackgroundManager {
  constructor() {
    this.layer = $('#bg-layer');
    this.input = $('#bg-file-input');
    this.url = null;
    this.mode = localStorage.getItem(STORAGE.bgMode) || 'photo';
    this.userSelected = localStorage.getItem('pipemode-bg-user-file') === '1';
    this.bind();
    this.syncMode();
    if (!this.userSelected) {
      this.loadDefaultBg();
    }
  }

  bind() {
    $('#bg-toggle')?.addEventListener('click', () => this.togglePanel());
    $('#quick-bg')?.addEventListener('click', () => this.togglePanel());
    $('#bg-select')?.addEventListener('click', () => this.input?.click());
    $('#bg-remove')?.addEventListener('click', () => this.clear());
    this.input?.addEventListener('change', (e) => this.loadFile(e.target.files?.[0]));
    $$('input[name="bg-mode"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        this.mode = radio.value;
        localStorage.setItem(STORAGE.bgMode, this.mode);
        this.syncMode();
      });
    });
  }

  syncMode() {
    const radio = $(`input[name="bg-mode"][value="${this.mode}"]`);
    if (radio) radio.checked = true;
  }

  togglePanel() { $('#bg-panel')?.classList.toggle('hidden'); }

  loadFile(file) {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      toast('请选择图片或视频文件');
      return;
    }
    this.mode = isVideo ? 'video' : 'photo';
    localStorage.setItem(STORAGE.bgMode, this.mode);
    this.syncMode();
    this.revoke();
    this.url = URL.createObjectURL(file);
    localStorage.setItem('pipemode-bg-user-file', '1');
    this.userSelected = true;
    const el = document.createElement(isVideo ? 'video' : 'img');
    el.src = this.url;
    if (isVideo) {
      Object.assign(el, { autoplay: true, loop: true, muted: true, playsInline: true });
      el.play?.().catch(() => {});
    }
    this.layer.replaceChildren(el);
  }

  async clear() {
    this.revoke();
    this.layer.replaceChildren();
    if (this.input) this.input.value = '';
    localStorage.removeItem('pipemode-bg-user-file');
    this.userSelected = false;
    toast('背景已移除');
    await this.loadDefaultBg();
  }

  async loadDefaultBg() {
    if (!window.dinoAPI) { console.warn('[bg] no dinoAPI'); return; }
    try {
      const videoPath = await window.dinoAPI.getBgVideoPath();
      console.log('[bg] videoPath:', videoPath);
      if (!videoPath) return;

      // 用 file.protocol + 路径拼接成 file:/// URL
      const fileUrl = `file:///${videoPath.replace(/\\/g, '/')}`;
      const videoEl = document.createElement('video');
      videoEl.src = fileUrl;
      Object.assign(videoEl, {
        autoplay: true,
        loop: true,
        muted: true,
        playsInline: true,
      });
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'cover';
      videoEl.play?.().catch(() => {});
      this.layer.replaceChildren(videoEl);
      this.url = fileUrl;
      this.mode = 'video';
      localStorage.setItem(STORAGE.bgMode, 'video');
      this.syncMode();
    } catch {
      // 视频加载失败不影响其他功能
    }
  }

  revoke() {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }
}

class PomodoroTimer {
  constructor() {
    const saved = safeJSON(localStorage.getItem(STORAGE.pomodoro), {});
    this.focusMinutes = Number(saved.focusMinutes) || 25;
    this.restMinutes = Number(saved.restMinutes) || 5;
    this.completed = Number(saved.completed) || 0;
    this.phase = saved.phase === 'rest' ? 'rest' : 'focus';
    this.running = false;
    this.remaining = this.durationSeconds();
    this.timer = null;
    this.bind();
    this.render();
  }

  bind() {
    $('#pomodoro-start')?.addEventListener('click', () => this.toggleStart());
    $('#pomodoro-pause')?.addEventListener('click', () => this.pause());
    $('#pomodoro-reset')?.addEventListener('click', () => this.reset());
    ['focus-duration', 'rest-duration'].forEach((id) => {
      $(`#${id}`)?.addEventListener('change', () => this.updateDurations());
    });
  }

  durationSeconds() { return (this.phase === 'focus' ? this.focusMinutes : this.restMinutes) * 60; }

  updateDurations() {
    this.focusMinutes = clamp(Number($('#focus-duration').value) || 25, 1, 120);
    this.restMinutes = clamp(Number($('#rest-duration').value) || 5, 1, 60);
    this.save();
    if (!this.running) this.reset(false);
  }

  toggleStart() {
    if (this.running) return;
    this.running = true;
    $('#pomodoro-start').textContent = '继续';
    $('#pomodoro-status').textContent = this.phase === 'focus' ? '专注中' : '休息中';
    this.timer = setInterval(() => this.tick(), 1000);
  }

  pause() {
    this.running = false;
    clearInterval(this.timer);
    $('#pomodoro-status').textContent = '已暂停';
  }

  reset(showToast = true) {
    this.pause();
    this.phase = 'focus';
    this.remaining = this.durationSeconds();
    $('#pomodoro-start').textContent = '开始';
    $('#pomodoro-status').textContent = '专注中';
    this.render();
    this.save();
    if (showToast) toast('番茄钟已重置');
  }

  tick() {
    this.remaining -= 1;
    if (this.remaining <= 0) this.finishPhase();
    this.render();
  }

  finishPhase() {
    const finishedFocus = this.phase === 'focus';
    if (finishedFocus) this.completed += 1;
    notify(finishedFocus ? '专注完成' : '休息结束', finishedFocus ? '休息一下吧！' : '准备进入下一轮专注。');
    this.phase = finishedFocus ? 'rest' : 'focus';
    this.remaining = this.durationSeconds();
    $('#pomodoro-status').textContent = this.phase === 'focus' ? '专注中' : '休息中';
    this.save();
  }

  render() {
    $('#focus-duration').value = this.focusMinutes;
    $('#rest-duration').value = this.restMinutes;
    $('#pomodoro-display').textContent = formatTime(this.remaining);
    $('#pomodoro-count').textContent = `已完成 ${this.completed} 个番茄`;
  }

  save() {
    localStorage.setItem(STORAGE.pomodoro, JSON.stringify({
      focusMinutes: this.focusMinutes,
      restMinutes: this.restMinutes,
      completed: this.completed,
      phase: this.phase,
    }));
  }
}

class TaskList {
  constructor() {
    this.tasks = safeJSON(localStorage.getItem(STORAGE.tasks), []);
    this.bind();
    this.render();
  }

  bind() {
    $('#task-add')?.addEventListener('click', () => this.addFromInput());
    $('#task-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addFromInput();
    });
  }

  addFromInput() {
    const input = $('#task-input');
    const text = input.value.trim();
    if (!text) return;
    this.tasks.unshift({ id: Date.now(), text, done: false });
    input.value = '';
    this.save();
    this.render();
  }

  toggle(id) {
    this.tasks = this.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task);
    this.save();
    this.render();
  }

  remove(id) {
    this.tasks = this.tasks.filter((task) => task.id !== id);
    this.save();
    this.render();
  }

  render() {
    const list = $('#task-list');
    list.innerHTML = '';
    if (!this.tasks.length) {
      list.innerHTML = '<li><span class="task-text">暂无任务，添加一个开始学习吧。</span></li>';
      return;
    }
    for (const task of this.tasks) {
      const li = document.createElement('li');
      li.className = task.done ? 'done' : '';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.addEventListener('change', () => this.toggle(task.id));
      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = task.text;
      const del = document.createElement('button');
      del.className = 'task-delete';
      del.type = 'button';
      del.textContent = '×';
      del.title = '删除任务';
      del.addEventListener('click', () => this.remove(task.id));
      li.append(checkbox, text, del);
      list.appendChild(li);
    }
  }

  save() { localStorage.setItem(STORAGE.tasks, JSON.stringify(this.tasks)); }
}

class ChatPanel {
  constructor(settings) {
    this.settings = settings;
    this.bind();
    this.addMessage('ai', '你好，我是 ZCode 学习助手。');
  }

  bind() {
    $('#chat-send')?.addEventListener('click', () => this.send());
    $('#chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) this.send();
    });
  }

  async send() {
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this.addMessage('user', text);
    const aiEl = this.addMessage('ai', '思考中...');

    const { apiUrl, apiKey, modelName } = this.settings.get();
    if (!apiKey) {
      aiEl.textContent = '请先在右上角“设置”中填写 API 密钥。';
      return;
    }

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: '你是 DinoPet 沉浸学习模式里的 ZCode 学习助手，回答简洁、鼓励、可执行。' },
            { role: 'user', content: text },
          ],
          temperature: 0.7,
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = await res.json();
      aiEl.textContent = data.choices?.[0]?.message?.content?.trim() || '没有收到有效回复。';
    } catch (err) {
      aiEl.classList.add('system');
      aiEl.textContent = `请求失败：${err.message}`;
    } finally {
      this.scrollToBottom();
    }
  }

  addMessage(role, text) {
    const el = document.createElement('div');
    el.className = `chat-message ${role}`;
    el.textContent = text;
    $('#chat-messages').appendChild(el);
    this.scrollToBottom();
    return el;
  }

  scrollToBottom() {
    const box = $('#chat-messages');
    box.scrollTop = box.scrollHeight;
  }
}

class QuickPanel {
  constructor() {
    this.panel = $('#quick-panel');
    this.bind();
  }

  bind() {
    this.panel?.addEventListener('mouseenter', () => this.panel.classList.add('expanded'));
    this.panel?.addEventListener('mouseleave', () => this.panel.classList.remove('expanded'));
    $('#quick-pomodoro')?.addEventListener('click', () => this.toggleOnly('#pomodoro-panel'));
    $('#quick-task')?.addEventListener('click', () => this.toggleOnly('#task-panel'));
    $('#quick-chat')?.addEventListener('click', () => this.toggleOnly('#chat-panel'));
    document.addEventListener('mousemove', (e) => {
      if (e.clientX < 200) this.panel?.classList.add('expanded');
      else if (!this.panel?.matches(':hover')) this.panel?.classList.remove('expanded');
    });
    document.addEventListener('keydown', (e) => this.hotkeys(e));
  }

  toggleOnly(sel) {
    const target = $(sel);
    const shouldShow = target.classList.contains('hidden');
    ['#task-panel', '#chat-panel', '#pomodoro-panel'].forEach((id) => $(id)?.classList.add('hidden'));
    if (shouldShow) target.classList.remove('hidden');
  }

  hotkeys(e) {
    const tag = e.target?.tagName?.toLowerCase();
    const typing = tag === 'input' || tag === 'textarea';
    if (e.ctrlKey && e.key === 'p') { e.preventDefault(); this.toggleOnly('#pomodoro-panel'); }
    if (e.ctrlKey && e.key === '1') { e.preventDefault(); this.toggleOnly('#task-panel'); }
    if (e.ctrlKey && e.key === '2') { e.preventDefault(); this.toggleOnly('#chat-panel'); }
    if (e.ctrlKey && e.key === '3') { e.preventDefault(); $('#bg-panel')?.classList.toggle('hidden'); }
    if (!typing && e.code === 'Space') { e.preventDefault(); $('#pomodoro-start')?.click(); }
    if (!typing && e.key === 'Escape') window.close();
  }
}

class DinoLayer {
  constructor() {
    this.svg = $('#learn-dino-svg');
    this.wrapper = $('#learn-dino');
    this.parts = buildDino(this.svg);
    this.sm = new StateMachine();
    this.bubble = new Bubble();
    new Animator(this.parts, this.sm);
    this.bind();
    this.loop();
  }

  bind() {
    this.wrapper?.addEventListener('click', () => {
      this.sm.set(State.HAPPY);
      this.say(randomPick(['加油！', '专注力 +1', '休息也很重要哦', '今天也很棒！']));
      setTimeout(() => this.sm.set(State.IDLE), 1600);
    });
  }

  say(text) {
    if (this.bubble?.sayNow) this.bubble.sayNow(text, 1800);
    else toast(text);
  }

  loop() {
    const follow = () => {
      const r = this.wrapper.getBoundingClientRect();
      this.bubble.follow(r.left + r.width / 2, r.top + 10);
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }
}

function formatTime(seconds) {
  const s = Math.max(0, seconds | 0);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function randomPick(items) { return items[Math.floor(Math.random() * items.length)]; }

function notify(title, body) {
  toast(`${title}：${body}`);
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') new Notification(title, { body });
  else if (Notification.permission !== 'denied') Notification.requestPermission().then((p) => {
    if (p === 'granted') new Notification(title, { body });
  });
}

function toast(text) {
  const bubble = $('#bubble');
  if (!bubble) return;
  bubble.textContent = text;
  bubble.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => bubble.classList.remove('show'), 1800);
}

// ========== 三段式全屏时钟 ==========

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function updateClock() {
  const now = new Date();
  const dateEl = $('#clock-date');
  if (dateEl) {
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    dateEl.textContent = `${y}/${mo}/${d}`;
  }
  const timeEl = $('#clock-time');
  if (timeEl) {
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    timeEl.textContent = `${h}:${m}:${s}`;
  }
  const weekdayEl = $('#clock-weekday');
  if (weekdayEl) weekdayEl.textContent = `星期${WEEKDAYS[now.getDay()]}`;
}

updateClock();
setInterval(updateClock, 1000);

document.addEventListener('DOMContentLoaded', () => {
  const settings = new SettingsManager();
  new BackgroundManager();
  new PomodoroTimer();
  new TaskList();
  new ChatPanel(settings);
  new QuickPanel();
  new DinoLayer();
  $('#learn-exit')?.addEventListener('click', () => window.close());
  console.log('沉浸式学习模式已启动');
});
