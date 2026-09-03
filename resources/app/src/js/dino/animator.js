// SVG transform 辅助：返回 transform 字符串片段
const T = (dx, dy) => `translate(${dx} ${dy})`;
const R = (a, cx, cy) => `rotate(${a} ${cx} ${cy})`;
const S = (sx, sy, cx, cy) =>
  `translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`;

function setXform(el, ...parts) {
  el.setAttribute('transform', parts.join(' '));
}

// 各部件的旋转/缩放中心
const PIVOT = {
  bodyBottom: [95, 205],
  neck: [115, 155],
  tailBase: [53, 168],
  legLHip: [80, 207],
  legRHip: [112, 207],
  armLShoulder: [100, 183],
  armRShoulder: [120, 183],
  eyesCenter: [150, 94],
};

export class Animator {
  constructor(parts, sm) {
    this.parts = parts;
    this.sm = sm;
    this.t0 = performance.now();
    this.stateStart = 0;

    // 眨眼状态
    this.blinking = false;
    this.blinkStart = 0;
    this.lastBlink = 0;
    this.nextBlinkGap = 2 + Math.random() * 3;

    sm.onChange((s) => this.onStateChange(s));
    this.loop();
  }

  get t() {
    return (performance.now() - this.t0) / 1000;
  }
  get phase() {
    return this.t - this.stateStart;
  }

  onStateChange(state) {
    this.stateStart = this.t;
    const { eyes, eyeOpen, eyeClosed, eyesHappy, mouthSmile, mouthOpen } = this.parts;

    // 默认：睁眼 + 微笑嘴
    eyes.style.display = '';
    eyeOpen.style.display = '';
    eyeClosed.style.display = 'none';
    eyesHappy.style.display = 'none';
    mouthSmile.style.display = '';
    mouthOpen.style.display = 'none';

    // 重置配件可见性
    const food = this.parts.svg.querySelector('#acc-food');
    const curtain = this.parts.svg.querySelector('#acc-curtain');
    const bathtub = this.parts.svg.querySelector('#acc-bathtub');
    if (food) food.setAttribute('opacity', '0');
    if (curtain) curtain.setAttribute('opacity', '0');
    if (bathtub) bathtub.setAttribute('opacity', '0');

    if (state === 'happy') {
      eyes.style.display = 'none';
      eyesHappy.style.display = '';
      mouthSmile.style.display = 'none';
      mouthOpen.style.display = '';
    }
  }

  // ---- 眨眼：切换睁眼/闭眼线条 ----
  updateBlink(t) {
    const { eyeOpen, eyeClosed } = this.parts;
    if (this.blinking) {
      const dur = 0.12;
      const p = (t - this.blinkStart) / dur;
      if (p >= 1) {
        this.blinking = false;
        this.lastBlink = t;
        this.nextBlinkGap = 2 + Math.random() * 3;
        eyeOpen.style.display = '';
        eyeClosed.style.display = 'none';
      } else {
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = '';
      }
    } else if (t - this.lastBlink > this.nextBlinkGap) {
      this.blinking = true;
      this.blinkStart = t;
    } else {
      eyeOpen.style.display = '';
      eyeClosed.style.display = 'none';
    }
  }

  // 固定闭眼/睁眼（睡觉/打瞌睡用）
  fixedEyes(closed) {
    this.parts.eyeOpen.style.display = closed ? 'none' : '';
    this.parts.eyeClosed.style.display = closed ? '' : 'none';
  }

  // ---- 主循环 ----
  loop() {
    const t = this.t;
    const ph = this.phase;
    switch (this.sm.current) {
      case 'idle': this.idle(t, ph); break;
      case 'walk': this.walk(t, ph); break;
      case 'sleep': this.sleep(t, ph); break;
      case 'drag': this.drag(t, ph); break;
      case 'happy': this.happy(t, ph); break;
      case 'sweat': this.sweat(t, ph); break;
      case 'doze': this.doze(t, ph); break;
      case 'wave': this.wave(t, ph); break;
      case 'feed': this.feed(t, ph); break;
      case 'bath': this.bath(t, ph); break;
    }
    requestAnimationFrame(() => this.loop());
  }

  // ---- 各状态动画 ----

  idle(t, ph) {
    const { body, head, tail, legL, legR, armL, armR } = this.parts;
    const breath = 1 + Math.sin(t * Math.PI / 1.6) * 0.025;
    setXform(body, S(1, breath, ...PIVOT.bodyBottom));
    setXform(head, R(0, ...PIVOT.neck));
    setXform(tail, R(Math.sin(t * 1.8) * 6, ...PIVOT.tailBase));
    setXform(legL, R(0, ...PIVOT.legLHip));
    setXform(legR, R(0, ...PIVOT.legRHip));
    setXform(armL, R(0, ...PIVOT.armLShoulder));
    setXform(armR, R(0, ...PIVOT.armRShoulder));
    this.updateBlink(t);
  }

