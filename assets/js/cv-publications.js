(() => {
  const root = document.querySelector('#cv_publications');
  const search = document.querySelector('#cv_search');
  const filters = [...document.querySelectorAll('.cv_filter')];
  const status = document.querySelector('#cv_status');
  let records = [];
  let activeType = 'all';

  const labels = {
    'csa-report':'CSA Research', 'webinar':'Webinars', 'blog':'Blog', 'elearning':'eLearning',
    'peer-reviewed':'Peer-reviewed', 'book-chapter':'Books & chapters', 'book-translation':'Book translations',
    'editorship':'Editorships', 'standard':'Standards', 'review':'Reviews', 'presentation':'Presentations'
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const prettyDate = d => d ? new Date(d+'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : '';

  /*
    Calculate a relevance score for a search query.

    Search behavior:
    - Every search term must appear somewhere in the record.
    - Title matches receive the strongest weight.
    - Subtitle/citation/author/source matches receive moderate weight.
    - Abstract matches receive the lowest weight.
    - An exact full-phrase title match receives an additional bonus.

    When no query is present, this function returns 0 and the normal
    chronological ordering is preserved.
  */
  function searchScore(record, query) {
    const phrase = query.trim().toLowerCase();
    if (!phrase) return 0;

    const terms = phrase.split(/\s+/).filter(Boolean);

    const title = String(record.display_title || record.title || '').toLowerCase();
    const subtitle = String(record.subtitle || '').toLowerCase();
    const authors = Array.isArray(record.authors)
      ? record.authors.join(' ').toLowerCase()
      : String(record.authors || '').toLowerCase();
    const citation = String(record.citation || '').toLowerCase();
    const source = String(record.source || '').toLowerCase();
    const abstract = String(record.abstract || '').toLowerCase();

    let score = 0;

    for (const term of terms) {
      let matched = false;

      if (title.includes(term)) {
        score += 50;
        matched = true;
      }

      if (subtitle.includes(term)) {
        score += 20;
        matched = true;
      }

      if (citation.includes(term)) {
        score += 15;
        matched = true;
      }

      if (authors.includes(term)) {
        score += 15;
        matched = true;
      }

      if (source.includes(term)) {
        score += 10;
        matched = true;
      }

      if (abstract.includes(term)) {
        score += 5;
        matched = true;
      }

      // Require all search terms to occur somewhere in the record.
      if (!matched) return 0;
    }

    // Strong bonus for the full search phrase appearing in the title.
    if (title === phrase) {
      score += 150;
    } else if (title.startsWith(phrase)) {
      score += 100;
    } else if (title.includes(phrase)) {
      score += 75;
    }

    return score;
  }

  function render() {
    const q = search.value.trim().toLowerCase();

    /*
      Apply visibility/type filters first, then rank search matches.

      With a search query:
        1. relevance score, highest first
        2. year, newest first
        3. title, alphabetically

      Without a search query:
        preserve the dataset's normal chronological grouping.
    */
    let shown = records
      .filter(r => r.visible && (activeType === 'all' || r.type === activeType))
      .map(r => ({ record: r, score: q ? searchScore(r, q) : 0 }))
      .filter(item => !q || item.score > 0);

    if (q) {
      shown.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;

        const yearA = Number(a.record.year) || 0;
        const yearB = Number(b.record.year) || 0;
        if (yearB !== yearA) return yearB - yearA;

        const titleA = String(a.record.display_title || a.record.title || '');
        const titleB = String(b.record.display_title || b.record.title || '');
        return titleA.localeCompare(titleB);
      });
    }

    status.textContent = `${shown.length} item${shown.length === 1 ? '' : 's'}`;

    if (!shown.length) {
      root.innerHTML = '<p class="cv_empty">No matching items.</p>';
      return;
    }

    /*
      Group by year for normal browsing. During search, relevance remains the
      primary sort inside each year because the array has already been ranked.
    */
    const groups = new Map();

    shown.forEach(item => {
      const r = item.record;
      const y = r.year || 'Undated';
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y).push(r);
    });

    /*
      When searching, order year groups by the best-ranked item that appears
      in each group. Because Map preserves insertion order, this naturally
      follows the relevance-sorted result list above.
    */
    root.innerHTML = [...groups.entries()].map(([year, items]) => `
      <section class="cv_year" aria-labelledby="cv_year_${year}">
        <h2 class="cv_year-heading" id="cv_year_${year}">${esc(year)}</h2>
        <div class="cv_entries">${items.map(itemHTML).join('')}</div>
      </section>`).join('');
  }

  function itemHTML(r) {
    const title = r.url ? `<a href="${esc(r.url)}">${esc(r.display_title || r.title)}</a>` : esc(r.display_title || r.title);
    const meta = [labels[r.type] || r.type, r.source==='CSA Research' ? r.authors : null, r.date ? prettyDate(r.date) : null].filter(Boolean).join(' · ');
    const citation = r.citation ? `<p class="cv_citation">${esc(r.citation)}</p>` : '';
    const abs = r.abstract ? `<details class="cv_abstract"><summary>Abstract</summary><p>${esc(r.abstract)}</p></details>` : '';
    return `<article class="cv_item" id="${esc(r.id)}"><h3 class="cv_item-title">${title}</h3><p class="cv_meta">${esc(meta)}</p>${citation}${abs}</article>`;
  }

  fetch('data/publications.json').then(r => r.json()).then(data => { records=data.records; render(); });
  search.addEventListener('input', render);
  filters.forEach(b => b.addEventListener('click', () => { activeType=b.dataset.type; filters.forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false')); render(); }));
})();
