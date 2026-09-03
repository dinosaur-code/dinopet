// 颜色定义
const GREEN = '#5DCC5F';
const YELLOW = '#FFE082';
const BLUSH = '#FF6B3D';
const OUTLINE = '#1A1A1A';
const SW = 4;

// 半圆刺（sweep=1 → 凸起朝上，rotate 转向）
function spike(r) {
  return `M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 Z`;
}

// 生成一个刺的 path 元素
function spikeEl(x, y, a, r = 10) {
  return `<path d="${spike(r)}" transform="translate(${x},${y}) rotate(${a})" fill="${YELLOW}" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>`;
}

// 沿椭圆轮廓计算刺的位置，沿法线向外偏移 offset 像素
function ellipseSpikes(cx, cy, rx, ry, params, spikeAngs, offset = 3) {
  return params.map((th, i) => {
    const dx = rx * Math.cos(th);
    const dy = ry * Math.sin(th);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const x = cx + dx + (offset * dx) / len;
    const y = cy + dy + (offset * dy) / len;
    return spikeEl(x, y, spikeAngs[i]);
  }).join('');
}

// 头部背刺（cx=135 cy=108 rx=60 ry=54）
function headSpikes() {
  return ellipseSpikes(
    135, 108, 60, 54,
    [-Math.PI / 2, -2 * Math.PI / 3, -5 * Math.PI / 6, -Math.PI],
    [0, -15, -35, -55],
    1
  );
}

// 身体背刺（cx=95 cy=175 rx=52 ry=30）
function bodySpikes() {
  return ellipseSpikes(
    95, 175, 52, 30,
    [-3 * Math.PI / 4, -Math.PI],
    [-40, -70],
    1
  );
}

/**
 * 侧面视角恐龙，面朝右，身体略朝正面转。
 * 背刺嵌入各自部件组，跟随部件动画。
 */
