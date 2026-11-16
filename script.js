(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.add('js');

  /* ---------- Toast + copy email ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  const toast = (message) => {
    toastEl.textContent = message;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1800);
  };

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      toast('Email address copied');
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  $$('.copy-mail').forEach((btn) => {
    btn.addEventListener('click', () => copyEmail(btn.dataset.email));
  });

  /* ---------- Nav: scroll progress, brand reveal, active section ---------- */
  const nav = $('#nav');
  const progress = $('#progress');
  const title = $('#title');
  const navLinks = $$('.nav-links a');
  const sections = $$('main section[id]');

  const bigname = $('#bigname');
  let lastY = window.scrollY;

  const onScroll = () => {
    const y = window.scrollY;

    // Header hides on the way down and returns on the way up.
    const dy = y - lastY;
    if (Math.abs(dy) > 4) {
      const palOpen = !$('#pal').hidden;
      nav.classList.toggle('hide', dy > 0 && y > 240 && !palOpen && !nav.contains(document.activeElement));
      lastY = y;
    }

    // Parallax: the footer name rises into place as it scrolls in.
    if (!reducedMotion) {
      const br = bigname.getBoundingClientRect();
      if (br.top < window.innerHeight) {
        const seen = Math.min(1, Math.max(0, (window.innerHeight - br.top) / br.height));
        bigname.style.setProperty('--by', `${(1 - seen) * 38}%`);
      }
    }

    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    nav.classList.toggle('past', title.getBoundingClientRect().bottom < nav.offsetHeight);

    let current = '';
    const line = y + nav.offsetHeight + 80;
    sections.forEach((section) => {
      if (section.offsetTop <= line) current = section.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle('on', link.getAttribute('href') === `#${current}`);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Fade panels in as they scroll into view ---------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('in-view');
          setTimeout(() => el.classList.add('done'), 700);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view', 'done'));
  }

  /* ---------- Section headings decode as they scroll into view ---------- */
  const initHeadings = () => {
    if (reducedMotion || !('IntersectionObserver' in window)) return;
    const GLYPHS = '01<>/[]{}#=+*';
    const textNode = (h2) => Array.from(h2.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim());
    const decode = (node, text) => {
      const start = performance.now();
      const DURATION = 600;
      const step = (now) => {
        const p = Math.min(1, (now - start) / DURATION);
        const settled = Math.floor(p * text.length);
        let out = text.slice(0, settled);
        for (let i = settled; i < text.length; i++) {
          out += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        node.textContent = out;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const node = textNode(entry.target);
        if (node) decode(node, node.textContent);
      });
    }, { threshold: 0.6 });
    $$('h2').forEach((h2) => {
      const node = textNode(h2);
      if (!node) return;
      h2.setAttribute('aria-label', node.textContent.trim());
      observer.observe(h2);
    });
  };
  initHeadings();

  /* ---------- Hero: type out the tagline ---------- */
  const typeTagline = () => {
    const target = $('#typed-tagline');
    if (!target) return;
    const text = 'Software Engineer | SDE Intern @ Siemens | CS @ VIT';
    if (reducedMotion) {
      target.textContent = text;
      return;
    }
    let i = 0;
    const next = () => {
      target.textContent = text.slice(0, i);
      if (i++ < text.length) setTimeout(next, 38);
    };
    setTimeout(next, 800);
  };

  /* ---------- Hero: letters of the name light up near the pointer ---------- */
  const initTitle = () => {
    let index = 0;
    $$('[data-split]', title).forEach((line) => {
      const chars = [...line.textContent];
      line.textContent = '';
      chars.forEach((ch) => {
        const span = document.createElement('span');
        span.className = 'ch';
        span.style.setProperty('--i', index++);
        span.textContent = ch;
        line.appendChild(span);
      });
    });
    if (reducedMotion || !window.matchMedia('(hover: hover)').matches) return;

    const chars = $$('.ch', title);
    window.addEventListener('pointermove', (e) => {
      const box = title.getBoundingClientRect();
      const near = e.clientY > box.top - 120 && e.clientY < box.bottom + 120;
      chars.forEach((ch) => {
        if (!near) {
          ch.style.color = '';
          return;
        }
        const r = ch.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        ch.style.color = d < r.height * 0.75 ? 'var(--accent)' : '';
      });
    }, { passive: true });
  };
  initTitle();

  /* ---------- Entry sequence ----------
     Counts up while the fonts load, then splits open and starts the hero. */
  const initBoot = () => {
    const boot = $('#boot');
    const begin = () => {
      document.documentElement.classList.add('ready');
      typeTagline();
    };
    if (!boot || reducedMotion) {
      if (boot) boot.remove();
      begin();
      return;
    }
    const count = $('#boot-n');
    const bar = $('#boot-bar');
    let loaded = false;
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, new Promise((res) => setTimeout(res, 2500))]).then(() => { loaded = true; });

    // Time-based, so it finishes on schedule even when frames are dropped.
    let p = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(100, Math.max(0, now - last));
      last = now;
      p = Math.min(loaded ? 100 : 88, p + dt * (loaded ? 0.2 : 0.07));
      count.textContent = String(Math.floor(p)).padStart(3, '0');
      bar.style.transform = `scaleX(${p / 100})`;
      if (p < 100) {
        requestAnimationFrame(tick);
        return;
      }
      finish();
    };
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      boot.classList.add('open');
      setTimeout(begin, 280);
      setTimeout(() => boot.remove(), 1200);
    };
    requestAnimationFrame(tick);
    // Never hold the page hostage: open regardless after a few seconds (e.g. a background tab).
    setTimeout(finish, 4000);
  };
  initBoot();

  /* ---------- Pointer: trailing frame, magnetic buttons, card tilt ---------- */
  const initPointer = () => {
    if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    // A square frame that trails the cursor and widens on anything clickable.
    const cur = $('#cur');
    const pos = { x: 0, y: 0, tx: 0, ty: 0, s: 1, ts: 1 };
    let moving = false;
    const follow = () => {
      pos.x += (pos.tx - pos.x) * 0.2;
      pos.y += (pos.ty - pos.y) * 0.2;
      pos.s += (pos.ts - pos.s) * 0.2;
      cur.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${pos.s})`;
      if (Math.abs(pos.tx - pos.x) + Math.abs(pos.ty - pos.y) + Math.abs(pos.ts - pos.s) > 0.05) {
        requestAnimationFrame(follow);
      } else {
        moving = false;
      }
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!cur.classList.contains('on')) {
        pos.x = e.clientX;
        pos.y = e.clientY;
        cur.classList.add('on');
      }
      pos.tx = e.clientX;
      pos.ty = e.clientY;
      const hot = !!e.target.closest('a, button, .sk li');
      pos.ts = hot ? 1.7 : 1;
      cur.classList.toggle('hot', hot);
      if (!moving) {
        moving = true;
        requestAnimationFrame(follow);
      }
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => cur.classList.remove('on'));

    // Buttons lean toward the pointer.
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate3d(${dx * 0.22}px, ${dy * 0.3}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    // Project cards tilt slightly and carry a light under the pointer.
    $$('.card:not(.feat)').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        if (!card.classList.contains('done')) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
        card.style.transform = `perspective(1100px) rotateX(${(0.5 - py) * 2.4}deg) rotateY(${(px - 0.5) * 2.4}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  };
  initPointer();

  /* ---------- Command menu ---------- */
  const initPalette = () => {
    const pal = $('#pal');
    const input = $('#pal-i');
    const list = $('#pal-l');
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    $('#pal-key').textContent = isMac ? '⌘K' : 'Ctrl K';

    const go = (hash) => () => { window.location.hash = hash; };
    const open = (url) => () => window.open(url, '_blank', 'noopener');

    const items = [
      { label: 'Top', kind: 'Section', run: go('#top') },
      ...$$('.nav-links a').map((a) => ({ label: a.textContent, kind: 'Section', run: go(a.getAttribute('href')) })),
      { label: 'Contact Me', kind: 'Section', run: go('#contact') },
      ...$$('.card[id]').map((card) => ({ label: $('h3', card).textContent, kind: 'Project', run: go(`#${card.id}`) })),
      { label: 'Copy email address', kind: 'Action', run: () => copyEmail('aryannaresh04@gmail.com') },
      { label: 'Write an email', kind: 'Action', run: () => { window.location.href = 'mailto:aryannaresh04@gmail.com'; } },
      { label: 'Open GitHub', kind: 'Link', run: open('https://github.com/aryannaresh04') },
      { label: 'Open LinkedIn', kind: 'Link', run: open('https://www.linkedin.com/in/aryan-naresh/') }
    ];

    let shown = [];
    let active = 0;
    let lastFocus = null;

    const render = () => {
      const q = input.value.trim().toLowerCase();
      shown = items.filter((item) => `${item.label} ${item.kind}`.toLowerCase().includes(q));
      active = Math.min(active, Math.max(0, shown.length - 1));
      list.textContent = '';
      if (!shown.length) {
        const empty = document.createElement('p');
        empty.className = 'pal-e';
        empty.textContent = 'Nothing matches that.';
        list.appendChild(empty);
        return;
      }
      shown.forEach((item, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', i === active);
        if (i === active) btn.className = 'on';
        const label = document.createElement('span');
        label.textContent = item.label;
        const kind = document.createElement('span');
        kind.textContent = item.kind;
        btn.append(label, kind);
        btn.addEventListener('click', () => choose(i));
        btn.addEventListener('pointermove', () => {
          if (active !== i) { active = i; render(); }
        });
        list.appendChild(btn);
      });
      const on = $('.on', list);
      if (on) on.scrollIntoView({ block: 'nearest' });
    };

    const show = () => {
      lastFocus = document.activeElement;
      pal.hidden = false;
      input.value = '';
      active = 0;
      render();
      input.focus();
    };
    const hide = () => {
      pal.hidden = true;
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    const choose = (i) => {
      const item = shown[i];
      if (!item) return;
      hide();
      item.run();
    };

    $('#pal-open').addEventListener('click', show);
    pal.addEventListener('click', (e) => { if (e.target === pal) hide(); });
    input.addEventListener('input', () => { active = 0; render(); });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (pal.hidden) show(); else hide();
        return;
      }
      if (pal.hidden) return;
      if (e.key === 'Escape') {
        hide();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!shown.length) return;
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
        render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        choose(active);
      } else if (e.key === 'Tab') {
        e.preventDefault(); // keep focus inside the dialog
      }
    });
  };
  initPalette();

  /* ---------- Background: a circuit board that reacts to the pointer ----------
     A dot grid with a CPU and a few smaller chips soldered onto it. Signals run
     along the traces into the chips, which heat up as they arrive. Dots lean
     away from the cursor, chips wake up when it comes near, and a click sends a
     ripple through the grid (or, on a chip, fires all of its traces at once). */
  const initField = () => {
    const canvas = $('#field');
    const ctx = canvas.getContext('2d');
    const GAP = 30;
    const REACH = 150;
    const ACC = '94, 255, 160';

    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let running = false;
    const pointer = { x: -9999, y: -9999 };
    let packets = [];
    let ripples = [];
    let lastSpawn = 0;
    let chips = [];
    let traces = [];
    let pulses = [];
    let lastPulse = 0;

    // Small seeded generator so the board layout stays put across resizes.
    const seeded = (seed) => () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const snap = (v) => Math.round(v / GAP) * GAP;

    // A trace leaves a pin, runs straight, takes a 45-degree bend, runs on, and ends in a via.
    const addTraces = (chip, rnd) => {
      const half = chip.half * GAP;
      const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      sides.forEach(([dx, dy]) => {
        for (let i = -(chip.half - 1); i <= chip.half - 1; i++) {
          if (chip.half > 1 && rnd() < 0.3) continue;
          const px = -dy;
          const py = dx;
          const x0 = chip.x + dx * (half + 7) + px * i * GAP;
          const y0 = chip.y + dy * (half + 7) + py * i * GAP;
          const a = 1 + Math.floor(rnd() * 4);
          const b = Math.floor(rnd() * 3);
          const c = 1 + Math.floor(rnd() * 3);
          const turn = rnd() < 0.5 ? 1 : -1;
          const x1 = chip.x + dx * (half + a * GAP) + px * i * GAP;
          const y1 = chip.y + dy * (half + a * GAP) + py * i * GAP;
          const x2 = x1 + (dx + px * turn) * b * GAP;
          const y2 = y1 + (dy + py * turn) * b * GAP;
          const x3 = x2 + dx * c * GAP;
          const y3 = y2 + dy * c * GAP;
          const pts = [[x0, y0], [x1, y1], [x2, y2], [x3, y3]];
          const cum = [0];
          for (let k = 1; k < pts.length; k++) {
            cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
          }
          traces.push({ chip, pts, cum, len: cum[cum.length - 1] });
        }
      });
    };

    const layoutBoard = () => {
      chips = [];
      traces = [];
      pulses = [];
      const wide = w >= 900;
      const spots = wide
        ? [
          { x: snap(w * 0.77), y: snap(h * 0.5), half: 3, label: 'CPU', main: true },
          { x: snap(60), y: snap(h * 0.32), half: 1, label: 'RAM' },
          { x: snap(w - 60), y: snap(h * 0.86), half: 1, label: 'NIC' },
          { x: snap(w * 0.4), y: snap(h - 30), half: 1, label: 'SSD' }
        ]
        : [
          { x: snap(w - 60), y: snap(h * 0.8), half: 2, label: 'CPU', main: true },
          { x: snap(30), y: snap(h * 0.45), half: 1, label: 'RAM' }
        ];
      spots.forEach((spot, i) => {
        const chip = { ...spot, heat: 0, near: 0, seed: i * 7.3 };
        chips.push(chip);
        addTraces(chip, seeded(1234 + i * 977));
      });
    };

    const pointAt = (tr, d) => {
      d = Math.max(0, Math.min(tr.len, d));
      for (let k = 1; k < tr.pts.length; k++) {
        if (d <= tr.cum[k] || k === tr.pts.length - 1) {
          const span = tr.cum[k] - tr.cum[k - 1] || 1;
          const f = (d - tr.cum[k - 1]) / span;
          return [tr.pts[k - 1][0] + (tr.pts[k][0] - tr.pts[k - 1][0]) * f, tr.pts[k - 1][1] + (tr.pts[k][1] - tr.pts[k - 1][1]) * f];
        }
      }
      return tr.pts[0];
    };

    const insideChip = (x, y, pad) => chips.some((c) => Math.abs(x - c.x) <= c.half * GAP + pad && Math.abs(y - c.y) <= c.half * GAP + pad);

    const drawChip = (chip, now) => {
      const half = chip.half * GAP;
      const glow = Math.min(1, chip.heat + chip.near * 0.7);
      const base = chip.main ? 0.42 : 0.26;
      const x = chip.x - half;
      const y = chip.y - half;

      // Pins: one on every grid line and one between.
      ctx.fillStyle = `rgba(${ACC}, ${base * 0.8 + glow * 0.5})`;
      for (let i = -(chip.half * 2 - 1); i <= chip.half * 2 - 1; i++) {
        const o = (i * GAP) / 2;
        ctx.fillRect(chip.x + o - 1.5, y - 7, 3, 6);
        ctx.fillRect(chip.x + o - 1.5, y + half * 2 + 1, 3, 6);
        ctx.fillRect(x - 7, chip.y + o - 1.5, 6, 3);
        ctx.fillRect(x + half * 2 + 1, chip.y + o - 1.5, 6, 3);
      }

      // Package
      ctx.fillStyle = '#0b0b0e';
      ctx.fillRect(x, y, half * 2, half * 2);
      if (glow > 0.02) {
        ctx.shadowColor = `rgba(${ACC}, ${glow * 0.8})`;
        ctx.shadowBlur = 24 * glow;
      }
      ctx.strokeStyle = `rgba(${ACC}, ${base + glow * 0.55})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, half * 2 - 1, half * 2 - 1);
      ctx.shadowBlur = 0;
      // Pin-1 marker
      ctx.fillStyle = `rgba(${ACC}, ${base + glow * 0.5})`;
      ctx.fillRect(x + 6, y + 6, 4, 4);

      if (chip.half >= 2) {
        // Die with a block of cores that flicker with activity.
        const die = half * (chip.half >= 3 ? 0.56 : 0.6);
        ctx.strokeStyle = `rgba(${ACC}, ${base * 0.7 + glow * 0.4})`;
        ctx.strokeRect(chip.x - die + 0.5, chip.y - die + 0.5, die * 2 - 1, die * 2 - 1);
        const n = chip.half >= 3 ? 4 : 3;
        const cell = (die * 2 - 10) / n;
        const top = chip.half >= 3 ? chip.y - die + 5 : chip.y - die + 5;
        for (let r = 0; r < n - (chip.half >= 3 ? 1 : 1); r++) {
          for (let c = 0; c < n; c++) {
            const flick = 0.5 + 0.5 * Math.sin(now * 0.004 * (1 + ((r * 7 + c * 3) % 5) * 0.37) + r * 2.1 + c * 1.3 + chip.seed);
            ctx.fillStyle = `rgba(${ACC}, ${0.05 + flick * (0.1 + glow * 0.55)})`;
            ctx.fillRect(chip.x - die + 5 + c * cell + 1, top + r * cell + 1, cell - 2, cell - 2);
          }
        }
        ctx.fillStyle = `rgba(${ACC}, ${0.55 + glow * 0.45})`;
        ctx.font = `500 ${chip.half >= 3 ? 12 : 10}px "Geist Mono", ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(chip.label, chip.x, chip.y + die - 11);
        if (chip.half >= 3) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.28 + glow * 0.3})`;
          ctx.font = '9px "Geist Mono", ui-monospace, monospace';
          ctx.textAlign = 'left';
          ctx.fillText('AN-2027', x + 16, y + 9);
          ctx.textAlign = 'right';
          ctx.fillText(`0x${(Math.floor(now / 90) % 65536).toString(16).toUpperCase().padStart(4, '0')}`, x + half * 2 - 7, y + half * 2 - 9);
        }
      } else {
        ctx.fillStyle = `rgba(${ACC}, ${0.5 + glow * 0.5})`;
        ctx.font = '9px "Geist Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(chip.label, chip.x, chip.y + 1);
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
      layoutBoard();
      if (!running) draw(0);
    };

    const spawnPacket = () => {
      const horizontal = Math.random() < 0.5;
      const forward = Math.random() < 0.5;
      const speed = 0.9 + Math.random() * 1.3;
      if (horizontal) {
        packets.push({
          x: forward ? -40 : w + 40,
          y: Math.floor(Math.random() * rows) * GAP,
          vx: forward ? speed : -speed,
          vy: 0
        });
      } else {
        packets.push({
          x: Math.floor(Math.random() * cols) * GAP,
          y: forward ? -40 : h + 40,
          vx: 0,
          vy: forward ? speed : -speed
        });
      }
    };

    const draw = (now) => {
      ctx.clearRect(0, 0, w, h);

      // Resting dots in one batch; the ones near the pointer or a ripple are drawn after.
      const lit = [];
      ctx.fillStyle = 'rgba(255, 255, 255, 0.075)';
      for (let i = 0; i < cols; i++) {
        const x = i * GAP;
        for (let j = 0; j < rows; j++) {
          const y = j * GAP;
          let glow = 0;
          let px = x;
          let py = y;

          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < REACH) {
            const f = 1 - d / REACH;
            glow = f * f;
            if (d > 0.01) {
              px += (dx / d) * f * 7;
              py += (dy / d) * f * 7;
            }
          }
          for (let k = 0; k < ripples.length; k++) {
            const rp = ripples[k];
            const band = Math.abs(Math.hypot(x - rp.x, y - rp.y) - rp.r);
            if (band < 26) glow = Math.max(glow, (1 - band / 26) * rp.life);
          }

          if (insideChip(x, y, 8)) continue;
          if (glow > 0.02) lit.push(px, py, glow);
          else ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      }
      for (let i = 0; i < lit.length; i += 3) {
        const g = lit[i + 2];
        const size = 1.5 + g * 2;
        ctx.fillStyle = `rgba(${ACC}, ${0.12 + g * 0.8})`;
        ctx.fillRect(lit[i] - size / 2, lit[i + 1] - size / 2, size, size);
      }

      // Traces, each ending in a via.
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';
      for (let i = 0; i < traces.length; i++) {
        const tr = traces[i];
        const lift = Math.min(1, tr.chip.heat + tr.chip.near * 0.6);
        ctx.strokeStyle = `rgba(${ACC}, ${(tr.chip.main ? 0.16 : 0.11) + lift * 0.22})`;
        ctx.beginPath();
        ctx.moveTo(tr.pts[0][0], tr.pts[0][1]);
        for (let k = 1; k < tr.pts.length; k++) ctx.lineTo(tr.pts[k][0], tr.pts[k][1]);
        ctx.stroke();
        const end = tr.pts[tr.pts.length - 1];
        ctx.beginPath();
        ctx.arc(end[0], end[1], 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Signals running along the traces.
      for (let i = 0; i < pulses.length; i++) {
        const pu = pulses[i];
        const head = pointAt(pu.tr, pu.d);
        ctx.strokeStyle = `rgba(${ACC}, 0.75)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(head[0], head[1]);
        for (let k = 1; k <= 4; k++) {
          const pt = pointAt(pu.tr, pu.d - pu.dir * k * 9);
          ctx.lineTo(pt[0], pt[1]);
        }
        ctx.stroke();
        ctx.fillStyle = `rgba(${ACC}, 1)`;
        ctx.fillRect(head[0] - 2, head[1] - 2, 4, 4);
      }

      // Chips, lit by the pointer and by arriving signals.
      for (let i = 0; i < chips.length; i++) {
        const chip = chips[i];
        const d = Math.hypot(pointer.x - chip.x, pointer.y - chip.y) - chip.half * GAP;
        const target = d < 170 ? 1 - Math.max(0, d) / 170 : 0;
        chip.near += (target - chip.near) * 0.12;
        drawChip(chip, now);
      }

      // Packets with a fading tail.
      for (let i = 0; i < packets.length; i++) {
        const p = packets[i];
        const tx = p.x - Math.sign(p.vx) * 70;
        const ty = p.y - Math.sign(p.vy) * 70;
        const tail = ctx.createLinearGradient(p.x, p.y, tx, ty);
        tail.addColorStop(0, `rgba(${ACC}, 0.38)`);
        tail.addColorStop(1, `rgba(${ACC}, 0)`);
        ctx.strokeStyle = tail;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = `rgba(${ACC}, 0.85)`;
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }

      if (!running) return;

      packets.forEach((p) => { p.x += p.vx; p.y += p.vy; });
      packets = packets.filter((p) => p.x > -120 && p.x < w + 120 && p.y > -120 && p.y < h + 120);
      if (now - lastSpawn > 700 && packets.length < 12) {
        spawnPacket();
        lastSpawn = now;
      }
      pulses.forEach((pu) => { pu.d += pu.dir * pu.speed; });
      pulses = pulses.filter((pu) => {
        if (pu.dir < 0 && pu.d <= 0) {
          pu.tr.chip.heat = Math.min(1, pu.tr.chip.heat + 0.28);
          return false;
        }
        return pu.d <= pu.tr.len;
      });
      if (traces.length && now - lastPulse > 380 && pulses.length < 14) {
        const tr = traces[Math.floor(Math.random() * traces.length)];
        const inward = Math.random() < 0.7;
        pulses.push({ tr, d: inward ? tr.len : 0, dir: inward ? -1 : 1, speed: 1.6 + Math.random() * 1.6 });
        lastPulse = now;
      }
      chips.forEach((chip) => { chip.heat *= 0.972; });
      ripples.forEach((rp) => { rp.r += 7; rp.life *= 0.985; });
      ripples = ripples.filter((rp) => rp.r < Math.hypot(w, h) && rp.life > 0.05);

      requestAnimationFrame(draw);
    };

    const start = () => {
      if (running || reducedMotion) return;
      running = true;
      requestAnimationFrame(draw);
    };
    const stop = () => { running = false; };

    window.addEventListener('resize', resize);
    resize();
    if (reducedMotion) return;

    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });
    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button, input, #pal, .toy')) return;
      // Clicking a chip overclocks it: every trace fires outward at once.
      const hit = chips.find((c) => Math.abs(e.clientX - c.x) <= c.half * GAP + 8 && Math.abs(e.clientY - c.y) <= c.half * GAP + 8);
      if (hit) {
        hit.heat = 1;
        traces.forEach((tr) => {
          if (tr.chip === hit) pulses.push({ tr, d: 0, dir: 1, speed: 2.4 + Math.random() * 1.4 });
        });
      }
      if (ripples.length < 4) ripples.push({ x: e.clientX, y: e.clientY, r: 0, life: 1 });
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
    start();
  };
  initField();
})();
