import { State } from '../dino/states.js';

const RAIN = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
const SNOW = [71, 73, 75, 77, 85, 86];
const CLOUDY = [2, 3];
const OVERCAST = [45, 48];
const THUNDER = [95, 96, 99];

const WEATHER_EMOJI = {
  rain: '🌧',
  snow: '❄️',
  cloudy: '☁️',
  overcast: '☁️',
  thunder: '⛈',
  clear: '☀️',
};

// 天气感知：定时获取当地天气，触发配件 + 气泡
export class Weather {
  constructor(bubble, sm) {
    this.bubble = bubble;
    this.sm = sm;
    this.currentType = null;
    this.city = '未知';
    this._onChange = null;

    setTimeout(() => this.check(), 6000);
    setInterval(() => this.check(), 30 * 60 * 1000);
  }

  onWeatherChange(fn) {
    this._onChange = fn;
  }

  async check() {
    try {
      let lat = 39.9, lon = 116.4; // 默认北京
      try {
        const r = await fetch('https://ipapi.co/json/');
        const d = await r.json();
        if (d.latitude && d.longitude) {
          lat = d.latitude;
          lon = d.longitude;
          this.city = d.city || '未知';
        }
      } catch (_) {}

      const wr = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`
      );
      const wd = await wr.json();
      this._react(wd.current.weather_code);
    } catch (e) {
      console.log('天气获取失败', e);
    }
  }

  _react(code) {
    let type = 'clear';
    if (RAIN.includes(code)) type = 'rain';
    else if (SNOW.includes(code)) type = 'snow';
    else if (THUNDER.includes(code)) type = 'thunder';
    else if (OVERCAST.includes(code)) type = 'overcast';
    else if (CLOUDY.includes(code)) type = 'cloudy';

    if (type === this.currentType) return;
    this.currentType = type;

    // 通知监听者（供 UI 面板使用）
    if (this._onChange) {
      setTimeout(() => {
        if (this._onChange) this._onChange({ type, city: this.city, icon: WEATHER_EMOJI[type] || '🌤' });
      }, 0);
    }

    // 不打断拖拽等特殊状态
    if (this.sm.current !== State.IDLE && this.sm.current !== State.WALK) return;

    switch (type) {
        case 'rain':
            this.bubble.say('下雨啦！☔');
            break;
        case 'clear':
            this.bubble.say('今天阳光真好！😎');
            break;
        case 'snow':
            this.bubble.say('下雪了！好冷🥶');
            break;
        case 'cloudy':
        case 'overcast':
            this.bubble.say('阴天呢……');
            break;
        case 'thunder':
            this.bubble.say('打雷了，好可怕！⚡');
            break;
    }
  }
}
