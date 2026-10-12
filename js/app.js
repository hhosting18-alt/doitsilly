/* DOITSILLY — map engine. No framework, no build step.
   Scenes: "space" (solar system) and "world" (both islands). Places open as panels over the world.
   Things to poke: every object in space answers when clicked, clicking empty space makes a wish,
   island locals say hi (and point you to the nearest place), clouds go poof, the ferry gives rides. */
(() => {
  const C = window.DIS_CONFIG, T = window.DIS_CONTENT, A = window.DIS_ASSETS, M = window.DIS_MAP;
  const $ = (s, el = document) => el.querySelector(s);
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

  /* ---------------- camera ---------------- */
  class Cam {
    constructor(view, stage, W, H, onChange) { Object.assign(this, { view, stage, W, H, onChange, s: 1, tx: 0, ty: 0, anim: null }); }
    get vw() { return this.view.clientWidth; } get vh() { return this.view.clientHeight; }
    apply() { this.stage.style.transform = `translate(${this.tx}px,${this.ty}px) scale(${this.s})`; this.onChange && this.onChange(); }
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
    to(target, ms = 900, clamp = true) {
      if (clamp) target = this.clamp({ ...target });
      if (this.anim) cancelAnimationFrame(this.anim.raf);
      if (REDUCE || ms <= 0) { this.set(target, false); return Promise.resolve(); }
      const vw = this.vw, vh = this.vh;
      const c0 = { x: (vw / 2 - this.tx) / this.s, y: (vh / 2 - this.ty) / this.s, l: Math.log(this.s) };
      const c1 = { x: (vw / 2 - target.tx) / target.s, y: (vh / 2 - target.ty) / target.s, l: Math.log(target.s) };
      return new Promise(res => {
        const t0 = performance.now();
        const step = now => {
          const k = Math.min(1, (now - t0) / ms), e = ease(k);
          const s = Math.exp(c0.l + (c1.l - c0.l) * e), cx = c0.x + (c1.x - c0.x) * e, cy = c0.y + (c1.y - c0.y) * e;
          this.s = s; this.tx = vw / 2 - cx * s; this.ty = vh / 2 - cy * s; this.apply();
          if (k < 1) this.anim = { raf: requestAnimationFrame(step) }; else { this.anim = null; this.set(target, false); res(); }
        };
        this.anim = { raf: requestAnimationFrame(step) };
      });
    }
    zoomAt(mx, my, factor, minS, maxS) {
      const s = Math.min(maxS, Math.max(minS, this.s * factor)), k = s / this.s;
      this.set({ s, tx: mx - (mx - this.tx) * k, ty: my - (my - this.ty) * k });
    }
    toWorld(mx, my) { return { x: (mx - this.tx) / this.s, y: (my - this.ty) / this.s }; }
    project(x, y) { return { x: x * this.s + this.tx, y: y * this.s + this.ty }; }
  }

  /* ---------------- state ---------------- */
  const S = { scene: "space", place: null, level: "system", busy: false, tour: -1, outPressure: 0, menuOpen: false, say: null };
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
    if (S.say.scene !== S.scene || S.transitioning || S.menuOpen) return hideSay();
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

  /* ---------------- solar system ---------------- */
  const SUN = [760, 560], TILT = -10;
  const ORBITS = [[210, 95], [380, 170], [520, 235], [620, 280]];
  const ZES = [430, 690], DIS_PLANET = [1190, 300];
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
    let far = "", near = "";
    for (let i = 0; i < 280; i++) {
      const x = (rnd() * 1600).toFixed(0), y = (rnd() * 1000).toFixed(0), r = .8 + rnd() * 1.8, fill = rnd() < .2 ? "#DDFF00" : "#fff";
      const c = `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${fill}"${rnd() < .35 ? tw() : ""}/>`;
      if (r > 1.9) near += c; else far += c;
    }
    for (let i = 0; i < 16; i++) { // four-point sparkles
      const x = Math.round(rnd() * 1600), y = Math.round(rnd() * 1000), s = Math.round(5 + rnd() * 6);
      near += `<path${tw()} fill="#fff" d="M${x},${y - s}Q${x},${y} ${x + s},${y}Q${x},${y} ${x},${y + s}Q${x},${y} ${x - s},${y}Q${x},${y} ${x},${y - s}Z"/>`;
    }
    const orbits = ORBITS.map(([rx, ry], i) => `<ellipse cx="${SUN[0]}" cy="${SUN[1]}" rx="${rx}" ry="${ry}" transform="rotate(${TILT} ${SUN[0]} ${SUN[1]})" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 12" opacity="${i === 3 ? .5 : .26}"/>`).join("");
    st.innerHTML = `<svg class="space-bg" viewBox="0 0 1600 1000" aria-hidden="true"><defs>
      <radialGradient id="neb-pink"><stop offset="0" stop-color="#FF52CC" stop-opacity=".2"/><stop offset="1" stop-color="#FF52CC" stop-opacity="0"/></radialGradient>
      <radialGradient id="neb-blue"><stop offset="0" stop-color="#0A72EE" stop-opacity=".32"/><stop offset="1" stop-color="#0A72EE" stop-opacity="0"/></radialGradient>
      <linearGradient id="star-tail" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#DDFF00" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <circle cx="1300" cy="820" r="430" fill="url(#neb-pink)"/><circle cx="260" cy="200" r="470" fill="url(#neb-blue)"/>
      <g id="par-far" class="par">${far}</g><g id="par-near" class="par">${near}</g>${orbits}</svg>
      <svg class="space-fx" id="space-fx" viewBox="0 0 1600 1000" aria-hidden="true"></svg>
      <div class="sprite" id="logo-planet" style="left:930px;top:110px;width:520px;z-index:5">${logoPlanetSVG()}</div>`;

    spaceThing({ svg: A.sprites.sun, w: 230, x: SUN[0], y: SUN[1], z: 5, name: T.space.sun.name, cls: "sun", onClick: el => { el.classList.toggle("cool"); spaceSay("sun", el); } });
    spaceThing({ svg: A.sprites.planet_zescorp, w: 380, x: ZES[0], y: ZES[1], z: 5, name: T.system.zescorp.name, cls: "zes", onClick: zescorpSay });
    const orb = (svg, w, key, o) => SP.orbiters.push({ el: spaceThing({ svg, w, name: T.space[key].name, onClick: el => spaceSay(key, el) }), zf: 6, zb: 4, ...o });
    orb(A.sprites.pebble, 44, "pebble", { c: SUN, rx: ORBITS[0][0], ry: ORBITS[0][1], tilt: TILT, period: 24, a: 1.2 });
    orb(A.sprites.grape, 56, "grape", { c: SUN, rx: ORBITS[2][0], ry: ORBITS[2][1], tilt: TILT, period: 70, a: 4.4 });
    orb(A.sprites.bubblegum, 84, "bubblegum", { c: SUN, rx: ORBITS[3][0], ry: ORBITS[3][1], tilt: TILT, period: 120, a: 2.5 });
    orb(A.sprites.moon, 54, "moon", { c: ZES, rx: 215, ry: 62, tilt: -8, period: 15, a: 0 });
    orb(A.sprites.satellite, 78, "satellite", { c: DIS_PLANET, rx: 275, ry: 96, tilt: -14, period: 21, a: 3 });
    SP.rocket = spaceThing({ svg: A.sprites.rocket, w: 44, z: 7, name: T.space.rocket.name, cls: "rocket", onClick: el => {
      SP.boost = 6; el.classList.add("boost"); clearTimeout(el.t); el.t = setTimeout(() => el.classList.remove("boost"), 1600); spaceSay("rocket", el);
    } });
    spaceThing({ svg: A.sprites.bot, w: 82, x: 1400, y: 790, z: 6, name: T.space.bot.name, cls: "float", onClick: el => spaceSay("bot", el) });
    spaceThing({ svg: A.sprites.ghost, w: 62, x: 150, y: 840, z: 6, name: T.space.ghost.name, cls: "float slow", onClick: el => spaceSay("ghost", el) });
    stepSpace(0);
  }
  function zescorpSay() { const el = $(".sp.zes"); bump(el, "pop"); const r = el.getBoundingClientRect(), p = space.toWorld(r.left + r.width / 2, r.top + r.height * .1); say(T.system.zescorp.line, p.x, p.y, { name: T.system.zescorp.name }); }
  function logoPlanetSVG() {
    // The "O" is the same pink ring with eyes as the mascot.
    const eye = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="6.6" fill="#fff"/><circle cx="${x + 1.4}" cy="${y + .8}" r="2.8" fill="#000"/>`;
    const ring = half => `<path d="${half ? "M-232,0 A232,48 0 0 0 232,0" : "M-232,0 A232,48 0 1 1 232,0 A232,48 0 1 1 -232,0"}" fill="none" stroke="#111" stroke-width="16" transform="rotate(-14)"/><path d="${half ? "M-232,0 A232,48 0 0 0 232,0" : "M-232,0 A232,48 0 1 1 232,0 A232,48 0 1 1 -232,0"}" fill="none" stroke="#FF52CC" stroke-width="9" stroke-dasharray="18 10" transform="rotate(-14)"/>`;
    return `<svg viewBox="-260 -190 520 380" role="img" aria-label="DOITSILLY planet">
      ${ring(false)}<circle r="150" fill="#000" stroke="#111" stroke-width="6"/>
      <g class="logo-type">
        <text x="-36" y="-8" text-anchor="end" class="lp-t">D</text>
        <g transform="translate(-5,-32)"><circle r="21" fill="none" stroke="#FF52CC" stroke-width="13"/>${eye(-6, 0)}${eye(6.5, 0)}</g>
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
    if (S.scene !== "space" || document.hidden) return;
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
    const p = space.toWorld(e.clientX, e.clientY);
    shootingStar(p.x, p.y, p.x < 800 ? rand(15, 40) : rand(140, 165), { dist: rand(300, 460), len: 170, w: 3 });
    const n = (+store.get("dis_wishes") || 0) + 1; store.set("dis_wishes", n);
    floatText(e.clientX, e.clientY, T.space.wish.replace("{n}", n));
  }

  /* ---------------- islands ---------------- */
  const CAST = [];
  let TYPES = [];
  function buildWorld() {
    const st = $("#world-stage");
    st.style.width = C.world[0] + "px"; st.style.height = C.world[1] + "px";
    const tile = t => `<img class="tile" alt="" src="${t.src}" style="left:${t.x}px;top:${t.y}px;width:${t.w + 1}px;height:${t.h + 1}px" draggable="false">`;
    st.innerHTML = `<svg class="layer layer-coast" id="coast" viewBox="0 0 ${C.world[0]} ${C.world[1]}" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="layer layer-base">${M.tiles.filter(t => t.layer === "base").map(tile).join("")}</div><div class="layer layer-sprites" id="sprites"></div>
      <div class="layer layer-fg">${M.tiles.filter(t => t.layer === "fg").map(tile).join("")}</div><div class="layer layer-top" id="sprites-top"></div>`;
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
    const f = h("div", { class: "pc-sprite ferry", id: "ferry", title: T.ferry.name }, `<img alt="" src="${C.ferry.art}" draggable="false">`);
    f.style.width = C.ferry.w + "px"; top.appendChild(f);
  }
  const metSet = () => { try { return new Set(JSON.parse(store.get("dis_met") || "[]")); } catch (e) { return new Set(); } };
  function anchorOf(el) { const r = el.getBoundingClientRect(); return world.toWorld(r.left + r.width / 2, r.top); }
  function greet(el) {
    const n = el.dataset.n, L = T.locals[n] || T.locals._default, a = anchorOf(el);
    bump(el, "hop");
    let near = null, best = 700;
    C.districts.forEach(d => { const dd = Math.hypot(d.pin[0] - a.x, d.pin[1] - a.y); if (dd < best) { best = dd; near = d; } });
    say(pick(L.lines), a.x, a.y, { name: L.name, link: near ? [T.visit.replace("{place}", P[near.id].landmark), `#/studio/${near.id}`] : null });
    const met = metSet(), had = met.size; met.add(n); store.set("dis_met", JSON.stringify([...met]));
    updateChrome();
    if (met.size > had && met.size === TYPES.length) setTimeout(() => floatText(innerWidth / 2, innerHeight / 2, T.hiDone), 500);
  }
  function rideFerry() {
    const el = $("#ferry"), a = anchorOf(el); bump(el, "hop");
    say(pick(T.ferry.lines), a.x, a.y, { name: T.ferry.name, ms: 1500 });
    setTimeout(() => go(S.level === "community" ? "#/studio" : "#/community"), 750);
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
    const d = new Float32Array(W * H), D = 1.414;
    for (let i = 0; i < W * H; i++) d[i] = grid[i] === target ? 0 : 1e9;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = d[i]; if (!v) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + D); if (x < W - 1) v = Math.min(v, d[i - W + 1] + D); }
      d[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = d[i]; if (!v) continue;
      if (x < W - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + D); if (x > 0) v = Math.min(v, d[i + W - 1] + D); }
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
    const tiles = M.tiles.filter(t => t.layer === "base"), key = "dis_coast_v2_" + tiles.length;
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
    dropSmall(land, W, H, 1, 90); dropSmall(land, W, H, 0, 600);
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
    $("#coast").innerHTML = `<defs><clipPath id="dis-art-clip" clipPathUnits="userSpaceOnUse"><path clip-rule="evenodd" d="${d.clip}"/></clipPath></defs>
      <path class="c-halo" fill-rule="evenodd" d="${d.halo}"/><path class="c-foam" d="${d.foam}"/><path class="c-beach" fill-rule="evenodd" d="${d.beach}"/>`;
    $("#world-stage").classList.add("clipped");
  }

  /* ---------------- overlay: labels + pins ---------------- */
  const OV = [];
  function buildOverlay() {
    const ov = $("#labels"); ov.innerHTML = "";
    const add = (el, wx, wy, show, anchor = "c") => { ov.appendChild(el); OV.push({ el, wx, wy, show, anchor }); };
    for (const k of ["studio", "community"]) {
      const g = T.gate[k], I = C.islands[k];
      const b = h("button", { class: "map-label island-label", type: "button" }, `<span>${g.label}</span><small>${g.line}</small>`);
      b.onclick = () => go(k === "studio" ? "#/studio" : "#/community");
      add(b, I.label[0], I.label[1], "islands");
    }
    C.districts.forEach(d => {
      const p = P[d.id];
      const b = h("button", { class: "map-label", type: "button" }, `<span>${p.landmark}</span><small>${p.plain}</small>`);
      b.onclick = () => go(`#/studio/${d.id}`);
      add(b, d.label[0], d.label[1], "studio");
      const pin = h("button", { class: "pin", type: "button", "aria-label": `About ${p.landmark}` }, `<svg viewBox="0 0 40 48" width="40" height="48" aria-hidden="true"><path class="pin-b" d="M20 2C10 2 2 9.6 2 19.5 2 28 8 35 16 36.6L20 46l4-9.4C32 35 38 28 38 19.5 38 9.6 30 2 20 2Z" fill="#fff" stroke="#111" stroke-width="2.2" stroke-linejoin="round"/><circle cx="20" cy="11.5" r="2.6" fill="#FF52CC"/><path d="M20 17v12" stroke="#111" stroke-width="3.6" stroke-linecap="round"/></svg>`);
      pin.onclick = e => { e.stopPropagation(); showPop(pin, d.id); };
      add(pin, d.pin[0], d.pin[1], "studio-pin", "b");
    });
    C.communityPlaces.forEach(d => {
      const name = (T.community.places[d.id] || {}).landmark || d.id;
      add(h("span", { class: "map-label dashed" }, `<span>${name}</span><small>${T.community.soon}</small>`), d.label[0], d.label[1], "community");
    });
    add(h("span", { class: "map-label small" }, `<span>${T.ferry.name}</span><small>Click it for a ride</small>`), 5420, 2560, "islands");
    const zp = h("button", { class: "map-label", type: "button" }, `<span>${T.system.zescorp.name}</span><small>${T.system.zescorp.line}</small>`);
    zp.onclick = zescorpSay; add(zp, ZES[0], ZES[1] - 185, "space");
    const dp = h("button", { class: "map-label island-label", type: "button" }, `<span>${T.system.doitsilly.name}</span><small>${T.system.doitsilly.line}</small>`);
    dp.onclick = () => go("#/islands"); add(dp, DIS_PLANET[0], 500, "space");
    const hit = h("button", { class: "planet-hit", type: "button", "aria-label": "Zoom into DOITSILLY" }); hit.onclick = () => go("#/islands"); add(hit, DIS_PLANET[0], DIS_PLANET[1], "space-hit");
  }
  function layoutOverlay() {
    const inSpace = S.scene === "space", cam = inSpace ? space : world;
    const z = cam.s / fitS, vw = innerWidth, vh = innerHeight;
    for (const o of OV) {
      let vis = false;
      if (inSpace) vis = o.show === "space" || o.show === "space-hit";
      else if (!S.transitioning) {
        if (o.show === "islands") vis = z < 1.15;
        else if (o.show === "studio" || o.show === "studio-pin") vis = z >= 1.15 && S.level === "studio";
        else if (o.show === "community") vis = z >= 1.15 && S.level === "community";
        if (S.place && o.show === "studio-pin") vis = false;
      }
      if (!vis) { o.el.hidden = true; continue; }
      const p = cam.project(o.wx, o.wy);
      if (p.x < -200 || p.y < -100 || p.x > vw + 200 || p.y > vh + 100) { o.el.hidden = true; continue; }
      o.el.hidden = false;
      if (o.show === "space-hit") { const d = 300 * cam.s; o.el.style.width = o.el.style.height = d + "px"; }
      o.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,${o.anchor === "b" ? "-100%" : "-50%"})`;
    }
    layoutSay();
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
      if (S.scene !== "world") return;
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
    const c = world.toWorld(world.vw / 2, world.vh / 2), si = C.islands.studio.rect, ci = C.islands.community.rect;
    const d = r => Math.hypot(c.x - (r[0] + r[2] / 2), c.y - (r[1] + r[3] / 2));
    return d(si) <= d(ci) ? "studio" : "community";
  }
  function onCamChange() {
    if (world && S.scene === "world") { const v = $("#world"); v.style.backgroundPosition = `${(world.tx % 40 + 40) % 40}px ${(world.ty % 40 + 40) % 40}px`; }
    const lv = computeLevel();
    if (lv !== S.level) { S.level = lv; updateChrome(); if (!S.place && !S.routing && !S.transitioning) setHash(lv === "system" ? "#/system" : "#/" + lv); }
    scheduleOverlay();
  }
  let ovRaf = 0; function scheduleOverlay() { if (!ovRaf) ovRaf = requestAnimationFrame(() => { ovRaf = 0; layoutOverlay(); }); }

  function updateChrome() {
    const trail = [["Solar system", "#/system"]];
    if (S.level !== "system") trail.push(["Both islands", "#/islands"]);
    if (S.level === "studio" || S.place) trail.push(["DOITSILLY Island", "#/studio"]);
    if (S.level === "community") trail.push(["Community Island", "#/community"]);
    if (S.place) trail.push([P[S.place].landmark, `#/studio/${S.place}`]);
    $("#trail").innerHTML = trail.map((t, i) => i === trail.length - 1 ? `<span aria-current="location">${t[0]}</span>` : `<a href="${t[1]}">${t[0]}</a><span aria-hidden="true">›</span>`).join("");
    const hint = S.place ? "" : S.level === "studio" ? T.hints.studio : S.level === "community" ? T.hints.community : S.level === "islands" ? T.hints.islands : T.hints.system;
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
  }
  async function enterSpace() {
    if (S.scene === "space") return space.to(space.fit([60, 40, 1500, 960], .02), 900);
    S.transitioning = true; S.busy = true; closePanel(true); closePop(); endTour(); hideSay();
    const cx = world.vw / 2, cy = world.vh / 2, s = world.s * .3;
    const p1 = world.to({ s, tx: cx - (cx - world.tx) * .3, ty: cy - (cy - world.ty) * .3 }, REDUCE ? 0 : 900, false);
    space.set({ s: 6, tx: space.vw / 2 - DIS_PLANET[0] * 6, ty: space.vh / 2 - DIS_PLANET[1] * 6 }, false);
    await sleep(REDUCE ? 0 : 350);
    $("#world").classList.remove("on"); $("#space").classList.remove("off"); S.scene = "space";
    await space.to(space.fit([60, 40, 1500, 960], .02), REDUCE ? 0 : 1200, false);
    await p1; S.transitioning = false; S.busy = false; onCamChange(); updateChrome();
  }

  /* ---------------- routing ---------------- */
  function setHash(hs) { if (location.hash !== hs) history.replaceState(null, "", hs); }
  function go(hs) { if (location.hash === hs) route(); else location.hash = hs; }
  async function route() {
    const parts = (location.hash || "#/").replace(/^#\/?/, "").split("/").filter(Boolean);
    S.routing = true; hideSay();
    closeOverlay("#list"); closeOverlay("#notfound"); if (S.menuOpen) toggleMenu(false);
    const [a, b] = parts;
    if (!a || a === "system") { closePanel(true); await enterSpace(); }
    else if (a === "islands") { closePanel(true); await enterWorld(islandsTarget()); }
    else if (a === "studio" && !b) { closePanel(true); await enterWorld(world.fit(C.islands.studio.rect, .04)); }
    else if (a === "community") { closePanel(true); await enterWorld(world.fit(C.islands.community.rect, .04)); }
    else if (a === "studio" && P[b]) { await openPlace(b); }
    else if (a === "list") { openOverlay("#list"); }
    else openOverlay("#notfound");
    S.routing = false; S.level = computeLevel(); updateChrome(); scheduleOverlay();
  }

  /* ---------------- places ---------------- */
  async function openPlace(id) {
    const d = C.districts.find(x => x.id === id);
    S.place = id; closePop();
    renderPanel(id);
    const panel = $("#panel"); panel.hidden = false; requestAnimationFrame(() => panel.classList.add("open"));
    updateChrome();
    await enterWorld(world.fit(d.rect, .02, panelArea()));
    $("#panel-title") && $("#panel-title").focus({ preventScroll: true });
  }
  function closePanel(silent) {
    if (!S.place) return;
    const panel = $("#panel"); panel.classList.remove("open"); setTimeout(() => { if (!S.place) panel.hidden = true; }, 300);
    S.place = null; updateChrome();
    if (!silent) go("#/studio");
  }

  const chip = (t, on, attr = "") => `<button type="button" class="chip" aria-pressed="${on ? "true" : "false"}" ${attr}>${t}</button>`;
  function renderPanel(id) {
    const p = P[id], body = $("#panel-body");
    let html = `<p class="kicker">${p.landmark} · ${p.plain}</p><h1 id="panel-title" tabindex="-1">${p.hero}</h1><p class="lead">${p.intro}</p>`;
    if (p.type === "service") {
      html += `<div class="row"><a class="btn pink" href="#/studio/contact">Start a ${p.plain} project</a><a class="btn" href="#/studio/work">See ${p.plain} work</a></div>
      <h2>What we make</h2><table class="deliv"><thead><tr><th scope="col">Deliverable</th><th scope="col">In one line</th></tr></thead><tbody>${p.deliverables.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</tbody></table>
      <h2>How it works</h2><ol class="steps">${p.steps.map(s => `<li><b>${s[0]}:</b> ${s[1]}</li>`).join("")}</ol>
      <div class="duo"><div class="card"><h3>How we show up</h3><p>${p.showUp}</p><a href="#/studio/about">About our four modes</a></div><div class="card alt"><h3>Made with 3rd Space</h3><p>${p.madeWith}</p><a href="#/community">See how collabs work</a></div></div>
      <h2>Proof from this department</h2><div class="cases">${[1, 2].map(() => `<a class="case" href="#/studio/work"><span class="thumb t-${id}">${A.sprites.scribble}</span><small>${p.plain}</small><b>[CLIENT]</b><span>[One-line outcome]</span></a>`).join("")}</div>
      <h2>Questions</h2>${p.faq.map(q => `<details><summary>${q[0]}</summary><p>${q[1]}</p></details>`).join("")}
      <div class="cta"><h2>Got a messy idea in this department?</h2><p>Half-formed is fine. That's our favourite kind.</p><a class="btn pink" href="#/studio/contact">Start a ${p.plain} project</a></div>`;
    } else if (p.type === "work") {
      html += `<div class="chips" role="group" aria-label="Filter by service">${p.services.map((s, i) => chip(s, i === 0, `data-f="${s}"`)).join("")}</div>
      <div class="cases" id="cases">${p.cases.map(c => `<a class="case" href="#/studio/work" data-s="${c.service}"><span class="thumb t-${c.service.toLowerCase()}">${A.sprites.scribble}</span><small>${c.service} · ${c.sector}</small><b>${c.client}</b><span>${c.outcome}</span></a>`).join("")}</div>
      <p class="empty" hidden>${p.empty} <a href="#/studio/contact">Start a project</a></p>
      <div class="cta"><h2>${p.cta[0]}</h2><p>${p.cta[1]}</p><a class="btn pink" href="#/studio/contact">Start a project</a></div>`;
    } else if (p.type === "about") {
      html += p.story.map(s => `<h2>${s[0]}</h2>${s[1].map(t => `<p${t === "Until you DO IT SILLY." ? ' class="big"' : ""}>${t}</p>`).join("")}`).join("");
      html += `<h2>${p.modesHeading}</h2><div class="modes">${p.modes.map(m => `<div class="card"><h3>${m[0]}</h3><p>${m[1]}</p></div>`).join("")}</div><p><b>${p.modesClose}</b></p>
      <h2>${p.whoHeading}</h2><p>${p.whoIntro}</p><ol class="steps">${p.who.map(w => `<li><b>${w[0]}.</b> ${w[1]}</li>`).join("")}</ol><p>${p.whoClose}</p>
      <div class="chips static">${p.personality.map(t => `<span class="chip">${t}</span>`).join("")}</div>
      <h2>${p.teamHeading}</h2><div class="team">${p.team.map(m => `<div class="card"><span class="thumb t-about">${A.sprites.scribble}</span><b>${m[0]}</b><small>${m[1]}</small><p>${m[2]}</p></div>`).join("")}</div>
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
    const n = P[p.next]; html += `<a class="next" href="#/studio/${p.next}">Next stop: ${n.landmark}</a>`;
    body.innerHTML = html; body.scrollTop = 0;
    $("#panel-kick").textContent = p.landmark;
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
    pop.innerHTML = `<b>${p.landmark}</b><small>${p.plain}</small><p>${p.oneliner}</p><a class="btn pink" href="#/studio/${id}">Go in</a>`;
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
    if (step.id) { const d = C.districts.find(x => x.id === step.id); await world.to(world.fit(d.rect, .1, { x: 0, y: 70, w: innerWidth, h: innerHeight - 220 }), 1000); }
    else await world.to(world.fit(C.islands.studio.rect, .04), 900);
  }
  function endTour() { S.tour = -1; $("#tour").hidden = true; updateChrome(); }

  /* ---------------- overlays ---------------- */
  function openOverlay(sel) { const o = $(sel); o.hidden = false; o.querySelector("h1,h2,a,button").focus(); }
  function closeOverlay(sel) { $(sel).hidden = true; }
  function toggleMenu(force) {
    S.menuOpen = force ?? !S.menuOpen; $("#menu").hidden = !S.menuOpen; if (S.menuOpen) hideSay();
    $("#menu-btn").setAttribute("aria-expanded", S.menuOpen); $("#menu-btn").firstChild.textContent = S.menuOpen ? "CLOSE " : "MENU "; $("#menu-btn span").textContent = S.menuOpen ? "×" : "=";
    if (S.menuOpen) $("#menu a").focus(); else $("#menu-btn").focus();
  }
  function buildMenu() {
    const st = Object.keys(P).filter(k => P[k].type === "service");
    $("#menu-studio").innerHTML = `<li><a href="#/studio">Studio map<small>DOITSILLY Island</small></a></li>` + st.map(k => `<li><a href="#/studio/${k}">${P[k].plain}<small>${P[k].landmark}</small></a></li>`).join("") +
      ["work", "about", "contact"].map(k => `<li><a href="#/studio/${k}">${P[k].plain}<small>${P[k].landmark}</small></a></li>`).join("");
    $("#menu-else").innerHTML = `<li><a href="#/system">Solar system<small>Zoom all the way out</small></a></li><li><a href="#/islands">Both islands<small>Pick a side</small></a></li><li><a href="#/list">See everything as a list<small>No map</small></a></li>` +
      T.social.map(s => `<li><a href="${s[1].startsWith("[") ? "#/list" : s[1]}" rel="noopener">${s[0]}</a></li>`).join("");
    $("#list-studio").innerHTML = `<li><a href="#/studio">DOITSILLY Island (Studio map)</a></li>` + Object.keys(P).map(k => `<li><a href="#/studio/${k}">${P[k].plain}: ${P[k].landmark}</a> <span>${P[k].oneliner}</span></li>`).join("");
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
      if (world.anim) { cancelAnimationFrame(world.anim.raf); world.anim = null; }
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
      if (e.target.closest(".panel,.menu,.sheet,.pop,.tour,.loader")) return;
      e.preventDefault(); if (S.busy) return;
      if (S.scene === "space") { if (e.deltaY < -20) go("#/islands"); return; }
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
    if (!REDUCE) sp.addEventListener("pointermove", e => {
      const mx = e.clientX / innerWidth - .5, my = e.clientY / innerHeight - .5;
      $("#par-far").style.transform = `translate(${(-mx * 10).toFixed(1)}px,${(-my * 10).toFixed(1)}px)`;
      $("#par-near").style.transform = `translate(${(-mx * 26).toFixed(1)}px,${(-my * 26).toFixed(1)}px)`;
    });
    const sayEl = $("#say");
    sayEl.addEventListener("mouseenter", () => clearTimeout(say.t)); sayEl.addEventListener("mouseleave", armSay);
    sayEl.addEventListener("click", e => { if (e.target.closest("a")) hideSay(); });
    $("#zoom-in").onclick = () => { if (S.scene === "space") return go("#/islands"); world.to({ ...zoomCenter(1.6) }, 450); };
    $("#zoom-out").onclick = () => { if (S.scene === "space") return; if (world.s <= fitS * 1.02) return go("#/system"); if (S.place) closePanel(); world.to({ ...zoomCenter(1 / 1.6) }, 450); };
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { if (S.say) hideSay(); else if (!$("#pop").hidden) closePop(); else if (S.menuOpen) toggleMenu(false); else if (!$("#list").hidden) go("#/studio"); else if (S.tour >= 0) endTour(); else if (S.place) closePanel(); }
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
    window.addEventListener("resize", () => { fitS = islandsTarget().s; world.set({ s: world.s, tx: world.tx, ty: world.ty }); space.set({ s: space.s, tx: space.tx, ty: space.ty }, S.scene !== "space"); scheduleOverlay(); });
    window.addEventListener("hashchange", route);
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
    for (const k in C.islands) { const [x, y, w, hh] = C.islands[k].rect; if (p.x > x && p.x < x + w && p.y > y && p.y < y + hh) return go(k === "studio" ? "#/studio" : "#/community"); }
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
    buildSpace(); buildWorld(); buildMenu();
    space = new Cam($("#space"), $("#space-stage"), 1600, 1000, onCamChange);
    world = new Cam($("#world"), $("#world-stage"), C.world[0], C.world[1], onCamChange);
    fitS = islandsTarget().s;
    space.set(space.fit([60, 40, 1500, 960], .02), false);
    world.set(islandsTarget());
    buildOverlay(); wireInput(); runFerry(); cookie();
    if (!REDUCE) requestAnimationFrame(spaceLoop);
    setTimeout(() => buildCoast().catch(() => {}), 50);
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
