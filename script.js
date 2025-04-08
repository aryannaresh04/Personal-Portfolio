document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      window.scrollTo({
        top: targetElement.offsetTop,
        behavior: 'smooth'
      });
    });
  });
  
  
  const animateOnScroll = () => {
    const animatedElements = document.querySelectorAll('.project-card.animate__animated, .experience-item.animate__animated, .education-item.animate__animated, .skill-category.animate__animated');
    animatedElements.forEach(element => {
      const elementPosition = element.getBoundingClientRect().top;
      const screenPosition = window.innerHeight / 1.3;
      if (elementPosition < screenPosition) {
        if (!element.classList.contains('animate__fadeInUp')) {
          element.classList.add('animate__fadeInUp');
        }
      }
    });
  };
  
  
  document.addEventListener('DOMContentLoaded', () => {
    
    animateOnScroll();
    
    window.addEventListener('scroll', animateOnScroll);
    
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.classList.add('animate__pulse');
      });
      card.addEventListener('mouseleave', () => {
        card.classList.remove('animate__pulse');
      });
    });
  });
  
  
  const tabLinks = document.querySelectorAll('.tablink');
  
  
  function setActiveTab() {
    
    const scrollPosition = window.scrollY;
    
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionBottom = sectionTop + section.offsetHeight;
      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        
        tabLinks.forEach(link => {
          link.classList.remove('active');
        });
        
        const currentTab = document.querySelector(`.tablink[href="#${section.id}"]`);
        if (currentTab) {
          currentTab.classList.add('active');
        }
      }
    });
  }
  
  
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      window.scrollTo({
        top: targetElement.offsetTop - 50,
        behavior: 'smooth'
      });
      tabLinks.forEach(tab => tab.classList.remove('active'));
      this.classList.add('active');
    });
  });
  
  
  window.addEventListener('scroll', setActiveTab);
  
  
  document.addEventListener('DOMContentLoaded', () => {
    
    if (tabLinks.length > 0) {
      tabLinks[0].classList.add('active');
    }
    
    
    if (window.location.hash) {
      const targetElement = document.querySelector(window.location.hash);
      if (targetElement) {
        setTimeout(() => {
          window.scrollTo({
            top: targetElement.offsetTop - 50,
            behavior: 'smooth'
          });
          
          const currentTab = document.querySelector(`.tablink[href="${window.location.hash}"]`);
          if (currentTab) {
            tabLinks.forEach(tab => tab.classList.remove('active'));
            currentTab.classList.add('active');
          }
        }, 100);
      }
    }
  });
  

  tabLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
      link.classList.add('animate__animated', 'animate__pulse');
    });
    link.addEventListener('mouseleave', () => {
      setTimeout(() => {
        link.classList.remove('animate__animated', 'animate__pulse');
      }, 500);
    });
  });
  
  
  const tabLinks = document.querySelectorAll('.tablink');
  const sections = document.querySelectorAll('section');
  const navbar = document.querySelector('.topnav');
  
  
  function handleScroll() {
    
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
        
        tabLinks.forEach(link => {
          link.classList.remove('active');
          link.classList.remove('animate__pulse');
        });
        
        const currentTab = document.querySelector(`.tablink[href="#${section.id}"]`);
        if (currentTab) {
          currentTab.classList.add('active');
          currentTab.classList.add('animate__animated', 'animate__pulse');
        }
      }
    });
  }
  
  
  const navLinks = document.querySelectorAll('.nav-link');
  
  
  function setActiveLink() {
    const scrollPosition = window.scrollY;
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionBottom = sectionTop + section.offsetHeight;
      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        const currentId = section.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${currentId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }
  
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      window.scrollTo({
        top: targetElement.offsetTop - 70,
        behavior: 'smooth'
      });
    });
  });
  
  
  window.addEventListener('scroll', setActiveLink);
  
  
  document.addEventListener('DOMContentLoaded', setActiveLink);

  const animatedElements = document.querySelectorAll('.project-card.animate__animated, .experience-item.animate__animated, .education-item.animate__animated, .skill-category.animate__animated, .achievement-item.animate__animated');

  