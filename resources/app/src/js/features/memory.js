const STORAGE_KEY = 'dino-memory';

// 持久化状态（可保存的状态）
const SAVEABLE_STATES = ['idle', 'walk', 'sleep', 'doze'];

// 饱食度衰减：每分钟 0.5
const HUNGER_DECAY_PER_MINUTE = 0.5;
// 心情衰减：每 60 秒 1
const MOOD_DECAY_PER_MINUTE = 1 / 60;

export class Memory {
  save(mood, hunger, uptime, state) {
    try {
      const data = {
        mood,
        hunger,
        uptime,
        state: SAVEABLE_STATES.includes(state) ? state : 'idle',
        saveTime: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage 不可用时静默忽略
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // 根据离线时间计算状态衰减
  decay(saved, now) {
    if (!saved) return { moodDecay: 0, hungerDecay: 0 };
    const elapsed = now - saved.saveTime;
    const minutes = elapsed / 60000;
    return {
      moodDecay: Math.round(minutes * MOOD_DECAY_PER_MINUTE),
      hungerDecay: Math.round(minutes * HUNGER_DECAY_PER_MINUTE * 10) / 10,
    };
  }
}
