import { State } from './dino/states.js';

// 异色恐龙配色（约 2% 概率触发）
const MUTATIONS = [
  { color: '#FF4444', name: '红色' },  // 红色
  { color: '#FFB6C1', name: '粉色' },  // 粉色
  { color: '#FFFFFF', name: '白色' },  // 白色
];

// 点击交互：点头/肚子不同反应，双击挥手，右键弹出 UI
export class Click {
  constructor(svg, sm, bubble) {
    this.svg = svg;
    this.sm = sm;
    this.bubble = bubble;
    this.lastClick = 0;
    this.clickTimer = null;

    this.svg.addEventListener('click', (e) => this._onClick(e));
  }

  _onClick(e) {
    const now = Date.now();
    if (now - this.lastClick < 350) {
      clearTimeout(this.clickTimer);
      this.lastClick = 0;
      this._double();
      return;
    }
    this.lastClick = now;
    clearTimeout(this.clickTimer);
    this.clickTimer = setTimeout(() => this._single(e), 350);
  }

  _single(e) {
    // 睡眠状态点击唤醒
    if (this.sm.current === State.SLEEP) {
      this.sm.set(State.IDLE);
      this.bubble.say('呼呼呼，睡醒了！', 2500);
      return;
    }

    const rect = this.svg.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;

    // 8% 概率触发异色恐龙
    if (Math.random() < 0.08) {
      this._mutate();
      return;
    }

    this.sm.set(State.HAPPY);
    if (relY < 0.55) {
      this.bubble.sayNow('嘿！', 2000);
    } else {
      this.bubble.sayNow('哈哈好痒！', 2000);
    }
    setTimeout(() => {
      if (this.sm.current === State.HAPPY) this.sm.set(State.IDLE);
    }, 1500);
  }

  _double() {
    // 睡眠状态点击唤醒
    if (this.sm.current === State.SLEEP) {
      this.sm.set(State.IDLE);
      this.bubble.say('呼呼呼，睡醒了！', 2500);
      return;
    }

    this.sm.set(State.WAVE);
    this.bubble.sayNow('你好呀~', 2500);
    setTimeout(() => {
      if (this.sm.current === State.WAVE) this.sm.set(State.IDLE);
    }, 2200);
  }

  _mutate() {
    const mutation = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
    this.bubble.sayNow('出异色了！！！', 2000);

    // 改变所有绿色部件的颜色
    const parts = this.svg.querySelectorAll('[fill="' + '#5DCC5F' + '"]');
    parts.forEach(part => {
      const fill = part.getAttribute('fill');
      if (fill === '#5DCC5F') {
        part.setAttribute('fill', mutation.color);
      }
    });

    // 恢复颜色（5 秒后）
    setTimeout(() => {
      const parts2 = this.svg.querySelectorAll('[fill="' + mutation.color + '"]');
      parts2.forEach(part => {
        part.setAttribute('fill', '#5DCC5F');
      });
    }, 5000);
  }
}
