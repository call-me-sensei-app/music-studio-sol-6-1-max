const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = x => x * x * (3 - 2 * x);

/** Deterministic, bounded resting behaviour. No frame-count-dependent animation. */
export class RestingCat {
  constructor(seed = 7719) {
    this.seed = seed;
    this.time = 0;
    this.nextYawn = 16;
    this.nextGlance = 5;
    this.glanceEnd = 0;
    this.yawnStart = -100;
    this.blinkStart = -100;
    this.nextBlink = 3;
    this.attention = 0;
    this.yaw = 0;
    this.pitch = .08;
    this.state = {};
  }
  random() { this.seed = this.seed * 16807 % 2147483647; return this.seed / 2147483647; }
  wake() { this.glanceEnd = this.time + 15; this.nextGlance = this.time + 27; }
  yawn() { this.yawnStart = this.time; this.nextYawn = this.time + 28 + this.random() * 22; }
  update(dt, yaw = 0, pitch = 0) {
    dt = clamp(dt, 0, .1);
    this.time += dt;
    const t = this.time;
    if (t >= this.nextYawn) this.yawn();
    if (t >= this.nextGlance) {
      this.glanceEnd = t + 6 + this.random() * 5;
      this.nextGlance = this.glanceEnd + 9 + this.random() * 15;
    }
    if (t >= this.nextBlink) {
      this.blinkStart = t;
      this.nextBlink = t + 3 + this.random() * 5;
    }
    const age = t - this.yawnStart;
    const mouth = age < 0 || age > 3.1 ? 0 : age < 1.05 ? smooth(age / 1.05) : age < 1.9 ? 1 : 1 - smooth((age - 1.9) / 1.2);
    const blinkAge = t - this.blinkStart;
    const blink = blinkAge >= 0 && blinkAge < .28 ? Math.sin(blinkAge / .28 * Math.PI) ** 2 : 0;
    const interest = t < this.glanceEnd && mouth < .15 ? 1 : 0;
    this.attention += (interest - this.attention) * (1 - Math.exp(-dt * 2.2));
    // Neck joints have a limited range; eyes finish a look, never an owl-like full rotation.
    const targetYaw = clamp(yaw, -.80, .80) * this.attention;
    const targetPitch = clamp(pitch, -.32, .30) * this.attention + .08 * (1 - this.attention) - mouth * .22;
    const damping = 1 - Math.exp(-dt * 3.2);
    this.yaw += (targetYaw - this.yaw) * damping;
    this.pitch += (targetPitch - this.pitch) * damping;
    Object.assign(this.state, {
      time: t, mouth, blink, yaw: this.yaw, pitch: this.pitch, attention: this.attention,
      eyes: 0, lidSquint: Math.max(blink,mouth*.65), eyesClosed: true,
      breath: Math.sin(t * Math.PI * 2 / 4.1),
      tail: Math.sin(t * 1.7) * Math.max(0, Math.sin(t * .19)) ** 8,
      ear: Math.sin(t * 1.9) * Math.max(0, Math.sin(t * .41)) ** 14,
      yawning: mouth > .02, watching: this.attention > .4
    });
    return this.state;
  }
}
