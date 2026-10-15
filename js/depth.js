/* DOITSILLY · depth: the islands as a little 3D diorama, seen through the screen like a window into a box.

   Off-axis projection (the "window" effect): the screen is the glass, the map lies a little way behind it, the
   dotted sea floor deeper still, clouds float near the glass, and the islands have thick cliff sides. Everything is
   drawn from where the viewer's eye is: the head (View full experience), the mouse (a gentle version), or the middle.

   How it stays cheap and safe:
   - Every layer is a flat plane, and a flat plane seen from any eye point is just a 2D scale + shift. So there are
     no CSS 3D transforms and nothing huge is forced onto a GPU layer (the reason the map used to draw in strips).
   - The camera gains one number, world.om (the map plane's perspective scale), next to world.ox / world.oy.
     project() and toWorld() include it, so labels, pins, speech bubbles and clicks all stay lined up.
   - If anything here throws, it switches itself off and the site carries on flat, exactly as before.
     Turn it off on purpose with depth.on = false in js/config.js, or by adding ?flat to the address. */
window.DIS_DEPTH = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const DEF = {
    on: true,
    wall: .1,      // how deep the box is: the map sits this fraction smaller than the screen when you look straight on
    fxWall: .26,   // ...how deep it opens up to during View full experience (the deep-room look)
    grid: true,    // tile lines on the box walls, running back into the screen (what makes the depth readable)
    floor: .22,    // how far below the map the dotted sea floor is (fraction of viewing distance)
    clouds: .25,   // clouds float this fraction of the way from the map up to the glass... (0 = on the map, 1 = on the glass)
    thick: 320,    // island thickness in map pixels (the cliff sides)
    maxThick: .06, // ...capped at this fraction of the viewing distance when zoomed right in
    slices: 4,     // how many layers draw the cliff sides (each one is a full redraw of the coastline, so keep it low)
    adapt: true,   // if frames get slow, quietly drop the extras (shadow, lean, then cliff layers + tile lines) to stay smooth
    lean: .6,      // how strongly the locals stand up off the map
    tilt: .42,     // the model look: how much of the islands' south cliff face always shows, as if seen from slightly in front
    tiltX: .1,     // ...and a little of the east face (negative = west)
    head: .55,     // how much moving your head (or the mouse) swings the cliff faces round on top of that
    maxDrop: .075, // the cliff face is never taller than this fraction of the screen height
    shadow: .3,    // how dark the shadow the islands cast on the water is (0 = no shadow)
    mouse: .4,     // how far the mouse moves the eye (0 = not at all, 1 = as far as the head can)
    reach: .9      // the furthest the eye goes from the middle (1 = the screen edge)
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mod = v => ((v % 40) + 40) % 40;

  return function create(o) {
    const cfg = Object.assign({}, DEF, o.cfg || {});
    const world = o.world, view = world.view;
    const $ = s => document.querySelector(s);
    const deep = $("#sea-deep"), dots = $("#sea-dots"), sprites = $("#sprites"), clouds = $("#clouds");
    let flatAsked = false; try { flatAsked = new URLSearchParams(location.search).has("flat"); } catch (e) {}
    const canLean = !!(window.CSS && CSS.supports && CSS.supports("transform", "skewX(calc(clamp(-.5, 0.1 * 2, .5) * 1rad))"));
    let dead = cfg.on === false || flatAsked || !deep || !dots;

    const E = { hx: 0, hy: 0, lean: 0, thx: 0, thy: 0, tl: 0, dm: 0, tdm: 0 }; // eye: now and target (-1..1 across the screen); dm: 0 = normal box, 1 = deep full-experience box
    let G = null, raf = 0, last = 0, box = null, wallKey = "", cliff = [], shade = null;
    let lastBeach = null, leanState = null; const varCache = {};
    // smoothness guard: watches frame times while things move; if they're slow it steps quality down (never back up
    // in the same visit, so nothing flickers). 0 = everything, 1 = no shadow / lean, 2 = fewer cliff layers, no tile lines,
    // 3 = the mouse stops tilting the view (head tracking still works)
    const Q = { level: 0, n: 0, sum: 0, lastT: 0 };
    function perf(now) {
      if (!cfg.adapt || Q.level >= 3) return;
      if (Q.lastT) { const d = now - Q.lastT; if (d > 0 && d < 250) { Q.sum += d; Q.n++; } }
      Q.lastT = now;
      if (Q.n >= 45) { const avg = Q.sum / Q.n; Q.sum = Q.n = 0; if (avg > 23) degrade(++Q.level, avg); }
    }
    function degrade(level, avg) {
      console.info(`Depth: frames were slow (${avg.toFixed(0)} ms), using lighter quality level ${level}.`);
      if (level >= 1 && shade) { shade.remove(); shade = null; }
      if (level >= 2) { wallKey = ""; if (lastBeach) coast(lastBeach); }
      if (level >= 3) { cfg.mouse = 0; if (!o.isFx()) aim(0, 0, 0); }
      cam();
    }

    function geom() {
      const W = view.clientWidth || innerWidth, H = view.clientHeight || innerHeight, P0 = 1.5 * Math.max(W, H);
      G = { W, H, cx: W / 2, cy: H / 2, P0, Da: P0 * (1 / (1 - cfg.wall) - 1), Df: P0 * cfg.floor };
      G.Dc = G.Da * (1 - clamp(cfg.clouds, 0, 1));
    }
    function eye() { // where the eye is, in screen px; P = its distance from the glass
      const r = cfg.reach;
      return { x: G.cx + clamp(E.hx, -r, r) * G.W / 2, y: G.cy + clamp(E.hy, -r, r) * G.H / 2, P: G.P0 * (1 - clamp(E.lean, -.9, .9) * .4) };
    }

    /* ---- the camera: the map plane's scale + shift for this eye point ---- */
    function sync() {
      const w = cfg.wall + (Math.max(cfg.wall, cfg.fxWall) - cfg.wall) * clamp(E.dm, 0, 1);
      G.Da = G.P0 * (1 / (1 - clamp(w, 0, .6)) - 1); G.Dc = G.Da * (1 - clamp(cfg.clouds, 0, 1));
      const e = eye(), kA = e.P / (e.P + G.Da);
      world.om = kA; world.ox = e.x * (1 - kA); world.oy = e.y * (1 - kA);
      world.apply(); // -> onCamChange -> cam()
      walls(e, kA);
    }
    // A plane at screen depth d, as a transform inside the map stage (which already carries the map plane's view).
    function local(e, d) {
      const kA = world.om, s = world.s, k = e.P / (e.P + d), r = k / kA;
      return { r, x: (world.tx * (r - 1) + (e.x * (1 - k) - world.ox) / kA) / s, y: (world.ty * (r - 1) + (e.y * (1 - k) - world.oy) / kA) / s };
    }
    const tf = p => `translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px) scale(${p.r.toFixed(5)})`;

    // Runs after every camera move (pan, zoom, glide) and every eye move: puts each depth layer where it belongs.
    function cam() {
      if (dead) return legacyDots();
      const e = eye(), kA = world.om, s = world.s;
      // the sea floor, below the map: screen-sized, so it gets the plain screen-space version of the same maths
      const kF = e.P / (e.P + G.Da + G.Df);
      deep.style.transform = `translate(${(e.x * (1 - kF)).toFixed(2)}px,${(e.y * (1 - kF)).toFixed(2)}px) scale(${kF.toFixed(5)})`;
      dots.style.transform = `translate(${mod(world.tx).toFixed(1)}px,${mod(world.ty).toFixed(1)}px)`;
      if (clouds) clouds.style.transform = tf(local(e, G.Dc));
      // the locals: each one leans away from the eye in proportion to its height, like something standing up.
      // This restyles every local, so it's only on when they're big enough to see it (zoomed in) and quality allows.
      const leanOn = !!sprites && canLean && Q.level < 1 && s * kA > .3;
      if (leanOn !== leanState) { leanState = leanOn; document.body.classList.toggle("d3-nolean", !leanOn); }
      if (leanOn) {
        const g = s * kA * cfg.lean / (e.P + G.Da);
        const set = (k, v) => { if (varCache[k] !== v) { varCache[k] = v; sprites.style.setProperty(k, v); } };
        set("--ex", (((e.x - world.ox) / kA - world.tx) / s).toFixed(0));
        set("--ey", (((e.y - world.oy) / kA - world.ty) / s).toFixed(0));
        set("--g", g.toExponential(3));
      }
      // the cliff sides: the beach outline repeated a little deeper each time. On top of the true perspective, each layer
      // is also nudged down (and a touch sideways) so the islands always read as solid models with a visible cliff face,
      // even looking straight on; the head / mouse swings that face round. Only the cliffs and shadow move: the map,
      // labels, pins and clicks are untouched.
      if (cliff.length) {
        const T = Math.min(cfg.thick * s * kA, G.P0 * cfg.maxThick), n = cliff.length;
        const drop = Math.min(cfg.thick, G.H * cfg.maxDrop / (s * kA)); // in map px
        const dx = drop * clamp(cfg.tiltX + E.hx * cfg.head, -.9, .9), dy = drop * clamp(cfg.tilt + E.hy * cfg.head, -.15, .95);
        const put = (u, p, f) => { const t = `matrix(${p.r.toFixed(5)} 0 0 ${p.r.toFixed(5)} ${(p.x + dx * f).toFixed(1)} ${(p.y + dy * f).toFixed(1)})`; if (u._t !== t) { u._t = t; u.setAttribute("transform", t); } };
        cliff.forEach((u, i) => { const f = (n - i) / n; put(u, local(e, G.Da + T * f), f); });
        if (shade) put(shade, local(e, G.Da + T), 1.45);
      }
    }
    function legacyDots() { // the flat site's sea dots, exactly as before
      if (!dots) return;
      dots.style.transform = `translate(${mod(world.tx + world.ox).toFixed(1)}px,${mod(world.ty + world.oy).toFixed(1)}px)`;
    }

    /* ---- the box: walls running from the screen's edges back to the map ---- */
    function buildBox() {
      box = document.createElementNS(NS, "svg");
      box.id = "box"; box.setAttribute("aria-hidden", "true"); box.setAttribute("preserveAspectRatio", "none");
      const grad = (id, x2, y2, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
      // light from the top left; each wall darkens as it goes back
      box.innerHTML = `<defs>${grad("bx-l", 1, 0, "#2F86F1", "#0A4FAE")}${grad("bx-t", 0, 1, "#1863C9", "#073B86")}
        <linearGradient id="bx-r" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#1B6BD3"/><stop offset="1" stop-color="#083F8F"/></linearGradient>
        <linearGradient id="bx-b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3A92F4"/><stop offset="1" stop-color="#0B55B6"/></linearGradient></defs>
        <polygon class="bx-w" fill="url(#bx-t)"/><polygon class="bx-w" fill="url(#bx-b)"/><polygon class="bx-w" fill="url(#bx-l)"/><polygon class="bx-w" fill="url(#bx-r)"/>
        <path class="bx-grid"/><path class="bx-ring"/><path class="bx-seam"/><path class="bx-ao bx-ao1"/><path class="bx-ao bx-ao2"/><path class="bx-back"/>`;
      view.appendChild(box);
    }
    function walls(e, kA) {
      if (!box) return;
      const { W, H } = G, key = [W, H, e.x.toFixed(1), e.y.toFixed(1), e.P.toFixed(1), G.Da.toFixed(1)].join();
      if (key === wallKey) return; wallKey = key;
      box.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const at = k => [e.x * (1 - k), e.y * (1 - k), e.x * (1 - k) + W * k, e.y * (1 - k) + H * k]; // the screen rect at depth
      const f = v => v.toFixed(1), [x0, y0, x1, y1] = at(kA);
      const pg = box.querySelectorAll("polygon");
      pg[0].setAttribute("points", `0,0 ${W},0 ${f(x1)},${f(y0)} ${f(x0)},${f(y0)}`);
      pg[1].setAttribute("points", `0,${H} ${f(x0)},${f(y1)} ${f(x1)},${f(y1)} ${W},${H}`);
      pg[2].setAttribute("points", `0,0 ${f(x0)},${f(y0)} ${f(x0)},${f(y1)} 0,${H}`);
      pg[3].setAttribute("points", `${W},0 ${W},${H} ${f(x1)},${f(y1)} ${f(x1)},${f(y0)}`);
      const rect = r => `M${f(r[0])},${f(r[1])}H${f(r[2])}V${f(r[3])}H${f(r[0])}Z`;
      // tile lines: rings part-way down the walls, plus lines running from the screen edge back to the map, so the walls
      // read like a tiled room going back into the screen
      const rings = cfg.grid ? [1, 2, 3, 4, 5, 6].map(i => i / 7) : [.34, .67];
      box.querySelector(".bx-ring").setAttribute("d", rings.map(t => rect(at(e.P / (e.P + G.Da * t)))).join(""));
      let gd = "";
      if (cfg.grid && Q.level < 2) {
        const N = 12, M = 7, bx = u => e.x * (1 - kA) + u * kA, by = v => e.y * (1 - kA) + v * kA;
        for (let i = 1; i < N; i++) { const u = W * i / N; gd += `M${f(u)},0L${f(bx(u))},${f(y0)}M${f(u)},${H}L${f(bx(u))},${f(y1)}`; }
        for (let i = 1; i < M; i++) { const v = H * i / M; gd += `M0,${f(v)}L${f(x0)},${f(by(v))}M${W},${f(v)}L${f(x1)},${f(by(v))}`; }
      }
      box.querySelector(".bx-grid").setAttribute("d", gd);
      box.querySelector(".bx-seam").setAttribute("d", `M0,0L${f(x0)},${f(y0)}M${W},0L${f(x1)},${f(y0)}M${W},${H}L${f(x1)},${f(y1)}M0,${H}L${f(x0)},${f(y1)}`);
      const back = rect([x0, y0, x1, y1]);
      box.querySelectorAll(".bx-ao,.bx-back").forEach(p => p.setAttribute("d", back));
    }

    /* ---- the island cliffs: called once the coastline exists (applyCoast in app.js) ---- */
    function coast(beachD) {
      const svg = $("#coast-old"), top = svg && svg.querySelector(".c-beach");
      if (!svg || !top || !beachD) return;
      lastBeach = beachD;
      ["#d3-cliff", "#d3-shadow"].forEach(s => { const old = svg.querySelector(s); if (old) old.remove(); });
      let defs = svg.querySelector("defs"); if (!defs) { defs = document.createElementNS(NS, "defs"); svg.prepend(defs); }
      let shape = defs.querySelector("#d3-cliff-shape");
      if (!shape) { shape = document.createElementNS(NS, "path"); shape.id = "d3-cliff-shape"; shape.setAttribute("fill-rule", "evenodd"); defs.appendChild(shape); }
      shape.setAttribute("d", beachD);
      const g = document.createElementNS(NS, "g"); g.id = "d3-cliff";
      const n = Math.max(2, Math.round(Q.level >= 2 ? Math.min(3, cfg.slices) : cfg.slices)), mix = (a, b, t) => Math.round(a + (b - a) * t);
      cliff = [];
      // deepest first; earthy brown at the bottom, sandy near the top. Plain fills only (an outline stroke on a path
      // this big is far more expensive to draw than the fill), except the ink line round the very bottom.
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), u = document.createElementNS(NS, "use");
        u.setAttribute("href", "#d3-cliff-shape");
        u.setAttribute("style", i === 0 ? "fill:#7A4A22;stroke:#111;stroke-width:9;stroke-linejoin:round" : `fill:rgb(${mix(150, 226, t)},${mix(96, 170, t)},${mix(48, 112, t)})`);
        g.appendChild(u); cliff.push(u);
      }
      // the shadow the islands cast on the shallow water: one dark copy of the outline under the cliffs
      shade = null;
      if (cfg.shadow > 0 && Q.level < 1) {
        const sg = document.createElementNS(NS, "use"); sg.id = "d3-shadow";
        sg.setAttribute("href", "#d3-cliff-shape");
        sg.setAttribute("style", `fill:#022A63;opacity:${clamp(cfg.shadow, 0, 1)}`);
        svg.insertBefore(sg, top); shade = sg;
      }
      svg.insertBefore(g, top);
      cam();
    }

    /* ---- the eye ---- */
    function settle(now) { // eases the eye toward its target (the mouse's, or back to the middle)
      raf = 0; perf(now);
      const dt = last ? Math.min(.1, (now - last) / 1000) : 1 / 60; last = now;
      const k = 1 - Math.exp(-dt * 6);
      E.hx += (E.thx - E.hx) * k; E.hy += (E.thy - E.hy) * k; E.lean += (E.tl - E.lean) * k; E.dm += (E.tdm - E.dm) * k;
      const done = Math.abs(E.thx - E.hx) + Math.abs(E.thy - E.hy) + Math.abs(E.tl - E.lean) + Math.abs(E.tdm - E.dm) < .0015;
      if (done) { E.hx = E.thx; E.hy = E.thy; E.lean = E.tl; E.dm = E.tdm; }
      sync();
      if (!done) raf = requestAnimationFrame(settle); else { last = 0; Q.lastT = 0; }
    }
    function aim(hx, hy, lean) { E.thx = hx; E.thy = hy; E.tl = lean; if (!raf) raf = requestAnimationFrame(settle); }
    function mouse(e) {
      if (dead || o.reduce || o.isFx() || !o.isActive() || e.pointerType !== "mouse" || e.buttons) return;
      aim((e.clientX / G.W - .5) * 2 * cfg.mouse, (e.clientY / G.H - .5) * 2 * cfg.mouse, 0);
    }

    let offing = false;
    function off(err) { // something went wrong: go flat and stay flat
      if (offing) return; offing = true;
      if (err) console.warn("Depth: switched off, the map stays flat.", err);
      dead = true; cancelAnimationFrame(raf); raf = 0; cliff = []; shade = null;
      const sh = document.querySelector("#d3-shadow"); if (sh) sh.remove();
      document.body.classList.remove("d3");
      if (box) { box.remove(); box = null; }
      const c = document.querySelector("#d3-cliff"); if (c) c.remove();
      [deep, clouds].forEach(el => { if (el) el.style.transform = ""; });
      world.om = 1; world.ox = world.oy = 0;
      try { world.apply(); } catch (e) {}
      offing = false;
    }
    const safe = fn => (...a) => { try { return fn(...a); } catch (err) { off(err); } };

    const api = {
      on: () => !dead,
      cam: safe(cam),
      coast: safe(b => { if (!dead) coast(b); }),
      resize: safe(() => { if (dead) return; geom(); wallKey = ""; sync(); }),
      // the full experience feeds the head position here every frame (already smoothed): hx, hy -1..1, lean + = closer
      head: safe((hx, hy, lean) => {
        if (dead) { // the flat site's old version: slide the whole map
          const ox = hx * innerWidth * .3, oy = hy * innerHeight * .26;
          if (Math.abs(ox - world.ox) > .3 || Math.abs(oy - world.oy) > .3) { world.ox = ox; world.oy = oy; world.apply(); }
          return;
        }
        cancelAnimationFrame(raf); raf = 0; last = 0; perf(performance.now());
        let dm = E.dm + (E.tdm - E.dm) * .07; if (Math.abs(E.tdm - dm) < .002) dm = E.tdm; // the box deepens over ~half a second
        const moved = Math.abs(hx - E.hx) + Math.abs(hy - E.hy) + Math.abs(lean - E.lean) + Math.abs(dm - E.dm) > .0008;
        E.hx = E.thx = hx; E.hy = E.thy = hy; E.lean = E.tl = lean; E.dm = dm;
        if (moved) sync();
      }),
      // View full experience on/off: the box opens up into a deep room, and closes back to the normal shallow one
      fx: safe(on => {
        if (dead) return;
        E.tdm = on ? 1 : 0;
        if (o.isActive() && !raf) raf = requestAnimationFrame(settle);
      }),
      rest: safe(() => {
        if (dead) { if (world.ox || world.oy) { world.ox = world.oy = 0; world.apply(); } return; }
        aim(0, 0, 0);
      })
    };

    if (!dead) {
      try {
        geom(); buildBox();
        document.body.classList.add("d3");
        window.addEventListener("pointermove", safe(mouse), { passive: true });
        document.documentElement.addEventListener("mouseleave", () => { if (!dead && !o.isFx()) aim(0, 0, 0); });
        sync();
      } catch (err) { off(err); }
    }
    return api;
  };
})();
