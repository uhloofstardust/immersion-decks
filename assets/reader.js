// Story reader: renders story.json (schema_version 1) with tap/hover glosses.
(function () {
  var page = document.getElementById("page");
  var pop = document.getElementById("pop");
  var params = new URLSearchParams(location.search);
  var story = null;
  var activeTok = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fail(msg) {
    page.textContent = "";
    page.appendChild(el("p", "notice", msg));
  }

  function resolveStoryPath() {
    var direct = params.get("story");
    if (direct) return Promise.resolve(direct);
    var id = params.get("s");
    if (!id) return Promise.reject(new Error("No story selected. Pick one from the library."));
    return fetch("library.json")
      .then(function (r) { if (!r.ok) throw new Error("Could not load the library."); return r.json(); })
      .then(function (lib) {
        var s = lib.stories.filter(function (x) { return x.id === id; })[0];
        if (!s || !s.reader) throw new Error("That story has no reader yet.");
        return s.reader;
      });
  }

  function render(data) {
    story = data;
    document.getElementById("title").textContent = data.title.native || data.title.en;
    document.getElementById("subtitle").textContent =
      data.title.native ? data.title.en : "";
    document.title = (data.title.en || data.title.native) + " — Immersion Decks";

    page.textContent = "";
    data.paragraphs.forEach(function (p) {
      var para = el("p", "para");
      p.sentences.forEach(function (s, si) {
        var sent = el("span", "sent");
        sent.dataset.sid = s.id;
        var tokens = s.tokens;
        var inPhrase = function (i) {
          return s.phrases.some(function (f) { return f.start <= i && i <= f.end; });
        };
        tokens.forEach(function (t, i) {
          var tok = el("span", "tok" + (inPhrase(i) ? " ph" : ""));
          tok.dataset.sid = s.id;
          tok.dataset.i = i;
          if (!t.is_punct) {
            tok.tabIndex = 0;
            var ruby = document.createElement("ruby");
            ruby.appendChild(document.createTextNode(t.text));
            ruby.appendChild(el("rt", "", t.romanization || ""));
            tok.appendChild(ruby);
          } else {
            tok.className = "punct";
            tok.textContent = t.text;
          }
          sent.appendChild(tok);
          if (t.space_after) {
            var joined = s.phrases.some(function (f) { return f.start <= i && i < f.end; });
            sent.appendChild(el("span", "sp" + (joined ? " ph" : ""), " "));
          }
        });
        var btn = el("button", "tr-btn", "EN");
        btn.type = "button";
        btn.title = "Show translation";
        btn.setAttribute("aria-label", "Toggle translation for this sentence");
        btn.addEventListener("click", function () { sent.classList.toggle("show-tr"); });
        var nw = el("span", "nw");
        var lastEl = sent.lastChild;
        if (lastEl && lastEl.classList && lastEl.classList.contains("punct")) nw.appendChild(lastEl);
        nw.appendChild(btn);
        sent.appendChild(nw);
        sent.appendChild(el("span", "tr", s.translation_en || ""));
        para.appendChild(sent);
        if (si < p.sentences.length - 1) para.appendChild(document.createTextNode(" "));
      });
      page.appendChild(para);
    });
  }

  function findSentence(sid) {
    for (var a = 0; a < story.paragraphs.length; a++) {
      var ss = story.paragraphs[a].sentences;
      for (var b = 0; b < ss.length; b++) if (ss[b].id === sid) return ss[b];
    }
    return null;
  }

  function show(tokEl) {
    var s = findSentence(tokEl.dataset.sid);
    if (!s) return;
    var i = +tokEl.dataset.i;
    var t = s.tokens[i];
    if (!t || t.is_punct) return;
    if (activeTok) activeTok.classList.remove("active");
    activeTok = tokEl;
    tokEl.classList.add("active");

    pop.textContent = "";
    var head = el("div", "w", t.text);
    if (t.romanization) head.appendChild(el("span", "r", t.romanization));
    pop.appendChild(head);
    if (t.gloss_en) pop.appendChild(el("div", "g", t.gloss_en));
    var meta = el("div", "m");
    if (t.lemma && t.lemma !== t.text) meta.appendChild(el("span", "chip", "root: " + t.lemma));
    if (t.pos) meta.appendChild(el("span", "chip", t.pos.toLowerCase()));
    if (meta.childNodes.length) pop.appendChild(meta);
    s.phrases.filter(function (f) { return f.start <= i && i <= f.end; }).forEach(function (f) {
      var text = s.tokens.slice(f.start, f.end + 1).map(function (x, k, arr) {
        return x.text + (x.space_after && k < arr.length - 1 ? " " : "");
      }).join("");
      var box = el("div", "phr");
      var b = el("b", "bn", text);
      box.appendChild(b);
      box.appendChild(document.createTextNode(" — " + f.gloss_en));
      pop.appendChild(box);
    });

    pop.hidden = false;
    var r = tokEl.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    var top = r.bottom + 10;
    if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 10);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }

  function hide() {
    pop.hidden = true;
    if (activeTok) activeTok.classList.remove("active");
    activeTok = null;
  }

  function tokOf(e) { return e.target.closest && e.target.closest(".tok:not(.punct)"); }

  page.addEventListener("mouseover", function (e) { var t = tokOf(e); if (t) show(t); });
  page.addEventListener("mouseout", function (e) { if (tokOf(e)) hide(); });
  page.addEventListener("focusin", function (e) { var t = tokOf(e); if (t) show(t); });
  page.addEventListener("focusout", hide);
  document.addEventListener("click", function (e) {
    var t = tokOf(e);
    if (t) show(t); else hide();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
  window.addEventListener("scroll", hide, { passive: true });

  resolveStoryPath()
    .then(function (path) {
      return fetch(path).then(function (r) {
        if (!r.ok) throw new Error("Could not load the story file.");
        return r.json();
      });
    })
    .then(render)
    .catch(function (err) {
      var msg = err && err.message ? err.message : "Something went wrong.";
      if (location.protocol === "file:") msg += " (Opened from disk? Run python3 -m http.server in the repo folder and visit http://localhost:8000.)";
      fail(msg);
    });
})();
