// 恐龙状态枚举
export const State = {
  IDLE: 'idle',
  WALK: 'walk',
  SLEEP: 'sleep',
  DRAG: 'drag',
  HAPPY: 'happy',
  SWEAT: 'sweat',
  DOZE: 'doze',
  WAVE: 'wave',
  FEED: 'feed',
  BATH: 'bath',
};

// 简单状态机：管理当前状态 + 变更通知
export class StateMachine {
  constructor() {
    this.current = State.IDLE;
    this.listeners = [];
  }

  set(state) {
    if (this.current === state) return;
    const prev = this.current;
    this.current = state;
    for (const fn of this.listeners) fn(state, prev);
  }

  onChange(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }
}
