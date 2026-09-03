// 气泡系统：在恐龙头顶显示文字，自动消失，多条排队
export class Bubble {
  constructor() {
    this.el = document.getElementById('bubble');
    this.queue = [];
    this.showing = false;
    this.timer = null;
    this.urgent = false; // 标记是否正在显示紧急消息
  }

  say(text, duration = 3500) {
    // 如果正在显示紧急消息，跳过后续排队（避免被挤掉）
    if (this.urgent) return;
    this.queue.push({ text, duration });
    if (!this.showing) this._next();
  }

  // 立即显示重要消息，清空队列，且后续气泡等它播完才播放
  sayNow(text, duration = 2500) {
    this.urgent = true;
    this.queue.length = 0;
    clearTimeout(this.timer);
    this.showing = false;
    this.el.classList.remove('show');
    this.el.textContent = text;
    this.el.classList.add('show');
    this.showing = true;
    this.timer = setTimeout(() => {
      this.el.classList.remove('show');
      this.showing = false;
      // 延迟 800ms 后才播放后续气泡，给用户足够阅读时间
      this.timer = setTimeout(() => {
        this.urgent = false;
        this._next();
      }, 800);
    }, duration);
  }

  _next() {
    if (this.queue.length === 0) {
      this.showing = false;
      this.el.classList.remove('show');
      return;
    }
    const { text, duration } = this.queue.shift();
    this.el.textContent = text;
    this.el.classList.add('show');
    this.showing = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.el.classList.remove('show');
      this.timer = setTimeout(() => this._next(), 300);
    }, duration);
  }

  // 把气泡定位到 (centerX, topY) 上方
  follow(centerX, topY) {
    this.el.style.left = centerX + 'px';
    this.el.style.top = topY - 42 + 'px';
  }
}
