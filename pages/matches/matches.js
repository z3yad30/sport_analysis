document.addEventListener('DOMContentLoaded', () => {
  const matchesSearchInput = document.getElementById('match-search-matches');

  function filterMatches(listSelector, query) {
    const cards = document.querySelectorAll(`${listSelector} .match-card`);
    cards.forEach(card => {
      const title = card.dataset.title || '';
      card.style.display = title.includes(query) ? '' : 'none';
    });
  }

  matchesSearchInput?.addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    filterMatches('#matches-tab-list', query);
  });

  /**
   * Handle match analysis button click
   */
  document.querySelectorAll('.match-action').forEach(button => {
    button.addEventListener('click', async (e) => {
      const matchCard = e.target.closest('.match-card');
      const matchId = matchCard?.dataset.matchId;

      if (!matchId) {
        alert('Error: Match ID not found.');
        return;
      }

      try {
        const originalText = e.target.textContent;
        e.target.textContent = 'Loading...';
        e.target.disabled = true;

        const response = await fetch(`/api/match/${matchId}`);

        if (!response.ok) {
          throw new Error(`Failed to load match data: ${response.status}`);
        }

        const matchData = await response.json();

        if (Array.isArray(matchData)) {
          const normalizedMatch = {
            ...matchData[0],
            events: matchData,
            id: matchId,
          };
          localStorage.setItem(`match_${matchId}`, JSON.stringify(normalizedMatch));
          localStorage.setItem('matches', JSON.stringify([normalizedMatch]));
        } else {
          localStorage.setItem(`match_${matchId}`, JSON.stringify(matchData));
        }

        sessionStorage.setItem('activeMatchId', matchId);
        window.location.href = `/pages/match_analysis/index.html?matchId=${encodeURIComponent(matchId)}`;
      } catch (error) {
        console.error('Error loading match data:', error);
        e.target.textContent = originalText;
        e.target.disabled = false;
        alert('Error loading match data. Please try again.');
      }
    });
  });

  const groupCards = document.querySelectorAll('.group-card');
  const groupPopup = document.getElementById('group-popup');
  const groupPopupClose = document.getElementById('group-popup-close');

  groupCards.forEach(card => {
    card.addEventListener('click', () => {
      const groupName = card.dataset.group || '';
      groupPopup.querySelector('.group-popup-title').textContent = `Group ${groupName} analysis`;
      groupPopup.classList.add('active');
      groupPopup.setAttribute('aria-hidden', 'false');
    });
  });

  groupPopupClose?.addEventListener('click', () => {
    groupPopup.classList.remove('active');
    groupPopup.setAttribute('aria-hidden', 'true');
  });

  groupPopup?.addEventListener('click', event => {
    if (event.target === groupPopup) {
      groupPopup.classList.remove('active');
      groupPopup.setAttribute('aria-hidden', 'true');
    }
  });
});