export function buildDino(svg) {
  svg.innerHTML = `
    <!-- 尾巴 + 尾刺 -->
    <g id="dino-tail" data-part="tail">
      <path d="M 53 168 Q 23 175 10 138" stroke="${OUTLINE}" stroke-width="22" stroke-linecap="round" fill="none"/>
      <path d="M 53 168 Q 23 175 10 138" stroke="${GREEN}" stroke-width="15" stroke-linecap="round" fill="none"/>
      ${spikeEl(25, 155, -5)}
    </g>

    <!-- 身体 + 肚子 + 背刺 -->
    <g id="dino-body" data-part="body">
      <ellipse cx="95" cy="175" rx="52" ry="30" fill="${GREEN}" stroke="${OUTLINE}" stroke-width="${SW}"/>
      <ellipse cx="110" cy="178" rx="30" ry="22" fill="${YELLOW}"/>
      ${bodySpikes()}
    </g>

    <!-- 后腿（左） -->
    <g id="dino-leg-l" data-part="leg-l">
      <ellipse cx="80" cy="213" rx="13" ry="11" fill="${GREEN}" stroke="${OUTLINE}" stroke-width="${SW}"/>
    </g>
    <!-- 前腿（右） -->
    <g id="dino-leg-r" data-part="leg-r">
      <ellipse cx="112" cy="213" rx="13" ry="11" fill="${GREEN}" stroke="${OUTLINE}" stroke-width="${SW}"/>
    </g>

    <!-- 后手臂（端点在肚子中间，手端上举） -->
    <g id="dino-arm-l" data-part="arm-l">
      <path d="M 100 183 Q 92 171 85 160" stroke="${OUTLINE}" stroke-width="16" stroke-linecap="round" fill="none"/>
      <path d="M 100 183 Q 92 171 85 160" stroke="${GREEN}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <circle cx="85" cy="160" r="7" fill="${GREEN}" stroke="${OUTLINE}" stroke-width="3"/>
    </g>
    <!-- 前手臂（端点在肚子中间） -->
    <g id="dino-arm-r" data-part="arm-r">
      <path d="M 120 183 Q 128 171 135 160" stroke="${OUTLINE}" stroke-width="16" stroke-linecap="round" fill="none"/>
      <path d="M 120 183 Q 128 171 135 160" stroke="${GREEN}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <circle cx="135" cy="160" r="8" fill="${GREEN}" stroke="${OUTLINE}" stroke-width="3"/>
    </g>

    <!-- 头 + 五官 + 头刺 -->
    <g id="dino-head" data-part="head">
      <ellipse cx="135" cy="108" rx="60" ry="54" fill="${GREEN}" stroke="${OUTLINE}" stroke-width="${SW}"/>
      <!-- 腮红 -->
      <ellipse cx="153" cy="117" rx="10" ry="7" fill="${BLUSH}"/>
      <!-- 眼睛：睁开 / 闭眼切换 -->
      <g id="dino-eyes" data-part="eyes">
        <g id="eye-open">
          <circle cx="150" cy="94" r="15" fill="${OUTLINE}"/>
          <circle cx="145" cy="89" r="5" fill="#fff"/>
        </g>
        <path id="eye-closed" d="M 136 94 Q 150 99 164 94" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round" fill="none" style="display:none"/>
      </g>
      <!-- 开心眯眼 ^ -->
      <g id="dino-eyes-happy" data-part="eyes-happy" style="display:none">
        <path d="M 136 98 Q 150 80 164 98" stroke="${OUTLINE}" stroke-width="5" stroke-linecap="round" fill="none"/>
      </g>
      <!-- 鼻孔（横向排列） -->
      <circle cx="184" cy="110" r="2.5" fill="${OUTLINE}"/>
      <circle cx="192" cy="110" r="2.5" fill="${OUTLINE}"/>
      <!-- 嘴：w 形小波浪微笑 -->
      <g id="dino-mouth" data-part="mouth">
        <path id="mouth-smile" d="M 170 120 Q 176 127 182 120 Q 188 127 194 120" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path id="mouth-open" d="M 170 118 Q 182 138 194 118 Q 182 128 170 118 Z" fill="${OUTLINE}" stroke="${OUTLINE}" stroke-width="2" style="display:none"/>
      </g>
      <!-- 头部背刺 -->
      ${headSpikes()}
    </g>


    <!-- 配件槽 -->
    <g id="dino-accessory" data-part="accessory"></g>

    <!-- 浴缸：白色遮罩覆盖恐龙下半身（帘子在前面遮挡） -->
    <g id="acc-bathtub" data-part="accessory-bathtub" opacity="0">
      <path d="M 15 170 Q 15 163 35 165 Q 65 167 95 169 Q 125 170 155 167 Q 180 165 195 167 Q 200 168 203 173 Q 205 195 203 217 Q 199 243 187 259 Q 173 273 155 281 Q 133 289 110 291 Q 87 293 65 289 Q 40 283 20 271 Q 7 259 0 239 Q -5 219 -5 199 Q -3 177 10 171 Q 13 169 15 170 Z" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx="105" cy="173" rx="40" ry="3" fill="#6BB3FF" opacity="0.6"/>
    </g>

    <!-- 帘子：蓝色挂杆 + 半透明帘布（最后渲染=最前面=挡住恐龙和浴缸） -->
    <g id="acc-curtain" data-part="accessory-curtain" opacity="0">
      <rect x="0" y="18" width="220" height="6" rx="3" fill="#C0C0C0" stroke="#1A1A1A" stroke-width="2"/>
      <path d="M 85 22 Q 135 262 Q 175 262 Q 205 264 Q 220 263 L 220 22 L 85 22 Z" fill="#707070" opacity="0.85" stroke="#1A1A1A" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="95" cy="55" r="3" fill="#B0B0B0"/>
      <circle cx="110" cy="80" r="4" fill="#B0B0B0"/>
      <circle cx="80" cy="105" r="3" fill="#B0B0B0"/>
      <circle cx="120" cy="130" r="4" fill="#B0B0B0"/>
      <circle cx="100" cy="155" r="3" fill="#B0B0B0"/>
    </g>
`;

  return {
    svg,
    wrapper: document.getElementById('dino-wrapper'),
    body: svg.querySelector('#dino-body'),
    head: svg.querySelector('#dino-head'),
    tail: svg.querySelector('#dino-tail'),
    legL: svg.querySelector('#dino-leg-l'),
    legR: svg.querySelector('#dino-leg-r'),
    armL: svg.querySelector('#dino-arm-l'),
    armR: svg.querySelector('#dino-arm-r'),
    eyes: svg.querySelector('#dino-eyes'),
    eyeOpen: svg.querySelector('#eye-open'),
    eyeClosed: svg.querySelector('#eye-closed'),
    eyesHappy: svg.querySelector('#dino-eyes-happy'),
    mouthSmile: svg.querySelector('#mouth-smile'),
    mouthOpen: svg.querySelector('#mouth-open'),
    accessory: svg.querySelector('#dino-accessory'),
  };
}

// 配件 SVG 生成器
export function umbrellaSVG() {
  return `
    <g id="acc-umbrella">
      <path d="M 85 26 Q 135 -10 185 26 Z" fill="#FF6B6B" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M 85 26 Q 110 8 135 26" fill="#FF8E8E" stroke="${OUTLINE}" stroke-width="2"/>
      <path d="M 135 26 Q 160 8 185 26" fill="#FF8E8E" stroke="${OUTLINE}" stroke-width="2"/>
      <line x1="135" y1="26" x2="135" y2="50" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/>
      <path d="M 135 50 Q 143 52 143 58" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round" fill="none"/>
    </g>
  `;
}

export function sunglassesSVG() {
  return `
    <g id="acc-sunglasses">
      <rect x="130" y="82" width="40" height="22" rx="10" fill="${OUTLINE}" stroke="${OUTLINE}" stroke-width="3"/>
      <line x1="130" y1="86" x2="120" y2="82" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/>
      <line x1="170" y1="86" x2="180" y2="82" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="142" cy="89" rx="6" ry="3" fill="#fff" opacity="0.3"/>
    </g>
  `;
}
