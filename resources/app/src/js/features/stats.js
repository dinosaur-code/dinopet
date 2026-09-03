import { State } from '../dino/states.js';
import { Memory } from './memory.js';

// 随机对话列表（空闲时偶尔触发）
const RANDOM_MESSAGES = [
  '今天天气真不错~',
  '好无聊啊……',
  '别忘记喝水哦~ 💧',
  '陪我玩嘛！',
  '你看那边！',
  '嗝~',
  '今天也要元气满满！',
  '想出去玩……',
  '嘿嘿~',
];

export class Stats {
  constructor(sm, bubble, ui) {
    this.sm = sm;
    this.bubble = bubble;
    this.ui = ui;

    // 记忆模块
    this.memory = new Memory();

    // 心情值 / 饱食度（0-100）
    this.mood = 80;
    this.hunger = 80;

    // 衰减计时器（毫秒）
    this.moodDecayInterval = 60 * 1000;   // 每 60s 心情 -1
    this.hungerDecayInterval = 30 * 1000; // 每 30s 饱食 -0.5
    this.lastMoodDecay = Date.now();
    this.lastHungerDecay = Date.now();

    // 随机对话计时器（30-60s 随机触发）
    this.lastRandomMsg = Date.now();
    this.nextRandomMsgDelay = this.rand(30000, 60000);

    // 运行时长
    this.startTime = Date.now();

    // 加载记忆
    this._loadMemory();

    // 启动衰减定时器
    this._tick();
  }

  _loadMemory() {
    const saved = this.memory.load();
    if (!saved) return;

    this.mood = saved.mood ?? 80;
    this.hunger = saved.hunger ?? 80;

    // 计算离线衰减
    const decay = this.memory.decay(saved, Date.now());
    this.mood = Math.max(0, this.mood - decay.moodDecay);
    this.hunger = Math.max(0, this.hunger - decay.hungerDecay);

    // 启动时重置运行时间（不再尝试恢复上次时长）
    this.startTime = Date.now();

    // 如果上次在睡觉/打盹，恢复状态
    if (saved.state === State.SLEEP || saved.state === State.DOZE) {
      this.sm.set(saved.state);
    }
  }

  rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  _tick() {
    const now = Date.now();

    // 心情衰减
    if (now - this.lastMoodDecay > this.moodDecayInterval) {
      this.mood = Math.max(0, this.mood - 1);
      this.lastMoodDecay = now;
    }

    // 饱食衰减
    if (now - this.lastHungerDecay > this.hungerDecayInterval) {
      this.hunger = Math.max(0, this.hunger - 1);
      this.lastHungerDecay = now;
    }

    // 随机对话
    if (now - this.lastRandomMsg > this.nextRandomMsgDelay) {
      const msg = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
      this.bubble.say(msg, 3000);
      this.lastRandomMsg = now;
      this.nextRandomMsgDelay = this.rand(30000, 60000);
    }

    // 饱食度过低 -> 打盹
    if (this.hunger <= 10 && this.sm.current !== State.DOZE && this.sm.current !== State.SLEEP) {
      this.sm.set(State.DOZE);
      this.bubble.say('好饿啊……先眯一会儿……💤', 3500);
    }

    // 通知 UI 更新
    if (this.ui) this.ui.update();

    // 保存记忆（每 10 秒一次）
    this._saveCount = (this._saveCount || 0) + 1;
    if (this._saveCount % 10 === 0) {
      this._saveToLocalStorage();
    }

    setTimeout(() => this._tick(), 1000);
  }

  // 喂食：+20 饱食，触发 FEED 状态动画
  feed() {
    this.hunger = Math.min(100, this.hunger + 20);
    this.mood = Math.min(100, this.mood + 5);
    this.sm.set(State.FEED);
    const msgs = ['好吃！', '谢谢主人~', '美味~', '好饱~', '再来一块！'];
    this.bubble.say(msgs[Math.floor(Math.random() * msgs.length)], 2500);
    setTimeout(() => {
      if (this.sm.current === State.FEED) this.sm.set(State.IDLE);
    }, 2000);
  }

  // 玩耍：+15 心情
  play() {
    this.mood = Math.min(100, this.mood + 15);
    this.sm.set(State.HAPPY);
    const msgs = ['好开心！', '嘻嘻~', '再来再来！', '太好玩了！'];
    this.bubble.say(msgs[Math.floor(Math.random() * msgs.length)], 2500);
    setTimeout(() => {
      if (this.sm.current === State.HAPPY) this.sm.set(State.IDLE);
    }, 1500);
  }

  // 睡觉（永久休眠，点击唤醒）
  sleep() {
    this.sm.set(State.SLEEP);
    this.bubble.say('晚安~ zzz……', 2500);
  }

  // 读书
  read() {
    this.sm.set(State.HAPPY);
    const msgs = ['好有趣！', '哈哈~', '原来如此！', '学到了~'];
    this.bubble.say(msgs[Math.floor(Math.random() * msgs.length)], 2500);
    this.mood = Math.min(100, this.mood + 3);
    setTimeout(() => {
      if (this.sm.current === State.HAPPY) this.sm.set(State.IDLE);
    }, 2200);
  }

  // 洗澡：+5 心情，触发 BATH 状态动画
  bath() {
    this.sm.set(State.BATH);
    const msgs = ['哗啦啦~', '好舒服！', '洗白白~', '我是干净的恐龙！'];
    this.bubble.say(msgs[Math.floor(Math.random() * msgs.length)], 2500);
    this.mood = Math.min(100, this.mood + 5);
    setTimeout(() => {
      if (this.sm.current === State.BATH) this.sm.set(State.IDLE);
    }, 2500);
  }

  // 打盹
  doze() {
    this.sm.set(State.DOZE);
    this.bubble.say('好困……眯一会儿……', 2500);
    setTimeout(() => {
      if (this.sm.current === State.DOZE) this.sm.set(State.IDLE);
    }, 3000);
  }

  // 格式化运行时长
  formatUptime() {
    const ms = Date.now() - this.startTime;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) return `${h}h${m}m`;
    return `${m}m`;
  }

  // 当前状态文字映射
  stateText() {
    const map = {
      [State.IDLE]: '待机中',
      [State.WALK]: '散步中',
      [State.SLEEP]: '睡觉中',
      [State.DRAG]: '被抱着',
      [State.HAPPY]: '好开心',
      [State.SWEAT]: '好热……',
      [State.DOZE]: '打盹中',
      [State.WAVE]: '挥手中',
      [State.FEED]: '吃东西中',
      [State.BATH]: '洗澡中',
    };
    return map[this.sm.current] || '待机中';
  }

  // 获取心情星星数（1-5）
  moodStars() {
    const v = this.mood;
    if (v >= 80) return 5;
    if (v >= 60) return 4;
    if (v >= 40) return 3;
    if (v >= 20) return 2;
    return 1;
  }

  // 获取当前数据对象
  getData() {
    return {
      mood: this.mood,
      moodStars: this.moodStars(),
      hunger: this.hunger,
      state: this.stateText(),
      uptime: this.formatUptime(),
    };
  }

  // 保存到 localStorage
  _saveToLocalStorage() {
    this.memory.save(this.mood, this.hunger, this.formatUptime(), this.sm.current);
  }
}
