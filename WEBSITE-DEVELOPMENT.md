# Website Development Reference

This document records the architecture, conventions, implementation
decisions, and current state of the Arle Lommel personal website. It is
intended to provide enough context to continue development in a new
ChatGPT Project or task-specific conversation without relying on the
original long development chat.

## 1. Site purpose and design direction

The site is a professional personal website presenting research,
projects, professional contributions, publications, résumé material, and
background information.

The design should remain restrained, editorial, and research-oriented
rather than resembling a conventional corporate portfolio. The existing
visual vocabulary is based heavily on EB Garamond, generous whitespace,
compact metadata, understated rules and accents, and semantic hierarchy.

The site is static and hosted with GitHub Pages. Development is tested
locally using a simple HTTP server, typically:

``` bash
python3 -m http.server 8000
```

Do not assume PHP or other server-side processing is available.

## 2. Intended site architecture

The site has moved from individual `.html` files toward section
directories with `index.html` files.

Intended top-level navigation:

-   Research
-   Projects
-   Contributions
-   Publications
-   Résumé
-   About

The root home page remains:

``` text
/index.html
```

Top-level sections should use directory URLs:

``` text
/research/index.html
/projects/index.html
/contributions/index.html
/publications/index.html
/resume/index.html
/about/index.html
```

This allows future subpages to inherit a meaningful URL hierarchy, for
example:

``` text
/projects/new-advent-corpus/
/projects/global-revenue-forecaster/
/research/multilingual-ai/
```

`CV` was reconsidered after Publications became a substantial
independent section. The preferred top-level concept is now **Résumé**,
with `/resume/` as the URL. The web résumé should be fuller than a
job-application PDF résumé but should not duplicate the exhaustive
Publications section.

## 3. Current directory concept

The working structure is approximately:

``` text
/
├── index.html
├── .gitignore
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   ├── cv-publications.css
│   │   └── resume.css
│   ├── images/
│   ├── includes/
│   │   ├── header.html
│   │   └── footer.html
│   └── js/
│       ├── includes.js
│       └── cv-publications.js
├── data/
│   └── publications.json
├── publications/
│   └── index.html
├── resume/
│   └── index.html
├── projects/
├── research/
├── contributions/
└── about/
```

Some destination pages may not yet exist. Temporary 404s for those
unfinished sections are expected during development.

## 4. Shared header and footer

The site is static, but the header and footer should not be duplicated
in every page. They are loaded at render time with JavaScript.

### Header fragment

`/assets/includes/header.html` contains only the shared header markup.

The header originally used this structure:

``` html
<header class="site-header">
    <div class="shell nav-wrap">
        <a class="site-name" href="/">Arle Lommel</a>
        <nav class="site-nav" aria-label="Primary navigation">
            <a href="/research/" data-section="research">Research</a>
            <a href="/projects/" data-section="projects">Projects</a>
            <a href="/contributions/" data-section="contributions">Contributions</a>
            <a href="/publications/" data-section="publications">Publications</a>
            <a href="/resume/" data-section="resume">Résumé</a>
            <a href="/about/" data-section="about">About</a>
        </nav>
    </div>
</header>
```

### Footer fragment

`/assets/includes/footer.html` is based on:

``` html
<footer class="site-footer">
    <div class="shell footer-wrap">
        <p>© <span id="year"></span> Arle Lommel</p>
        <div class="footer-links">
            <a href="/resume/">Résumé</a>
            <a href="/">Home</a>
        </div>
    </div>
</footer>
```

The year is set by JavaScript rather than by a script embedded in the
footer fragment.

### Page placeholders

Individual pages use:

``` html
<div id="site-header"></div>
```

near the beginning of `<body>`, and:

``` html
<div id="site-footer"></div>
```

near the end.

They load:

``` html
<script src="/assets/js/includes.js"></script>
```

### Root-relative paths

Shared assets and site-level links should generally use root-relative
URLs:

``` text
/assets/...
/data/...
/projects/...
/publications/
```

This is important because pages now live at different directory depths.

## 5. Active navigation

The shared header should mark the current top-level section
automatically rather than requiring page-specific header markup.

Navigation links carry `data-section` attributes. `includes.js`
determines the section from `window.location.pathname`, applies an
`active` class, and sets:

``` html
aria-current="page"
```

This means a page such as:

``` text
/projects/new-advent-corpus/
```

can automatically mark Projects as active.

