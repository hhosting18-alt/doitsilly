/* DOITSILLY — map engine. No framework, no build step.
   Scenes: "space" (the DOITSILLY planet) and "world" (DOITSILLY Island + About Us Island). Places open as panels over the world.
   Clicking the planet opens "Pick a side": drag Scribble (the pink O) out of the logo onto a landing pad.
     DOITSILLY pad -> zoom into the islands.   Community pad -> the Community landing page (#/community).
   Things to poke: every object in space answers when clicked, clicking empty space makes a wish,
   island locals say hi (and point you to the nearest place), clouds go poof, the ferry gives rides. */
(() => {
  const C = window.DIS_CONFIG, T = window.DIS_CONTENT, A = window.DIS_ASSETS, M = window.DIS_MAP;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, attrs = {}, html = "") => { const el = document.createElement(tag); for (const k in attrs) el.setAttribute(k, attrs[k]); if (html) el.innerHTML = html; return el; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const NS = "http://www.w3.org/2000/svg";
  const P = T.places;
  const isMobile = () => window.innerWidth < 760;
  const D = id => C.districts.find(x => x.id === id);
  const placeHash = id => `#/${D(id).island}/${id}`;
  const ISLANDS = Object.keys(C.islands); // ["studio", "about"]

  /* ---------------- camera ---------------- */
  class Cam {
    constructor(view, stage, W, H, onChange) { Object.assign(this, { view, stage, W, H, onChange, s: 1, tx: 0, ty: 0, ox: 0, oy: 0, anim: null }); }
    get vw() { return this.view.clientWidth; } get vh() { return this.view.clientHeight; }
    // A plain 2D transform: the browser always draws the whole map. (Forcing the 9800 x 5400 map onto one GPU layer made
    // browsers draw it in strips, so parts showed up blank while it moved.) ox/oy: the full experience's lean offset.
    apply() { this.stage.style.transform = `translate(${(this.tx + this.ox).toFixed(2)}px,${(this.ty + this.oy).toFixed(2)}px) scale(${this.s})`; this.onChange && this.onChange(); }
    clamp(st) {
      const { W, H } = this, vw = this.vw, vh = this.vh;
      st.tx = W * st.s >= vw ? Math.min(0, Math.max(vw - W * st.s, st.tx)) : (vw - W * st.s) / 2;
      st.ty = H * st.s >= vh ? Math.min(0, Math.max(vh - H * st.s, st.ty)) : (vh - H * st.s) / 2;
      return st;
    }
    fit([x, y, w, hh], pad = .08, area) {
      area = area || { x: 0, y: 0, w: this.vw, h: this.vh };
      const s = Math.min(area.w / w, area.h / hh) * (1 - pad);
      return { s, tx: area.x + area.w / 2 - (x + w / 2) * s, ty: area.y + area.h / 2 - (y + hh / 2) * s };
    }
    set(st, clamp = true) { if (clamp) st = this.clamp({ ...st }); this.s = st.s; this.tx = st.tx; this.ty = st.ty; this.apply(); }
    // stop a glide in progress; whoever was waiting for it carries on (never left hanging)
    stop() { if (this.anim) { cancelAnimationFrame(this.anim.raf); const r = this.anim.res; this.anim = null; if (r) r(); } }
    to(target, ms = 900, clamp = true) {
      if (clamp) target = this.clamp({ ...target });
      this.stop();
      if (REDUCE || ms <= 0) { this.set(target, false); return Promise.resolve(); }
      const vw = this.vw, vh = this.vh;
      const c0 = { x: (vw / 2 - this.tx) / this.s, y: (vh / 2 - this.ty) / this.s, l: Math.log(this.s) };
      const c1 = { x: (vw / 2 - target.tx) / target.s, y: (vh / 2 - target.ty) / target.s, l: Math.log(target.s) };
      return new Promise(res => {
        const t0 = performance.now();
        const anim = { raf: 0, res };
        const step = now => {
          if (this.anim !== anim) return; // stopped or replaced
          const k = Math.min(1, (now - t0) / ms), e = ease(k);
          const s = Math.exp(c0.l + (c1.l - c0.l) * e), cx = c0.x + (c1.x - c0.x) * e, cy = c0.y + (c1.y - c0.y) * e;
          this.s = s; this.tx = vw / 2 - cx * s; this.ty = vh / 2 - cy * s; this.apply();
          if (k < 1) anim.raf = requestAnimationFrame(step); else { this.anim = null; this.set(target, false); res(); }
        };
        this.anim = anim; anim.raf = requestAnimationFrame(step);
      });
    }
    zoomAt(mx, my, factor, minS, maxS) {
      this.stop();
      const s = Math.min(maxS, Math.max(minS, this.s * factor)), k = s / this.s;
      this.set({ s, tx: mx - (mx - this.tx) * k, ty: my - (my - this.ty) * k });
    }
    toWorld(mx, my) { return { x: (mx - this.tx - this.ox) / this.s, y: (my - this.ty - this.oy) / this.s }; }
    project(x, y) { return { x: x * this.s + this.tx + this.ox, y: y * this.s + this.ty + this.oy }; }
  }

  /* ---------------- state ---------------- */
  const S = { scene: "space", place: null, level: "system", busy: false, tour: -1, outPressure: 0, menuOpen: false, say: null, page: null };
  let space, world, fitS = 1;

  /* ---------------- speech bubble (shared by space and islands) ---------------- */
  function say(text, wx, wy, opts = {}) {
    const el = $("#say");
    el.innerHTML = `${opts.name ? `<b>${esc(opts.name)}</b>` : ""}<span>${esc(text)}</span>${opts.link ? `<a href="${opts.link[1]}">${esc(opts.link[0])}</a>` : ""}`;
    S.say = { wx, wy, scene: S.scene, ms: opts.ms || 4200 };
    el.hidden = false; layoutSay(); armSay();
  }
  function armSay() { clearTimeout(say.t); if (S.say) say.t = setTimeout(hideSay, S.say.ms); }
  function hideSay() { clearTimeout(say.t); S.say = null; $("#say").hidden = true; }
  function layoutSay() {
    if (!S.say) return;
    if (S.say.scene !== S.scene || S.transitioning || S.menuOpen || S.page) return hideSay();
    const p = (S.scene === "space" ? space : world).project(S.say.wx, S.say.wy);
    $("#say").style.transform = `translate(${p.x.toFixed(0)}px,${p.y.toFixed(0)}px) translate(-50%,calc(-100% - 12px))`;
  }
  function floatText(x, y, text) {
    const el = h("span", { class: "float-text" }); el.textContent = text; el.style.left = x + "px"; el.style.top = y + "px";
    document.body.appendChild(el);
    if (REDUCE) { setTimeout(() => el.remove(), 1400); return; }
    el.animate([{ transform: "translate(-50%,-50%) scale(.8)", opacity: 0 }, { transform: "translate(-50%,-110%) scale(1)", opacity: 1, offset: .2 }, { transform: "translate(-50%,-320%)", opacity: 0 }], { duration: 1700, easing: "ease-out" }).onfinish = () => el.remove();
  }
  function bump(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  /* ---------------- space: one planet, DOITSILLY ---------------- */
  const SUN = [215, 205], DIS_PLANET = [800, 470];
  const SAT_ORBIT = { rx: 360, ry: 118, tilt: -14 };
  const SP = { orbiters: [], rocket: null, rt: 2.1, boost: 1, nextStar: 0, nextComet: 0, last: 0 };
  function orbitPoint(o) {
    const x = o.rx * Math.cos(o.a), y = o.ry * Math.sin(o.a), t = o.tilt * Math.PI / 180;
    return { x: o.c[0] + x * Math.cos(t) - y * Math.sin(t), y: o.c[1] + x * Math.sin(t) + y * Math.cos(t), front: Math.sin(o.a) > 0 };
  }
  function placeSp(el, x, y, rot) { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)${rot ? ` rotate(${rot.toFixed(1)}deg)` : ""}`; }
  function spaceThing({ svg, w, x = 0, y = 0, z = 3, name, cls = "", onClick }) {
    const el = h("button", { class: `sp ${cls}`, type: "button", "aria-label": name }, `<span class="sp-inner">${svg}</span>`);
    el.style.width = w + "px"; el.style.zIndex = z; placeSp(el, x, y);
    el.addEventListener("click", e => { e.stopPropagation(); bump(el, "pop"); onClick && onClick(el); });
    $("#space-stage").appendChild(el); return el;
  }
  function spaceSay(key, el, text) {
    const L = T.space[key], r = el.getBoundingClientRect(), p = space.toWorld(r.left + r.width / 2, r.top + Math.min(r.height * .12, 24));
    say(text || pick(L.lines), p.x, p.y, { name: L.name });
  }
  function buildSpace() {
    const st = $("#space-stage");
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const tw = () => ` class="tw" style="--tw:${(2 + rnd() * 3).toFixed(1)}s;animation-delay:-${(rnd() * 5).toFixed(1)}s"`;
    // The sky reaches well past the 1600x1000 stage so wide and tall screens are filled edge to edge.
    const SKY = { x: -1100, y: -700, w: 3800, h: 2400 };
    let far = "", near = "";
    for (let i = 0; i < 1100; i++) {
      const x = (SKY.x + rnd() * SKY.w).toFixed(0), y = (SKY.y + rnd() * SKY.h).toFixed(0), r = .8 + rnd() * 1.8, fill = rnd() < .2 ? "#DDFF00" : "#fff";
      const c = `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${fill}"${rnd() < .05 ? tw() : ""}/>`;
      if (r > 1.9) near += c; else far += c;
    }
    for (let i = 0; i < 44; i++) { // four-point sparkles
      const x = Math.round(SKY.x + rnd() * SKY.w), y = Math.round(SKY.y + rnd() * SKY.h), s = Math.round(5 + rnd() * 6);
      near += `<path${i % 3 ? "" : tw()} fill="#fff" d="M${x},${y - s}Q${x},${y} ${x + s},${y}Q${x},${y} ${x},${y + s}Q${x},${y} ${x - s},${y}Q${x},${y} ${x},${y - s}Z"/>`;
    }
    const [px, py] = DIS_PLANET;
    const orbit = `<ellipse cx="${px}" cy="${py}" rx="${SAT_ORBIT.rx}" ry="${SAT_ORBIT.ry}" transform="rotate(${SAT_ORBIT.tilt} ${px} ${py})" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 12" opacity=".32"/>`;
    st.innerHTML = `<svg class="space-bg" viewBox="${SKY.x} ${SKY.y} ${SKY.w} ${SKY.h}" style="left:${SKY.x}px;top:${SKY.y}px;width:${SKY.w}px;height:${SKY.h}px" aria-hidden="true"><defs>
      <radialGradient id="neb-pink"><stop offset="0" stop-color="#FF52CC" stop-opacity=".2"/><stop offset="1" stop-color="#FF52CC" stop-opacity="0"/></radialGradient>
      <radialGradient id="neb-blue"><stop offset="0" stop-color="#0A72EE" stop-opacity=".32"/><stop offset="1" stop-color="#0A72EE" stop-opacity="0"/></radialGradient>
      <radialGradient id="neb-lime"><stop offset="0" stop-color="#DDFF00" stop-opacity=".07"/><stop offset="1" stop-color="#DDFF00" stop-opacity="0"/></radialGradient>
      <radialGradient id="planet-glow"><stop offset=".55" stop-color="#FF52CC" stop-opacity=".22"/><stop offset="1" stop-color="#FF52CC" stop-opacity="0"/></radialGradient>
      <linearGradient id="star-tail" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#DDFF00" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <circle cx="260" cy="200" r="620" fill="url(#neb-blue)"/><circle cx="1360" cy="840" r="560" fill="url(#neb-pink)"/>
      <circle cx="-560" cy="820" r="620" fill="url(#neb-pink)"/><circle cx="2160" cy="120" r="680" fill="url(#neb-blue)"/>
      <circle cx="-380" cy="-180" r="460" fill="url(#neb-lime)"/><circle cx="2050" cy="1180" r="520" fill="url(#neb-lime)"/>
      <circle cx="${px}" cy="${py}" r="300" fill="url(#planet-glow)"/></svg>
      <svg class="space-layer par" id="par-far" viewBox="${SKY.x} ${SKY.y} ${SKY.w} ${SKY.h}" style="left:${SKY.x}px;top:${SKY.y}px;width:${SKY.w}px;height:${SKY.h}px" aria-hidden="true">${far}</svg>
      <svg class="space-layer par" id="par-near" viewBox="${SKY.x} ${SKY.y} ${SKY.w} ${SKY.h}" style="left:${SKY.x}px;top:${SKY.y}px;width:${SKY.w}px;height:${SKY.h}px" aria-hidden="true">${near}${orbit}</svg>
      <svg class="space-fx" id="space-fx" viewBox="0 0 1600 1000" aria-hidden="true"></svg>
      <div class="sprite" id="logo-planet" style="left:${px - 260}px;top:${py - 190}px;width:520px;z-index:5">${logoPlanetSVG()}</div>`;

    spaceThing({ svg: A.sprites.sun, w: 190, x: SUN[0], y: SUN[1], z: 5, name: T.space.sun.name, cls: "sun", onClick: el => { el.classList.toggle("cool"); spaceSay("sun", el); } });
    SP.orbiters.push({ el: spaceThing({ svg: A.sprites.satellite, w: 78, name: T.space.satellite.name, onClick: el => spaceSay("satellite", el) }), zf: 6, zb: 4, c: DIS_PLANET, ...SAT_ORBIT, period: 21, a: 3 });
    SP.rocket = spaceThing({ svg: A.sprites.rocket, w: 44, z: 7, name: T.space.rocket.name, cls: "rocket", onClick: el => {
      SP.boost = 6; el.classList.add("boost"); clearTimeout(el.t); el.t = setTimeout(() => el.classList.remove("boost"), 1600); spaceSay("rocket", el);
    } });
    spaceThing({ svg: A.sprites.bot, w: 82, x: 1400, y: 790, z: 6, name: T.space.bot.name, cls: "float", onClick: el => spaceSay("bot", el) });
    spaceThing({ svg: A.sprites.ghost, w: 62, x: 150, y: 840, z: 6, name: T.space.ghost.name, cls: "float slow", onClick: el => spaceSay("ghost", el) });
    stepSpace(0);
  }
  function logoPlanetSVG() {
    // The "O" is the same pink ring with eyes as the mascot.
    const eye = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="6.6" fill="#fff"/><circle cx="${x + 1.4}" cy="${y + .8}" r="2.8" fill="#000"/>`;
    // The ring sits low, like Saturn's, so its front half passes under the lettering instead of through SILLY.
    const ringD = half => half ? "M-232,0 A232,48 0 0 0 232,0" : "M-232,0 A232,48 0 1 1 232,0 A232,48 0 1 1 -232,0";
    const ring = half => `<g transform="translate(0,40) rotate(-12)"><path d="${ringD(half)}" fill="none" stroke="#111" stroke-width="16"/><path d="${ringD(half)}" fill="none" stroke="#FF52CC" stroke-width="9" stroke-dasharray="18 10"/></g>`;
    return `<svg viewBox="-260 -190 520 380" role="img" aria-label="DOITSILLY planet">
      ${ring(false)}<circle r="150" fill="#000" stroke="#111" stroke-width="6"/>
      <g class="logo-type">
        <text x="-36" y="-8" text-anchor="end" class="lp-t">D</text>
        <image class="lp-o" href="art/squiggle.svg" x="-37" y="-59" width="64" height="54"/>
        <circle class="lp-slot" cx="-5" cy="-32" r="24" fill="none" stroke="#FF52CC" stroke-width="3" stroke-dasharray="5 7" stroke-linecap="round"/>
        <text x="26" y="-8" class="lp-t">IT</text><text x="0" y="62" text-anchor="middle" class="lp-t">SILLY</text></g>
      ${ring(true)}</svg>`;
  }
  function stepSpace(dt) {
    SP.boost += (1 - SP.boost) * Math.min(1, dt * 1.5);
    for (const o of SP.orbiters) { o.a += dt * 2 * Math.PI / o.period; const p = orbitPoint(o); placeSp(o.el, p.x, p.y); o.el.style.zIndex = p.front ? o.zf : o.zb; }
    SP.rt += dt * .06 * SP.boost;
    const t = SP.rt, x = 800 + 700 * Math.sin(2 * t), y = 500 + 410 * Math.sin(3 * t + 1.1);
    placeSp(SP.rocket, x, y, Math.atan2(1230 * Math.cos(3 * t + 1.1), 1400 * Math.cos(2 * t)) * 180 / Math.PI + 90);
  }
  function spaceLoop(now) {
    requestAnimationFrame(spaceLoop);
    const dt = SP.last ? Math.min(.05, (now - SP.last) / 1000) : 0; SP.last = now;
    if (S.scene !== "space" || document.hidden || S.page) return;
    stepSpace(dt);
    if (now > SP.nextStar) { if (SP.nextStar) autoStar(); SP.nextStar = now + rand(1800, 4600); }
    if (now > SP.nextComet) { if (SP.nextComet) shootingStar(-120, rand(80, 380), rand(8, 16), { len: 340, w: 4.5, dist: 1900, dur: 6500, comet: true }); SP.nextComet = now + rand(16000, 28000); }
  }
  function shootingStar(x, y, ang, o = {}) {
    const fx = $("#space-fx"); if (!fx || REDUCE) return;
    const len = o.len || rand(110, 190), w = o.w || 2.4, dist = o.dist || rand(380, 620), dur = o.dur || rand(700, 1100);
    const g = document.createElementNS(NS, "g");
    g.innerHTML = `${o.comet ? `<circle r="${w * 3.4}" fill="#BDE3FF" opacity=".3"/>` : ""}<polygon points="0,${-w} ${-len},0 0,${w}" fill="url(#star-tail)"/><circle r="${w + .7}" fill="#fff"/>`;
    fx.appendChild(g);
    const a = ang * Math.PI / 180, x1 = x + Math.cos(a) * dist, y1 = y + Math.sin(a) * dist;
    g.animate([{ transform: `translate(${x}px,${y}px) rotate(${ang}deg)`, opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .75 }, { transform: `translate(${x1}px,${y1}px) rotate(${ang}deg)`, opacity: 0 }], { duration: dur, easing: o.comet ? "linear" : "cubic-bezier(.3,.1,.6,1)" }).onfinish = () => g.remove();
  }
  function autoStar() { const left = Math.random() < .5; shootingStar(left ? rand(60, 900) : rand(700, 1540), rand(-20, 320), left ? rand(18, 40) : rand(140, 162)); }
  function makeWish(e) {
    if (S.scene !== "space" || S.busy || e.target.closest("button,a")) return;
    if (PK.open) return closePick(); // clicking empty space closes the chooser
    const p = space.toWorld(e.clientX, e.clientY);
    shootingStar(p.x, p.y, p.x < 800 ? rand(15, 40) : rand(140, 165), { dist: rand(300, 460), len: 170, w: 3 });
    const n = (+store.get("dis_wishes") || 0) + 1; store.set("dis_wishes", n);
    floatText(e.clientX, e.clientY, T.space.wish.replace("{n}", n));
  }

  /* ---------------- pick a side: drag Scribble onto a landing pad ----------------
     Scribble (the scribbly pink O) lives in space. It starts in the middle, as the O of the DOITSILLY planet, and can be
     dragged anywhere; it stays where you leave it (drop it back on the planet and it snaps home).
     Picking it up, tapping it or clicking the planet brings out the two landing pads.
     Keyboard: Tab to a pad and press Enter, and Scribble flies there by itself. */
  const PK = { open: false, drag: null, spot: null, pos: { x: 0, y: 0 }, dropping: false };
  const O_HOME = [DIS_PLANET[0] - 5, DIS_PLANET[1] - 32]; // where the O sits in the planet's lettering
  const pads = () => $$("#pick .pad");
  const tf = (x, y, rot = 0, sc = 1) => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) rotate(${rot.toFixed(1)}deg) scale(${sc})`;
  function placeToken(x, y, rot = 0, sc = 1) { $("#token").style.transform = tf(x, y, rot, sc); PK.pos = { x, y }; }
  const tokenHome = () => space.project(O_HOME[0], O_HOME[1]);
  const tokenSpot = () => PK.spot ? { x: PK.spot.fx * innerWidth, y: PK.spot.fy * innerHeight } : tokenHome();
  function layoutToken() {
    if (!space || PK.dropping) return;
    const t = $("#token"), show = S.scene === "space" && !S.page && !S.transitioning && !S.menuOpen;
    if (!show) { if (PK.drag) cancelDrag(); t.hidden = true; document.body.classList.remove("token-on"); return; }
    t.hidden = false; document.body.classList.add("token-on");
    const w = Math.round(Math.max(52, Math.min(96, 86 * space.s))) + "px"; if (t.style.width !== w) t.style.width = w;
    document.body.classList.toggle("o-away", !!PK.spot || !!PK.drag);
    if (PK.drag) return;
    const p = tokenSpot(); placeToken(p.x, p.y);
  }
  function buildPick() {
    $("#pick-title").textContent = T.pick.headline; $("#pick-sub").textContent = T.pick.sub; $("#pick-close").textContent = T.pick.back;
    pads().forEach(p => {
      const k = p.dataset.side, L = T.pick[k];
      p.querySelector(".pad-art").innerHTML = k === "studio" ? A.sprites.padStudio : A.sprites.padCommunity;
      p.querySelector("b").textContent = L.name; p.querySelector("small").textContent = L.line;
      p.addEventListener("click", e => { if (e.detail === 0) dropOn(p); else nudge(p); }); // keyboard = fly there; mouse click = "drag me"
    });
    $("#token .token-art").innerHTML = A.sprites.squiggle;
    const bubble = $("#token .token-say"); bubble.textContent = T.pick.grab; bubble.hidden = !!store.get("dis_grabbed");
    $("#pick-close").onclick = () => closePick();
    $("#token").addEventListener("pointerdown", startDrag);
  }
  function planetScreen() { return space.project(DIS_PLANET[0], DIS_PLANET[1]); }
  function layoutPick() {
    if (!PK.open) return;
    const c = planetScreen(), r = 150 * space.s, vw = innerWidth, vh = innerHeight, mob = isMobile();
    pads().forEach((p, i) => {
      const w = p.offsetWidth, art = p.querySelector(".pad-art").offsetWidth;
      let x, y;
      if (mob) { x = vw * (i ? .74 : .26); y = Math.min(vh - 150, c.y + r * 1.2 + 110); }
      else { const off = r * 1.55 + 150; x = Math.max(w / 2 + 16, Math.min(vw - w / 2 - 16, c.x + (i ? off : -off))); y = c.y; }
      p.style.left = (x - w / 2).toFixed(0) + "px"; p.style.top = (y - art / 2).toFixed(0) + "px";
      p._c = { x, y };
    });
  }
  function openPick(opts = {}) {
    if (PK.open || S.scene !== "space" || S.busy || S.page) return;
    PK.open = true; hideSay(); closePop();
    document.body.classList.add("picking");
    $("#pick").hidden = false; layoutPick();
    bump($("#logo-planet"), "wobble");
    const c = planetScreen();
    if (!REDUCE) pads().forEach((p, i) => {
      const dx = c.x - p._c.x, dy = c.y - p._c.y;
      p.animate([{ transform: `translate(${dx}px,${dy}px) scale(.15)`, opacity: 0 }, { transform: "translate(0,0) scale(1.08)", opacity: 1, offset: .7 }, { transform: "none", opacity: 1 }],
        { duration: 720, delay: 60 + i * 110, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" });
    });
    updateChrome(); scheduleOverlay();
    if (!opts.quiet) setTimeout(() => PK.open && !PK.drag && pads()[0].focus({ preventScroll: true }), 60);
  }
  function closePick(silent) {
    if (!PK.open) return;
    PK.open = false;
    document.body.classList.remove("picking");
    $("#pick").hidden = true;
    pads().forEach(p => p.classList.remove("over", "landed", "nudge"));
    if (!silent) { updateChrome(); scheduleOverlay(); }
  }
  function startDrag(e) {
    if (PK.dropping || PK.drag || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    const t = $("#token"), p = PK.pos; t.getAnimations().forEach(a => a.cancel());
    t.classList.add("held"); document.body.classList.add("dragging");
    PK.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x - e.clientX, oy: p.y - e.clientY, lx: e.clientX, vx: 0, moved: false };
    placeToken(p.x, p.y, 0, 1.12);
    window.addEventListener("pointermove", moveDrag); window.addEventListener("pointerup", endDrag); window.addEventListener("pointercancel", endDrag);
  }
  function stopListening() { window.removeEventListener("pointermove", moveDrag); window.removeEventListener("pointerup", endDrag); window.removeEventListener("pointercancel", endDrag); }
  function cancelDrag() {
    PK.drag = null; stopListening();
    $("#token").classList.remove("held"); document.body.classList.remove("dragging"); pads().forEach(p => p.classList.remove("over"));
  }
  function padAt(x, y) { return pads().find(p => p._c && Math.hypot(x - p._c.x, y - p._c.y) < p.querySelector(".pad-art").offsetWidth / 2 + 36) || null; }
  function moveDrag(e) {
    const d = PK.drag; if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) {
      d.moved = true; document.body.classList.add("o-away");
      $("#token .token-say").hidden = true; store.set("dis_grabbed", "1");
      openPick({ quiet: true });
    }
    d.vx = d.vx * .7 + (e.clientX - d.lx) * .3; d.lx = e.clientX;
    const x = e.clientX + d.ox, y = e.clientY + d.oy;
    placeToken(x, y, Math.max(-28, Math.min(28, d.vx * 1.6)), 1.12);
    const over = d.moved ? padAt(x, y) : null; pads().forEach(p => p.classList.toggle("over", p === over));
  }
  function endDrag(e) {
    const d = PK.drag; if (!d || e.pointerId !== d.id) return;
    cancelDrag();
    const x = e.clientX + d.ox, y = e.clientY + d.oy;
    const pad = e.type === "pointerup" && d.moved ? padAt(x, y) : null;
    if (pad) return dropOn(pad, { x, y });
    settle(x, y);
    if (!d.moved) { bump($("#token"), "nudge"); openPick(); } // a tap brings out the pads
  }
  function settle(x, y) {
    const m = 34, home = tokenHome(), from = { ...PK.pos };
    x = Math.max(m, Math.min(innerWidth - m, x)); y = Math.max(m, Math.min(innerHeight - m, y));
    if (Math.hypot(x - home.x, y - home.y) < 44) { PK.spot = null; x = home.x; y = home.y; }
    else PK.spot = { fx: x / innerWidth, fy: y / innerHeight };
    placeToken(x, y);
    document.body.classList.toggle("o-away", !!PK.spot);
    if (!REDUCE) $("#token").animate([{ transform: tf(from.x, from.y, 0, 1.12) }, { transform: tf(x, y, 0, 1) }], { duration: 280, easing: "cubic-bezier(.3,.7,.4,1.4)" });
  }
  function nudge(p) { bump(p, "nudge"); bump($("#token"), "nudge"); floatText(p._c.x, p._c.y - 30, T.pick.nudge); }
  async function dropOn(pad, from) {
    if (PK.dropping || !PK.open) return;
    PK.dropping = true;
    const t = $("#token"), c = pad._c, side = pad.dataset.side;
    from = from || PK.pos;
    t.hidden = false; t.getAnimations().forEach(a => a.cancel());
    pad.classList.add("landed");
    if (!REDUCE) {
      const arc = { x: (from.x + c.x) / 2, y: Math.min(from.y, c.y) - 90 };
      await t.animate([{ transform: tf(from.x, from.y, 0, 1.12) }, { transform: tf(arc.x, arc.y, 160, 1.05), offset: .45 }, { transform: tf(c.x, c.y, 360, .9), offset: .85 }, { transform: tf(c.x, c.y, 360, .2), opacity: 0 }],
        { duration: 600, easing: "cubic-bezier(.4,0,.5,1)", fill: "forwards" }).finished;
    }
    t.hidden = true; t.getAnimations().forEach(a => a.cancel());
    PK.spot = null; document.body.classList.remove("o-away"); // next time we're in space, Scribble is back home
    bump(pad, "pop");
    await sleep(REDUCE ? 0 : 280);
    // PK.dropping stays on until the route starts, so Scribble doesn't flash back onto the planet in between
    if (side === "community") { await wipeFrom(c.x, c.y); closePick(true); go("#/community"); }
    else { closePick(true); go("#/islands"); }
  }
  function wipeFrom(x, y) {
    const w = $("#wipe"), R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    w.style.width = w.style.height = R * 2 + "px"; w.style.left = x - R + "px"; w.style.top = y - R + "px";
    w.hidden = false; w.style.opacity = 1;
    if (REDUCE) return Promise.resolve();
    return w.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 620, easing: "cubic-bezier(.6,0,.3,1)", fill: "forwards" }).finished;
  }
  function clearWipe() {
    const w = $("#wipe"); if (w.hidden) return;
    if (REDUCE) { w.hidden = true; return; }
    w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease-out", fill: "forwards" }).finished.then(() => { w.getAnimations().forEach(a => a.cancel()); w.hidden = true; });
  }

  /* ---------------- community landing page (#/community) ---------------- */
  function renderCommunity() {
    const K = T.community, join = K.joinUrl && !K.joinUrl.startsWith("[") ? K.joinUrl : "#/studio/contact";
    const crowd = [["pencil_kid", 118], ["paint_bucket", 96], ["crayon", 132], ["toast_dj", 120], [null, 170], ["cam_director", 128], ["bulb", 100], ["postit_stack", 92], ["clapper", 104]];
    const person = ([n, ht], i) => `<span class="c-person" style="--h:${ht}px;--i:${i}">${n ? `<img src="art/cast/${n}.svg" alt="" draggable="false">` : A.sprites.scribble}</span>`;
    $("#community").innerHTML = `
      <section class="c-hero">
        <div class="c-hero-in">
          <p class="c-kick">${K.kicker}</p>
          <h1 id="c-title" tabindex="-1">${K.hero}</h1>
          <p class="c-lead">${K.intro}</p>
          <div class="row"><a class="btn ink" href="${esc(join)}"${join.startsWith("http") ? ' rel="noopener"' : ""}>${K.join}</a><button class="btn" type="button" data-scroll="c-where">${K.visit}</button></div>
        </div>
        <div class="c-crowd" aria-hidden="true">${crowd.map(person).join("")}</div>
      </section>
      <section class="c-sec">
        <h2>${K.spotsHeading}</h2>
        <div class="c-spots">${K.spots.map(s => `<article class="c-spot tone-${s.tone}"><div class="c-spot-art"><img src="${s.art}" alt="" draggable="false"></div><h3>${s.name}</h3><p>${s.line}</p></article>`).join("")}</div>
      </section>
      <section class="c-sec c-band">
        <div class="c-band-in">
          <h2>${K.studioHeading}</h2><p class="c-lead">${K.studioIntro}</p>
          <dl class="c-roles">${K.studioRoles.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl>
          <div class="c-acc"><h3>${K.accelerator[0]}</h3><p>${K.accelerator[1]}</p></div>
        </div>
      </section>
      <section class="c-sec c-split">
        <div id="c-where"><h2>${K.whereHeading}</h2><p>${K.where}</p></div>
        <div><h2>${K.brandsHeading}</h2><p>${K.brands}</p><a class="btn pink" href="#/studio/contact">Start a project</a></div>
      </section>
      <footer class="c-foot"><p class="signoff">${K.closing}</p><div class="row"><a class="btn" href="#/islands">Visit DOITSILLY Island</a><a class="btn" href="#/system">Back to space</a></div></footer>`;
    $("#community").addEventListener("click", e => { const b = e.target.closest("[data-scroll]"); if (b) { const t = document.getElementById(b.dataset.scroll); t && t.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" }); } });
  }
  function showCommunity() {
    closePanel(true); closePop(); endTour(); hideSay();
    const pg = $("#community"), first = pg.hidden;
    S.page = "community"; document.body.classList.add("on-page");
    pg.hidden = false; if (first) { pg.scrollTop = 0; bump(pg, "enter"); }
    $("#c-title").focus({ preventScroll: true });
    clearWipe();
  }
  function hideCommunity() {
    if (!S.page) return;
    S.page = null; $("#community").hidden = true; document.body.classList.remove("on-page");
  }

  /* ---------------- islands ---------------- */
  const CAST = [];
  let TYPES = [];
  function buildWorld() {
    const st = $("#world-stage");
    st.style.width = C.world[0] + "px"; st.style.height = C.world[1] + "px";
    const tile = t => `<img class="tile" alt="" src="${t.src}" data-x="${t.x}" data-y="${t.y}" data-w="${t.w}" data-h="${t.h}" decoding="async" style="left:${t.x}px;top:${t.y}px;width:${t.w + 1}px;height:${t.h + 1}px" draggable="false">`;
    // The original tiles are only SOURCE art now: buildLogoIsland() cuts them into districts and lays them out inside the
    // logo outline (#chunks). The logo itself (#logo-skin) sits on top until the island is ready, then fades away.
    // Layers, bottom to top: the logo-island coast, the original coast, the original art (shown once the island has
    // broken apart), the logo-island districts (#chunks), locals, the original foreground art, clouds, and the logo itself.
    st.innerHTML = `<svg class="layer layer-coast" id="coast" viewBox="0 0 ${C.world[0]} ${C.world[1]}" preserveAspectRatio="none" aria-hidden="true"></svg>
      <svg class="layer layer-coast" id="coast-old" viewBox="0 0 ${C.world[0]} ${C.world[1]}" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="layer layer-src layer-src-base" aria-hidden="true">${M.tiles.filter(t => t.layer === "base").map(tile).join("")}</div>
      <div class="layer layer-base" id="chunks"></div><div class="layer layer-sprites" id="sprites"></div>
      <div class="layer layer-src layer-src-fg" aria-hidden="true">${M.tiles.filter(t => t.layer === "fg").map(tile).join("")}</div>
      <div class="layer layer-top" id="sprites-top"></div><div class="layer layer-skin"><img id="logo-skin" src="art/logo-island.svg" alt="" draggable="false"></div>`;
    st.classList.add("premorph");
    const low = $("#sprites"), top = $("#sprites-top"), kept = [];
    CAST.length = 0;
    (M.cast || []).forEach(c => {
      if (c.a === "fly") return; // paper planes used to zip around; the island keeps its locals still
      if (kept.some(k => k.n === c.n && Math.hypot(k.x - c.x, k.y - c.y) < 40)) return; // drop stacked duplicates
      kept.push(c);
      const el = h("div", { class: "pc-sprite cast", "data-n": c.n, title: (T.locals[c.n] || T.locals._default).name }, `<img alt="" src="${c.src}" draggable="false">`);
      el.style.cssText = `left:${c.x}px;top:${c.y}px;width:${c.w}px`;
      low.appendChild(el); CAST.push({ c, el });
    });
    TYPES = [...new Set(CAST.map(o => o.c.n))];
    C.clouds.forEach((cl, i) => {
      const el = h("div", { class: "pc-sprite drift cloud" }, `<img alt="" src="${cl.src}" draggable="false">`);
      el.style.cssText = `left:${cl.x}px;top:${cl.y}px;width:${cl.w}px;--dx:${cl.dx}px;--dur:${cl.dur}s;animation-delay:${-i * 7}s`;
      top.appendChild(el);
    });
    if (C.ferry) {
      const f = h("div", { class: "pc-sprite ferry", id: "ferry", title: T.ferry.name }, `<img alt="" src="${C.ferry.art}" draggable="false">`);
      f.style.width = C.ferry.w + "px"; top.appendChild(f);
    }
    // A compass rose in the open sea, bottom right: it fills the empty water and says "this is a map".
    const pt8 = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4 - Math.PI / 2, L = i % 2 ? 120 : 210, w = i % 2 ? 22 : 34, b = a + Math.PI / 2;
      return `<path d="M${(Math.cos(a) * L).toFixed(0)},${(Math.sin(a) * L).toFixed(0)} L${(Math.cos(b) * w).toFixed(0)},${(Math.sin(b) * w).toFixed(0)} L0,0 Z" fill="${i === 0 ? "#FF52CC" : i % 2 ? "#DDFF00" : "#fff"}" stroke="#111" stroke-width="8" stroke-linejoin="round"/><path d="M${(Math.cos(a) * L).toFixed(0)},${(Math.sin(a) * L).toFixed(0)} L${(-Math.cos(b) * w).toFixed(0)},${(-Math.sin(b) * w).toFixed(0)} L0,0 Z" fill="${i === 0 ? "#D92FA8" : i % 2 ? "#B8D600" : "#D9E6F5"}" stroke="#111" stroke-width="8" stroke-linejoin="round"/>`; }).join("");
    const compass = h("div", { class: "pc-sprite compass", id: "compass", "aria-hidden": "true" }, `<svg viewBox="-300 -300 600 600"><circle r="250" fill="#0A72EE" stroke="#fff" stroke-width="10" stroke-dasharray="34 22"/><circle r="170" fill="none" stroke="#fff" stroke-width="5" opacity=".55"/>${pt8}<circle r="24" fill="#111"/><circle r="10" fill="#FF52CC"/><text y="-258" text-anchor="middle" dominant-baseline="middle" font-family="Unbounded, Arial Black, sans-serif" font-weight="900" font-size="62" fill="#111" stroke="#111" stroke-width="16" stroke-linejoin="round">N</text><text y="-258" text-anchor="middle" dominant-baseline="middle" font-family="Unbounded, Arial Black, sans-serif" font-weight="900" font-size="62" fill="#fff">N</text></svg>`);
    compass.style.cssText = "left:8180px;top:4100px;width:600px";
    top.appendChild(compass);
  }
  const metSet = () => { try { return new Set(JSON.parse(store.get("dis_met") || "[]")); } catch (e) { return new Set(); } };
  function anchorOf(el) { const r = el.getBoundingClientRect(); return world.toWorld(r.left + r.width / 2, r.top); }
  function greet(el) {
    const n = el.dataset.n, L = T.locals[n] || T.locals._default, a = anchorOf(el);
    bump(el, "hop");
    let near = null, best = 700;
    C.districts.forEach(d => { const dd = Math.hypot(d.pin[0] - a.x, d.pin[1] - a.y); if (dd < best) { best = dd; near = d; } });
    say(pick(L.lines), a.x, a.y, { name: L.name, link: near ? [T.visit.replace("{place}", P[near.id].landmark), placeHash(near.id)] : null });
    const met = metSet(), had = met.size; met.add(n); store.set("dis_met", JSON.stringify([...met]));
    updateChrome();
    if (met.size > had && met.size === TYPES.length) setTimeout(() => floatText(innerWidth / 2, innerHeight / 2, T.hiDone), 500);
  }
  function rideFerry() {
    const el = $("#ferry"), a = anchorOf(el); bump(el, "hop");
    say(pick(T.ferry.lines), a.x, a.y, { name: T.ferry.name, ms: 1500 });
    setTimeout(() => go(S.level === "about" ? "#/studio" : "#/about"), 750);
  }
  function poofCloud(el) { if (el.classList.contains("poof")) return; el.classList.add("poof"); setTimeout(() => el.classList.remove("poof"), 9000); }

  /* ---------------- coastline: finish the island edges ----------------
     Parts of the island art end in hard, straight cuts. On load we read the tiles at 1/10 scale, trace a wobbly
     hand-drawn coast around the land (sand beach, foam line, shallow water) and trim the straight cuts away.
     Needs the page served over http (start.bat); on file:// the browser won't let us read pixels, so it's skipped. */
  function hs(a, b) { let n = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hs(xi, yi), b = hs(xi + 1, yi), c = hs(xi, yi + 1), d = hs(xi + 1, yi + 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  }
  function chamfer(grid, W, H, target) { // distance (in cells) from each cell to the nearest cell equal to target
    const d = new Float32Array(W * H), D2 = 1.414;
    for (let i = 0; i < W * H; i++) d[i] = grid[i] === target ? 0 : 1e9;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = d[i]; if (!v) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + D2); if (x < W - 1) v = Math.min(v, d[i - W + 1] + D2); }
      d[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = d[i]; if (!v) continue;
      if (x < W - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + D2); if (x > 0) v = Math.min(v, d[i + W - 1] + D2); }
      d[i] = v;
    }
    return d;
  }
  function dropSmall(grid, W, H, val, min) { // remove specks of land (val 1) / fill small lakes (val 0)
    const seen = new Uint8Array(W * H), stack = new Int32Array(W * H), comp = [];
    for (let s = 0; s < W * H; s++) {
      if (seen[s] || grid[s] !== val) continue;
      let sp = 0, edge = false; comp.length = 0; stack[sp++] = s; seen[s] = 1;
      while (sp) {
        const i = stack[--sp], x = i % W, y = (i / W) | 0; comp.push(i);
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && !seen[j] && grid[j] === val) { seen[j] = 1; stack[sp++] = j; }
      }
      if (comp.length < min && !(val === 0 && edge)) for (const i of comp) grid[i] = 1 - val;
    }
  }
  function contours(f, W, H) { // marching squares: closed loops where f crosses 0 (inside = f < 0)
    const pts = new Map();
    const P_ = (id, x, y) => { let p = pts.get(id); if (!p) { p = { x, y, n: [] }; pts.set(id, p); } return id; };
    const seg = (a, b) => { pts.get(a).n.push(b); pts.get(b).n.push(a); };
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
      const i = y * W + x, tl = f[i], tr = f[i + 1], br = f[i + W + 1], bl = f[i + W];
      const c = (tl < 0 ? 8 : 0) | (tr < 0 ? 4 : 0) | (br < 0 ? 2 : 0) | (bl < 0 ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const Tp = () => P_(2 * i, x + tl / (tl - tr), y), Bp = () => P_(2 * (i + W), x + bl / (bl - br), y + 1);
      const Lp = () => P_(2 * i + 1, x, y + tl / (tl - bl)), Rp = () => P_(2 * (i + 1) + 1, x + 1, y + tr / (tr - br));
      switch (c) {
        case 1: case 14: seg(Lp(), Bp()); break;
        case 2: case 13: seg(Bp(), Rp()); break;
        case 3: case 12: seg(Lp(), Rp()); break;
        case 4: case 11: seg(Tp(), Rp()); break;
        case 6: case 9: seg(Tp(), Bp()); break;
        case 7: case 8: seg(Lp(), Tp()); break;
        case 5: case 10: {
          const joined = (tl + tr + br + bl) / 4 < 0;
          if ((c === 5) === joined) { seg(Lp(), Tp()); seg(Bp(), Rp()); } else { seg(Lp(), Bp()); seg(Tp(), Rp()); }
        }
      }
    }
    const loops = [], used = new Set();
    for (const [id] of pts) {
      if (used.has(id)) continue;
      const poly = []; let prev = -1, cur = id;
      while (cur !== undefined && !used.has(cur)) { used.add(cur); const q = pts.get(cur); poly.push(q.x, q.y); const nx = q.n[0] !== prev ? q.n[0] : q.n[1]; prev = cur; cur = nx; }
      if (poly.length >= 16) loops.push(poly);
    }
    return loops;
  }
  function pathFrom(loops, K, minArea) { // thin the points and draw smooth curves through them
    let out = "";
    for (const L of loops) {
      const m = L.length / 2; let area = 0;
      for (let i = 0; i < m; i++) { const j = (i + 1) % m; area += L[2 * i] * L[2 * j + 1] - L[2 * j] * L[2 * i + 1]; }
      if (Math.abs(area) / 2 < minArea) continue;
      const p = []; let lx = 1e9, ly = 1e9;
      for (let i = 0; i < L.length; i += 2) if (Math.hypot(L[i] - lx, L[i + 1] - ly) >= 1.6) { p.push(L[i], L[i + 1]); lx = L[i]; ly = L[i + 1]; }
      const n = p.length / 2; if (n < 4) continue;
      const k = i => ((i % n) + n) % n, X = i => (p[k(i) * 2] - .5) * K, Y = i => (p[k(i) * 2 + 1] - .5) * K, r = Math.round;
      out += `M${r(X(0))},${r(Y(0))}`;
      for (let i = 0; i < n; i++) out += `C${r(X(i) + (X(i + 1) - X(i - 1)) / 6)},${r(Y(i) + (Y(i + 1) - Y(i - 1)) / 6)} ${r(X(i + 1) - (X(i + 2) - X(i)) / 6)},${r(Y(i + 1) - (Y(i + 2) - Y(i)) / 6)} ${r(X(i + 1))},${r(Y(i + 1))}`;
      out += "Z";
    }
    return out;
  }
  async function buildCoast() {
    const K = 10, W = Math.ceil(C.world[0] / K) + 2, H = Math.ceil(C.world[1] / K) + 2;
    const tiles = M.tiles.filter(t => t.layer === "base"), key = "dis_coast_v3_" + tiles.length;
    try { const c = JSON.parse(store.get(key) || "null"); if (c && c.clip) return applyCoast(c); } catch (e) {}
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    await Promise.all(tiles.map(t => new Promise(res => { const im = new Image(); im.onload = () => { g.drawImage(im, 1 + t.x / K, 1 + t.y / K, t.w / K, t.h / K); res(); }; im.onerror = res; im.src = t.src; })));
    let px; try { px = g.getImageData(0, 0, W, H).data; } catch (e) { return; }
    const N = W * H, land = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2], a = px[i * 4 + 3];
      const sea = Math.abs(r - 10) < 34 && Math.abs(gg - 114) < 40 && Math.abs(b - 238) < 40, dot = Math.abs(r - 5) < 30 && Math.abs(gg - 72) < 34 && Math.abs(b - 154) < 36;
      land[i] = a > 110 && !sea && !dot ? 1 : 0;
    }
    for (let x = 0; x < W; x++) land[x] = land[N - 1 - x] = 0;
    for (let y = 0; y < H; y++) land[y * W] = land[y * W + W - 1] = 0;
    dropSmall(land, W, H, 1, 900); dropSmall(land, W, H, 0, 600); // drop stray specks and small sand blobs, fill small lakes
    // Round the square corners (erode by R, grow back), keeping thin bits like jetties that the rounding would erase.
    const R = 6, dIn = chamfer(land, W, H, 0), dOut = chamfer(land, W, H, 1), core = new Uint8Array(N);
    for (let i = 0; i < N; i++) core[i] = land[i] && dIn[i] > R ? 1 : 0;
    const dCore = chamfer(core, W, H, 1), sdf = new Float32Array(N);
    for (let i = 0; i < N; i++) sdf[i] = Math.min(dCore[i] - R, land[i] ? -Math.min(dIn[i], R) : dOut[i]);
    // Slow, wide waves plus a little ripple turn straight cuts into bays and headlands.
    const level = (base, amp, sx) => { const f = new Float32Array(N); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; f[i] = sdf[i] - base - amp * (vnoise(x / 26 + sx, y / 26) * .75 + vnoise(x / 9, y / 9 + sx) * .25); } return f; };
    const d = {
      clip: pathFrom(contours(level(-3.2, 2.6, 0), W, H), K, 30),
      beach: pathFrom(contours(level(5, 3.2, 11), W, H), K, 60),
      foam: pathFrom(contours(level(11, 3.4, 23), W, H), K, 80),
      halo: pathFrom(contours(level(17, 4, 37), W, H), K, 100)
    };
    if (!d.clip) return;
    store.set(key, JSON.stringify(d)); applyCoast(d);
  }
  function applyCoast(d) {
    $("#coast-old").innerHTML = `<defs><clipPath id="dis-art-clip" clipPathUnits="userSpaceOnUse"><path clip-rule="evenodd" d="${d.clip}"/></clipPath></defs>
      <path class="c-halo" fill-rule="evenodd" d="${d.halo}"/><path class="c-foam" d="${d.foam}"/><path class="c-beach" fill-rule="evenodd" d="${d.beach}"/>`;
    $("#world-stage").classList.add("clipped");
    setTimeout(() => bakeTiles(d.clip).catch(() => {}).finally(() => ISL._mapReady()), 100);
  }
  /* Clipping the island art with a live SVG clip-path forces the browser to redraw the whole map through that shape on
     every frame of a pan or zoom. Instead, each tile is clipped once, in the background, into a new image; after that the
     live clip is switched off and moving the map is just sliding pictures around. */
  async function bakeTiles(clipD) {
    if (bakeTiles.started || !window.Path2D) return; bakeTiles.started = true;
    let clip; try { clip = new Path2D(clipD); } catch (e) { return; }
    const idle = () => new Promise(r => window.requestIdleCallback ? requestIdleCallback(r, { timeout: 80 }) : setTimeout(r, 0));
    for (const im of $$("#world-stage img.tile")) {
      await idle();
      try {
        if (!im.complete || !im.naturalWidth) await (im.decode ? im.decode() : Promise.resolve()).catch(() => {});
        const nw = im.naturalWidth, nh = im.naturalHeight; if (!nw) continue;
        const x = +im.dataset.x, y = +im.dataset.y, w = +im.dataset.w, hh = +im.dataset.h, sx = nw / w, sy = nh / hh;
        const cv = document.createElement("canvas"); cv.width = nw; cv.height = nh;
        const g = cv.getContext("2d");
        g.setTransform(sx, 0, 0, sy, -x * sx, -y * sy); g.clip(clip, "evenodd"); g.drawImage(im, x, y, w, hh);
        const blob = await new Promise(r => cv.toBlob(r, "image/webp", .95)); if (!blob) return;
        const url = URL.createObjectURL(blob);
        await new Promise(r => { const n = new Image(); n.onload = n.onerror = r; n.src = url; });
        im.src = url;
        await (im.decode ? im.decode() : Promise.resolve()).catch(() => {}); // ready before the next one: no blank tiles
      } catch (e) { return; } // unsupported or blocked: the live clip stays on, which still looks right
    }
    $("#world-stage").classList.add("baked");
  }

  /* ---------------- the logo island ----------------
     The map is ONE island in the shape of the DOITSILLY logo (js/logo-shape.js). On load:
       1. the original island art (the hidden source tiles) is read at 1/10 scale to find the land;
       2. the land is split into 12 districts around the seed points in config (logoIsland.seeds), with wobbly,
          hand-drawn-looking borders;
       3. the districts are laid out on a 4 x 3 grid inside the logo outline (logoIsland.grid), each one scaled to
          fill its cell, and every place, pin and local moves with its district (ISL.ready);
       4. in the background each district is cut out of the full-quality art and baked into one image, clipped to
          the logo outline (ISL.baked).
     The logo (#logo-skin) covers the island until then; ISL.reveal() fades it away so the logo becomes the island. */
  const ISL = { morphed: false, revealing: false, chunks: [] };
  ISL.ready = new Promise(r => { ISL._ready = r; });
  ISL.baked = new Promise(r => { ISL._baked = r; });
  // the real map is ready to show: every tile trimmed to the coast, swapped in and decoded (never shown half-done)
  ISL.mapReady = new Promise(r => { ISL._mapReady = r; });
  const mapReadyOrTimeout = () => Promise.race([ISL.mapReady, sleep(12000)]);
  /* The arrival show: logo -> logo island -> the island breaks apart and every district flies back to its real spot ->
     the original two islands. instant = skip the show (arriving zoomed in, e.g. a shared link to a place). */
  ISL.reveal = async (instant) => {
    if (ISL.morphed || ISL.revealing) return;
    ISL.revealing = true;
    await ISL.baked;
    const st = $("#world-stage");
    const finish = () => {
      st.classList.remove("premorph", "breaking"); st.classList.add("broken"); ISL.morphed = true; ISL.revealing = false; updateChrome(); scheduleOverlay();
      // the show is over: free the temporary pieces, the logo-island coast and the logo overlay
      setTimeout(() => {
        ISL.chunks.forEach(c => { try { URL.revokeObjectURL(c.el.src); } catch (e) {} c.el.remove(); }); ISL.chunks = [];
        const co = $("#coast"); if (co) co.innerHTML = "";
        const sk = $("#logo-skin"); if (sk) sk.remove();
      }, 1200);
    };
    if (instant || REDUCE || !ISL.chunks.length) { await mapReadyOrTimeout(); return finish(); }
    await sleep(450);
    st.classList.remove("premorph");                 // 1. the logo fades into the logo island
    await Promise.all([sleep(1700 + 1500), mapReadyOrTimeout()]); // 2. ...which holds until the real map is fully ready
    st.classList.add("breaking");                     // 3. its coast dissolves and the districts fly home
    ISL.chunks.forEach((c, i) => {
      const delay = (i % 4) * .07 + Math.floor(i / 4) * .09;
      c.el.style.willChange = "transform";
      c.el.style.transition = `transform 1.7s cubic-bezier(.65,0,.25,1) ${delay.toFixed(2)}s`;
      c.el.style.transform = c.home;
    });
    await sleep(2050);
    st.classList.add("broken");                       // 4. the real islands take over: coastline, locals, ferry, labels
    await sleep(700);
    ISL.chunks.forEach(c => { c.el.style.willChange = ""; });
    finish();
  };
  function largestPiece(mask, W, H) {
    const lab = new Int32Array(W * H), stack = new Int32Array(W * H); let best = 0, bestId = 0, id = 0;
    for (let s = 0; s < W * H; s++) {
      if (!mask[s] || lab[s]) continue;
      id++; let sp = 0, n = 0; stack[sp++] = s; lab[s] = id;
      while (sp) {
        const i = stack[--sp], x = i % W; n++;
        if (x > 0 && mask[i - 1] && !lab[i - 1]) { lab[i - 1] = id; stack[sp++] = i - 1; }
        if (x < W - 1 && mask[i + 1] && !lab[i + 1]) { lab[i + 1] = id; stack[sp++] = i + 1; }
        if (i >= W && mask[i - W] && !lab[i - W]) { lab[i - W] = id; stack[sp++] = i - W; }
        if (i < W * H - W && mask[i + W] && !lab[i + W]) { lab[i + W] = id; stack[sp++] = i + W; }
      }
      if (n > best) { best = n; bestId = id; }
    }
    const out = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) out[i] = lab[i] === bestId ? 1 : 0;
    return out;
  }
  async function buildLogoIsland() {
    if (ISL.started) return; ISL.started = true; // build once, ever
    const L = C.logoIsland, LG = window.DIS_LOGO, stage = $("#world-stage");
    const [vx, vy, vw, vh] = LG.vb;
    const IW = L.width, IH = IW * vh / vw, IX = Math.round((C.world[0] - IW) / 2), IY = Math.round((C.world[1] - IH) / 2), sc = IW / vw;
    ISL.rect = [IX, IY, IW, IH];
    ISL._ready(); // nothing on the real map waits for the intro island
    const toWorld = new DOMMatrix([sc, 0, 0, sc, IX - vx * sc, IY - vy * sc]);
    const logoPath = new Path2D(); logoPath.addPath(new Path2D(LG.d), toWorld);

    // the coast, drawn round the logo outline: shallows, foam, ink line, sand, then grass inside
    const u = v => (v / sc).toFixed(2);   // world px -> logo units (the path is drawn in logo units, scaled up)
    $("#coast").innerHTML = `<defs><pattern id="isl-grass" width="${u(130)}" height="${u(130)}" patternUnits="userSpaceOnUse"><rect width="${u(130)}" height="${u(130)}" fill="#C8F03C"/><circle cx="${u(40)}" cy="${u(40)}" r="${u(22)}" fill="#2E9E4F"/><circle cx="${u(105)}" cy="${u(100)}" r="${u(16)}" fill="#3DAE5C"/></pattern><path id="isl-shape" d="${LG.d}"/></defs>
      <g transform="matrix(${sc} 0 0 ${sc} ${IX - vx * sc} ${IY - vy * sc})" stroke-linejoin="round" stroke-linecap="round">
      <use href="#isl-shape" class="c-halo" fill="#4F9BF7" stroke="#4F9BF7" stroke-width="${u(400)}"/>
      <use href="#isl-shape" fill="none" stroke="#fff" stroke-width="${u(270)}" stroke-dasharray="${u(60)} ${u(46)}" opacity=".8"/>
      <use href="#isl-shape" fill="none" stroke="#4F9BF7" stroke-width="${u(236)}"/>
      <use href="#isl-shape" fill="none" stroke="#111" stroke-width="${u(150)}"/>
      <use href="#isl-shape" fill="url(#isl-grass)" stroke="#FFE6C2" stroke-width="${u(130)}"/></g>`;
    const skin = $("#logo-skin");
    skin.style.cssText = `left:${IX}px;top:${IY}px;width:${IW}px;height:${IH}px`;

    // 1. find the land in the original art, at 1/10 scale
    const K = 10, W = Math.ceil(C.world[0] / K) + 2, H = Math.ceil(C.world[1] / K) + 2, N = W * H;
    const src = $$("#world-stage .layer-src-base img.tile"), srcFg = $$("#world-stage .layer-src-fg img.tile");
    await Promise.all(src.concat(srcFg).map(im => (im.decode ? im.decode() : Promise.resolve()).catch(() => {})));
    // districts are worked out once and remembered by the browser; later visits skip straight to step 3
    const names = Object.keys(L.seeds);
    const cacheKey = "dis_isl_v1_" + src.length + "_" + names.map(n => n + L.seeds[n].join(".")).join("_");
    let DIST = null;
    try { const c = JSON.parse(store.get(cacheKey) || "null"); if (Array.isArray(c) && c.length === names.length) DIST = c; } catch (e) {}
    const breath = () => new Promise(r => setTimeout(r, 0)); // let the page draw a frame between heavy steps
    if (!DIST) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    for (const im of src) g.drawImage(im, 1 + im.dataset.x / K, 1 + im.dataset.y / K, im.dataset.w / K, im.dataset.h / K);
    let px = null; try { px = g.getImageData(0, 0, W, H).data; } catch (e) {}
    const land = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!px) { land[i] = 1; continue; }   // pixels unreadable (opened as a file): treat everything as land
      const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2], a = px[i * 4 + 3];
      const sea = Math.abs(r - 10) < 34 && Math.abs(gg - 114) < 40 && Math.abs(b - 238) < 40, dot = Math.abs(r - 5) < 30 && Math.abs(gg - 72) < 34 && Math.abs(b - 154) < 36;
      land[i] = a > 110 && !sea && !dot ? 1 : 0;
    }
    for (let x = 0; x < W; x++) land[x] = land[N - 1 - x] = 0;
    for (let y = 0; y < H; y++) land[y * W] = land[y * W + W - 1] = 0;
    dropSmall(land, W, H, 1, 900); dropSmall(land, W, H, 0, 600);

    // 2. split it into districts round the seed points, with wobbly borders
    const seeds = names.map(n => [L.seeds[n][0] / K + 1, L.seeds[n][1] / K + 1]);
    const owner = new Int8Array(N).fill(-1);
    for (let y = 0; y < H; y++) { if (y % 48 === 0) await breath(); for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!land[i]) continue;
      const X = x + 11 * vnoise(x / 20, y / 20 + 3) + 3 * vnoise(x / 6 + 5, y / 6);
      const Y = y + 11 * vnoise(x / 20 + 7, y / 20) + 3 * vnoise(x / 6, y / 6 + 11);
      let best = 1e9, bi = 0;
      for (let k = 0; k < seeds.length; k++) { const d = (X - seeds[k][0]) ** 2 + (Y - seeds[k][1]) ** 2; if (d < best) { best = d; bi = k; } }
      owner[i] = bi;
    } }
    const nearestSeed = (wx, wy) => { let best = 1e9, bi = 0; seeds.forEach((s, k) => { const d = (wx / K + 1 - s[0]) ** 2 + (wy / K + 1 - s[1]) ** 2; if (d < best) { best = d; bi = k; } }); return bi; };
    const ownerAt = (wx, wy) => { const x = Math.round(wx / K + 1), y = Math.round(wy / K + 1); const o = x >= 0 && y >= 0 && x < W && y < H ? owner[y * W + x] : -1; return o >= 0 ? o : nearestSeed(wx, wy); };
    DIST = [];
    for (let k = 0; k < names.length; k++) {
      const n = names[k];
      if (k % 3 === 0) await breath();
      let m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = owner[i] === k ? 1 : 0;
      m = largestPiece(m, W, H);
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let i = 0; i < N; i++) if (m[i]) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const f = new Float32Array(N); for (let i = 0; i < N; i++) f[i] = m[i] ? -1 : 1;
      DIST.push({ name: n, d: pathFrom(contours(f, W, H), K, 20), box: [(x0 - 1) * K, (y0 - 1) * K, (x1 - x0 + 1) * K, (y1 - y0 + 1) * K] });
    }
    if (px) store.set(cacheKey, JSON.stringify(DIST));
    }

    // 3. lay them out inside the logo, one per grid cell, scaled to fill it
    const rows = L.grid.length, cols = L.grid[0].length, cw = IW / cols, ch = IH / rows;
    L.grid.forEach((row, r) => row.forEach((n, c) => {
      const dd = DIST[names.indexOf(n)]; if (!dd) return;
      const [bx, by, bw, bh] = dd.box;
      dd.s = Math.max(cw / bw, ch / bh) * L.overlap;
      dd.src = [bx + bw / 2, by + bh / 2];
      dd.dst = [IX + cw * (c + .5), IY + ch * (r + .5)];
      dd.about = L.about.includes(n);
    }));
    ISL._ready(); // the real map's places, pins, locals and camera frames stay exactly where they always were

    // 4. bake each district from the full-quality art, clipped to its own border and to the logo outline
    const R = L.bakeScale, all = src.concat(srcFg), host = $("#chunks");
    const idle = () => new Promise(r => window.requestIdleCallback ? requestIdleCallback(r, { timeout: 400 }) : setTimeout(r, 30));
    try {
      for (const row of L.grid) for (const n of row) {
        const dd = DIST[names.indexOf(n)]; if (!dd || !dd.s) continue;
        await idle();
        const [bx, by, bw, bh] = dd.box;
        const x0 = Math.max(IX, dd.dst[0] - bw * dd.s / 2), y0 = Math.max(IY, dd.dst[1] - bh * dd.s / 2);
        const x1 = Math.min(IX + IW, dd.dst[0] + bw * dd.s / 2), y1 = Math.min(IY + IH, dd.dst[1] + bh * dd.s / 2);
        if (x1 <= x0 || y1 <= y0) continue;
        const c2 = document.createElement("canvas"); c2.width = Math.ceil((x1 - x0) * R); c2.height = Math.ceil((y1 - y0) * R);
        const g2 = c2.getContext("2d");
        g2.setTransform(R, 0, 0, R, -x0 * R, -y0 * R);
        g2.clip(logoPath);
        g2.transform(dd.s, 0, 0, dd.s, dd.dst[0] - dd.src[0] * dd.s, dd.dst[1] - dd.src[1] * dd.s);
        g2.clip(new Path2D(dd.d));
        for (const im of all) {
          const tx = +im.dataset.x, ty = +im.dataset.y, tw = +im.dataset.w, th = +im.dataset.h;
          if (tx > bx + bw || tx + tw < bx || ty > by + bh || ty + th < by || !im.naturalWidth) continue;
          g2.drawImage(im, tx, ty, tw + 1, th + 1);
        }
        const blob = await new Promise(r => c2.toBlob(r, "image/webp", .9));
        if (!blob) throw new Error("bake refused");
        const img = h("img", { class: "chunk", alt: "", draggable: "false", decoding: "async" });
        img.style.cssText = `left:${x0.toFixed(0)}px;top:${y0.toFixed(0)}px;width:${(x1 - x0).toFixed(0)}px;height:${(y1 - y0).toFixed(0)}px`;
        img.src = URL.createObjectURL(blob);
        await (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
        host.appendChild(img);
        // where this piece lives on the real map: the same art, back at its original place and size
        const hx0 = dd.src[0] + (x0 - dd.dst[0]) / dd.s, hy0 = dd.src[1] + (y0 - dd.dst[1]) / dd.s;
        img.style.transformOrigin = "0 0";
        ISL.chunks.push({ el: img, home: `translate3d(${(hx0 - x0).toFixed(1)}px,${(hy0 - y0).toFixed(1)}px,0) scale(${(1 / dd.s).toFixed(4)})` });
      }
    } catch (e) {
      console.warn("Logo island: could not bake the art (open the site through start.bat, not as a file).", e);
    }
    ISL._baked();
  }

  /* ---------------- the full experience (optional) ----------------
     Only when someone clicks "View full experience": the page goes fullscreen, asks for the camera, and tracks the
     viewer's head with MediaPipe's face landmarker (loaded only then, from jsDelivr / Google's model host). The head
     position moves the perspective's vanishing point (an off-axis view, like looking through a window): far layers
     drift with you, near ones the other way, and leaning in deepens it. The video never leaves the device.
     Camera refused or unavailable: the mouse drives the same effect. Everyone else gets the normal flat site. */
  const FX = { on: false, mode: null, ox: .5, oy: .5, p: 1100, tox: .5, toy: .5, tp: 1100, base: 0, frames: 0, stream: null, lm: null, raf: 0, lastT: -1 };
  const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
  function fxProject(p, z) { // a point drawn at height z above the map, as seen from the moved viewpoint
    const ox = FX.ox * innerWidth, oy = FX.oy * innerHeight, f = FX.p / (FX.p - z);
    p.x = ox + (p.x - ox) * f; p.y = oy + (p.y - oy) * f;
  }
  function fxApply(now) {
    // smoothing that feels the same at 60, 120 or 144 Hz: eases to the head position in about a third of a second
    const dt = FX.lastFrame ? Math.min(.1, (now - FX.lastFrame) / 1000) : 1 / 60; FX.lastFrame = now;
    const k = 1 - Math.exp(-dt * 11);
    FX.ox += (FX.tox - FX.ox) * k; FX.oy += (FX.toy - FX.oy) * k; FX.p += (FX.tp - FX.p) * k;
    // like a window: lean left and you see further to the right, lean up and you see further down
    const hx = (FX.ox - .5) / .42, hy = (FX.oy - .5) / .34, lean = (1100 - FX.p) / 520; // lean: + when closer
    let sky = null;
    if (S.scene === "world") {
      // the camera itself slides opposite to your head (labels and pins follow, since they use the same camera)
      const ox = hx * innerWidth * .3, oy = hy * innerHeight * .26;
      if (Math.abs(ox - world.ox) > .3 || Math.abs(oy - world.oy) > .3) { world.ox = ox; world.oy = oy; world.apply(); }
    } else {
      // space: the far sky slides with you more than the near stars, so the planet floats in front of them
      const s = (f) => `translate(${(hx * innerWidth * f).toFixed(1)}px,${(hy * innerHeight * f).toFixed(1)}px) scale(${(1 + lean * f).toFixed(4)})`;
      sky = [s(.14), s(.09), s(.05)];
    }
    const key = sky ? sky.join() : "";
    if (key === FX.lastKey) return; // nothing moved: write nothing
    FX.lastKey = key;
    const bg = $("#space-stage .space-bg"), far = $("#par-far"), near = $("#par-near");
    if (bg) bg.style.transform = sky ? sky[0] : "";
    if (far) far.style.transform = sky ? sky[1] : "";
    if (near) near.style.transform = sky ? sky[2] : "";
  }
  function fxTarget(hx, hy, hz) { // hx, hy: -1..1 (right, down); hz: + leaning in
    hx = Math.max(-1.2, Math.min(1.2, hx)); hy = Math.max(-1.2, Math.min(1.2, hy));
    FX.tox = .5 + hx * .42; FX.toy = .5 + hy * .34; FX.tp = Math.max(620, Math.min(1500, 1100 - hz * 520));
  }
  function fxLoop(now) {
    if (!FX.on) return;
    FX.raf = requestAnimationFrame(fxLoop);
    const v = $("#fx-video");
    if (FX.mode === "camera" && FX.lm && v.readyState >= 2 && v.currentTime !== FX.lastT && now - (FX.lastDetect || 0) > 30) {
      FX.lastT = v.currentTime; FX.lastDetect = now;
      let res = null; try { res = FX.lm.detectForVideo(v, performance.now()); } catch (e) {}
      const lm = res && res.faceLandmarks && res.faceLandmarks[0];
      if (lm && lm[468] && lm[473]) {
        const mx = (lm[468].x + lm[473].x) / 2, my = (lm[468].y + lm[473].y) / 2;
        const dist = Math.hypot(lm[468].x - lm[473].x, lm[468].y - lm[473].y);
        if (FX.frames < 30) { FX.base = FX.base ? FX.base * .9 + dist * .1 : dist; FX.frames++; } // learn the resting distance
        fxTarget((.5 - mx) * 2.4, (my - .5) * 2.4, FX.base ? (dist - FX.base) / FX.base * 2.2 : 0);
      }
    }
    fxApply(now);
  }
  function fxMouse(e) { if (FX.on && FX.mode === "mouse") fxTarget((e.clientX / innerWidth - .5) * 2, (e.clientY / innerHeight - .5) * 2, 0); }
  async function startFX() {
    if (FX.on) return;
    try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
    FX.on = true; FX.frames = 0; FX.base = 0;
    document.body.classList.add("fx");
    $("#par-far").style.transform = ""; $("#par-near").style.transform = "";
    const panel = $("#fx-panel"), note = $("#fx-note");
    panel.hidden = false; $("#fx-title").textContent = T.fx.loading; note.textContent = T.fx.privacy;
    $("#fx-btn").setAttribute("aria-pressed", "true");
    $("#fx-btn .fx-label").textContent = T.fx.exit; $("#fx-btn").setAttribute("aria-label", T.fx.exit);
    cancelAnimationFrame(FX.raf); FX.raf = requestAnimationFrame(fxLoop);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("no camera API");
      FX.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (!FX.on) return stopStream();
      const v = $("#fx-video"); v.srcObject = FX.stream; await v.play().catch(() => {});
      if (!FX.lm) {
        const vision = await import(MP + "/vision_bundle.mjs");
        const files = await vision.FilesetResolver.forVisionTasks(MP + "/wasm");
        FX.lm = await vision.FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" }, runningMode: "VIDEO", numFaces: 1 });
      }
      if (!FX.on) return stopStream();
      FX.mode = "camera"; panel.classList.add("cam");
      $("#fx-title").textContent = T.fx.on;
    } catch (e) {
      console.warn("Full experience: camera unavailable, using the mouse.", e);
      stopStream();
      if (!FX.on) return;
      FX.mode = "mouse"; panel.classList.remove("cam");
      $("#fx-title").textContent = T.fx.mouse; note.textContent = T.fx.denied;
    }
  }
  function stopStream() { if (FX.stream) { FX.stream.getTracks().forEach(t => t.stop()); FX.stream = null; } const v = $("#fx-video"); if (v) v.srcObject = null; }
  function stopFX() {
    if (!FX.on) return;
    FX.on = false; FX.mode = null; cancelAnimationFrame(FX.raf); stopStream();
    document.body.classList.remove("fx");
    FX.lastKey = ""; FX.lastFrame = 0;
    if (world && (world.ox || world.oy)) { world.ox = world.oy = 0; world.apply(); }
    ["#space-stage .space-bg", "#par-far", "#par-near"].forEach(s => { const el = $(s); if (el) el.style.transform = ""; });
    FX.ox = FX.oy = FX.tox = FX.toy = .5; FX.p = FX.tp = 1100;
    $("#fx-panel").hidden = true; $("#fx-panel").classList.remove("cam");
    $("#fx-btn").setAttribute("aria-pressed", "false");
    $("#fx-btn .fx-label").textContent = T.fx.button; $("#fx-btn").setAttribute("aria-label", T.fx.button);
    try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
    scheduleOverlay();
  }
  function wireFX() {
    const b = $("#fx-btn"); if (!b) return;
    b.querySelector(".fx-label").textContent = T.fx.button;
    $("#fx-exit").textContent = T.fx.exit;
    b.onclick = () => (FX.on ? stopFX() : startFX());
    $("#fx-exit").onclick = stopFX;
    window.addEventListener("pointermove", fxMouse, { passive: true });
    document.addEventListener("visibilitychange", () => { if (document.hidden && FX.on) stopFX(); });
  }

  /* ---------------- overlay: labels + pins ---------------- */
  const OV = [];
  const PIN_SVG = `<svg viewBox="0 0 40 48" width="40" height="48" aria-hidden="true"><path class="pin-b" d="M20 2C10 2 2 9.6 2 19.5 2 28 8 35 16 36.6L20 46l4-9.4C32 35 38 28 38 19.5 38 9.6 30 2 20 2Z" fill="#fff" stroke="#111" stroke-width="2.2" stroke-linejoin="round"/><circle cx="20" cy="11.5" r="2.6" fill="#FF52CC"/><path d="M20 17v12" stroke="#111" stroke-width="3.6" stroke-linecap="round"/></svg>`;
  function buildOverlay() {
    const ov = $("#labels"); ov.innerHTML = ""; OV.length = 0;
    const add = (el, wx, wy, show, anchor = "c") => { ov.appendChild(el); OV.push({ el, wx, wy, show, anchor }); };
    for (const k of ISLANDS) {
      const g = T.gate[k], I = C.islands[k];
      const b = h("button", { class: `map-label island-label il-${k}`, type: "button" }, `<span>${g.label}</span><small>${g.line}</small>`);
      b.onclick = () => go(`#/${k}`);
      add(b, I.label[0], I.label[1], "islands");
    }
    C.districts.forEach(d => {
      const p = P[d.id];
      const b = h("button", { class: `map-label${d.island === "about" ? " about-label" : ""}`, type: "button" }, `<span>${p.landmark}</span><small>${p.plain}</small>`);
      b.onclick = () => go(placeHash(d.id));
      add(b, d.label[0], d.label[1], d.island);
      const pin = h("button", { class: "pin", type: "button", "aria-label": `About ${p.landmark}` }, PIN_SVG);
      pin.onclick = e => { e.stopPropagation(); showPop(pin, d.id); };
      add(pin, d.pin[0], d.pin[1], `${d.island}-pin`, "b");
    });
    if (C.ferry) add(h("span", { class: "map-label small" }, `<span>${T.ferry.name}</span><small>Click it for a ride</small>`), C.ferry.label[0], C.ferry.label[1], "islands");
    const dp = h("button", { class: "map-label island-label planet-label", type: "button" }, `<span>${T.system.doitsilly.name}</span><small>${T.system.doitsilly.line}</small>`);
    dp.onclick = openPick; add(dp, DIS_PLANET[0], DIS_PLANET[1] + 220, "space");
    const hit = h("button", { class: "planet-hit", type: "button", "aria-label": "DOITSILLY planet: pick a side" }); hit.onclick = openPick; add(hit, DIS_PLANET[0], DIS_PLANET[1], "space-hit");
  }
  function layoutOverlay() {
    const inSpace = S.scene === "space", cam = inSpace ? space : world;
    const z = cam.s / fitS, vw = innerWidth, vh = innerHeight;
    for (const o of OV) {
      let vis = false;
      if (S.page) vis = false;
      else if (inSpace) vis = (o.show === "space" && !PK.open) || o.show === "space-hit";
      else if (!S.transitioning && ISL.morphed) {
        if (o.show === "islands") vis = z < 1.15;
        else for (const k of ISLANDS) if (o.show === k || o.show === `${k}-pin`) vis = z >= 1.15 && S.level === k;
        if (S.place && o.show.endsWith("-pin")) vis = false;
      }
      if (!vis) { o.el.hidden = true; continue; }
      const p = cam.project(o.wx, o.wy);
      if (p.x < -200 || p.y < -100 || p.x > vw + 200 || p.y > vh + 100) { o.el.hidden = true; continue; }
      o.el.hidden = false;
      if (o.show === "space-hit") { const d = 300 * cam.s; o.el.style.width = o.el.style.height = d + "px"; }
      o.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,${o.anchor === "b" ? "-100%" : "-50%"})`;
    }
    layoutSay();
    layoutPick();
    layoutToken();
  }

  /* ---------------- ferry ---------------- */
  function runFerry() {
    const el = $("#ferry"); if (!el) return;
    const F = C.ferry, a = F.a, b = F.b, dur = F.dur * 1000, w = F.w;
    const place = (x, y, flip) => { el.style.transform = `translate(${x - w / 2}px,${y - w * .45}px) scaleX(${flip ? -1 : 1})`; };
    if (REDUCE) { place(a[0], a[1], false); return; }
    const t0 = performance.now();
    const step = now => {
      requestAnimationFrame(step);
      if (S.scene !== "world" || S.page) return;
      const t = ((now - t0) % dur) / dur; let k, flip;
      if (t < .1) { k = 0; flip = false; } else if (t < .45) { k = ease((t - .1) / .35); flip = false; }
      else if (t < .55) { k = 1; flip = true; } else if (t < .9) { k = 1 - ease((t - .55) / .35); flip = true; } else { k = 0; flip = false; }
      place(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k + Math.sin(now / 500) * 4, flip);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- level / chrome ---------------- */
  function computeLevel() {
    if (S.scene === "space") return "system";
    if (world.s / fitS < 1.15) return "islands";
    const c = world.toWorld(world.vw / 2, world.vh / 2);
    const d = r => Math.hypot(c.x - (r[0] + r[2] / 2), c.y - (r[1] + r[3] / 2));
    return ISLANDS.reduce((best, k) => d(C.islands[k].rect) < d(C.islands[best].rect) ? k : best, ISLANDS[0]);
  }
  function onCamChange() {
    if (world && S.scene === "world") { const m = v => ((v % 40) + 40) % 40; seaDots().style.transform = `translate(${m(world.tx + world.ox).toFixed(1)}px,${m(world.ty + world.oy).toFixed(1)}px)`; }
    const lv = computeLevel();
    if (lv !== S.level) { S.level = lv; updateChrome(); if (!S.place && !S.routing && !S.transitioning && !S.page) setHash(lv === "system" ? "#/system" : "#/" + lv); }
    scheduleOverlay();
  }
  let ovRaf = 0; function scheduleOverlay() { if (!ovRaf) ovRaf = requestAnimationFrame(() => { ovRaf = 0; layoutOverlay(); }); }
  let _dots; const seaDots = () => _dots || (_dots = $("#sea-dots"));

  function updateChrome() {
    const trail = [["Space", "#/system"]];
    if (S.level !== "system") trail.push(["Both islands", "#/islands"]);
    const isl = S.place ? D(S.place).island : ISLANDS.includes(S.level) ? S.level : null;
    if (isl) trail.push([T.gate[isl].label, `#/${isl}`]);
    if (S.place) trail.push([P[S.place].landmark, placeHash(S.place)]);
    $("#trail").innerHTML = trail.map((t, i) => i === trail.length - 1 ? `<span aria-current="location">${t[0]}</span>` : `<a href="${t[1]}">${t[0]}</a><span aria-hidden="true">›</span>`).join("");
    const hint = S.place || PK.open ? "" : T.hints[S.level] || "";
    const hb = $("#hint"); hb.hidden = !hint || S.tour >= 0; hb.querySelector("span").textContent = hint;
    $("#tour-start").hidden = S.level !== "studio" || !!S.place;
    const met = metSet(), hi = $("#hi");
    hi.hidden = S.scene !== "world" || S.level === "islands" || !!S.place || met.size === 0;
    hi.textContent = T.hi.replace("{n}", met.size).replace("{m}", TYPES.length);
    document.body.dataset.level = S.level;
  }

  /* ---------------- scene transitions ---------------- */
  const islandsTarget = () => world.fit(C.islandsFit, .02);
  function panelArea() {
    if (isMobile()) return { x: 0, y: 70, w: innerWidth, h: innerHeight * .34 };
    const pw = Math.min(660, innerWidth * .5) + 32; return { x: pw, y: 70, w: innerWidth - pw, h: innerHeight - 90 };
  }
  async function enterWorld(target) {
    if (S.scene === "world") return world.to(target, 1000);
    S.transitioning = true; S.busy = true; closePop(); hideSay();
    const lp = DIS_PLANET;
    const zoomIn = { s: 6, tx: space.vw / 2 - lp[0] * 6, ty: space.vh / 2 - lp[1] * 6 };
    const from = islandsTarget(); const cx = world.vw / 2, cy = world.vh / 2;
    world.set({ s: from.s * .32, tx: cx - (cx - from.tx) * .32, ty: cy - (cy - from.ty) * .32 }, false);
    document.body.classList.add("zooming");
    const p1 = space.to(zoomIn, REDUCE ? 0 : 1300, false);
    await sleep(REDUCE ? 0 : 650);
    $("#world").classList.add("on"); $("#space").classList.add("off");
    S.scene = "world";
    await world.to(target, REDUCE ? 0 : 1100, false);
    await p1;
    document.body.classList.remove("zooming"); S.transitioning = false; S.busy = false;
    world.set(target); onCamChange(); updateChrome();
    ISL.reveal(S.level !== "islands");
  }
  const spaceHome = () => space.fit([60, 40, 1500, 960], .02);
  async function enterSpace() {
    if (S.scene === "space") return space.to(spaceHome(), 900);
    S.transitioning = true; S.busy = true; closePanel(true); closePop(); endTour(); hideSay();
    const cx = world.vw / 2, cy = world.vh / 2, s = world.s * .3;
    const p1 = world.to({ s, tx: cx - (cx - world.tx) * .3, ty: cy - (cy - world.ty) * .3 }, REDUCE ? 0 : 900, false);
    space.set({ s: 6, tx: space.vw / 2 - DIS_PLANET[0] * 6, ty: space.vh / 2 - DIS_PLANET[1] * 6 }, false);
    await sleep(REDUCE ? 0 : 350);
    $("#world").classList.remove("on"); $("#space").classList.remove("off"); S.scene = "space";
    await space.to(spaceHome(), REDUCE ? 0 : 1200, false);
    await p1; S.transitioning = false; S.busy = false; onCamChange(); updateChrome();
  }

  /* ---------------- routing ---------------- */
  function setHash(hs) { if (location.hash !== hs) history.replaceState(null, "", hs); }
  function go(hs) { if (location.hash === hs) route(); else location.hash = hs; }
  // one move at a time: a click that arrives mid-move waits, then the latest address wins
  let routeBusy = false, routeAgain = false;
  async function route() {
    if (routeBusy) { routeAgain = true; return; }
    routeBusy = true;
    try { await routeOnce(); }
    catch (e) { console.error("Route:", e); S.transitioning = false; S.busy = false; document.body.classList.remove("zooming"); }
    finally { routeBusy = false; S.routing = false; }
    if (routeAgain) { routeAgain = false; route(); }
  }
  async function routeOnce() {
    if (location.hash === "#/studio/about") history.replaceState(null, "", "#/about/story"); // old address
    const parts = (location.hash || "#/").replace(/^#\/?/, "").split("/").filter(Boolean);
    S.routing = true; hideSay();
    closeOverlay("#list"); closeOverlay("#notfound"); if (S.menuOpen) toggleMenu(false);
    const [a, b] = parts;
    if (a && !["system", "community", "list"].includes(a)) await ISL.ready; // the island's layout decides where everything is
    if (a !== "community") { hideCommunity(); clearWipe(); }
    if (PK.open) closePick(true);
    PK.dropping = false;
    if (!a || a === "system") { closePanel(true); await enterSpace(); }
    else if (a === "islands") { closePanel(true); await enterWorld(islandsTarget()); }
    else if (ISLANDS.includes(a) && !b) { closePanel(true); await enterWorld(world.fit(C.islands[a].rect, .04)); }
    else if (ISLANDS.includes(a) && P[b] && D(b) && D(b).island === a) { await openPlace(b); }
    else if (a === "community" && !b) { showCommunity(); }
    else if (a === "list") { openOverlay("#list"); }
    else openOverlay("#notfound");
    S.routing = false; S.level = computeLevel(); updateChrome(); scheduleOverlay();
  }

  /* ---------------- places ---------------- */
  async function openPlace(id) {
    const d = D(id);
    S.place = id; closePop();
    renderPanel(id);
    const panel = $("#panel"); panel.hidden = false; requestAnimationFrame(() => panel.classList.add("open"));
    updateChrome();
    await enterWorld(world.fit(d.rect, .02, panelArea()));
    $("#panel-title") && $("#panel-title").focus({ preventScroll: true });
  }
  function closePanel(silent) {
    if (!S.place) return;
    const isl = D(S.place).island;
    const panel = $("#panel"); panel.classList.remove("open"); setTimeout(() => { if (!S.place) panel.hidden = true; }, 300);
    S.place = null; updateChrome();
    if (!silent) go(`#/${isl}`);
  }

  const chip = (t, on, attr = "") => `<button type="button" class="chip" aria-pressed="${on ? "true" : "false"}" ${attr}>${t}</button>`;
  function renderPanel(id) {
    const p = P[id], body = $("#panel-body");
    let html = `<p class="kicker">${p.landmark} · ${p.plain}</p><h1 id="panel-title" tabindex="-1">${p.hero}</h1><p class="lead">${p.intro}</p>`;
    if (p.type === "service") {
      html += `<div class="row"><a class="btn pink" href="#/studio/contact">Start a ${p.plain} project</a><a class="btn" href="#/studio/work">See ${p.plain} work</a></div>
      <h2>What we make</h2><table class="deliv"><thead><tr><th scope="col">Deliverable</th><th scope="col">In one line</th></tr></thead><tbody>${p.deliverables.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</tbody></table>
      <h2>How it works</h2><ol class="steps">${p.steps.map(s => `<li><b>${s[0]}:</b> ${s[1]}</li>`).join("")}</ol>
      <div class="duo"><div class="card"><h3>How we show up</h3><p>${p.showUp}</p><a href="#/about/modes">About our four modes</a></div><div class="card alt"><h3>Made with the Community</h3><p>${p.madeWith}</p><a href="#/community">See how collabs work</a></div></div>
      <h2>Proof from this department</h2><div class="cases">${[1, 2].map(() => `<a class="case" href="#/studio/work"><span class="thumb t-${id}">${A.sprites.scribble}</span><small>${p.plain}</small><b>[CLIENT]</b><span>[One-line outcome]</span></a>`).join("")}</div>
      <h2>Questions</h2>${p.faq.map(q => `<details><summary>${q[0]}</summary><p>${q[1]}</p></details>`).join("")}
      <div class="cta"><h2>Got a messy idea in this department?</h2><p>Half-formed is fine. That's our favourite kind.</p><a class="btn pink" href="#/studio/contact">Start a ${p.plain} project</a></div>`;
    } else if (p.type === "work") {
      html += `<div class="chips" role="group" aria-label="Filter by service">${p.services.map((s, i) => chip(s, i === 0, `data-f="${s}"`)).join("")}</div>
      <div class="cases" id="cases">${p.cases.map(c => `<a class="case" href="#/studio/work" data-s="${c.service}"><span class="thumb t-${c.service.toLowerCase()}">${A.sprites.scribble}</span><small>${c.service} · ${c.sector}</small><b>${c.client}</b><span>${c.outcome}</span></a>`).join("")}</div>
      <p class="empty" hidden>${p.empty} <a href="#/studio/contact">Start a project</a></p>
      <div class="cta"><h2>${p.cta[0]}</h2><p>${p.cta[1]}</p><a class="btn pink" href="#/studio/contact">Start a project</a></div>`;
    } else if (p.type === "story") {
      html += p.story.map(s => `<h2>${s[0]}</h2>${s[1].map(t => `<p${t === "Until you DO IT SILLY." ? ' class="big"' : ""}>${t}</p>`).join("")}`).join("");
    } else if (p.type === "modes") {
      html += `<div class="modes">${p.modes.map(m => `<div class="card"><h3>${m[0]}</h3><p>${m[1]}</p></div>`).join("")}</div><p class="big">${p.modesClose}</p>
      <div class="row"><a class="btn pink" href="#/studio/contact">Start a project</a><a class="btn" href="#/studio">Explore the studio</a></div>`;
    } else if (p.type === "who") {
      html += `<ol class="steps">${p.who.map(w => `<li><b>${w[0]}.</b> ${w[1]}</li>`).join("")}</ol><p>${p.whoClose}</p>
      <h2>What we're like</h2><div class="chips static">${p.personality.map(t => `<span class="chip">${t}</span>`).join("")}</div>`;
    } else if (p.type === "team") {
      html += `<div class="team">${p.team.map(m => `<div class="card"><span class="thumb t-about">${A.sprites.scribble}</span><b>${m[0]}</b><small>${m[1]}</small><p>${m[2]}</p></div>`).join("")}</div>
      <h2>${p.whereHeading}</h2><p>${p.where}</p><div class="row"><a class="btn" href="#/community">Meet the people behind the wall</a><a class="btn pink" href="#/studio/contact">Start a project</a></div>`;
    } else if (p.type === "contact") {
      html += `<form id="brief" novalidate>
        <div class="grid2"><label>Your name<input name="name" required placeholder="What should we call you?" autocomplete="name"><em class="err"></em></label>
        <label>Email<input name="email" type="email" required placeholder="We'll reply here" autocomplete="email"><em class="err"></em></label></div>
        <label>Company or project<input name="company" placeholder="It's fine if it doesn't have a name yet"></label>
        <fieldset><legend>What do you need?</legend><div class="chips">${p.needs.map(n => chip(n, false, `data-need="${n}"`)).join("")}</div></fieldset>
        <div class="grid2"><label>Rough budget<select name="budget"><option value="">Pick one</option>${p.budgets.map(b => `<option>${b}</option>`).join("")}</select></label>
        <label>When do you need it?<select name="timeline"><option value="">Pick one</option>${p.timelines.map(b => `<option>${b}</option>`).join("")}</select></label></div>
        <label>Tell us the messy version<textarea name="brief" rows="5" required placeholder="What are you making, who's it for, and what's keeping you up at night?"></textarea><em class="err"></em></label>
        <div class="row"><button class="btn pink" type="submit">Stamp it and send</button><small>${p.privacy}</small></div><p class="form-err" role="alert" hidden></p></form>
        <div class="success" hidden role="status"></div>
        <div class="card"><h3>What happens next</h3><ol class="steps">${p.nextSteps.map(s => `<li>${s}</li>`).join("")}</ol></div>
        <div class="card alt"><h3>Prefer talking?</h3><p>${p.talk}</p></div>`;
    }
    const n = P[p.next]; html += `<a class="next" href="${placeHash(p.next)}">Next stop: ${n.landmark}</a>`;
    body.innerHTML = html; body.scrollTop = 0;
    $("#panel-kick").textContent = `${T.gate[D(id).island].label} · ${p.landmark}`;
    wirePanel(p);
  }
  function wirePanel(p) {
    const body = $("#panel-body");
    if (p.type === "work") body.querySelectorAll("[data-f]").forEach(b => b.onclick = () => {
      body.querySelectorAll("[data-f]").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      let n = 0; body.querySelectorAll("#cases .case").forEach(c => { const on = b.dataset.f === "All" || c.dataset.s === b.dataset.f; c.hidden = !on; n += on; });
      body.querySelector(".empty").hidden = n > 0;
    });
    if (p.type === "contact") {
      body.querySelectorAll("[data-need]").forEach(b => b.onclick = () => b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"));
      const f = $("#brief");
      f.onsubmit = async e => {
        e.preventDefault(); let ok = true;
        f.querySelectorAll("[required]").forEach(i => {
          const err = i.parentElement.querySelector(".err"); let m = "";
          if (!i.value.trim()) m = T.errors.required; else if (i.type === "email" && !/^\S+@\S+\.\S+$/.test(i.value)) m = T.errors.email;
          err.textContent = m; i.setAttribute("aria-invalid", m ? "true" : "false"); if (m) ok = false;
        });
        if (!ok) { f.querySelector("[aria-invalid=true]").focus(); return; }
        const data = Object.fromEntries(new FormData(f)); data.needs = [...f.querySelectorAll("[data-need][aria-pressed=true]")].map(b => b.dataset.need);
        if (C.formEndpoint) {
          try { const r = await fetch(C.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!r.ok) throw 0; }
          catch (_) { const fe = f.querySelector(".form-err"); fe.textContent = T.errors.sendFailed; fe.hidden = false; return; }
        }
        const s = body.querySelector(".success"), [t1, t2] = p.success;
        s.innerHTML = `<h2>${t1}</h2><p>${esc(t2).replace("{name}", esc(data.name)).replace("{email}", esc(data.email))}</p><div class="row"><a class="btn" href="#/studio/work">See our work</a><a class="btn" href="#/studio">Back to the map</a></div>`;
        f.hidden = true; s.hidden = false; s.setAttribute("tabindex", "-1"); s.focus();
      };
    }
  }

  /* ---------------- info popover ---------------- */
  function showPop(pin, id) {
    const pop = $("#pop"), p = P[id], r = pin.getBoundingClientRect(); hideSay();
    pop.innerHTML = `<b>${p.landmark}</b><small>${p.plain}</small><p>${p.oneliner}</p><a class="btn pink" href="${placeHash(id)}">Go in</a>`;
    pop.hidden = false;
    const x = Math.min(innerWidth - 270, Math.max(10, r.left + r.width / 2 - 130)), y = Math.max(80, r.top - pop.offsetHeight - 8);
    pop.style.left = x + "px"; pop.style.top = y + "px"; pop.querySelector("a").focus();
  }
  function closePop() { $("#pop").hidden = true; }

  /* ---------------- tour ---------------- */
  async function tourGo(i) {
    S.tour = i; hideSay(); const step = T.tour[i], card = $("#tour");
    card.hidden = false; $("#hint").hidden = true;
    card.querySelector("p").textContent = step.text;
    card.querySelector(".tour-n").textContent = `Stop ${i + 1} of ${T.tour.length}`;
    $("#tour-prev").disabled = i === 0;
    $("#tour-next").textContent = i === T.tour.length - 1 ? "Finish" : "Next stop";
    if (step.id) { const d = D(step.id); await world.to(world.fit(d.rect, .1, { x: 0, y: 70, w: innerWidth, h: innerHeight - 220 }), 1000); }
    else await world.to(world.fit(C.islands.studio.rect, .04), 900);
  }
  function endTour() { if (S.tour < 0) return; S.tour = -1; $("#tour").hidden = true; updateChrome(); }

  /* ---------------- overlays ---------------- */
  function openOverlay(sel) { const o = $(sel); o.hidden = false; o.querySelector("h1,h2,a,button").focus(); }
  function closeOverlay(sel) { $(sel).hidden = true; }
  function toggleMenu(force) {
    S.menuOpen = force ?? !S.menuOpen; $("#menu").hidden = !S.menuOpen; if (S.menuOpen) { hideSay(); closePick(); } scheduleOverlay();
    $("#menu-btn").setAttribute("aria-expanded", S.menuOpen); $("#menu-btn").firstChild.textContent = S.menuOpen ? "CLOSE " : "MENU "; $("#menu-btn span").textContent = S.menuOpen ? "×" : "=";
    if (S.menuOpen) $("#menu a").focus(); else $("#menu-btn").focus();
  }
  function buildMenu() {
    const on = k => Object.keys(P).filter(id => D(id) && D(id).island === k);
    const item = k => `<li><a href="${placeHash(k)}">${P[k].plain}<small>${P[k].landmark}</small></a></li>`;
    $("#menu-studio").innerHTML = `<li><a href="#/studio">Studio map<small>DOITSILLY Island</small></a></li>` + on("studio").map(item).join("");
    $("#menu-about").innerHTML = `<li><a href="#/about">Island map<small>About Us Island</small></a></li>` + on("about").map(item).join("");
    $("#menu-else").innerHTML = `<li><a href="#/system">Space<small>Zoom all the way out</small></a></li><li><a href="#/islands">Both islands<small>Studio and About Us</small></a></li><li><a href="#/list">See everything as a list<small>No map</small></a></li>` +
      T.social.map(s => `<li><a href="${s[1].startsWith("[") ? "#/list" : s[1]}" rel="noopener">${s[0]}</a></li>`).join("");
    const li = k => `<li><a href="${placeHash(k)}">${P[k].plain}: ${P[k].landmark}</a> <span>${P[k].oneliner}</span></li>`;
    $("#list-studio").innerHTML = `<li><a href="#/studio">DOITSILLY Island (Studio map)</a></li>` + on("studio").map(li).join("");
    $("#list-about").innerHTML = `<li><a href="#/about">About Us Island (map)</a></li>` + on("about").map(li).join("");
    $("#menu").addEventListener("click", e => { if (e.target.closest("a")) toggleMenu(false); });
  }

  /* ---------------- input ---------------- */
  function wireInput() {
    const view = $("#world"), ptrs = new Map(); let drag = null, pinch = null;
    view.addEventListener("pointerdown", e => {
      if (S.busy || e.target.closest("button,a")) return;
      view.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, tx: world.tx, ty: world.ty, moved: false };
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: world.s }; drag = null; }
    });
    view.addEventListener("pointermove", e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); world.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.s * d / pinch.d) / world.s, fitS * .8, C.maxScale); return; }
      if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return; drag.moved = true; view.classList.add("grabbing");
      world.stop();
      world.set({ s: world.s, tx: drag.tx + dx, ty: drag.ty + dy });
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); view.classList.remove("grabbing");
      if (ptrs.size < 2) pinch = null;
      if (drag && !drag.moved && ptrs.size === 0) clickWorld(e.clientX, e.clientY);
      if (ptrs.size === 0) drag = null;
    };
    view.addEventListener("pointerup", up); view.addEventListener("pointercancel", up);
    window.addEventListener("wheel", e => {
      if (e.target.closest(".panel,.menu,.sheet,.pop,.tour,.loader,.cpage")) return;
      e.preventDefault(); if (S.busy || S.page) return;
      if (S.scene === "space") { if (e.deltaY < -20) openPick(); return; }
      const f = Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0016));
      if (f < 1 && world.s <= fitS * .81) { S.outPressure += -e.deltaY; if (S.outPressure < -260) { S.outPressure = 0; go("#/system"); } return; }
      S.outPressure = 0; world.zoomAt(e.clientX, e.clientY, f, fitS * .8, C.maxScale);
    }, { passive: false });
    view.addEventListener("keydown", e => {
      const k = e.key, step = 80;
      if (k.startsWith("Arrow")) { e.preventDefault(); world.set({ s: world.s, tx: world.tx + (k === "ArrowLeft" ? step : k === "ArrowRight" ? -step : 0), ty: world.ty + (k === "ArrowUp" ? step : k === "ArrowDown" ? -step : 0) }); }
    });
    // space: wishes + a little parallax on the stars
    const sp = $("#space");
    sp.addEventListener("click", makeWish);
    if (!REDUCE) {
      let par = null, parRaf = 0;
      const far = $("#par-far"), near = $("#par-near");
      sp.addEventListener("pointermove", e => {
        if (FX.on) return; // the full experience moves the stars itself
        par = [e.clientX / innerWidth - .5, e.clientY / innerHeight - .5];
        if (!parRaf) parRaf = requestAnimationFrame(() => {
          parRaf = 0; const [mx, my] = par;
          far.style.transform = `translate(${(-mx * 10).toFixed(1)}px,${(-my * 10).toFixed(1)}px)`;
          near.style.transform = `translate(${(-mx * 26).toFixed(1)}px,${(-my * 26).toFixed(1)}px)`;
        });
      });
    }
    const sayEl = $("#say");
    sayEl.addEventListener("mouseenter", () => clearTimeout(say.t)); sayEl.addEventListener("mouseleave", armSay);
    sayEl.addEventListener("click", e => { if (e.target.closest("a")) hideSay(); });
    $("#zoom-in").onclick = () => { if (S.scene === "space") return openPick(); world.to({ ...zoomCenter(1.6) }, 450); };
    $("#zoom-out").onclick = () => { if (S.scene === "space") return closePick(); if (world.s <= fitS * 1.02) return go("#/system"); if (S.place) closePanel(); world.to({ ...zoomCenter(1 / 1.6) }, 450); };
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { if (S.say) hideSay(); else if (PK.open) { closePick(); $(".planet-hit").focus(); } else if (!$("#pop").hidden) closePop(); else if (S.menuOpen) toggleMenu(false); else if (!$("#list").hidden) go("#/islands"); else if (S.tour >= 0) endTour(); else if (S.place) closePanel(); }
      if ((e.key === "+" || e.key === "=") && e.target === document.body) $("#zoom-in").click();
      if (e.key === "-" && e.target === document.body) $("#zoom-out").click();
    });
    document.addEventListener("click", e => { if (!$("#pop").hidden && !e.target.closest("#pop,.pin")) closePop(); });
    $("#menu-btn").onclick = () => toggleMenu();
    $("#panel-close").onclick = () => closePanel();
    $("#tour-start").onclick = () => tourGo(0);
    $("#tour-next").onclick = () => S.tour >= T.tour.length - 1 ? endTour() : tourGo(S.tour + 1);
    $("#tour-prev").onclick = () => S.tour > 0 && tourGo(S.tour - 1);
    $("#tour-end").onclick = endTour;
    window.addEventListener("resize", () => { fitS = islandsTarget().s; world.set({ s: world.s, tx: world.tx, ty: world.ty }); space.set(S.scene === "space" && !S.transitioning ? spaceHome() : { s: space.s, tx: space.tx, ty: space.ty }, false); scheduleOverlay(); });
    window.addEventListener("hashchange", route);
    wireFX();
  }
  function zoomCenter(f) { const cx = world.vw / 2, cy = world.vh / 2, s = Math.min(C.maxScale, Math.max(fitS * .8, world.s * f)), k = s / world.s; return { s, tx: cx - (cx - world.tx) * k, ty: cy - (cy - world.ty) * k }; }
  function clickWorld(mx, my) {
    const hit = document.elementFromPoint(mx, my);
    const ferry = hit && hit.closest(".ferry"), cloud = hit && hit.closest(".cloud"), local = hit && hit.closest(".cast");
    if (ferry) return rideFerry();
    if (cloud) return poofCloud(cloud);
    if (local && S.level !== "islands") return greet(local);
    hideSay();
    if (S.level !== "islands") return;
    const p = world.toWorld(mx, my);
    for (const k of ISLANDS) { const [x, y, w, hh] = C.islands[k].rect; if (p.x > x && p.x < x + w && p.y > y && p.y < y + hh) return go(`#/${k}`); }
  }

  /* ---------------- loader + cookie ---------------- */
  async function loader() {
    const L = $("#loader"), seen = store.get("dis_seen");
    L.hidden = false; $("#loader-art").innerHTML = A.sprites.scribble;
    const line = $("#loader-line"), bar = $("#loader-bar");
    const imgs = [...document.querySelectorAll("#world-stage img.tile")];
    let done = 0, skipped = false;
    const ready = Promise.all(imgs.map(i => (i.decode ? i.decode() : Promise.resolve()).catch(() => {}).then(() => { done++; bar.style.width = Math.round(done / imgs.length * 100) + "%"; })));
    $("#skip").onclick = () => { skipped = true; };
    const lines = seen ? [] : T.loader; let i = 0;
    const tick = setInterval(() => { if (i < lines.length) line.textContent = lines[i++]; }, 800);
    line.textContent = lines.length ? lines[i++] : T.loader[3];
    const minTime = sleep(seen ? 500 : 3200);
    await Promise.race([Promise.all([ready, minTime]), sleep(12000), new Promise(r => { const c = setInterval(() => { if (skipped) { clearInterval(c); r(); } }, 100); })]);
    clearInterval(tick); store.set("dis_seen", "1"); L.classList.add("out"); await sleep(400); L.remove();
  }
  function cookie() {
    if (store.get("dis_cookie")) return; const c = $("#cookie"); c.hidden = false; c.querySelector("p").textContent = T.cookie;
    $("#cookie-ok").onclick = () => { store.set("dis_cookie", "1"); c.hidden = true; };
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    $("#logo-img").src = A.logo;
    buildSpace(); buildWorld(); buildMenu(); buildPick(); renderCommunity();
    space = new Cam($("#space"), $("#space-stage"), 1600, 1000, onCamChange);
    world = new Cam($("#world"), $("#world-stage"), C.world[0], C.world[1], onCamChange);
    fitS = islandsTarget().s;
    space.set(spaceHome(), false);
    world.set(islandsTarget());
    buildOverlay(); wireInput(); runFerry(); cookie();
    if (!REDUCE) requestAnimationFrame(spaceLoop);
    buildLogoIsland().catch(e => { console.error("Logo island:", e); ISL._ready(); ISL._baked(); });
    // the real islands' coastline and trimmed tiles get prepared straight away, while the visitor is still in space
    buildCoast().catch(() => {}).then(() => { if (!$("#world-stage").classList.contains("clipped")) ISL._mapReady(); });
    $("#list h1").textContent = T.list.headline; $("#list .sub").textContent = T.list.sub;
    $("#notfound h1").textContent = T.notFound.headline; $("#notfound p").textContent = T.notFound.body;
    await loader();
    const startAt = location.hash && location.hash !== "#/" ? location.hash : "#/system";
    if (startAt === "#/system") { S.scene = "space"; $("#world").classList.remove("on"); $("#space").classList.remove("off"); onCamChange(); history.replaceState(null, "", "#/system"); }
    else route();
    updateChrome(); scheduleOverlay();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
})();
