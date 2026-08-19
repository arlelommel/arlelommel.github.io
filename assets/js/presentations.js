(() => {
	'use strict';

	const state = {
		records: [],
		filter: 'keynote',
		query: ''
	};

	const results = document.getElementById('pres_results');
	const status = document.getElementById('pres_status');
	const filters = document.getElementById('pres_filters');
	const search = document.getElementById('pres_search');

	if (!results || !status || !filters || !search) {
		return;
	}

	const esc = value => String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

	// Preserve the same limited title/citation markup used on Publications.
	const richText = value => esc(value)
		.replace(/&lt;em&gt;/gi, '<em>')
		.replace(/&lt;\/em&gt;/gi, '</em>');


	// Abstracts allow only p, em, strong, and anchors with safe href values.

	const abstractHTML = value => {
		const template = document.createElement('template');
		template.innerHTML = String(value ?? '');

		const allowedTags = new Set(['P', 'STRONG', 'EM', 'A']);

		const sanitizeNode = node => {
			if (node.nodeType === Node.TEXT_NODE) {
				return document.createTextNode(node.textContent);
			}

			if (node.nodeType !== Node.ELEMENT_NODE) {
				return document.createDocumentFragment();
			}

			if (!allowedTags.has(node.tagName)) {
				const fragment = document.createDocumentFragment();
				[...node.childNodes].forEach(child => fragment.appendChild(sanitizeNode(child)));
				return fragment;
			}

			const clean = document.createElement(node.tagName.toLowerCase());

			if (node.tagName === 'A') {
				const href = node.getAttribute('href');

				if (href && !/^\s*(javascript|data|vbscript):/i.test(href)) {
					clean.setAttribute('href', href);
				}
			}

			[...node.childNodes].forEach(child => clean.appendChild(sanitizeNode(child)));
			return clean;
		};

		const output = document.createElement('div');
		[...template.content.childNodes].forEach(node => output.appendChild(sanitizeNode(node)));

		return output.innerHTML;
	};

	const typeLabels = {
		'keynote': 'Keynotes',
		'presentation': 'Presentations',
		'webinar': 'Webinars'
	};

	const filterOrder = ['keynote', 'presentation', 'webinar'];

	const labelForType = type => typeLabels[type] || String(type || '')
		.replace(/[-_]+/g, ' ')
		.replace(/\b\w/g, c => c.toUpperCase());

	const visibleRecords = () => state.records.filter(record => record.visible !== false);

	// Build lightweight presentation-series aggregates from direct series_parent links.
	// Data contract: every member points directly to one canonical record; chains are invalid.
	const preprocessSeries = records => {
		const byId = new Map(records.map(record => [record.id, record]));
		const membersByParent = new Map();
		const malformed = new Set();

		records.forEach(record => {
			if (!record.series_parent) return;

			const parentId = record.series_parent;
			const parent = byId.get(parentId);

			if (!record.id) {
				console.warn('Presentation series member is missing an id and cannot be grouped.', record);
				malformed.add(record);
				return;
			}

			if (parentId === record.id) {
				console.warn(`Presentation series record "${record.id}" points to itself as series_parent.`);
				malformed.add(record);
				return;
			}

			if (!parent) {
				console.warn(`Presentation series record "${record.id}" points to missing parent "${parentId}".`);
				malformed.add(record);
				return;
			}

			if (parent.series_parent) {
				console.warn(`Presentation series record "${record.id}" points to "${parentId}", which is itself a series member. series_parent must point directly to the canonical record.`);
				malformed.add(record);
				return;
			}

			if (!membersByParent.has(parentId)) {
				membersByParent.set(parentId, []);
			}

			membersByParent.get(parentId).push(record);
		});

		const collapsedMemberIds = new Set();
		const aggregates = new Map();

		membersByParent.forEach((members, parentId) => {
			const parent = byId.get(parentId);
			const validMembers = members.filter(member => !malformed.has(member));
			const instances = [parent, ...validMembers];
			console.table(
				instances.map(record => ({
					id: record.id,
					title: record.title,
					date: record.date
				}))
			);

			if (instances.length < 2) return;

			validMembers.forEach(member => collapsedMemberIds.add(member.id));

			const dated = instances
				.filter(record => record.date)
				.sort((a, b) => String(a.date).localeCompare(String(b.date)));

			const oldest = dated[0] || parent;
			const newest = dated[dated.length - 1] || parent;

			const aggregate = {
				...parent,
				title: parent.series_title || parent.title,
				display_title: parent.series_title || parent.display_title || parent.title,
				year: newest.year || (newest.date ? Number(String(newest.date).slice(0, 4)) : parent.year),
				date: newest.date || parent.date,
				is_series: true,
				series_count: instances.length,
				series_oldest_date: oldest.date || null,
				series_newest_date: newest.date || null,
				series_members: instances
			};

			aggregates.set(parentId, aggregate);
		});

		return records
			.filter(record => !collapsedMemberIds.has(record.id))
			.map(record => aggregates.get(record.id) || record);
	};

	const formatMonthYear = value => {
		if (!value) return '';

		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) return '';

		return new Intl.DateTimeFormat('en', {
			month: 'long',
			year: 'numeric'
		}).format(date);
	};

	const seriesDateRange = record => {
		if (!record.is_series) return '';

		const oldest = formatMonthYear(record.series_oldest_date);
		const newest = formatMonthYear(record.series_newest_date);

		if (!oldest && !newest) return '';
		if (!oldest) return newest;
		if (!newest) return oldest;
		if (oldest === newest) return oldest;

		return `${oldest} – ${newest}`;
	};

	const chronologicalSort = (a, b) => {
		const yearDiff = Number(b.year || 0) - Number(a.year || 0);
		if (yearDiff) return yearDiff;

		const dateA = a.date || '';
		const dateB = b.date || '';
		if (dateA !== dateB) return dateB.localeCompare(dateA);

		return String(a.title || '').localeCompare(String(b.title || ''));
	};

	const searchScore = (record, query) => {
		const q = query.toLowerCase();
		const title = String(record.title || '').toLowerCase();
		const authors = String(record.authors || '').toLowerCase();
		const abstract = String(record.abstract || '').toLowerCase();
		const citation = String(record.citation || '').toLowerCase();
		const source = String(record.source || '').toLowerCase();
		const subtitle = String(record.subtitle || '').toLowerCase();

		let score = 0;
		if (title === q) score += 100;
		if (title.startsWith(q)) score += 60;
		if (title.includes(q)) score += 40;
		if (subtitle.includes(q)) score += 24;
		if (authors.includes(q)) score += 18;
		if (citation.includes(q)) score += 16;
		if (abstract.includes(q)) score += 8;
		if (source.includes(q)) score += 4;
		return score;
	};

	const filteredRecords = () => {
		let records = preprocessSeries(visibleRecords());

		if (state.filter !== 'all') {
			records = records.filter(record => record.type === state.filter);
		}

		if (state.query) {
			return records
				.map(record => {
					const members = record.is_series ? record.series_members : [record];
					const score = Math.max(...members.map(member => searchScore(member, state.query)));
					return { record, score };
				})
				.filter(item => item.score > 0)
				.sort((a, b) => b.score - a.score || chronologicalSort(a.record, b.record))
				.map(item => item.record);
		}

		return [...records].sort(chronologicalSort);
	};

	const renderMeta = record => {
		const parts = [];
		if (record.authors) parts.push(record.authors);
		if (record.source) parts.push(record.source);

		if (record.is_series) {
			const range = seriesDateRange(record);
			if (range) parts.push(range);
			parts.push(`${record.series_count} instances in this series`);
		} else if (record.year) {
			parts.push(record.year);
		}

		if (record.type) parts.push(labelForType(record.type));
		return parts.map(esc).join(' · ');
	};

	const renderRecord = record => {
		const baseTitle = richText(record.display_title || record.title || 'Untitled');
		const title = record.is_series ? `${baseTitle} <span class="pres_series-label">(series)</span>` : baseTitle;
		const linkedTitle = record.url
			? `<a href="${esc(record.url)}">${title}</a>`
			: title;
		const citation = record.citation
			? `<p class="pres_record-citation">${richText(record.citation)}</p>`
			: '';
		const abstractSource = record.is_series
			? (record.series_members?.find(member => member.id === record.id)?.abstract || record.abstract)
			: record.abstract;

		const abstract = abstractSource
			? `<div class="pres_record-abstract">
				<button class="pres_disclosure pres_abstract-toggle" type="button" aria-expanded="false">Show description</button>
				<div class="pres_abstract-text" hidden>${abstractHTML(abstractSource)}</div>
			</div>`
		: '';

		return `
			<article class="pres_record">
				<h3 class="pres_record-title">${linkedTitle}</h3>
				<p class="pres_record-meta">${renderMeta(record)}</p>
				${citation}
				${abstract}
			</article>`;
	};

	const render = () => {
		const records = filteredRecords();
		status.textContent = `${records.length} presentation${records.length === 1 ? '' : 's'}`;

		if (!records.length) {
			results.innerHTML = '<p class="pres_empty">No presentations match the current search and filter.</p>';
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
			.map(([year, yearRecords]) => `<section class="pres_year-group"><h2 class="pres_year">${esc(year)}</h2>${yearRecords.map(renderRecord).join('')}</section>`)
			.join('');
	};

	const buildFilters = () => {
		const orderedFilters = ['keynote', 'presentation', 'webinar', 'all'];

		filters.innerHTML = orderedFilters.map(type => {
			const active = type === state.filter;
			const label = type === 'all' ? 'All presentations' : labelForType(type);

			return `<button class="pres_filter-button${active ? ' is-active' : ''}" type="button" data-filter="${esc(type)}" aria-pressed="${active ? 'true' : 'false'}">${esc(label)}</button>`;
		}).join('');
	};

	document.addEventListener('click', event => {
		const filterButton = event.target.closest('.pres_filter-button');
		if (filterButton) {
			state.filter = filterButton.dataset.filter;
			filters.querySelectorAll('.pres_filter-button').forEach(button => {
				const active = button === filterButton;
				button.classList.toggle('is-active', active);
				button.setAttribute('aria-pressed', active ? 'true' : 'false');
			});
			render();
			return;
		}

		const abstractButton = event.target.closest('.pres_abstract-toggle');
		if (abstractButton) {
			const text = abstractButton.nextElementSibling;
			const expanded = abstractButton.getAttribute('aria-expanded') === 'true';
			abstractButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
			abstractButton.textContent = expanded ? 'Show description' : 'Hide description';
			text.hidden = expanded;
		}
	});

	search.addEventListener('input', () => {
		state.query = search.value.trim();
		render();
	});

	fetch('/data/presentations.json')
		.then(response => {
			if (!response.ok) throw new Error(`Presentation data request failed: ${response.status}`);
			return response.json();
		})
		.then(data => {
			state.records = Array.isArray(data.records) ? data.records : [];
			buildFilters();
			render();
		})
		.catch(error => {
			console.error(error);
			status.textContent = '';
			results.innerHTML = '<p class="pres_empty">Presentation data could not be loaded.</p>';
		});
})();
