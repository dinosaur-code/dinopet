import { State } from '../dino/states.js';

// 系统感知：CPU 高→出汗，长时间空闲→打瞌睡
export class SysMon {
  constructor(sm, bubble) {
    this.sm = sm;
    this.bubble = bubble;
    this.highSec = 0;
    this.lowSec = 0;
    this.inHigh = false;
    this.inLow = false;

    if (window.dinoAPI) {
      window.dinoAPI.onCpuUsage((u) => this._onCpu(u));
    }
  }

  _onCpu(usage) {
    const pct = usage * 100;

    if (pct > 80) {
      this.highSec += 5;
      this.lowSec = 0;
      if (this.highSec >= 10 && !this.inHigh) {
        this.inHigh = true;
        if (this.sm.current === State.IDLE || this.sm.current === State.WALK) {
          this.sm.set(State.SWEAT);
          this.bubble.say('好热……CPU 要烧起来了🔥');
        }
      }
    } else if (pct < 10) {
      this.lowSec += 5;
      this.highSec = 0;
      if (this.lowSec >= 120 && !this.inLow) {
        this.inLow = true;
        if (this.sm.current === State.IDLE || this.sm.current === State.WALK) {
          this.sm.set(State.DOZE);
          this.bubble.say('好无聊，先眯一会儿……💤');
        }
      }
    } else {
      this.highSec = 0;
      this.lowSec = 0;
      this._reset();
    }
  }

  _reset() {
    if (this.inHigh) {
      this.inHigh = false;
      if (this.sm.current === State.SWEAT) this.sm.set(State.IDLE);
    }
    if (this.inLow) {
      this.inLow = false;
      if (this.sm.current === State.DOZE) this.sm.set(State.IDLE);
    }
  }
}
