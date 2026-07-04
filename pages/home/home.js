document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('match-search');
  const newsCarousel = document.querySelector('[data-news-carousel]');

  function filterMatches(listSelector, query) {
    const cards = document.querySelectorAll(`${listSelector} .match-card`);
    cards.forEach(card => {
      const title = card.dataset.title || '';
      card.style.display = title.includes(query) ? '' : 'none';
    });
  }

  function handleSearchInput(event) {
    const query = event.target.value.trim().toLowerCase();
    filterMatches('#home-match-list', query);
  }

  searchInput?.addEventListener('input', handleSearchInput);

  if (newsCarousel) {
    const slides = Array.from(newsCarousel.querySelectorAll('.news-slide'));
    const dots = Array.from(newsCarousel.querySelectorAll('.news-dot'));
    const counter = newsCarousel.querySelector('.news-counter');
    const prevButton = newsCarousel.querySelector('.news-nav-left');
    const nextButton = newsCarousel.querySelector('.news-nav-right');
    let activeIndex = 0;

    function renderNews(index) {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('active', slideIndex === activeIndex);
      });
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('active', dotIndex === activeIndex);
      });
      if (counter) {
        counter.textContent = `${activeIndex + 1} / ${slides.length}`;
      }
    }

    prevButton?.addEventListener('click', () => renderNews(activeIndex - 1));
    nextButton?.addEventListener('click', () => renderNews(activeIndex + 1));
    dots.forEach((dot) => {
      dot.addEventListener('click', () => renderNews(Number(dot.dataset.index)));
    });
  }

  document.querySelectorAll('.match-action').forEach(button => {
    button.addEventListener('click', () => {
      alert('Analysis page coming soon.');
    });
  });
});
