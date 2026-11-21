// Renders the stories and decks lists from library.json.
(function () {
  var storiesEl = document.getElementById("stories-list");
  var decksEl = document.getElementById("decks-list");
  var dl = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/></svg>';

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function storyCard(s) {
    return (
      '<article class="story ' + esc(s.color || "butter") + '"><div>' +
      (s.tag ? '<div class="series">' + esc(s.tag) + "</div>" : "") +
      '<div class="native">' + esc(s.title.native) + "</div>" +
      '<div class="en">' + esc(s.title.en) + "</div></div>" +
      '<div><div class="by">' + (s.author ? "by " + esc(s.author.en) : "&nbsp;") + "</div>" +
      '<div class="story-actions"><a class="btn primary small" href="reader.html?s=' +
      encodeURIComponent(s.id) + '">Read</a></div></div></article>'
    );
  }

  function deckRow(d) {
    return (
      '<article class="deck ' + esc(d.color || "butter") + '">' +
      '<div class="deck-title"><div class="native">' + esc(d.title.native) + "</div>" +
      '<div class="meta"><b>' + esc(d.title.en) + "</b>" +
      (d.author ? " · " + esc(d.author.en) : "") +
      (d.tag ? ' <span class="series">' + esc(d.tag) + "</span>" : "") + "</div></div>" +
      '<a class="btn small" href="' + esc(d.file) + '" download>' + dl + "Download" +
      (d.size ? " · " + esc(d.size) : "") + "</a></article>"
    );
  }

  function fill(el, items, render, empty) {
    el.innerHTML = items && items.length ? items.map(render).join("") : '<p class="empty">' + empty + "</p>";
  }

  fetch("library.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (lib) {
      fill(storiesEl, lib.stories, storyCard, "No stories yet.");
      fill(decksEl, lib.decks, deckRow, "No decks yet.");
    })
    .catch(function () {
      var msg = '<p class="notice">Could not load the library. If you opened this file directly, run <code>python3 -m http.server</code> in the repo folder and visit http://localhost:8000.</p>';
      storiesEl.innerHTML = msg;
      decksEl.innerHTML = "";
    });
})();