The directory structure is therefore part of the navigation
architecture, not merely an organizational convenience.

## 6. Code formatting conventions

Use **tabs for indentation**, not spaces, in HTML, CSS, JavaScript, JSON
where practical, and other hand-maintained site code.

Semantic comments are encouraged where they improve maintainability.
Comments should explain responsibilities, assumptions, or non-obvious
behavior rather than narrating trivial syntax.

Page-specific CSS should remain distinct from the main site stylesheet
when practical.

For the Publications page, page-specific CSS uses `cv_`-prefixed class
names.

For the Résumé page, page-specific CSS should use `resume_`-prefixed
class names.

This naming convention makes it immediately clear which styles belong to
specialized pages and reduces accidental coupling to the main site CSS.

## 7. Publications architecture

Publications is now a substantial top-level section at:

``` text
/publications/
```

Its principal files are:

``` text
/publications/index.html
/assets/css/cv-publications.css
/assets/js/cv-publications.js
/data/publications.json
```

The page provides:

-   search;
-   format/type filtering;
-   chronological grouping;
-   expandable abstracts where available;
-   links to source publications where available.

### Default visibility rule

For CSA Research material, the original visibility rule was:

> If it has an abstract or is a webinar, show it; otherwise hide it by
> default.

Non-CSA material imported from the older CV defaults to visible.

Archived blog posts were generally excluded, with exceptions possible
for particularly relevant work.

Two "Continuously Updated" CSA records were identified as tool landing
pages rather than publications and were excluded from the publication
record.

## 8. Publications JSON

The JSON file contains a top-level `records` array and associated
metadata.

A representative record is conceptually:

``` json
{
    "id": "example-record",
    "doi": null,
    "title": "Canonical plain-text title",
    "subtitle": null,
    "display_title": "Display title with permitted semantic markup",
    "type": "peer-reviewed",
    "source": null,
    "authors": "Dr. Arle Lommel",
    "date": "2026-01-01",
    "year": 2026,
    "abstract": null,
    "url": null,
    "visible": true,
    "provenance": "manual"
}
```

JSON object property order is not semantically significant. Fields may
be added without breaking parsing provided the JSON remains valid.

`doi` was added immediately after `id` for human salience. Values may be
DOI strings or `null`.

A manually added dataset record exists for:

**New Advent Corpus of English Translations of the Writings of Early
Church Fathers**

with DOI:

``` text
10.13140/2.1.4816.9289
```

and a Zenodo record URL.

The record type `dataset` was added to support this and potentially
other datasets.

### Validate JSON after hand edits

A trailing comma once broke the Publications page. Before debugging
JavaScript, validate the entire JSON file with:

``` bash
python3 -m json.tool data/publications.json > /dev/null
```

Silent return means valid JSON.

## 9. Publication title semantics and typography

The distinction between `title` and `display_title` is intentional.

### `title`

Use as the canonical **plain-text** title.

It should drive:

-   search;
-   sorting;
-   other logic that should not be affected by markup.

### `display_title`

Use for presentation.

It may contain limited semantic markup, currently principally:

``` html
<em>...</em>
```

This permits proper italicization of book titles and similar
bibliographic material.

Do not use `display_title` as the search key.

### Limited rich text

The renderer uses a helper conceptually like:

``` javascript
// Escape all HTML, then selectively restore permitted semantic markup.
const richText = s => esc(s)
    .replace(/&lt;em&gt;/gi, '<em>')
    .replace(/&lt;\/em&gt;/gi, '</em>');
```

This deliberately does **not** enable arbitrary HTML. It escapes
everything and selectively restores the permitted `<em>` tags.

Use `richText()` for:

-   `display_title`;
-   `citation`.

Continue escaping fields that do not need semantic markup.

The citation renderer should therefore use:

``` javascript
richText(r.citation)
```

rather than:

``` javascript
esc(r.citation)
```

Abstracts currently remain escaped plain text unless a future
requirement justifies controlled markup there.

## 10. Publication search behavior

Search was modified to rank results by relevance rather than merely
filtering them.

Title matches should have priority over matches in abstracts and other
fields.

Search should operate on `record.title`, not `record.display_title`,
because the latter may contain presentation markup.

The search-result ordering uses relevance score first, then
deterministic tie-breaking such as year and title.

The conceptual field roles are:

``` text
title          canonical plain-text title; search and sorting
display_title  presentation title; limited semantic markup permitted
```

