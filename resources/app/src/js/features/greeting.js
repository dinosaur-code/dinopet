import { State } from '../dino/states.js';

// 打招呼：按时辰问好
export class Greeting {
  constructor(sm, bubble) {
    this.sm = sm;
    this.bubble = bubble;
  }

  greet() {
    const h = new Date().getHours();
    let msg, st;

    if (h >= 5 && h < 11) {
      msg = '早安！新的一天开始啦~';
      st = State.WAVE;
    } else if (h >= 11 && h < 14) {
      msg = '中午好！记得吃饭哦~';
      st = State.WAVE;
    } else if (h >= 14 && h < 18) {
      msg = '下午好~打起精神！';
      st = State.WAVE;
    } else if (h >= 18 && h < 22) {
      msg = '晚上好~辛苦一天啦';
      st = State.WAVE;
    } else {
      msg = '夜深了，早点休息哦……';
      st = State.DOZE;
    }

    this.sm.set(st);
    this.bubble.say(msg, 4000);
    setTimeout(() => {
      if (this.sm.current === st) this.sm.set(State.IDLE);
    }, 2500);
  }
}
