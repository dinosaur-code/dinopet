// UI 面板：右键恐龙弹出，状态面板 / 快捷互动面板切换

export class UIPanel {
  constructor(stats, bubble, wrapper) {
    this.stats = stats;
    this.bubble = bubble;
    this.wrapper = wrapper;
    this.visible = false;
    this.showingState = true; // true = 显示状态面板, false = 显示互动面板
    this.cooldowns = {};     // 互动按钮冷却

    this._buildDOM();
    this._bindEvents();
    // 初始更新
    this.update();
  }

  _buildDOM() {
    // 创建面板（不再有右上角齿轮按钮）
    const panel = document.createElement('div');
    panel.id = 'ui-panel';

    // --- 状态面板 ---
    const statePanel = document.createElement('div');
    statePanel.id = 'ui-state-panel';

    statePanel.innerHTML = `
      <div class="ui-header">
        <span class="ui-title">🦕 小恐龙</span>
        <span class="ui-status" id="ui-status-text">待机中</span>
      </div>
      <div class="ui-row">
        <span class="ui-label">🎈 心情</span>
        <span class="ui-stars" id="ui-stars"></span>
        <span class="ui-value" id="ui-mood-val">80</span>
      </div>
      <div class="ui-row">
        <span class="ui-label">🍖 饱食</span>
        <div class="ui-bar-wrap"><div class="ui-bar" id="ui-hunger-bar"></div></div>
        <span class="ui-value" id="ui-hunger-val">80</span>
      </div>
      <div class="ui-row">
        <span class="ui-label">⏰ 运行</span>
        <span id="ui-uptime">0m</span>
      </div>
      <div class="ui-row">
        <span class="ui-label">🌤 天气</span>
        <span id="ui-weather">等待中...</span>
      </div>
      <div class="ui-toggle-btn" id="ui-toggle-interact">🎮 快捷互动</div>
    `;

    // --- 互动面板 ---
    const interactPanel = document.createElement('div');
    interactPanel.id = 'ui-interact-panel';
    interactPanel.style.display = 'none';

    interactPanel.innerHTML = `
      <div class="ui-header">
        <span class="ui-title">🎮 快捷互动</span>
      </div>
      <div class="ui-interact-grid">
        <button class="ui-interact-btn" data-action="feed" id="btn-feed">🍖 喂食</button>
        <button class="ui-interact-btn" data-action="play" id="btn-play">🎾 玩耍</button>
        <button class="ui-interact-btn" data-action="sleep" id="btn-sleep">💤 睡觉</button>
        <button class="ui-interact-btn" data-action="read" id="btn-read">📚 读书</button>
        <button class="ui-interact-btn" data-action="bath" id="btn-bath">🛁 洗澡</button>
        <button class="ui-interact-btn" data-action="doze" id="btn-doze">💤 打盹</button>
      </div>
      <div class="ui-toggle-btn" id="ui-toggle-state">📋 返回状态</div>
    `;

    panel.appendChild(statePanel);
    panel.appendChild(interactPanel);

    document.body.appendChild(panel);

    // 存储 DOM 引用
    this.panel = panel;
    this.statePanel = statePanel;
    this.interactPanel = interactPanel;
  }

  _bindEvents() {
    // 切换面板内容
    document.getElementById('ui-toggle-interact').addEventListener('click', (e) => {
      e.stopPropagation();
      this.showingState = false;
      this.statePanel.style.display = 'none';
      this.interactPanel.style.display = 'block';
    });

    document.getElementById('ui-toggle-state').addEventListener('click', (e) => {
      e.stopPropagation();
      this.showingState = true;
      this.statePanel.style.display = 'block';
      this.interactPanel.style.display = 'none';
    });

    // 互动按钮
    const actions = {
      feed: () => this.stats.feed(),
      play: () => this.stats.play(),
      sleep: () => this.stats.sleep(),
      read: () => this.stats.read(),
      bath: () => this.stats.bath(),
      doze: () => this.stats.doze(),
    };

    Object.keys(actions).forEach(key => {
      const el = document.getElementById(`btn-${key}`);
      if (el) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.cooldowns[key]) return;
          actions[key]();
          // 操作后立即保存记忆
          this.stats._saveToLocalStorage();
          // 操作后关闭面板
          this.hide();
          // 冷却 30s
          this.cooldowns[key] = true;
          el.disabled = true;
          el.textContent = '⏳ 冷却中';
          setTimeout(() => {
            this.cooldowns[key] = false;
            el.disabled = false;
            this._resetBtnText(key);
          }, 30000);
        });
      }
    });
  }

  _resetBtnText(key) {
    const labels = { feed: '🍖 喂食', play: '🎾 玩耍', sleep: '💤 睡觉', read: '📚 读书', bath: '🛁 洗澡', doze: '💤 打盹' };
    const el = document.getElementById(`btn-${key}`);
    if (el) el.textContent = labels[key];
  }

  show() {
    // 每次打开都从状态面板开始
    this.showingState = true;
    this.statePanel.style.display = 'block';
    this.interactPanel.style.display = 'none';

    this.visible = true;
    this.panel.classList.add('visible');
    this.update();
  }

  hide() {
    this.visible = false;
    this.panel.classList.remove('visible');
  }

  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // 暴露天气更新接口
  setWeather(text) {
    const el = document.getElementById('ui-weather');
    if (el) el.textContent = text;
  }

  // 实时更新状态数据
  update() {
    const data = this.stats.getData();

    const starsEl = document.getElementById('ui-stars');
    if (starsEl) {
      starsEl.textContent = '●'.repeat(data.moodStars) + '○'.repeat(5 - data.moodStars);
    }

    const moodValEl = document.getElementById('ui-mood-val');
    if (moodValEl) moodValEl.textContent = data.mood;

    const hungerValEl = document.getElementById('ui-hunger-val');
    if (hungerValEl) hungerValEl.textContent = data.hunger.toFixed(1);

    const hungerBar = document.getElementById('ui-hunger-bar');
    if (hungerBar) hungerBar.style.width = `${data.hunger}%`;

    const uptimeEl = document.getElementById('ui-uptime');
    if (uptimeEl) uptimeEl.textContent = data.uptime;

    const statusEl = document.getElementById('ui-status-text');
    if (statusEl) statusEl.textContent = data.state;
  }
}