## 11. Publication chronological sorting

A bug exposed that the renderer had been relying on the physical order
of records in the JSON.

JavaScript `Map` preserves insertion order. Consequently, if a 2015
record appeared first in the JSON, the 2015 year group could appear
before 2026 even though subsequent records were chronologically
arranged.

The renderer should therefore explicitly sort records before grouping
them.

This sorting must happen not only in the main view but also when a
format filter such as Peer-reviewed is selected.

For normal browsing, the intended sort hierarchy is:

1.  year descending;
2.  date descending where available;
3.  title alphabetically as a deterministic fallback.

Year must be considered independently because some older CV-derived
records have a valid `year` but `date: null`.

Search results use relevance score first and chronological/title
tie-breakers thereafter.

The order of records in `publications.json` should therefore be
considered irrelevant to presentation.

## 12. Publications fetch path

Because Publications moved from a root-level `publications.html` to:

``` text
/publications/index.html
```

the JSON fetch must be root-relative:

``` javascript
fetch('/data/publications.json')
```

Do **not** use:

``` javascript
fetch('data/publications.json')
```

from the directory-based page, because that resolves to:

``` text
/publications/data/publications.json
```

and produces a 404.

## 13. Safari caching issue

Safari aggressively cached an older copy of `cv-publications.js`, even
after Safari was restarted. This made correct source edits appear
ineffective.

Adding a query parameter to the script URL forced a fresh request:

``` html
<script src="/assets/js/cv-publications.js?v=2"></script>
```

This may be retained. During active development, incrementing the
version parameter is a useful cache-busting mechanism:

``` text
?v=3
?v=4
```

If localhost behavior appears inconsistent with the file on disk,
inspect the exact served resource or change the version query before
assuming the current code is faulty.

## 14. Ad-blocker behavior on localhost

Safari showed a repeatable but nonfatal console error in a normal window
that did not appear in a private window.

The error was traced to the AdBlock extension rather than to site code.

Whitelisting `localhost` in AdBlock eliminated the console noise.

Keep AdBlock enabled for normal browsing; localhost is simply exempted
for development.

## 15. Résumé direction

The current designed résumé source is the newer IDML version, referred
to during development as `resume-nicer.idml`.

An older `resume-netflix.pdf` exists but is substantially more verbose
and is not the preferred structural/design source.

The web résumé should preserve the visual vocabulary of the newer IDML
where practical, including:

-   EB Garamond-led typography;
-   restrained editorial presentation;
-   compact metadata;
-   small section headings;
-   clear date/role relationships;
-   role summaries and achievement bullets;
-   strong but not decorative hierarchy.

It should remain a web page rather than attempting to reproduce print
layout literally.

### Résumé sections

The requested internal navigation is:

-   Contact
-   Executive profile
    -   Key achievements
    -   Research and analytic methods
-   Professional experience
-   Education
-   Languages

The second-level navigation under Executive profile is acceptable
because the page is long enough to justify direct access.

### Publications from Résumé

Do not duplicate the publication list on the résumé page.

Instead, include a prominent link near the top:

**My publications**

pointing to:

``` text
/publications/
```

The Publications section is the canonical full research record.

### Résumé vs CV

The preferred site label is **Résumé**, not CV.

The conceptual distinction is:

-   **Résumé** --- what I have done and what I can do;
-   **Publications** --- documented research and scholarly output;
-   **Projects** --- things I have built or developed;
-   **Contributions** --- broader professional/community impact;
-   **Research** --- what I work on and how I approach it.

A downloadable PDF résumé may eventually be linked prominently from the
HTML résumé page.

## 16. Current résumé content direction

The current résumé presents the user as a research leader specializing
in multilingual AI, machine translation, localization quality,
human-machine interaction, global content, quantitative analysis,
cultural research, international standards, and business strategy.

Major professional themes include:

-   leadership of CSA Research's distributed research organization;
-   Multidimensional Quality Metrics (MQM);
-   presidency of the MQM Council;
-   ASTM standardization of MQM;
-   multilingual AI and language technology;
-   translation quality;
-   Post-Localization;
-   Augmented Translation / Human at the Core;
-   global content transformation;
-   multilingual web and interoperability;
-   computational research methods;
-   research-to-product/tool development.

Professional experience includes CSA Research / Common Sense Advisory,
MQM Council, ASTM F43.03, DFKI, GALA, and LISA.

