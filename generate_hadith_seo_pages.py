#!/usr/bin/env python3
"""Build static, indexable pages for Sahih al-Bukhari hadith URLs.

GitHub Pages serves this project's SPA shell for normal app routes.  Search
engines therefore cannot reliably receive the title, H1, and hadith text for
an individual citation.  This script writes an independent HTML document for
each Bukhari hadith at /hadith/bukhari/<book>/h/<number>/ and adds those URLs
to sitemap.xml.

Run from the repository root before deploying:
    python generate_hadith_seo_pages.py

Use --dry-run first to see the number of pages without writing anything.
"""

from __future__ import annotations

import argparse
import html
import json
import re
from datetime import date
from pathlib import Path
import xml.etree.ElementTree as ET

SITE_ORIGIN = "https://www.quranaw.com"
COLLECTION_SLUG = "bukhari"
COLLECTION_NAME = "Sahih al-Bukhari"
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"


def clean_text(value: str) -> str:
    """Normalise whitespace but preserve the actual hadith wording."""
    return re.sub(r"\s+", " ", value or "").strip()


def description_for(reference: str, english: str) -> str:
    text = f"{reference}: {clean_text(english)}"
    return text[:157].rsplit(" ", 1)[0] + "..." if len(text) > 160 else text


def page_html(*, chapter_number: str, chapter: str, hadith: dict) -> str:
    number = hadith["n"]
    reference = f"{COLLECTION_NAME} {number}"
    canonical = f"{SITE_ORIGIN}/hadith/{COLLECTION_SLUG}/{chapter_number}/h/{number}"
    title = f"{reference} — {chapter} | QuranAW"
    english = clean_text(hadith.get("en", ""))
    hinglish = clean_text(hadith.get("hi", ""))
    arabic = clean_text(hadith.get("ar", ""))
    description = description_for(reference, english)
    breadcrumb_schema = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Hadith Collections", "item": f"{SITE_ORIGIN}/hadith"},
                {"@type": "ListItem", "position": 2, "name": COLLECTION_NAME, "item": f"{SITE_ORIGIN}/hadith/{COLLECTION_SLUG}"},
                {"@type": "ListItem", "position": 3, "name": f"Book {chapter_number}: {chapter}", "item": f"{SITE_ORIGIN}/hadith/{COLLECTION_SLUG}/{chapter_number}"},
                {"@type": "ListItem", "position": 4, "name": reference, "item": canonical},
            ],
        },
        ensure_ascii=False,
    )
    hadith_schema = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            "name": reference,
            "headline": title,
            "text": english,
            "inLanguage": "en",
            "isPartOf": {"@type": "CreativeWork", "name": COLLECTION_NAME},
            "url": canonical,
        },
        ensure_ascii=False,
    )
    # JSON-LD lives in a raw-text script element. Avoid an accidental closing
    # tag if a future source text ever contains the sequence "</script>".
    breadcrumb_schema = breadcrumb_schema.replace("</", "<\\/")
    hadith_schema = hadith_schema.replace("</", "<\\/")
    esc = html.escape
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">
  <link rel="canonical" href="{esc(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="QuranAW">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:url" content="{esc(canonical)}">
  <meta property="og:image" content="{SITE_ORIGIN}/android-chrome-512x512.png">
  <meta name="twitter:card" content="summary">
  <link rel="stylesheet" href="/style.css?v=12">
  <script type="application/ld+json">{breadcrumb_schema}</script>
  <script type="application/ld+json">{hadith_schema}</script>
</head>
<body>
  <header class="site-header"><div class="container header-inner"><a class="brand" href="/"><span class="brand-text">QuranAW</span></a></div></header>
  <main class="container text-container">
    <nav class="crumb" aria-label="Breadcrumb"><a href="/">Library</a> / <a href="/hadith">Hadith Collections</a> / <a href="/hadith/{COLLECTION_SLUG}">{COLLECTION_NAME}</a> / <a href="/hadith/{COLLECTION_SLUG}/{chapter_number}">Book {chapter_number}</a></nav>
    <article>
      <h1 class="page-title">{esc(reference)}</h1>
      <p>Book {esc(str(chapter_number))}: {esc(chapter)} · Hadith {esc(str(hadith.get('ib', '')))}</p>
      <section class="dua-card" aria-labelledby="hadith-text">
        <h2 id="hadith-text" class="visually-hidden">Hadith text</h2>
        <div class="verse-arabic dua-arabic" lang="ar" dir="rtl">{esc(arabic)}</div>
        <p class="verse-urdu dua-translation">{esc(english)}</p>
        {f'<p class="verse-translit hadith-hinglish">{esc(hinglish)}</p>' if hinglish else ''}
        <p class="dua-reference">{esc(reference)} · Book {esc(str(chapter_number))}, Hadith {esc(str(hadith.get('ib', '')))}</p>
      </section>
      <p><a href="/hadith/{COLLECTION_SLUG}/{chapter_number}">Read all hadith in Book {chapter_number}: {esc(chapter)}</a></p>
    </article>
  </main>
</body>
</html>
"""


def update_sitemap(urls: list[str], *, write: bool) -> None:
    sitemap = Path("sitemap.xml")
    tree = ET.parse(sitemap)
    root = tree.getroot()
    existing = {node.text for node in root.findall(f"{{{SITEMAP_NS}}}url/{{{SITEMAP_NS}}}loc")}
    for url in urls:
        if url in existing:
            continue
        node = ET.SubElement(root, f"{{{SITEMAP_NS}}}url")
        ET.SubElement(node, f"{{{SITEMAP_NS}}}loc").text = url
        ET.SubElement(node, f"{{{SITEMAP_NS}}}lastmod").text = date.today().isoformat()
        ET.SubElement(node, f"{{{SITEMAP_NS}}}changefreq").text = "yearly"
        ET.SubElement(node, f"{{{SITEMAP_NS}}}priority").text = "0.7"
    ET.register_namespace("", SITEMAP_NS)
    if write:
        tree.write(sitemap, encoding="UTF-8", xml_declaration=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Report page count without writing files")
    args = parser.parse_args()
    payload = json.loads(Path("hadith-data/bukhari.json").read_text(encoding="utf-8"))
    pages: list[tuple[Path, str]] = []
    urls: list[str] = []
    for chapter_number, hadiths in payload["hadithsByBook"].items():
        chapter = payload["sections"].get(chapter_number, f"Book {chapter_number}")
        for hadith in hadiths:
            number = hadith["n"]
            output = Path("hadith") / COLLECTION_SLUG / str(chapter_number) / "h" / str(number) / "index.html"
            pages.append((output, page_html(chapter_number=chapter_number, chapter=chapter, hadith=hadith)))
            urls.append(f"{SITE_ORIGIN}/hadith/{COLLECTION_SLUG}/{chapter_number}/h/{number}")
    print(f"{len(pages)} static Bukhari pages will be generated.")
    if args.dry_run:
        return
    for output, content in pages:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(content, encoding="utf-8")
    update_sitemap(urls, write=True)
    print("Generated pages and added their URLs to sitemap.xml.")


if __name__ == "__main__":
    main()