  walk(t, ph) {
    const { body, head, tail, legL, legR, armL, armR } = this.parts;
    const f = 4.5; // 步频
    const step = Math.sin(t * Math.PI * f);
    const bob = -Math.abs(Math.sin(t * Math.PI * f)) * 4;
    const breath = 1 + Math.sin(t * Math.PI / 1.6) * 0.02;
    setXform(body, T(0, bob), S(1, breath, ...PIVOT.bodyBottom));
    setXform(head, R(Math.sin(t * Math.PI * f) * 3, ...PIVOT.neck));
    setXform(tail, R(Math.sin(t * Math.PI * f + 0.5) * 12, ...PIVOT.tailBase));
    setXform(legL, R(step * 9, ...PIVOT.legLHip));
    setXform(legR, R(-step * 9, ...PIVOT.legRHip));
    setXform(armL, R(-step * 2, ...PIVOT.armLShoulder));
    setXform(armR, R(step * 2, ...PIVOT.armRShoulder));
    this.updateBlink(t);
  }

  sleep(t, ph) {
    const { body, head, tail, legL, legR, armL, armR } = this.parts;
    const breath = 1 + Math.sin(t * Math.PI / 3) * 0.02;
    setXform(body, S(1, breath, ...PIVOT.bodyBottom));
    setXform(head, R(-8, ...PIVOT.neck)); // 头微低
    setXform(tail, R(0, ...PIVOT.tailBase));
    setXform(legL, R(0, ...PIVOT.legLHip));
    setXform(legR, R(0, ...PIVOT.legRHip));
    setXform(armL, R(0, ...PIVOT.armLShoulder));
    setXform(armR, R(0, ...PIVOT.armRShoulder));
    this.fixedEyes(true); // 闭眼
  }

  drag(t, ph) {
    const { body, head, tail, legL, legR, armL, armR } = this.parts;
    const dangle = Math.sin(t * 8) * 4; // 悬空微晃
    setXform(body, R(dangle, ...PIVOT.bodyBottom));
    setXform(head, R(-dangle * 0.5, ...PIVOT.neck));
    setXform(tail, R(Math.sin(t * 5) * 15, ...PIVOT.tailBase));
    setXform(legL, R(12, ...PIVOT.legLHip)); // 腿下垂
    setXform(legR, R(-12, ...PIVOT.legRHip));
    setXform(armL, R(Math.sin(t * 6) * 5, ...PIVOT.armLShoulder)); // 原地小幅度挥动
    setXform(armR, R(-Math.sin(t * 6) * 5, ...PIVOT.armRShoulder));
    this.fixedEyes(false); // 眼睛正常
  }

  happy(t, ph) {
    const { body, head, tail, legL, legR, armL, armR } = this.parts;
    // 弹跳：前 0.3s 上升，0.3-0.6s 下落，循环
    const bounce = -Math.abs(Math.sin(t * Math.PI * 3)) * 12;
    const breath = 1 + Math.sin(t * Math.PI * 3) * 0.04;
    setXform(body, T(0, bounce), S(1, breath, ...PIVOT.bodyBottom));
    setXform(head, R(0, ...PIVOT.neck));
    setXform(tail, R(Math.sin(t * 6) * 18, ...PIVOT.tailBase));
    setXform(legL, R(0, ...PIVOT.legLHip));
    setXform(legR, R(0, ...PIVOT.legRHip));
    setXform(armL, R(-30, ...PIVOT.armLShoulder)); // 手举高
    setXform(armR, R(30, ...PIVOT.armRShoulder));
  }

  sweat(t, ph) {
    const { body, head, tail, legL, legR, armL, armR } = this.parts;
    const shake = Math.sin(t * 20) * 1.5; // 微抖
    const breath = 1 + Math.sin(t * 8) * 0.03; // 喘气
    setXform(body, T(shake, 0), S(1, breath, ...PIVOT.bodyBottom));
    setXform(head, R(shake, ...PIVOT.neck));
    setXform(tail, R(Math.sin(t * 6) * 8, ...PIVOT.tailBase));
    setXform(legL, R(0, ...PIVOT.legLHip));
    setXform(legR, R(0, ...PIVOT.legRHip));
    setXform(armL, R(-15, ...PIVOT.armLShoulder));
    setXform(armR, R(15, ...PIVOT.armRShoulder));
    this.updateBlink(t);
  }

  doze(t, ph) {
    const { body, head, tail, legL, legR, armL, armR } = this.parts;
    const nod = Math.sin(t * 1.2) * 6 - 6; // 点头
    const breath = 1 + Math.sin(t * Math.PI / 2.5) * 0.02;
    setXform(body, S(1, breath, ...PIVOT.bodyBottom));
    setXform(head, R(nod, ...PIVOT.neck));
    setXform(tail, R(0, ...PIVOT.tailBase));
    setXform(legL, R(0, ...PIVOT.legLHip));
    setXform(legR, R(0, ...PIVOT.legRHip));
    setXform(armL, R(0, ...PIVOT.armLShoulder));
    setXform(armR, R(0, ...PIVOT.armRShoulder));
    this.fixedEyes(true); // 闭眼
  }

