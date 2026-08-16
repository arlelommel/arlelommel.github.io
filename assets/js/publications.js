(() => {
	'use strict';

	const state = {
		records: [],
		mode: 'selected',
		filter: 'all',
		query: ''
	};

	const results = document.getElementById('pub_results');
	const status = document.getElementById('pub_status');
	const controls = document.getElementById('pub_all-controls');
	const filters = document.getElementById('pub_filters');
	const search = document.getElementById('pub_search');
	const selectedFooter = document.getElementById('pub_selected-footer');

	if (!results || !status || !controls || !filters || !search || !selectedFooter) {
		return;
	}

	const esc = value => String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

	// Existing bibliographic rich text: escape everything, then restore <em> only.
	const richText = value => esc(value)
		.replace(/&lt;em&gt;/gi, '<em>')
		.replace(/&lt;\/em&gt;/gi, '</em>');

	// Selected commentary allows only p, em, strong, and anchors with safe href values.
	const significanceHTML = value => {
		const template = document.createElement('template');
		template.innerHTML = String(value ?? '');

		const allowed = new Set(['P', 'EM', 'STRONG', 'A']);
		const safeProtocols = new Set(['http:', 'https:', 'mailto:']);

		const cleanNode = node => {
			if (node.nodeType === Node.TEXT_NODE) {
				return document.createTextNode(node.textContent);
			}

			if (node.nodeType !== Node.ELEMENT_NODE) {
				return document.createDocumentFragment();
			}

			if (!allowed.has(node.tagName)) {
				const fragment = document.createDocumentFragment();
				[...node.childNodes].forEach(child => fragment.append(cleanNode(child)));
				return fragment;
			}

			const clean = document.createElement(node.tagName.toLowerCase());

			if (node.tagName === 'A') {
				const href = node.getAttribute('href') || '';
				let safeHref = '';

				try {
					const parsed = new URL(href, window.location.origin);
					const isRelative = !/^[a-z][a-z0-9+.-]*:/i.test(href);
					if (isRelative || safeProtocols.has(parsed.protocol)) {
						safeHref = href;
					}
				} catch (_) {
					safeHref = '';
				}

				if (safeHref) {
					clean.setAttribute('href', safeHref);
					if (/^https?:/i.test(safeHref)) {
						clean.setAttribute('rel', 'noopener noreferrer');
					}
				}
			}

			[...node.childNodes].forEach(child => clean.append(cleanNode(child)));
			return clean;
		};

		const output = document.createElement('div');
		[...template.content.childNodes].forEach(node => output.append(cleanNode(node)));
		return output.innerHTML;
	};

	const typeLabels = {
		'peer-reviewed': 'Peer-reviewed',
		'csa-report': 'CSA reports',
		'book-chapter': 'Book chapters',
		'book-translation': 'Book translations',
		'presentation': 'Presentations',
		'webinar': 'Webinars',
		'standard': 'Standards',
		'editorship': 'Editorships',
		'review': 'Reviews',
		'dataset': 'Datasets'
	};

	const labelForType = type => typeLabels[type] || String(type || '')
		.replace(/[-_]+/g, ' ')
		.replace(/\b\w/g, c => c.toUpperCase());

	const visibleRecords = () => state.records.filter(record => record.visible !== false);

	const chronologicalSort = (a, b) => {
		const yearDiff = Number(b.year || 0) - Number(a.year || 0);
		if (yearDiff) return yearDiff;

		const dateA = a.date || '';
		const dateB = b.date || '';
		if (dateA !== dateB) return dateB.localeCompare(dateA);

		return String(a.title || '').localeCompare(String(b.title || ''));
	};

	const selectedSort = (a, b) => {
		const orderDiff = Number(a.preferred_order) - Number(b.preferred_order);
		if (orderDiff) return orderDiff;
		return String(a.title || '').localeCompare(String(b.title || ''));
	};

	const searchScore = (record, query) => {
		const q = query.toLowerCase();
		const title = String(record.title || '').toLowerCase();
		const authors = String(record.authors || '').toLowerCase();
		const abstract = String(record.abstract || '').toLowerCase();
		const citation = String(record.citation || '').toLowerCase();
		const source = String(record.source || '').toLowerCase();

		let score = 0;
		if (title === q) score += 100;
		if (title.startsWith(q)) score += 60;
		if (title.includes(q)) score += 40;
		if (authors.includes(q)) score += 18;
		if (citation.includes(q)) score += 12;
		if (abstract.includes(q)) score += 8;
		if (source.includes(q)) score += 4;
		return score;
	};

	const selectedRecords = () => visibleRecords()
		.filter(record => Object.prototype.hasOwnProperty.call(record, 'preferred_order'))
		.filter(record => Number.isFinite(Number(record.preferred_order)))
		.sort(selectedSort);

	const allRecords = () => {
		let records = visibleRecords();
		if (state.filter !== 'all') {
			records = records.filter(record => record.type === state.filter);
		}

		if (state.query) {
			records = records
				.map(record => ({ record, score: searchScore(record, state.query) }))
				.filter(item => item.score > 0)
				.sort((a, b) => b.score - a.score || chronologicalSort(a.record, b.record))
				.map(item => item.record);
			return records;
		}

		return [...records].sort(chronologicalSort);
	};

	const renderMeta = record => {
		const parts = [];
		if (record.authors) parts.push(record.authors);
		if (record.source) parts.push(record.source);
		if (record.year) parts.push(record.year);
		if (record.type) parts.push(labelForType(record.type));
		return parts.map(esc).join(' · ');
	};

	const renderSignificance = record => {
		if (state.mode !== 'selected' || !record.significance) return '';

		return `
			<div class="pub_significance">
				<p class="pub_significance-label">Context and significance</p>
				<div class="pub_significance-clip">
					<div class="pub_significance-content">${significanceHTML(record.significance)}</div>
				</div>
				<button class="pub_disclosure pub_significance-toggle" type="button" aria-expanded="false">Read more</button>
			</div>`;
	};

	const renderRecord = record => {
		const title = richText(record.display_title || record.title || 'Untitled');
		const linkedTitle = record.url
			? `<a href="${esc(record.url)}">${title}</a>`
			: title;
		const citation = record.citation
			? `<p class="pub_record-citation">${richText(record.citation)}</p>`
			: '';
		const abstract = record.abstract
			? `<div class="pub_record-abstract">
				<button class="pub_disclosure pub_abstract-toggle" type="button" aria-expanded="false">Show abstract</button>
				<p class="pub_abstract-text" hidden>${esc(record.abstract)}</p>
			</div>`
			: '';

		return `
			<article class="pub_record">
				<h3 class="pub_record-title">${linkedTitle}</h3>
				<p class="pub_record-meta">${renderMeta(record)}</p>
				${citation}
				${abstract}
				${renderSignificance(record)}
			</article>`;
	};

	const renderSelected = records => {
		if (!records.length) {
			results.innerHTML = '<p class="pub_empty">No selected publications have been defined yet.</p>';
			return;
		}
		results.innerHTML = records.map(renderRecord).join('');
	};

	const renderAll = records => {
		if (!records.length) {
			results.innerHTML = '<p class="pub_empty">No publications match the current search and filters.</p>';
			return;
		}

		if (state.query) {
			results.innerHTML = records.map(renderRecord).join('');
			return;
		}

		const groups = new Map();
		records.forEach(record => {
			const year = record.year || 'Undated';
			if (!groups.has(year)) groups.set(year, []);
			groups.get(year).push(record);
		});

		results.innerHTML = [...groups.entries()]
			.map(([year, yearRecords]) => `<section class="pub_year-group"><h2 class="pub_year">${esc(year)}</h2>${yearRecords.map(renderRecord).join('')}</section>`)
			.join('');
	};

	const updateStatus = count => {
		if (state.mode === 'selected') {
			status.textContent = `${count} selected publication${count === 1 ? '' : 's'}`;
			return;
		}
		status.textContent = `${count} publication${count === 1 ? '' : 's'}`;
	};

	const render = () => {
		const records = state.mode === 'selected' ? selectedRecords() : allRecords();
		updateStatus(records.length);
		if (state.mode === 'selected') renderSelected(records);
		else renderAll(records);
	};

	const setMode = mode => {
		state.mode = mode;
		controls.hidden = mode !== 'all';
		selectedFooter.hidden = mode !== 'selected';

		document.querySelectorAll('.pub_mode-button').forEach(button => {
			const active = button.dataset.mode === mode;
			button.classList.toggle('is-active', active);
			button.setAttribute('aria-pressed', active ? 'true' : 'false');
		});

		render();
	};

	const buildFilters = () => {
		const types = [...new Set(visibleRecords().map(record => record.type).filter(Boolean))]
			.sort((a, b) => labelForType(a).localeCompare(labelForType(b)));

		filters.innerHTML = [
			'<button class="pub_filter-button is-active" type="button" data-filter="all" aria-pressed="true">All types</button>',
			...types.map(type => `<button class="pub_filter-button" type="button" data-filter="${esc(type)}" aria-pressed="false">${esc(labelForType(type))}</button>`)
		].join('');
	};

	document.addEventListener('click', event => {
		const modeButton = event.target.closest('.pub_mode-button');
		if (modeButton) {
			setMode(modeButton.dataset.mode);
			return;
		}

		if (event.target.closest('[data-switch-to-all]')) {
			setMode('all');
			window.scrollTo({ top: document.querySelector('.pub_mode-switch').offsetTop - 24, behavior: 'smooth' });
			return;
		}

		const filterButton = event.target.closest('.pub_filter-button');
		if (filterButton) {
			state.filter = filterButton.dataset.filter;
			filters.querySelectorAll('.pub_filter-button').forEach(button => {
				const active = button === filterButton;
				button.classList.toggle('is-active', active);
				button.setAttribute('aria-pressed', active ? 'true' : 'false');
			});
			render();
			return;
		}

		const abstractButton = event.target.closest('.pub_abstract-toggle');
		if (abstractButton) {
			const text = abstractButton.nextElementSibling;
			const expanded = abstractButton.getAttribute('aria-expanded') === 'true';
			abstractButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
			abstractButton.textContent = expanded ? 'Show abstract' : 'Hide abstract';
			text.hidden = expanded;
			return;
		}

		const significanceButton = event.target.closest('.pub_significance-toggle');
		if (significanceButton) {
			const block = significanceButton.closest('.pub_significance');
			const expanded = significanceButton.getAttribute('aria-expanded') === 'true';
			block.classList.toggle('is-expanded', !expanded);
			significanceButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
			significanceButton.textContent = expanded ? 'Read more' : 'Show less';
		}
	});

	search.addEventListener('input', () => {
		state.query = search.value.trim();
		render();
	});

	fetch('/data/publications.json')
		.then(response => {
			if (!response.ok) throw new Error(`Publication data request failed: ${response.status}`);
			return response.json();
		})
		.then(data => {
			state.records = Array.isArray(data.records) ? data.records : [];
			buildFilters();
			setMode('selected');
		})
		.catch(error => {
			console.error(error);
			status.textContent = '';
			results.innerHTML = '<p class="pub_empty">Publication data could not be loaded.</p>';
			selectedFooter.hidden = true;
		});
})();
