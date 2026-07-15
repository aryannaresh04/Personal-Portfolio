const tabLinks = document.querySelectorAll('.tablink');
const sections = document.querySelectorAll('section');
const navbar = document.querySelector('.topnav');

// Smooth scroll for all in-page anchor links (nav tabs, logo, hero CTA)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const targetElement = document.querySelector(this.getAttribute('href'));
    if (!targetElement) return;
    window.scrollTo({
      top: targetElement.offsetTop - 50,
      behavior: 'smooth'
    });
  });
});

// Fade cards in as they scroll into view (IntersectionObserver keeps it off the scroll path)
document.documentElement.classList.add('js');

const initRevealOnScroll = () => {
  const revealElements = document.querySelectorAll('.project-card, .experience-item, .education-item, .skill-category, .achievement-item');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealElements.forEach(el => observer.observe(el));
};

// Shrink navbar and highlight the tab for the section in view
const handleScroll = () => {
  if (window.scrollY > 100) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  const scrollPosition = window.scrollY;
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    const sectionBottom = sectionTop + section.offsetHeight;
    if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
      tabLinks.forEach(link => link.classList.remove('active'));
      const currentTab = document.querySelector(`.tablink[href="#${section.id}"]`);
      if (currentTab) {
        currentTab.classList.add('active');
      }
    }
  });
};

window.addEventListener('scroll', handleScroll, { passive: true });

// Type out the hero tagline character by character
const typeTagline = () => {
  const taglineTarget = document.getElementById('typed-tagline');
  if (!taglineTarget) return;
  const taglineText = 'Software Engineer | SDE Intern @ Siemens | CS @ VIT';
  let charIndex = 0;
  const typeNext = () => {
    if (charIndex <= taglineText.length) {
      taglineTarget.textContent = taglineText.slice(0, charIndex);
      charIndex++;
      setTimeout(typeNext, 45);
    }
  };
  setTimeout(typeNext, 700);
};

// Faint drifting particle field in the hero, connected by lines when close
const initHeroParticles = () => {
  const canvas = document.getElementById('hero-particles');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  let particles = [];

  const resize = () => {
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
    const count = Math.min(70, Math.floor(canvas.width / 22));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.6
    }));
  };

  const linkDistance = 130;

  const frame = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < linkDistance) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.14 * (1 - dist / linkDistance)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
};

document.addEventListener('DOMContentLoaded', () => {
  initRevealOnScroll();
  handleScroll();
  typeTagline();
  initHeroParticles();

  // Jump to the section in the URL hash on load
  if (window.location.hash) {
    const targetElement = document.querySelector(window.location.hash);
    if (targetElement) {
      setTimeout(() => {
        window.scrollTo({
          top: targetElement.offsetTop - 50,
          behavior: 'smooth'
        });
      }, 100);
    }
  }
});
