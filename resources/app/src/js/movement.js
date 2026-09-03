import { State } from './dino/states.js';

const WRAPPER_W = 160;
const WRAPPER_H = 204;

// 移动系统：idle ↔ walk 循环，在屏幕底部溜达
export class Movement {
  constructor(wrapper, sm, bounds, onFacing) {
    this.wrapper = wrapper;
    this.sm = sm;
    this.bounds = bounds;
    this.onFacing = onFacing;

    this.x = bounds.width / 2 - WRAPPER_W / 2;
    this.y = bounds.height - WRAPPER_H - 10;
    this.facing = 1;
    this.targetX = this.x;
    this.speed = 45;
    this.idleTimer = 0;
    this.idleDuration = 2 + Math.random() * 3;

    this._applyPos();
  }

  setBounds(bounds) {
    this.bounds = bounds;
  }

  get position() {
    return { x: this.x, y: this.y };
  }

  setPos(x, y) {
    this.x = x;
    this.y = y;
    this._applyPos();
  }

  _applyPos() {
    this.wrapper.style.left = this.x + 'px';
    this.wrapper.style.top = this.y + 'px';
  }

  _setFacing(f) {
    if (this.facing !== f) {
      this.facing = f;
      if (this.onFacing) this.onFacing(f);
    }
  }

  _pickTarget() {
    const margin = 60;
    const maxX = this.bounds.width - WRAPPER_W - margin;
    this.targetX = margin + Math.random() * (maxX - margin);
  }

  update(dt) {
    if (this.sm.current !== State.IDLE && this.sm.current !== State.WALK) return;

    if (this.sm.current === State.IDLE) {
      this.idleTimer += dt;
      if (this.idleTimer >= this.idleDuration) {
        this.idleTimer = 0;
        this._pickTarget();
        this._setFacing(this.targetX > this.x ? 1 : -1);
        this.sm.set(State.WALK);
      }
    } else if (this.sm.current === State.WALK) {
      const dx = this.targetX - this.x;
      if (Math.abs(dx) < 4) {
        this.sm.set(State.IDLE);
        this.idleDuration = 2 + Math.random() * 3;
      } else {
        this.x += this.speed * dt * Math.sign(dx);
        this._applyPos();
      }
    }
  }
}
