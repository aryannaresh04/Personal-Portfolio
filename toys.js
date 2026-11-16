/* Working models: one small interactive toy per internship / featured project.
   Each one is a simplified model of the real thing's core idea. No dependencies. */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ACC = '94, 255, 160';
  const BAD = '255, 107, 107';
  const WARN = '255, 200, 87';
  const T1 = '#e6e6ea';
  const T3 = '#8a8a94';
  const LINE = 'rgba(255, 255, 255, 0.14)';
  const FAINT = 'rgba(255, 255, 255, 0.075)';
  const MONO = '"Geist Mono", ui-monospace, Menlo, Consolas, monospace';

  /* ---------- Shared helpers ---------- */
  const el = (tag, attrs, ...kids) => {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    });
    kids.flat().forEach((kid) => { if (kid != null) node.append(kid); });
    return node;
  };

  const shell = (root, title) => {
    const status = el('span', { class: 'label acc' });
    const body = el('div', { class: 'toy-b' });
    const ctl = el('div', { class: 'ctl' });
    const meters = el('div', { class: 'meters' });
    const note = el('p', { class: 'note' });
    root.append(el('div', { class: 'toy-h' }, el('span', { class: 'label', text: title }), status), body, ctl, meters, note);
    return { status, body, ctl, meters, note };
  };

  const meter = (parent, label) => {
    const value = el('b', { text: '0' });
    parent.append(el('div', { class: 'meter' }, el('span', { text: label }), value));
    return value;
  };

  const seg = (parent, label, options, initial, onChange) => {
    const wrap = el('div', { class: 'seg', role: 'group', 'aria-label': label });
    const buttons = options.map(([value, text]) => {
      const btn = el('button', { type: 'button', text, 'aria-pressed': String(value === initial) });
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        onChange(value);
      });
      return btn;
    });
    wrap.append(...buttons);
    parent.append(wrap);
    return {
      set: (value) => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === value)))
    };
  };

  const button = (parent, text, onClick, extra = '') => {
    const btn = el('button', { type: 'button', class: `tbtn ${extra}`.trim(), text, onclick: onClick });
    parent.append(btn);
    return btn;
  };

  // Runs frame(dtSeconds, nowMs) only while the toy is on screen and the tab is visible.
  const loop = (root, frame) => {
    let visible = false;
    let raf = 0;
    let last = 0;
    const run = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frame(dt, now);
      raf = requestAnimationFrame(run);
    };
    const update = () => {
      const on = visible && !document.hidden;
      if (on && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(run);
      } else if (!on && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        update();
      }).observe(root);
    } else {
      visible = true;
    }
    document.addEventListener('visibilitychange', update);
    update();
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* =====================================================================
     1. Siemens: TC Monitor. Kill a service, watch what it takes down,
        and compare live streaming with manual polling.
     ===================================================================== */
  const monitorToy = (root) => {
    const ui = shell(root, 'Working model / dependency map');
    const SERVICES = [
      ['database', 0, []], ['license', 0, []], ['volume', 0, []],
      ['file-server', 1, ['volume']], ['pool-manager', 1, ['database', 'license']], ['search', 1, ['database']],
      ['web-tier', 2, ['pool-manager']], ['dispatcher', 2, ['pool-manager', 'file-server']], ['workflow', 2, ['pool-manager']],
      ['gateway', 3, ['web-tier', 'search', 'file-server']], ['visualization', 3, ['dispatcher', 'file-server']], ['reports', 3, ['web-tier', 'workflow']]
    ];
    const deps = Object.fromEntries(SERVICES.map(([name, , d]) => [name, d]));
    const POLL = 5; // seconds here stand in for the 5 minutes of manual polling

    const down = new Set();       // what is really down
    let shownDown = new Set();    // what the dashboard knows about
    const killedAt = {};
    let mode = 'sse';
    let pollT = 0;
    let lastDetect = null;

    const NS = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs) => {
      const node = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
      return node;
    };
    const svg = svgEl('svg', { class: 'mon', role: 'group', 'aria-label': 'Service dependency map' });
    ui.body.append(svg);
    let nodes = {};
    let edges = [];
    let wide = null;

    const build = (isWide) => {
      wide = isWide;
      svg.textContent = '';
      nodes = {};
      edges = [];
      svg.classList.toggle('narrow', !isWide);
      const W = isWide ? 1000 : 360;
      const H = isWide ? 250 : 400;
      const bw = isWide ? 176 : 108;
      const bh = isWide ? 36 : 32;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const pos = {};
      const perLayer = [0, 0, 0, 0];
      SERVICES.forEach(([name, layer]) => {
        const i = perLayer[layer]++;
        pos[name] = isWide
          ? { x: 104 + layer * 264, y: 50 + i * 75 }
          : { x: 62 + i * 118, y: 44 + layer * 104 };
      });
      SERVICES.forEach(([name, , d]) => {
        d.forEach((dep) => {
          const a = pos[dep];
          const b = pos[name];
          const path = isWide
            ? `M${a.x + bw / 2} ${a.y} C${a.x + bw / 2 + 50} ${a.y}, ${b.x - bw / 2 - 50} ${b.y}, ${b.x - bw / 2} ${b.y}`
            : `M${a.x} ${a.y + bh / 2} C${a.x} ${a.y + bh / 2 + 36}, ${b.x} ${b.y - bh / 2 - 36}, ${b.x} ${b.y - bh / 2}`;
          const edge = svgEl('path', { d: path, class: 'mon-e' });
          svg.append(edge);
          edges.push({ edge, from: dep, to: name });
        });
      });
      SERVICES.forEach(([name]) => {
        const p = pos[name];
        const g = svgEl('g', { class: 'mon-n', tabindex: '0', role: 'button' });
        g.append(
          svgEl('rect', { x: p.x - bw / 2, y: p.y - bh / 2, width: bw, height: bh }),
          svgEl('rect', { class: 'led', x: p.x - bw / 2 + 9, y: p.y - 3, width: 6, height: 6 })
        );
        const label = svgEl('text', { x: p.x - bw / 2 + 22, y: p.y + 4 });
        label.textContent = name;
        g.append(label);
        const toggle = () => {
          if (down.has(name)) {
            down.delete(name);
          } else {
            down.add(name);
            killedAt[name] = performance.now();
          }
          if (mode === 'sse') sync();
          render();
        };
        g.addEventListener('click', toggle);
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
        svg.append(g);
        nodes[name] = g;
      });
      render();
    };

    const impactedBy = (set) => {
      const memo = {};
      const hit = (name) => {
        if (name in memo) return memo[name];
        memo[name] = false;
        memo[name] = deps[name].some((d) => set.has(d) || hit(d));
        return memo[name];
      };
      return (name) => !set.has(name) && hit(name);
    };

    // The dashboard catches up with reality (instantly over SSE, once per sweep when polling).
    const sync = () => {
      const now = performance.now();
      down.forEach((name) => {
        if (!shownDown.has(name)) lastDetect = (now - killedAt[name]) / 1000;
      });
      shownDown = new Set(down);
    };

    const mHealthy = meter(ui.meters, 'Healthy');
    const mDown = meter(ui.meters, 'Down');
    const mImpacted = meter(ui.meters, 'Taken down with it');
    const mDetect = meter(ui.meters, 'Time to detect');

    const render = () => {
      const impacted = impactedBy(shownDown);
      let nDown = 0;
      let nImp = 0;
      SERVICES.forEach(([name]) => {
        const isDown = shownDown.has(name);
        const isImp = impacted(name);
        if (isDown) nDown++;
        if (isImp) nImp++;
        const g = nodes[name];
        g.setAttribute('class', `mon-n${isDown ? ' down' : isImp ? ' impacted' : ''}${down.has(name) !== isDown ? ' stale' : ''}`);
        g.setAttribute('aria-label', `${name}: ${isDown ? 'down' : isImp ? 'impacted' : 'healthy'}. Press to ${down.has(name) ? 'restore' : 'take down'}.`);
      });
      edges.forEach(({ edge, from }) => {
        edge.setAttribute('class', `mon-e${shownDown.has(from) || impacted(from) ? ' bad' : ''}`);
      });
      mHealthy.textContent = SERVICES.length - nDown - nImp;
      mDown.textContent = nDown;
      mDown.className = nDown ? 'bad' : '';
      mImpacted.textContent = nImp;
      mImpacted.className = nImp ? 'warn' : '';
      if (lastDetect == null) mDetect.textContent = '-';
      else if (mode === 'sse') mDetect.textContent = 'near-instant';
      else mDetect.textContent = `~${Math.max(0.1, lastDetect).toFixed(1)} min`;
      const pending = [...down].filter((n) => !shownDown.has(n)).length + [...shownDown].filter((n) => !down.has(n)).length;
      ui.status.textContent = pending
        ? `${pending} change${pending > 1 ? 's' : ''} not detected yet`
        : nDown ? `${nDown} down / ${nImp} impacted` : 'All services healthy';
    };

    seg(ui.ctl, 'How the dashboard gets its data', [['sse', 'Live stream (SSE)'], ['poll', 'Manual polling']], 'sse', (value) => {
      mode = value;
      pollT = 0;
      lastDetect = null;
      bar.parentNode.hidden = mode !== 'poll';
      if (mode === 'sse') sync();
      render();
    });
    button(ui.ctl, 'Fail a random service', () => {
      const up = SERVICES.map((s) => s[0]).filter((n) => !down.has(n));
      if (!up.length) return;
      const name = pick(up);
      down.add(name);
      killedAt[name] = performance.now();
      if (mode === 'sse') sync();
      render();
    });
    button(ui.ctl, 'Restore all', () => {
      down.clear();
      if (mode === 'sse') sync();
      render();
    });
    const bar = el('i');
    ui.ctl.append(el('div', { class: 'poll', hidden: '' }, el('span', { class: 'label', text: 'Next poll' }), el('span', { class: 'poll-bar' }, bar)));

    ui.note.textContent = 'Click a service to take it down and see everything that depends on it go with it. Switch to manual polling to feel the difference: the dashboard only notices on the next sweep (1 second here stands for 1 minute). Simplified model with made-up service names, not the client\'s environment.';

    const check = () => {
      const isWide = ui.body.clientWidth >= 760;
      if (isWide !== wide) build(isWide);
    };
    if ('ResizeObserver' in window) new ResizeObserver(check).observe(ui.body);
    check();

    loop(root, (dt) => {
      if (mode !== 'poll') return;
      pollT += dt;
      if (pollT >= POLL) {
        pollT = 0;
        sync();
        render();
      }
      bar.style.transform = `scaleX(${pollT / POLL})`;
    });
  };

  /* =====================================================================
     2. CoreEL: five flight instruments. Replays a recorded flight, or
        take the stick and fly it.
     ===================================================================== */
  const flightToy = (root) => {
    const ui = shell(root, 'Working model / flight instruments');
    const canvas = el('canvas', { 'aria-label': 'Airspeed, attitude, altimeter, heading and vertical speed instruments' });
    ui.body.append(canvas);
    const ctx = canvas.getContext('2d');
    let W = 0;
    let H = 0;

    const s = { roll: 0, pitch: 0, hdg: 90, alt: 4500, spd: 150, vs: 0 };
    const stick = { x: 0, y: 0 };
    let mode = reduced ? 'fly' : 'replay';
    let replayT = 0;
    // [seconds, roll, pitch] recorded track, looped.
    const TRACK = [[0, 0, 0], [2, 0, 0], [4, 25, 0], [8, 25, 2], [10, 0, 6], [13, 0, 6], [15, -30, 0], [19, -30, -2], [21, 0, -6], [23, 0, -4], [24, 0, 0]];
    const TRACK_LEN = 24;
    const sample = (t) => {
      for (let i = 1; i < TRACK.length; i++) {
        if (t <= TRACK[i][0]) {
          const a = TRACK[i - 1];
          const b = TRACK[i];
          const f = (t - a[0]) / (b[0] - a[0]);
          return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
        }
      }
      return [0, 0];
    };

    const resize = () => {
      const w = canvas.clientWidth;
      if (!w) return;
      const perRow = w >= 640 ? 5 : 3;
      const rows = Math.ceil(5 / perRow);
      const r = Math.min(w / perRow / 2 - 10, 92);
      const h = Math.round(rows * (r * 2 + 40) + 14);
      if (canvas.style.height !== `${h}px`) canvas.style.height = `${h}px`;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w;
      H = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    // Angles: 0 points up, positive is clockwise.
    const polar = (cx, cy, len, a) => [cx + Math.sin(a) * len, cy - Math.cos(a) * len];
    const rad = (deg) => (deg * Math.PI) / 180;

    const face = (cx, cy, r, label) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0b0b0e';
      ctx.fill();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = T3;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy + r + 16);
    };
    const tick = (cx, cy, r, a, len, color = T3, width = 1) => {
      const [x1, y1] = polar(cx, cy, r - 3, a);
      const [x2, y2] = polar(cx, cy, r - 3 - len, a);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    const needle = (cx, cy, len, a) => {
      const [x, y] = polar(cx, cy, len, a);
      const [bx, by] = polar(cx, cy, -len * 0.18, a);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(x, y);
      ctx.strokeStyle = `rgb(${ACC})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgba(${ACC}, 0.7)`;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = T1;
      ctx.fill();
    };
    const text = (str, x, y, size = 10, color = T1) => {
      ctx.fillStyle = color;
      ctx.font = `${size}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(str, x, y);
    };
    const readout = (str, cx, cy, r) => {
      const w = r * 0.72;
      ctx.fillStyle = '#131317';
      ctx.fillRect(cx - w / 2, cy + r * 0.34, w, 16);
      ctx.strokeStyle = LINE;
      ctx.strokeRect(cx - w / 2 + 0.5, cy + r * 0.34 + 0.5, w - 1, 15);
      text(str, cx, cy + r * 0.34 + 8.5, 10, `rgb(${ACC})`);
    };

    const airspeed = (cx, cy, r) => {
      face(cx, cy, r, 'AIRSPEED kt');
      for (let v = 40; v <= 240; v += 10) {
        const a = rad(-135 + ((v - 40) / 200) * 270);
        const major = v % 40 === 0;
        tick(cx, cy, r, a, major ? 9 : 5, major ? T1 : T3);
        if (major) { const [x, y] = polar(cx, cy, r - 22, a); text(String(v), x, y, 9, T3); }
      }
      needle(cx, cy, r - 14, rad(-135 + ((clamp(s.spd, 40, 240) - 40) / 200) * 270));
    };

    const attitude = (cx, cy, r) => {
      face(cx, cy, r, 'ATTITUDE');
      const px = r / 28; // pixels per degree of pitch
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(cx, cy);
      ctx.rotate(rad(-s.roll));
      ctx.translate(0, s.pitch * px);
      ctx.fillStyle = '#10283a';
      ctx.fillRect(-r * 2, -r * 4, r * 4, r * 4);
      ctx.fillStyle = '#2b2012';
      ctx.fillRect(-r * 2, 0, r * 4, r * 4);
      ctx.strokeStyle = T1;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 2, 0);
      ctx.lineTo(r * 2, 0);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      for (let p = -20; p <= 20; p += 5) {
        if (p === 0) continue;
        const half = p % 10 === 0 ? r * 0.3 : r * 0.15;
        ctx.beginPath();
        ctx.moveTo(-half, -p * px);
        ctx.lineTo(half, -p * px);
        ctx.stroke();
      }
      ctx.restore();
      // Fixed aircraft symbol and roll pointer.
      ctx.strokeStyle = `rgb(${ACC})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy);
      ctx.lineTo(cx - r * 0.16, cy);
      ctx.lineTo(cx - r * 0.16, cy + 6);
      ctx.moveTo(cx + r * 0.5, cy);
      ctx.lineTo(cx + r * 0.16, cy);
      ctx.lineTo(cx + r * 0.16, cy + 6);
      ctx.stroke();
      ctx.fillStyle = `rgb(${ACC})`;
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
      [-45, -30, -15, 0, 15, 30, 45].forEach((d) => tick(cx, cy, r, rad(d), d % 30 === 0 ? 8 : 5, T1));
      const [tx, ty] = polar(cx, cy, r - 13, rad(-s.roll));
      ctx.beginPath();
      ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${ACC})`;
      ctx.fill();
    };

    const altimeter = (cx, cy, r) => {
      face(cx, cy, r, 'ALTITUDE ft');
      for (let i = 0; i < 50; i++) {
        const major = i % 5 === 0;
        tick(cx, cy, r, rad(i * 7.2), major ? 9 : 4, major ? T1 : T3);
        if (major) { const [x, y] = polar(cx, cy, r - 22, rad(i * 7.2)); text(String(i / 5), x, y, 9, T3); }
      }
      readout(String(Math.round(s.alt / 10) * 10), cx, cy, r);
      needle(cx, cy, r - 14, rad(((s.alt % 1000) / 1000) * 360));
    };

    const heading = (cx, cy, r) => {
      face(cx, cy, r, 'HEADING');
      const names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
      for (let d = 0; d < 360; d += 10) {
        const a = rad(d - s.hdg);
        const major = d % 30 === 0;
        tick(cx, cy, r, a, major ? 9 : 5, major ? T1 : T3);
        if (major) {
          const [x, y] = polar(cx, cy, r - 22, a);
          text(names[d] || String(d / 10), x, y, 9, names[d] ? `rgb(${ACC})` : T3);
        }
      }
      ctx.fillStyle = `rgb(${ACC})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r + 3);
      ctx.lineTo(cx - 5, cy - r - 5);
      ctx.lineTo(cx + 5, cy - r - 5);
      ctx.fill();
      // Aircraft outline in the middle.
      ctx.strokeStyle = T1;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx, cy + 10);
      ctx.moveTo(cx - 11, cy);
      ctx.lineTo(cx + 11, cy);
      ctx.moveTo(cx - 5, cy + 9);
      ctx.lineTo(cx + 5, cy + 9);
      ctx.stroke();
      readout(`${String(Math.round(s.hdg) % 360).padStart(3, '0')}°`, cx, cy, r);
    };

    const vsi = (cx, cy, r) => {
      face(cx, cy, r, 'VERT SPEED x1000 fpm');
      [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2].forEach((v) => {
        const a = rad(-90 + v * 75);
        const major = Number.isInteger(v);
        tick(cx, cy, r, a, major ? 9 : 5, major ? T1 : T3);
        if (major) { const [x, y] = polar(cx, cy, r - 22, a); text(String(Math.abs(v)), x, y, 9, T3); }
      });
      text('UP', cx - r * 0.2, cy - r * 0.3, 8, T3);
      text('DN', cx - r * 0.2, cy + r * 0.3, 8, T3);
      needle(cx, cy, r - 14, rad(-90 + clamp(s.vs / 1000, -2, 2) * 75));
    };

    const draw = () => {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      const perRow = W >= 640 ? 5 : 3;
      const r = Math.min(W / perRow / 2 - 10, 92);
      const gauges = [airspeed, attitude, altimeter, heading, vsi];
      gauges.forEach((gauge, i) => {
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, 5 - row * perRow);
        const col = i - row * perRow;
        const cell = W / inRow;
        gauge(cell * (col + 0.5), 12 + r + row * (r * 2 + 40), r);
      });
    };

    // Controls
    const modeSeg = seg(ui.ctl, 'Flight source', [['replay', 'Replay recorded flight'], ['fly', 'Fly it yourself']], mode, (value) => { mode = value; });
    const knob = el('i');
    const pad = el('div', { class: 'stick', tabindex: '0', role: 'application', 'aria-label': 'Control stick. Drag, or use the arrow keys, to pitch and roll.' }, knob);
    ui.ctl.append(el('div', { class: 'stick-w' }, pad, el('span', { class: 'label', text: 'Stick: drag or arrow keys' })));
    let dragging = false;
    const setStick = (x, y) => {
      stick.x = clamp(x, -1, 1);
      stick.y = clamp(y, -1, 1);
      knob.style.transform = `translate(${stick.x * 30}px, ${stick.y * 30}px)`;
    };
    const fromEvent = (e) => {
      const r = pad.getBoundingClientRect();
      setStick(((e.clientX - r.left) / r.width - 0.5) * 2.4, ((e.clientY - r.top) / r.height - 0.5) * 2.4);
    };
    const takeControl = () => {
      if (mode !== 'fly') { mode = 'fly'; modeSeg.set('fly'); }
    };
    pad.addEventListener('pointerdown', (e) => {
      dragging = true;
      pad.setPointerCapture(e.pointerId);
      takeControl();
      fromEvent(e);
    });
    pad.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
    const release = () => { dragging = false; setStick(0, 0); };
    pad.addEventListener('pointerup', release);
    pad.addEventListener('pointercancel', release);
    const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    pad.addEventListener('keydown', (e) => {
      if (!keys[e.key]) return;
      e.preventDefault();
      takeControl();
      setStick(keys[e.key][0] || stick.x, keys[e.key][1] || stick.y);
    });
    pad.addEventListener('keyup', (e) => { if (keys[e.key]) setStick(0, 0); });
    pad.addEventListener('blur', () => setStick(0, 0));

    const mSpd = meter(ui.meters, 'Airspeed');
    const mAlt = meter(ui.meters, 'Altitude');
    const mHdg = meter(ui.meters, 'Heading');
    const mVs = meter(ui.meters, 'Vertical speed');

    ui.note.textContent = 'Five instruments, like the 2D navigation panel: airspeed, attitude, altimeter, heading and vertical speed. Let it replay a recorded flight, or drag the stick (pull down to climb). The flight model is a toy, and time runs fast.';

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    resize();

    loop(root, (dt) => {
      let rollT;
      let pitchT;
      if (mode === 'replay') {
        replayT = (replayT + dt) % TRACK_LEN;
        [rollT, pitchT] = sample(replayT);
        const sec = Math.floor(replayT);
        ui.status.textContent = `Replaying 00:${String(sec).padStart(2, '0')} / 00:${TRACK_LEN}`;
      } else {
        rollT = stick.x * 45;
        pitchT = stick.y * 14;
        ui.status.textContent = 'You have control';
      }
      s.roll += (rollT - s.roll) * Math.min(1, dt * 3);
      s.pitch += (pitchT - s.pitch) * Math.min(1, dt * 2.2);
      s.hdg = (s.hdg + s.roll * 0.35 * dt + 360) % 360;
      s.vs += (s.pitch * 220 - s.vs) * Math.min(1, dt * 2);
      s.alt = clamp(s.alt + (s.vs / 60) * dt * 8, 500, 9500);
      s.spd += (150 - s.pitch * 3 - s.spd) * Math.min(1, dt * 0.8);
      mSpd.textContent = `${Math.round(s.spd)} kt`;
      mAlt.textContent = `${Math.round(s.alt / 10) * 10} ft`;
      mHdg.textContent = `${String(Math.round(s.hdg) % 360).padStart(3, '0')}°`;
      mVs.textContent = `${s.vs >= 0 ? '+' : '-'}${Math.abs(Math.round(s.vs / 10) * 10)} fpm`;
      draw();
    });
  };

  /* =====================================================================
     3. cachedb: write-ahead log, group commit, LSM tree. Write to it,
        then pull the plug and see what survives.
     ===================================================================== */
  const walToy = (root) => {
    const ui = shell(root, 'Working model / write path');
    const MEM_CAP = 32;
    const TICK = 0.07;
    const GROUP = 22; // group commit syncs up to 22 writes at once: the real speed-up

    let mem = new Map();
    let wal = [];
    let sst = [];              // newest first; each file is a Map
    const truth = new Map();   // every confirmed write, used to verify recovery
    let queue = 0;
    let mode = 'group';
    let compaction = false;
    let confirmed = 0;
    let lost = 0;
    let lastChecked = null;
    let busy = false;          // crashed / recovering
    let acc = 0;
    let dirty = true;

    const memCells = el('div', { class: 'cells' });
    const walCells = el('div', { class: 'cells' });
    const sstBox = el('div', { class: 'ssts' });
    const memCount = el('span', { class: 'label' });
    const walCount = el('span', { class: 'label' });
    const sstCount = el('span', { class: 'label' });
    const viz = el('div', { class: 'lsm' },
      el('div', { class: 'lsm-c ram' }, el('div', { class: 'lsm-h' }, el('span', { class: 'label acc', text: 'Memtable / RAM' }), memCount), memCells),
      el('div', { class: 'lsm-c' }, el('div', { class: 'lsm-h' }, el('span', { class: 'label acc', text: 'Write-ahead log / disk' }), walCount), walCells),
      el('div', { class: 'lsm-c' }, el('div', { class: 'lsm-h' }, el('span', { class: 'label acc', text: 'SSTable files / disk' }), sstCount), sstBox)
    );
    const log = el('div', { class: 'tlog', 'aria-live': 'polite' });
    ui.body.append(viz, log);
    for (let i = 0; i < MEM_CAP; i++) { memCells.append(el('i')); walCells.append(el('i')); }

    const lines = [];
    const say = (line) => {
      lines.push(line);
      while (lines.length > 3) lines.shift();
      log.textContent = '';
      lines.forEach((l) => log.append(el('div', { text: l })));
    };

    const lookup = (key) => {
      if (mem.has(key)) return { value: mem.get(key), checked: 0 };
      for (let i = 0; i < sst.length; i++) {
        if (sst[i].has(key)) return { value: sst[i].get(key), checked: i + 1 };
      }
      return { value: null, checked: sst.length };
    };

    const flush = () => {
      sst.unshift(new Map(mem));
      mem = new Map();
      wal = [];
      if (compaction) compact(true);
    };

    // Size-tiered, simplified: once four files pile up, merge them into one.
    const compact = (auto) => {
      if (sst.length < (auto ? 4 : 2)) return false;
      const merged = new Map();
      for (let i = sst.length - 1; i >= 0; i--) sst[i].forEach((v, k) => merged.set(k, v));
      const before = sst.length;
      sst = [merged];
      say(`compaction: merged ${before} files into 1`);
      return true;
    };

    const write = (n) => {
      for (let i = 0; i < n; i++) {
        const key = `user:${Math.floor(Math.random() * 400)}`;
        const value = Math.random().toString(16).slice(2, 6);
        wal.push(key);          // 1. append to the log
        mem.set(key, value);    // 2. apply in memory
        truth.set(key, value);  // 3. fsync returns, the client is told OK
        confirmed++;
        if (mem.size >= MEM_CAP) flush();
      }
      dirty = true;
    };

    const crash = () => {
      if (busy) return;
      busy = true;
      const dropped = queue;
      queue = 0;
      const replay = wal.slice();
      const values = new Map(mem);
      mem = new Map();        // RAM is gone
      viz.classList.add('crash');
      ui.status.textContent = 'Power lost';
      say(`-- power cut. memtable gone${dropped ? `, ${dropped} unconfirmed writes dropped` : ''}`);
      dirty = true;
      setTimeout(() => {
        viz.classList.remove('crash');
        ui.status.textContent = 'Replaying the log';
        // Recovery: rebuild the memtable from the write-ahead log.
        replay.forEach((key) => mem.set(key, values.get(key)));
        // Verify every write the client was told succeeded.
        let missing = 0;
        truth.forEach((value, key) => { if (lookup(key).value !== value) missing++; });
        lost += missing;
        say(`restart: replayed ${replay.length} log ${replay.length === 1 ? 'entry' : 'entries'}. confirmed writes lost: ${missing}`);
        busy = false;
        dirty = true;
      }, reduced ? 0 : 900);
    };

    button(ui.ctl, 'SET x1', () => { if (!busy) queue += 1; });
    button(ui.ctl, 'Burst x200', () => { if (!busy) queue += 200; });
    button(ui.ctl, 'GET random key', () => {
      if (busy) { say('> GET: still restarting, try again in a moment'); return; }
      if (!truth.size) { say('> GET: nothing written yet'); return; }
      const key = pick([...truth.keys()]);
      const res = lookup(key);
      lastChecked = res.checked;
      say(`> GET ${key} -> "${res.value}"  (${res.checked ? `checked ${res.checked} file${res.checked > 1 ? 's' : ''}` : 'found in memtable'})`);
      dirty = true;
    });
    button(ui.ctl, 'Pull the plug', crash, 'danger');
    seg(ui.ctl, 'Disk sync strategy', [['each', 'fsync every write'], ['group', 'Group commit']], mode, (value) => { mode = value; dirty = true; });
    seg(ui.ctl, 'Compaction', [[false, 'Compaction off'], [true, 'Compaction on']], compaction, (value) => {
      compaction = value;
      if (value && compact(false)) dirty = true;
    });

    const mRate = meter(ui.meters, 'Durable writes / sec');
    const mConfirmed = meter(ui.meters, 'Confirmed writes');
    const mLost = meter(ui.meters, 'Lost after crashes');
    const mFiles = meter(ui.meters, 'Files per lookup');

    ui.note.textContent = 'Every write goes to the log on disk before the client hears OK, so pulling the plug loses nothing that was confirmed: the toy re-checks every confirmed key after each restart. Group commit syncs a batch at once instead of one write at a time. Simplified model; the writes/sec figures are from the real benchmark.';

    const render = () => {
      dirty = false;
      const m = memCells.children;
      const w = walCells.children;
      for (let i = 0; i < MEM_CAP; i++) {
        m[i].className = i < mem.size ? 'on' : '';
        w[i].className = i < wal.length ? 'on' : '';
      }
      memCount.textContent = `${mem.size}/${MEM_CAP}`;
      walCount.textContent = `${wal.length} entries`;
      sstCount.textContent = `${sst.length} file${sst.length === 1 ? '' : 's'}`;
      sstBox.textContent = '';
      sst.slice(0, 60).forEach((file) => {
        sstBox.append(el('i', { style: `width:${Math.min(100, 8 + file.size / 4)}%` }));
      });
      mRate.textContent = mode === 'group' ? '45,249' : '2,058';
      mConfirmed.textContent = confirmed.toLocaleString('en-US');
      mLost.textContent = lost;
      mLost.className = lost ? 'bad' : 'ok';
      mFiles.textContent = lastChecked == null ? `up to ${sst.length}` : `${lastChecked} of ${sst.length}`;
      if (!busy) ui.status.textContent = queue ? `${queue} writes queued` : 'Idle';
    };

    say('> ready. SET some keys, then pull the plug.');
    loop(root, (dt) => {
      acc += dt;
      while (acc >= TICK) {
        acc -= TICK;
        if (!busy && queue > 0) {
          const n = Math.min(queue, mode === 'group' ? GROUP : 1);
          queue -= n;
          write(n);
        }
      }
      if (dirty || queue) render();
    });
    render();
  };

  /* =====================================================================
     4. Intrusion detector: you are the attacker. Click to send traffic
        and see what gets past each model.
     ===================================================================== */
  const nidsToy = (root) => {
    const ui = shell(root, 'Working model / try to get past it');
    const canvas = el('canvas', { class: 'nids-c', 'aria-label': 'Traffic feature space. Click to send a flow.' });
    const alertsBox = el('div', { class: 'alerts' });
    ui.body.append(canvas, alertsBox);
    const ctx = canvas.getContext('2d');
    let W = 0;
    let H = 0;

    const NORMAL = { x: 0.4, y: 0.56, rx: 0.19, ry: 0.24 };
    const KNOWN = [
      { x: 0.84, y: 0.2, r: 0.11, name: 'DoS' },
      { x: 0.13, y: 0.3, r: 0.085, name: 'port scan' }
    ];
    let useIF = true;
    let dots = [];     // background normal traffic
    let shots = [];    // what the visitor sent
    let alerts = [];
    let sent = 0;
    let caught = 0;
    let spawn = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // How far outside the normal cluster a point is (1 = on the boundary).
    const distance = (x, y) => Math.hypot((x - NORMAL.x) / NORMAL.rx, (y - NORMAL.y) / NORMAL.ry);
    const knownAt = (x, y) => KNOWN.find((k) => Math.hypot(x - k.x, y - k.y) < k.r);

    const renderAlerts = () => {
      alertsBox.textContent = '';
      const top = alerts.slice().sort((a, b) => b.sev - a.sev).slice(0, 3);
      if (!top.length) {
        alertsBox.append(el('div', { class: 'alert empty', text: 'Triage queue is empty. Alerts appear here, most severe first.' }));
        return;
      }
      top.forEach((a) => {
        alertsBox.append(el('div', { class: 'alert' },
          el('b', { text: `SEV ${a.sev}` }),
          el('span', { text: a.text }),
          el('button', { type: 'button', class: 'tbtn', text: 'Resolve', onclick: () => { alerts = alerts.filter((x) => x !== a); renderAlerts(); } })
        ));
      });
      if (alerts.length > 3) alertsBox.append(el('div', { class: 'alert empty', text: `+ ${alerts.length - 3} more in the queue` }));
    };

    const mSent = meter(ui.meters, 'Unseen attacks sent');
    const mCaught = meter(ui.meters, 'Caught');
    const mRate = meter(ui.meters, 'Detection rate');
    const mMissed = meter(ui.meters, 'Slipped through');
    const stats = () => {
      mSent.textContent = sent;
      mCaught.textContent = caught;
      mRate.textContent = sent ? `${Math.round((caught / sent) * 100)}%` : '-';
      mMissed.textContent = sent - caught;
      mMissed.className = sent - caught ? 'warn' : '';
    };

    const fire = (x, y, quiet) => {
      const known = knownAt(x, y);
      const d = distance(x, y);
      const shot = { x, y, age: 0, kind: 'normal' };
      if (known) {
        shot.kind = 'flagged';
        alerts.push({ sev: 95, text: `Known attack (${known.name}) / Random Forest` });
        if (!quiet) ui.status.textContent = `Flagged: the Random Forest has seen ${known.name} before`;
      } else if (d <= 1) {
        if (!quiet) ui.status.textContent = 'Looks like normal traffic. Not flagged.';
      } else {
        // An attack type the Random Forest never trained on.
        sent++;
        const score = d - 1;
        const byRF = Math.random() < 0.145;
        const byIF = useIF && Math.random() < clamp(0.3 + 0.55 * score, 0.3, 0.92);
        if (byRF || byIF) {
          caught++;
          shot.kind = 'flagged';
          const sev = Math.round(clamp(40 + 55 * (score / 1.5), 40, 94));
          alerts.push({ sev, text: `Unseen pattern / ${byIF ? 'Isolation Forest' : 'Random Forest'}` });
          if (!quiet) ui.status.textContent = `Caught by the ${byIF ? 'Isolation Forest: too far from normal' : 'Random Forest'}`;
        } else {
          shot.kind = 'missed';
          if (!quiet) ui.status.textContent = useIF ? 'Slipped through: close enough to normal' : 'Slipped through: the Random Forest has never seen this';
        }
      }
      shots.push(shot);
      if (shots.length > 80) shots.shift();
      stats();
      renderAlerts();
    };

    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      fire((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, false);
    });

    seg(ui.ctl, 'Detector', [[false, 'Random Forest only'], [true, '+ Isolation Forest']], useIF, (value) => { useIF = value; });
    button(ui.ctl, 'Launch 20 unseen attacks', () => {
      for (let i = 0; i < 20; i++) {
        let x;
        let y;
        let tries = 0;
        do {
          const a = Math.random() * Math.PI * 2;
          const d = 1.05 + Math.random() ** 2 * 1.6;
          x = NORMAL.x + Math.cos(a) * NORMAL.rx * d;
          y = NORMAL.y + Math.sin(a) * NORMAL.ry * d;
        } while ((x < 0.03 || x > 0.97 || y < 0.05 || y > 0.95 || knownAt(x, y)) && ++tries < 40);
        fire(x, y, true);
      }
      ui.status.textContent = `${caught} of ${sent} unseen attacks caught`;
    });
    button(ui.ctl, 'Clear', () => {
      shots = [];
      alerts = [];
      sent = 0;
      caught = 0;
      stats();
      renderAlerts();
      ui.status.textContent = 'Click the map to send traffic';
    });

    ui.note.textContent = 'You are the attacker: click anywhere to send a flow. The Random Forest only recognises attack types it trained on; the Isolation Forest learned only what normal looks like, so it flags whatever sits far from it. Two made-up features instead of the real ones; the odds are tuned to the NSL-KDD results.';
    ui.status.textContent = 'Click the map to send traffic';

    const ellipse = (k, scale) => {
      ctx.beginPath();
      ctx.ellipse(k.x * W, k.y * H, k.rx * W * scale, k.ry * H * scale, 0, 0, Math.PI * 2);
    };

    const draw = (dt) => {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      // Grid
      ctx.strokeStyle = FAINT;
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo((i / 8) * W, 0);
        ctx.lineTo((i / 8) * W, H);
        ctx.stroke();
      }
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (i / 5) * H);
        ctx.lineTo(W, (i / 5) * H);
        ctx.stroke();
      }
      ctx.font = `10px ${MONO}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = T3;
      ctx.fillText('connection rate →', 10, H - 12);
      ctx.fillText('↑ bytes per flow', 10, 14);

      // Regions the Random Forest was trained on.
      ctx.setLineDash([4, 4]);
      KNOWN.forEach((k) => {
        ctx.beginPath();
        ctx.arc(k.x * W, k.y * H, k.r * Math.min(W, H * 1.6), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${BAD}, 0.55)`;
        ctx.stroke();
        ctx.fillStyle = `rgba(${BAD}, 0.06)`;
        ctx.fill();
        ctx.fillStyle = `rgba(${BAD}, 0.9)`;
        ctx.textAlign = 'center';
        const tag = `trained on: ${k.name}`;
        const half = ctx.measureText(tag).width / 2 + 6;
        ctx.fillText(tag, clamp(k.x * W, half, W - half), k.y * H);
      });
      // The Isolation Forest's idea of normal.
      if (useIF) {
        ellipse(NORMAL, 1);
        ctx.strokeStyle = `rgba(${ACC}, 0.6)`;
        ctx.stroke();
        ctx.fillStyle = `rgba(${ACC}, 0.04)`;
        ctx.fill();
        ctx.fillStyle = `rgba(${ACC}, 0.9)`;
        ctx.textAlign = 'center';
        ctx.fillText('normal traffic', NORMAL.x * W, (NORMAL.y - NORMAL.ry) * H - 10);
      }
      ctx.setLineDash([]);

      // Background traffic
      if (!reduced) {
        spawn += dt;
        while (spawn > 0.22) {
          spawn -= 0.22;
          const a = Math.random() * Math.PI * 2;
          const d = Math.sqrt(Math.random()) * 0.85;
          dots.push({ x: NORMAL.x + Math.cos(a) * NORMAL.rx * d, y: NORMAL.y + Math.sin(a) * NORMAL.ry * d, age: 0 });
        }
      }
      dots = dots.filter((p) => (p.age += dt) < 7);
      dots.forEach((p) => {
        ctx.fillStyle = `rgba(${ACC}, ${0.5 * (1 - p.age / 7)})`;
        ctx.fillRect(p.x * W - 1.5, p.y * H - 1.5, 3, 3);
      });

      shots.forEach((p) => {
        p.age += dt;
        const x = p.x * W;
        const y = p.y * H;
        if (p.kind === 'flagged') {
          const pulse = Math.min(1, p.age / 0.5);
          ctx.strokeStyle = `rgba(${BAD}, ${1 - pulse * 0.4})`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - 5 - pulse * 3, y - 5 - pulse * 3, 10 + pulse * 6, 10 + pulse * 6);
          ctx.beginPath();
          ctx.moveTo(x - 3, y - 3);
          ctx.lineTo(x + 3, y + 3);
          ctx.moveTo(x + 3, y - 3);
          ctx.lineTo(x - 3, y + 3);
          ctx.stroke();
        } else if (p.kind === 'missed') {
          ctx.fillStyle = `rgb(${WARN})`;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(${WARN}, 0.4)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = T1;
          ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
        }
      });
    };

    if ('ResizeObserver' in window) new ResizeObserver(() => { resize(); draw(0); }).observe(canvas);
    resize();
    stats();
    renderAlerts();
    loop(root, draw);
  };

  /* =====================================================================
     5. Ticket booking: grab seats while bots do the same. Holds expire,
        races resolve to exactly one winner, nothing is double-booked.
     ===================================================================== */
  const seatsToy = (root) => {
    const ui = shell(root, 'Working model / book against the bots');
    const ROWS = 'ABCDEF';
    const COLS = 10;
    const MY_HOLD = 9;
    const BOT_HOLD = 5;
    const OFFER = 6;

    let seats = [];
    let now = 0;
    let botT = 0;
    let races = 0;
    let doubleBooked = 0;

    const grid = el('div', { class: 'seats', role: 'group', 'aria-label': 'Seat map' });
    const log = el('div', { class: 'tlog', 'aria-live': 'polite' });
    const legend = el('div', { class: 'legend' },
      ...[['', 'Free'], ['mine-held', 'Your hold'], ['mine', 'Your ticket'], ['other-held', 'Held by someone else'], ['sold', 'Sold']]
        .map(([cls, text]) => el('span', {}, el('i', { class: `seat ${cls}` }), text))
    );
    ui.body.append(grid, legend, log);

    const lines = [];
    const say = (...add) => {
      lines.push(...add);
      while (lines.length > 3) lines.shift();
      log.textContent = '';
      lines.forEach((l) => log.append(el('div', { text: l })));
    };

    // The whole point: one conditional update per hold. Whoever's statement lands first wins;
    // the other one matches zero rows.
    const tryHold = (seat, who, ttl) => {
      if (seat.status !== 'free' && seat.status !== 'offer') return 0;
      if (seat.status === 'offer' && who !== 'you') return 0;
      if (seat.owner && seat.status === 'held') doubleBooked++;
      seat.status = 'held';
      seat.owner = who;
      seat.exp = now + ttl;
      seat.ttl = ttl;
      seat.decide = who === 'bot' ? now + rand(1.5, 3.5) : 0;
      seat.willBook = Math.random() < 0.55;
      return 1;
    };

    const click = (seat) => {
      if (seat.status === 'free') {
        if (Math.random() < 0.35) {
          // A bot asks for the same seat in the same instant.
          races++;
          const youFirst = Math.random() < 0.5;
          const first = youFirst ? 'you' : 'bot';
          const second = youFirst ? 'bot' : 'you';
          const a = tryHold(seat, first, first === 'you' ? MY_HOLD : BOT_HOLD);
          const b = tryHold(seat, second, second === 'you' ? MY_HOLD : BOT_HOLD);
          say(`race for ${seat.id}: two holds in the same instant`,
            `  ${first.padEnd(3)} UPDATE seats ... WHERE id='${seat.id}' AND free  -> ${a} row`,
            `  ${second.padEnd(3)} same statement                          -> ${b} rows`);
          ui.status.textContent = youFirst ? `You won the race for ${seat.id}` : `A bot beat you to ${seat.id}`;
        } else {
          tryHold(seat, 'you', MY_HOLD);
          say(`${seat.id}: held for you, ${MY_HOLD}s to confirm. Click it again to book.`);
          ui.status.textContent = `Holding ${seat.id}`;
        }
      } else if (seat.status === 'offer') {
        tryHold(seat, 'you', MY_HOLD);
        seat.waiting = false;
        say(`${seat.id}: waitlist offer accepted, held for you.`);
      } else if (seat.status === 'held' && seat.owner === 'you') {
        seat.status = 'booked';
        say(`${seat.id}: booked. QR ticket signed.`);
        ui.status.textContent = `${seat.id} is yours`;
      } else if (seat.status === 'held') {
        seat.waiting = true;
        say(`${seat.id} is held by someone else. You are on the waitlist for it.`);
      } else if (seat.owner !== 'you') {
        say(`${seat.id} is sold.`);
      }
      render();
    };

    const reset = () => {
      seats = [];
      grid.textContent = '';
      now = 0;
      botT = 0;
      races = 0;
      for (let r = 0; r < ROWS.length; r++) {
        for (let c = 1; c <= COLS; c++) {
          const seat = { id: `${ROWS[r]}${c}`, status: 'free', owner: null, exp: 0, ttl: 1, waiting: false };
          seat.bar = el('i');
          seat.btn = el('button', { type: 'button', class: 'seat', onclick: () => click(seat) }, el('span', { text: seat.id }), seat.bar);
          grid.append(seat.btn);
          seats.push(seat);
        }
      }
      lines.length = 0;
      say('Click a free seat to hold it, then click again to book before the hold runs out.');
      ui.status.textContent = 'Doors open';
      render();
    };

    const mMine = meter(ui.meters, 'Your tickets');
    const mLeft = meter(ui.meters, 'Seats left');
    const mRaces = meter(ui.meters, 'Same-instant requests');
    const mDouble = meter(ui.meters, 'Double bookings');

    const render = () => {
      let mine = 0;
      let left = 0;
      seats.forEach((seat) => {
        let cls = '';
        let label = 'free';
        if (seat.status === 'held') { cls = seat.owner === 'you' ? 'mine-held' : 'other-held'; label = seat.owner === 'you' ? 'held for you' : 'held by someone else'; }
        if (seat.status === 'booked') { cls = seat.owner === 'you' ? 'mine' : 'sold'; label = seat.owner === 'you' ? 'your ticket' : 'sold'; }
        if (seat.status === 'offer') { cls = 'offer'; label = 'offered to you'; }
        if (seat.status === 'free') left++;
        if (seat.status === 'booked' && seat.owner === 'you') mine++;
        seat.btn.className = `seat ${cls}${seat.waiting ? ' waiting' : ''}`.trim();
        seat.btn.setAttribute('aria-label', `Seat ${seat.id}, ${label}`);
        const timed = seat.status === 'held' || seat.status === 'offer';
        seat.bar.style.transform = `scaleX(${timed ? clamp((seat.exp - now) / seat.ttl, 0, 1) : 0})`;
      });
      mMine.textContent = mine;
      mLeft.textContent = left;
      mRaces.textContent = races;
      mDouble.textContent = doubleBooked;
      mDouble.className = doubleBooked ? 'bad' : 'ok';
    };

    button(ui.ctl, 'Book all my holds', () => {
      const held = seats.filter((seat) => seat.status === 'held' && seat.owner === 'you');
      held.forEach((seat) => { seat.status = 'booked'; });
      say(held.length ? `${held.map((seat) => seat.id).join(', ')}: booked.` : 'Nothing on hold right now.');
      render();
    });
    button(ui.ctl, 'Reset the venue', reset);

    ui.note.textContent = 'Bots are buying at the same time as you. A hold is one atomic update that only succeeds if the seat is free, so when two requests land together exactly one gets it. Expiry is checked on every write, so a lapsed hold frees the seat with no cleanup job. Click a seat someone else is holding to join its waitlist.';

    reset();
    loop(root, (dt) => {
      now += dt;
      botT += dt;
      seats.forEach((seat) => {
        if (seat.status === 'held' && seat.owner === 'bot' && seat.willBook && now > seat.decide) {
          seat.status = 'booked';
          seat.waiting = false;
        }
        if ((seat.status === 'held' || seat.status === 'offer') && now > seat.exp) {
          const wasYours = seat.owner === 'you';
          const wasOffer = seat.status === 'offer';
          seat.owner = null;
          if (seat.waiting && !wasOffer) {
            // Freed seat goes to the waitlist first, for a limited time.
            seat.status = 'offer';
            seat.owner = 'you';
            seat.exp = now + OFFER;
            seat.ttl = OFFER;
            say(`${seat.id} was released: offered to you for ${OFFER}s.`);
          } else {
            seat.status = 'free';
            seat.waiting = false;
            if (wasYours) say(`${seat.id}: your ${wasOffer ? 'offer' : 'hold'} expired, seat released.`);
          }
        }
      });
      if (botT > 0.9) {
        botT = 0;
        const free = seats.filter((seat) => seat.status === 'free');
        if (free.length > seats.length * 0.15) tryHold(pick(free), 'bot', BOT_HOLD);
      }
      render();
    });
  };

  /* ---------- Mount ---------- */
  const TOYS = { monitor: monitorToy, flight: flightToy, wal: walToy, nids: nidsToy, seats: seatsToy };
  document.querySelectorAll('[data-toy]').forEach((root) => {
    const make = TOYS[root.dataset.toy];
    if (!make) return;
    try {
      make(root);
    } catch (err) {
      root.hidden = true;
      console.error(`toy "${root.dataset.toy}" failed to start`, err);
    }
  });
})();
