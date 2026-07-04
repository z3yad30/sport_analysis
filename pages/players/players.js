document.addEventListener('DOMContentLoaded', () => {
  const awardCards = document.querySelectorAll('.award-card');
  const awardModal = document.getElementById('award-modal');
  const awardModalClose = document.getElementById('award-modal-close');
  const awardModalTitle = document.getElementById('award-modal-title');
  const awardModalWinner = document.getElementById('award-modal-winner');
  const awardModalMeaning = document.getElementById('award-modal-meaning');
  const awardModalDescription = document.getElementById('award-modal-description');
  const awardModalFlag = document.getElementById('award-modal-flag');

  awardCards.forEach(card => {
    card.addEventListener('click', () => {
      awardModalTitle.textContent = card.dataset.title || 'Award';
      awardModalWinner.textContent = card.dataset.winner || '';
      awardModalMeaning.textContent = card.dataset.meaning || '';
      awardModalDescription.textContent = card.dataset.description || '';
      awardModalFlag.src = card.dataset.flag || '';
      awardModalFlag.alt = `${card.dataset.winner || 'Winner'} flag`;
      awardModal.classList.add('active');
      awardModal.setAttribute('aria-hidden', 'false');
    });
  });

  awardModalClose?.addEventListener('click', () => {
    awardModal.classList.remove('active');
    awardModal.setAttribute('aria-hidden', 'true');
  });

  awardModal?.addEventListener('click', event => {
    if (event.target === awardModal) {
      awardModal.classList.remove('active');
      awardModal.setAttribute('aria-hidden', 'true');
    }
  });

  // Player Search Functionality
  const playerSearchInput = document.getElementById('player-search');
  const playerResults = document.getElementById('player-results');
  let abortController = null;

  function renderPlayerEmptyState(message) {
    playerResults.innerHTML = `<p class="empty-state">${message}</p>`;
  }

  playerSearchInput?.addEventListener('input', async (event) => {
    const query = event.target.value.trim();

    if (!query) {
      // Cancel any pending requests
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      renderPlayerEmptyState('Start typing to search for players...');
      return;
    }

    // Cancel previous request if one is in progress
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    try {
      const response = await fetch(`/api/search-players?q=${encodeURIComponent(query)}`, {
        signal: abortController.signal
      });
      const players = await response.json();

      if (players.length === 0) {
        renderPlayerEmptyState('No players found matching your search.');
        return;
      }

      playerResults.innerHTML = players.map(player => `
        <div class="player-card">
          <div class="player-image ${!player.image || player.image.includes('undefined') ? 'no-image' : ''}">
            ${player.image && !player.image.includes('undefined') ? 
              `<img src="${player.image}" alt="${player.name}" onerror="this.parentElement.classList.add('no-image'); this.style.display='none';">` 
              : ''}
          </div>
          <p class="player-name">${player.name}</p>
          <p class="player-team">${player.team}</p>
        </div>
      `).join('');
    } catch (error) {
      // Don't show error if request was aborted (user typed something new)
      if (error.name !== 'AbortError') {
        renderPlayerEmptyState('Error loading players. Please try again.');
        console.error('Player search error:', error);
      }
    }
  });
});
