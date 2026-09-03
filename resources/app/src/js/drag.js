import { State } from './dino/states.js';

const WRAPPER_H = 204;

// 拖拽 + 落地物理
export class Drag {
  constructor(wrapper, sm, movement, bounds) {
    this.wrapper = wrapper;
    this.sm = sm;
    this.movement = movement;
    this.bounds = bounds;

    this.dragging = false;
    this.offX = 0;
    this.offY = 0;

    this.falling = false;
    this.vy = 0;
    this.gravity = 2200;

    this._bind();
  }

  _bind() {
    this.wrapper.addEventListener('mousedown', (e) => this._down(e));
    document.addEventListener('mousemove', (e) => this._move(e));
    document.addEventListener('mouseup', () => this._up());
  }

  _down(e) {
    if (this.falling) return;
    // 右键不触发拖拽，直接让 contextmenu 处理
    if (e.button === 2) return;
    this.dragging = true;
    this.sm.set(State.DRAG);
    this.wrapper.classList.add('dragging');
    const rect = this.wrapper.getBoundingClientRect();
    this.offX = e.clientX - rect.left;
    this.offY = e.clientY - rect.top;
    e.preventDefault();
  }

  _move(e) {
    if (!this.dragging) return;
    this.movement.setPos(e.clientX - this.offX, e.clientY - this.offY);
  }

  _up() {
    if (!this.dragging) return;
    this.dragging = false;
    this.wrapper.classList.remove('dragging');
    this.falling = true;
    this.vy = 0;
  }

  update(dt) {
    if (!this.falling) return;
    const pos = this.movement.position;
    this.vy += this.gravity * dt;
    let ny = pos.y + this.vy * dt;
    const floor = this.bounds.height - WRAPPER_H - 10;

    if (ny >= floor) {
      ny = floor;
      if (Math.abs(this.vy) > 250) {
        this.vy = -this.vy * 0.35; // 弹一下
      } else {
        this.vy = 0;
        this.falling = false;
        this.sm.set(State.IDLE);
      }
    }
    this.movement.setPos(pos.x, ny);
  }
}
