let current = 0;
const slides = document.querySelectorAll('.slide');
const total = slides.length;
const counter = document.getElementById('counter');
const progressBar = document.getElementById('progress-bar');

function showSlide(n) {
  slides[current].classList.remove('active');
  current = (n + total) % total;
  slides[current].classList.add('active');

  counter.textContent = `${current + 1} / ${total}`;
  progressBar.style.width = `${((current + 1) / total) * 100}%`;

  document.getElementById('prev-btn').style.opacity = current === 0 ? '0.3' : '1';
  document.getElementById('next-btn').style.opacity = current === total - 1 ? '0.3' : '1';
}

function changeSlide(dir) {
  showSlide(current + dir);
}

/* Keyboard Navigation */
document.addEventListener('keydown', function(e) {
  if (['ArrowRight', ' ', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
    changeSlide(1);
  } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
    e.preventDefault();
    changeSlide(-1);
  }
});

/* Touch Navigation */
let touchStartX = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
});

document.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    changeSlide(diff > 0 ? 1 : -1);
  }
});

/* Initialize */
showSlide(0);