Education includes a PhD and MA in Folkloristics from Indiana
University, graduate study in Comparative Literature at Brigham Young
University, and a BA in Linguistics from Brigham Young University.

Languages listed are English, Hungarian, and German.

When updating résumé wording, prefer the newer IDML content over the
older Netflix résumé unless there is an explicit reason to recover
material from the older document.

## 17. Projects direction

A future Projects section should include the New Advent Corpus as an
open-resource project.

The corpus is approximately 30 MB and should not necessarily be stored
directly in the GitHub Pages repository.

It is now hosted/being established on Zenodo and has the existing DOI:

``` text
10.13140/2.1.4816.9289
```

The corpus consists of public-domain translations gathered from an
existing website with permission from the compiler; the user performed
segmentation and conversion to TEI.

The original compiler should receive appropriate credit for
gathering/maintaining the source collection.

The project is useful on the site because it demonstrates commitment to
open scholarly resources as well as corpus/TEI work.

The historical `readme.txt` may remain as `.txt`; there is no need to
convert it to Markdown merely for modernity if preserving the existing
artifact is preferable.

## 18. Git conventions and housekeeping

`.DS_Store` should not be tracked.

The repository now has a `.gitignore` containing:

``` text
.DS_Store
```

A previously tracked root `.DS_Store` was removed from Git's index.

For structural changes involving moved/deleted directories, use:

``` bash
git add -A
```

so additions, deletions, and moves are all staged.

After staging, inspect:

``` bash
git status
```

before committing.

## 19. Design and maintainability principles

When modifying the site:

-   Preserve the established visual vocabulary rather than introducing
    unrelated component styles.
-   Prefer semantic HTML.
-   Keep page-specific CSS isolated where practical.
-   Prefix specialized page classes (`cv_`, `resume_`) so their
    ownership is obvious.
-   Use tabs for indentation.
-   Add semantic comments for non-obvious responsibilities and behavior.
-   Prefer root-relative URLs for site assets and navigation.
-   Make presentation independent of incidental data-file ordering.
-   Keep canonical data separate from presentation markup where
    possible.
-   Permit only the minimum rich HTML needed in data fields.
-   Avoid duplicating shared site chrome across pages.
-   Avoid duplicating Publications content in the Résumé.
-   Treat accessibility attributes such as `aria-current`, `aria-label`,
    and live status regions as part of the implementation rather than
    optional decoration.

## 20. Useful debugging checklist

If Publications fails to load:

1.  Check that `/assets/js/cv-publications.js` is actually the current
    served file.

2.  If Safari may be caching it, increment the `?v=` query parameter.

3.  Open `/data/publications.json` directly in the browser.

4.  Validate JSON:

    ``` bash
    python3 -m json.tool data/publications.json > /dev/null
    ```

5.  Confirm the fetch uses:

    ``` javascript
    fetch('/data/publications.json')
    ```

6.  Check for 404s in the Network/Console view.

7.  Remember that localhost is whitelisted in AdBlock to prevent
    extension-generated console errors.

If shared header/footer fails:

1.  Confirm the page is being served over `http://localhost`, not opened
    as `file://`.
2.  Confirm `/assets/js/includes.js` loads.
3.  Confirm `/assets/includes/header.html` and
    `/assets/includes/footer.html` are accessible directly.
4.  Check that the page contains `#site-header` and `#site-footer`
    placeholders.
5.  Verify root-relative paths.

## 21. Recommended conversation split for future work

For a new ChatGPT Project, use separate task-oriented conversations
rather than allowing one conversation to accumulate the entire site
history.

Suggested conversations:

-   **Site architecture & shared components**
    -   directories;
    -   navigation;
    -   header/footer;
    -   shared CSS;
    -   accessibility;
    -   deployment.
-   **Résumé**
    -   `/resume/`;
    -   IDML-derived content;
    -   résumé-specific CSS;
    -   PDF résumé link.
-   **Publications**
    -   JSON schema;
    -   import/cleanup;
    -   search;
    -   filters;
    -   sorting;
    -   bibliographic typography.
-   **Projects**
    -   project pages;
    -   New Advent corpus;
    -   analytical tools and open resources.
-   **Research / Contributions / About**
    -   content and structure for those site sections.

This document should be treated as the shared architectural reference
across those conversations. When implementation files conflict with this
document, inspect the current files before changing them: some details
may have evolved after this reference was written.
