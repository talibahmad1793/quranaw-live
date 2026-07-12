const cfg = window.SITE_CONFIG;
const API_ROOT = `https://api.github.com/repos/${cfg.githubOwner}/${cfg.githubRepo}/contents`;
const RAW_ROOT = `https://raw.githubusercontent.com/${cfg.githubOwner}/${cfg.githubRepo}/${cfg.githubBranch}`;

const app = document.getElementById("app");

document.title = cfg.siteTitle;
document.querySelectorAll("[data-site-title]").forEach((el) => (el.textContent = cfg.siteTitle));

function titleFromSlug(slug) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\.pdf$/i, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function githubList(path) {
  const url = path ? `${API_ROOT}/${path}?ref=${cfg.githubBranch}` : `${API_ROOT}?ref=${cfg.githubBranch}`;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) {
    if (res.status === 403) throw new Error("GitHub API rate limit reached. Try again in a bit.");
    if (res.status === 404) throw new Error("Repo or folder not found. Check config.js.");
    throw new Error(`GitHub API error (${res.status})`);
  }
  return res.json();
}

function naturalSort(a, b) {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child) node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function renderLoading(target) {
  target.appendChild(el("p", { class: "state-msg" }, "Loading\u2026"));
}

function renderError(target, message) {
  target.appendChild(el("p", { class: "state-msg error" }, message));
}

async function renderHome() {
  app.innerHTML = "";
  const hero = el("section", { class: "hero" }, [
    el("div", { class: "container" }, [
      el("p", { class: "eyebrow" }, "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u0647\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650"),
      el("h1", {}, cfg.siteTitle),
      el("p", {}, cfg.tagline),
    ]),
  ]);
  app.appendChild(hero);

  const main = el("main", { class: "container" });
  app.appendChild(main);
  renderLoading(main);

  try {
    const items = await githubList("");
    const folders = items.filter((i) => i.type === "dir").sort(naturalSort);
    main.innerHTML = "";

    if (folders.length === 0) {
      main.appendChild(
        el("p", { class: "state-msg" }, "No books yet \u2014 push a folder of PDFs to your repo and refresh.")
      );
      return;
    }

    const grid = el("div", { class: "grid" });
    folders.forEach((folder) => {
      const card = el("a", { class: "card", href: `#/book/${encodeURIComponent(folder.name)}` }, [
        el("div", { class: "card-spine" }),
        el("div", { class: "card-body" }, [
          el("span", { class: "card-kicker" }, "Book"),
          el("h2", { class: "card-title" }, titleFromSlug(folder.name)),
          el("p", { class: "card-desc" }, "Tap to view parts"),
        ]),
      ]);
      grid.appendChild(card);
    });
    main.appendChild(grid);
  } catch (e) {
    main.innerHTML = "";
    renderError(main, e.message);
  }
}

async function renderBook(bookSlug) {
  app.innerHTML = "";
  const main = el("main", { class: "container" });
  app.appendChild(main);
  main.appendChild(el("p", { class: "crumb" }, [el("a", { href: "#/" }, "Library"), ` / ${titleFromSlug(bookSlug)}`]));
  main.appendChild(el("h1", { class: "page-title" }, titleFromSlug(bookSlug)));
  const listWrap = el("div");
  main.appendChild(listWrap);
  renderLoading(listWrap);

  try {
    const items = await githubList(bookSlug);
    const files = items.filter((i) => i.type === "file" && /\.pdf$/i.test(i.name)).sort(naturalSort);
    listWrap.innerHTML = "";

    if (files.length === 0) {
      listWrap.appendChild(el("p", { class: "state-msg" }, "No PDF parts uploaded to this folder yet."));
      return;
    }

    const grid = el("div", { class: "part-grid" });
    files.forEach((file, i) => {
      const tile = el(
        "a",
        { class: "tile", href: `#/book/${encodeURIComponent(bookSlug)}/part/${encodeURIComponent(file.name)}` },
        [el("span", { class: "tile-num" }, String(i + 1)), el("span", { class: "tile-label" }, titleFromSlug(file.name))]
      );
      grid.appendChild(tile);
    });
    listWrap.appendChild(grid);
  } catch (e) {
    listWrap.innerHTML = "";
    renderError(listWrap, e.message);
  }
}

function renderPart(bookSlug, fileName) {
  app.innerHTML = "";
  const rawUrl = `${RAW_ROOT}/${bookSlug}/${encodeURIComponent(fileName)}`;
  const wrap = el("div", { class: "container" }, [
    el("p", { class: "crumb" }, [
      el("a", { href: "#/" }, "Library"),
      " / ",
      el("a", { href: `#/book/${encodeURIComponent(bookSlug)}` }, titleFromSlug(bookSlug)),
      ` / ${titleFromSlug(fileName)}`,
    ]),
    el("div", { class: "viewer-wrap" }, [
      el("div", { class: "viewer-top" }, [
        el("a", { href: `#/book/${encodeURIComponent(bookSlug)}` }, "\u2190 Back to parts"),
        el("span", {}, titleFromSlug(fileName)),
        el("a", { href: rawUrl, target: "_blank", rel: "noopener" }, "Open raw PDF \u2197"),
      ]),
      el("iframe", { class: "viewer-frame", src: rawUrl, title: fileName }),
    ]),
  ]);
  app.appendChild(el("main", {}, wrap));
}

function route() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);

  if (parts[0] === "book" && parts[1] && parts[2] === "part" && parts[3]) {
    renderPart(decodeURIComponent(parts[1]), decodeURIComponent(parts[3]));
  } else if (parts[0] === "book" && parts[1]) {
    renderBook(decodeURIComponent(parts[1]));
  } else {
    renderHome();
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
