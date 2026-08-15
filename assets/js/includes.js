async function loadInclude(selector, url) {
	const element = document.querySelector(selector);

	if (!element) return;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Could not load ${url}: ${response.status}`);
		}

		element.innerHTML = await response.text();
	} catch (error) {
		console.error(error);
	}
}


function markActiveNavigation() {
	const path = window.location.pathname;

	document.querySelectorAll('.site-nav a[data-section]').forEach(link => {
		const section = link.dataset.section;

		if (path.startsWith(`/${section}/`)) {
			link.classList.add('active');
			link.setAttribute('aria-current', 'page');
		}
	});
}


async function loadSiteChrome() {
	await Promise.all([
		loadInclude('#site-header', '/assets/includes/header.html'),
		loadInclude('#site-footer', '/assets/includes/footer.html')
	]);

	markActiveNavigation();

	const year = document.getElementById('year');

	if (year) {
		year.textContent = new Date().getFullYear();
	}
}


loadSiteChrome();