  wave(t, ph) {
    const { body, head, tail, legL, legR, armL, armR } = this.parts;
    const wave = Math.sin(t * 6) * 30;
    const bounce = -Math.abs(Math.sin(t * Math.PI * 2)) * 3;
    const breath = 1 + Math.sin(t * Math.PI / 1.6) * 0.025;
    setXform(body, T(0, bounce), S(1, breath, ...PIVOT.bodyBottom));
    setXform(head, R(0, ...PIVOT.neck));
    setXform(tail, R(Math.sin(t * 3) * 10, ...PIVOT.tailBase));
    setXform(legL, R(0, ...PIVOT.legLHip));
    setXform(legR, R(0, ...PIVOT.legRHip));
    setXform(armL, R(-20 + wave * 0.4, ...PIVOT.armLShoulder)); // 左手挥
    setXform(armR, R(20 - wave * 0.4, ...PIVOT.armRShoulder)); // 右手挥
    this.updateBlink(t);
  }

  feed(t, ph) {
    const { body, head, tail, legL, legR, armL, armR } = this.parts;
    // 咀嚼动画：轻微的上下点头 + 身体微弹跳
    const chew = Math.sin(t * Math.PI * 4);
    const bounce = -Math.abs(Math.sin(t * Math.PI * 3)) * 6;
    const breath = 1 + Math.sin(t * Math.PI * 3) * 0.02;
    setXform(body, T(0, bounce), S(1, breath, ...PIVOT.bodyBottom));
    setXform(head, R(chew * 3, ...PIVOT.neck));
    setXform(tail, R(Math.sin(t * 6) * 12, ...PIVOT.tailBase));
    setXform(legL, R(0, ...PIVOT.legLHip));
    setXform(legR, R(0, ...PIVOT.legRHip));
    setXform(armL, R(-15 + chew * 5, ...PIVOT.armLShoulder)); // 手举到嘴边
    setXform(armR, R(15 - chew * 5, ...PIVOT.armRShoulder));
    this.updateBlink(t);

    // 显示食物配件
    const food = this.parts.svg.querySelector('#acc-food');
    if (food) food.setAttribute('opacity', '1');
  }

  bath(t, ph) {
    const { body, head, tail, legL, legR, armL, armR } = this.parts;
    // 洗澡：身体轻晃 + 手臂挥舞
    const sway = Math.sin(t * Math.PI * 2.5) * 4;
    const breath = 1 + Math.sin(t * Math.PI / 2) * 0.02;
    setXform(body, T(sway, 0), S(1, breath, ...PIVOT.bodyBottom));
    setXform(head, R(Math.sin(t * Math.PI * 2) * 5, ...PIVOT.neck));
    setXform(tail, R(Math.sin(t * Math.PI * 3) * 10, ...PIVOT.tailBase));
    setXform(legL, R(0, ...PIVOT.legLHip));
    setXform(legR, R(0, ...PIVOT.legRHip));
    setXform(armL, R(Math.sin(t * Math.PI * 4) * 20 - 10, ...PIVOT.armLShoulder)); // 搓手
    setXform(armR, R(-Math.sin(t * Math.PI * 4) * 20 + 10, ...PIVOT.armRShoulder));
    this.updateBlink(t);

    // 显示帘子和浴缸
    const curtain = this.parts.svg.querySelector('#acc-curtain');
    const bathtub = this.parts.svg.querySelector('#acc-bathtub');
    if (curtain) curtain.setAttribute('opacity', '1');
    if (bathtub) bathtub.setAttribute('opacity', '1');

    // 水滴微幅浮动（用 data-base-cy 存原始值，防止漂移）
    const drops = curtain.querySelectorAll('circle');
    if (drops.length) {
      drops.forEach((drop, i) => {
        let baseCy = parseFloat(drop.getAttribute('data-base-cy'));
        if (isNaN(baseCy)) {
          baseCy = parseFloat(drop.getAttribute('cy'));
          drop.setAttribute('data-base-cy', baseCy);
        }
        const animDur = 3 + (i % 4) * 0.8;
        const offset = Math.sin(t * Math.PI * 2 / animDur + i) * 3;
        drop.setAttribute('cy', baseCy + offset);
        drop.setAttribute('opacity', 0.6 + Math.sin(t * Math.PI * 2 / animDur + i + 1) * 0.3);
      });
    }

    // 帘子整体微幅左右飘动
    if (curtain) {
      const swayAngle = Math.sin(t * Math.PI * 1.5) * 1.5;
      curtain.setAttribute('transform', `rotate(${swayAngle}, 110, 21)`);
    }
  }
}
