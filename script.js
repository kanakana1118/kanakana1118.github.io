// 機能ごとに、対象の要素があるページだけで動く
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  // ---- 下にスクロールすると右下に出る「上に戻る」ボタン ----
  function initToTop() {
    var SHOW_AFTER = 300; // この距離(px)より下に来たら表示する

    var button = document.createElement("button");
    button.type = "button";
    button.className = "to-top";
    button.setAttribute("aria-label", "ページの先頭へ戻る");
    button.textContent = "↑";
    document.body.appendChild(button);

    function update() {
      button.classList.toggle("is-visible", window.scrollY > SHOW_AFTER);
    }

    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // ---- Top: 各ページの概要を、説明文の下端にそろえる ----
  // 説明文（.menu-ui）はイラストに対して位置が決まっていて、イラストの下端より下にはみ出したり、手前に余ったりする。
  // どちらの場合も、説明文の下端から GAP だけ下に、概要が始まるように、上の余白を決める。
  function initGuide(stage) {
    var GAP = 36;
    var guide = stage.querySelector(".menu-guide");
    var ui = stage.querySelector(".menu-ui");
    var art = stage.querySelector(".menu-art img");
    if (!guide || !ui || !art) return;

    function fit() {
      if (!stage.classList.contains("is-menu")) return;
      var overflow = ui.getBoundingClientRect().bottom - art.getBoundingClientRect().bottom; // 負なら、イラストの中に余っている
      var margin = Math.round(overflow + GAP);
      guide.style.marginTop = margin + "px";
      // 手前に引き上げた分だけ、全体の高さが縮まらないようにする（イラストの下端まで、画面を保つ）
      guide.style.minHeight = Math.max(0, -margin) + "px";
    }

    if (window.ResizeObserver) {
      var observer = new ResizeObserver(fit);
      observer.observe(ui);
      observer.observe(art);
    }
    new MutationObserver(fit).observe(stage, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", fit);
    window.addEventListener("load", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    fit();
  }

  // ---- Top: 動画 → 暗転（点滅）→ メニュー ----
  function initIntro(stage) {
    var BLACKOUT_MS = 900; // style.css の flicker の長さと合わせる
    var BLACKOUT_LEAD_SEC = 0.5; // 動画が終わる、この秒数前から点滅を始める
    var NO_VIDEO_MS = 3500; // 動画が無い間は、この時間で次へ進む
    var GLITCH_MS = 1200; // 動画の始まりの乱れが収まるまで。style.css の --glitch-ms と合わせる
    var GLITCH_MAX = 70; // 横にずれる、いちばん大きい幅（px）
    var started = false;

    var seen = false;
    try {
      seen = sessionStorage.getItem("introSeen") === "1";
    } catch (e) {}

    // 動きを減らす設定の人と、同じ訪問で2回目以降の人は、イントロを飛ばす
    if (reduceMotion || seen) {
      stage.classList.add("is-instant", "is-menu");
      return;
    }

    function toMenu() {
      if (started) return;
      started = true;
      try {
        sessionStorage.setItem("introSeen", "1");
      } catch (e) {}
      stage.classList.add("is-blackout");
      window.setTimeout(function () {
        stage.classList.remove("is-blackout");
        stage.classList.add("is-menu");
      }, BLACKOUT_MS);
    }

    var video = stage.querySelector("video");
    if (!video) {
      window.setTimeout(toMenu, NO_VIDEO_MS);
      return;
    }

    // 再生が始まったら、始まりの「画面が横にざざっとずれる」演出を動かす
    function onPlaying() {
      stage.classList.add("is-playing");
      glitch();
    }

    // SVG フィルター（#tv-glitch）の、ずれの大きさと帯の位置を、細かく入れ替える
    function glitch() {
      var intro = stage.querySelector(".intro");
      var turb = document.querySelector("#tv-glitch feTurbulence");
      var disp = document.querySelector("#tv-glitch feDisplacementMap");
      if (!intro || !turb || !disp) return;
      var t0 = window.performance.now();
      intro.style.filter = "url(#tv-glitch)";

      function tick() {
        var p = (window.performance.now() - t0) / GLITCH_MS;
        if (p >= 1) {
          intro.style.filter = "";
          return;
        }
        // 後半ほど弱くなる。ときどき、ずれが止まる（ざざっ、ざざっ、となる）
        var amp = Math.random() < 0.25 ? 0 : (1 - p) * (1 - p) * GLITCH_MAX * (0.4 + Math.random() * 0.6);
        disp.setAttribute("scale", amp.toFixed(1));
        turb.setAttribute("seed", String(Math.floor(Math.random() * 1000)));
        turb.setAttribute("baseFrequency", "0 " + (0.004 + Math.random() * 0.02).toFixed(3));
        window.setTimeout(tick, 60);
      }
      tick();
    }
    if (!video.paused && video.readyState > 2) onPlaying();
    else video.addEventListener("playing", onPlaying, { once: true });

    // 再生位置が「終わりの少し前」に来たら点滅を始める（timeupdate は粗いので、毎フレーム見る）
    function watch() {
      if (started) return;
      var duration = video.duration;
      if (duration && isFinite(duration) && video.currentTime >= duration - BLACKOUT_LEAD_SEC) {
        toMenu();
        return;
      }
      window.requestAnimationFrame(watch);
    }
    watch();

    // 長さが分からない・読み込みに失敗したときの保険
    video.addEventListener("ended", toMenu);
    video.addEventListener("error", toMenu);
    var played = video.play();
    if (played && played.catch) played.catch(toMenu);
  }

  // ---- Illust: 先頭と末尾がつながるスライダー ----
  function initCarousel(root) {
    var track = root.querySelector(".carousel-track");
    var slides = Array.prototype.slice.call(track.children);
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    var dotsBox = root.querySelector(".carousel-dots");
    var n = slides.length;
    var index = 0;
    var dots = [];
    var CODE = { "far-l": -2, "-1": -1, "0": 0, "1": 1, "far-r": 2 };

    if (n < 2) return;
    root.classList.add("is-loop");

    slides.forEach(function () {
      var dot = el("span");
      dotsBox.appendChild(dot);
      dots.push(dot);
    });

    // 現在のスライドとの差から、位置の名前を決める
    function posOf(i) {
      var d = (((i - index) % n) + n) % n;
      if (d > n / 2) d -= n;
      if (d === 0) return "0";
      if (d === 1) return "1";
      if (d === -1) return "-1";
      return d > 0 ? "far-r" : "far-l";
    }

    function render() {
      slides.forEach(function (slide, i) {
        var now = posOf(i);
        var before = slide.getAttribute("data-pos");
        // 端をまたぐスライドは、画面を横切らずに、一瞬で移す
        var jump = before !== null && Math.abs(CODE[now] - CODE[before]) > 1;
        if (jump || before === null) slide.classList.add("no-anim");
        slide.setAttribute("data-pos", now);
        slide.setAttribute("aria-hidden", now === "0" ? "false" : "true");
      });
      void track.offsetWidth; // ここで一度、位置を確定させる
      slides.forEach(function (slide) {
        slide.classList.remove("no-anim");
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
      });
    }

    function go(step) {
      index = (((index + step) % n) + n) % n;
      render();
    }

    prev.addEventListener("click", function () {
      go(-1);
    });
    next.addEventListener("click", function () {
      go(1);
    });
    track.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    });

    // スマホ: 左右になぞる（スワイプ）。右から左へ＝次、左から右へ＝前。
    // pointer ではなく touch で見る（斜めになぞってスクロールが始まっても、指を離したときに判定できる）
    var touchX = null;
    var touchY = null;
    track.addEventListener(
      "touchstart",
      function (event) {
        if (event.touches.length !== 1) {
          touchX = null;
          return;
        }
        touchX = event.touches[0].clientX;
        touchY = event.touches[0].clientY;
      },
      { passive: true }
    );
    track.addEventListener(
      "touchend",
      function (event) {
        if (touchX === null || !event.changedTouches.length) return;
        var dx = event.changedTouches[0].clientX - touchX;
        var dy = event.changedTouches[0].clientY - touchY;
        touchX = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      },
      { passive: true }
    );
    track.addEventListener("touchcancel", function () {
      touchX = null;
    });

    // タップ（クリック）: 左右に見えている隣の作品をタップすると、その作品が中央に来る
    track.addEventListener("click", function (event) {
      if (event.target.closest("a, button")) return;
      var slide = event.target.closest(".slide");
      if (!slide) return;
      var pos = slide.getAttribute("data-pos");
      if (pos === "1") go(1);
      else if (pos === "-1") go(-1);
    });

    render();
  }

  // ---- 左の目次・一覧（Novel の作品一覧と、各ページの目次で共通）----
  // 広い画面（幅1360px以上）では、左に出しっぱなし。狭い画面では、ページの先頭の3本横線のボタンから、左へ引き出す（最初は閉じている）。
  // rows: [{ name, note, level(0=大項目, 1=小項目), onSelect }]
  function createSideList(heading, rows) {
    var host = document.querySelector("main");
    var list = el("nav", "side-list");
    list.setAttribute("aria-label", heading);

    var head = el("div", "side-list-head");
    var title = el("p", "side-list-title");
    title.textContent = heading;
    var closeButton = el("button", "side-list-close");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", heading + "を閉じる");
    closeButton.textContent = "×";
    head.appendChild(title);
    head.appendChild(closeButton);
    list.appendChild(head);

    var toggle = el("button", "side-list-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", heading + "を開く");
    for (var b = 0; b < 3; b++) toggle.appendChild(el("span", "side-list-bar")); // 3本の横線
    var backdrop = el("div", "side-list-backdrop");

    function setOpen(open) {
      list.classList.toggle("is-open", open);
      backdrop.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    var items = el("ol", "side-list-items");
    var buttons = rows.map(function (row) {
      var li = el("li");
      var button = el("button", "side-list-item" + (row.level ? " side-list-item--sub" : ""));
      button.type = "button";
      var name = el("span", "side-list-name");
      name.textContent = row.name;
      button.appendChild(name);
      if (row.note) {
        var note = el("span", "side-list-note");
        note.textContent = row.note;
        button.appendChild(note);
      }
      button.addEventListener("click", function () {
        row.onSelect();
        setOpen(false);
      });
      li.appendChild(button);
      items.appendChild(li);
      return button;
    });
    list.appendChild(items);

    toggle.addEventListener("click", function () {
      setOpen(true);
    });
    closeButton.addEventListener("click", function () {
      setOpen(false);
    });
    backdrop.addEventListener("click", function () {
      setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });

    host.appendChild(list);
    host.appendChild(backdrop);
    host.insertBefore(toggle, host.firstChild); // 見出しの上。スクロールすると、画面の上に付いてくる

    return {
      buttons: buttons,
      setCurrent: function (current) {
        buttons.forEach(function (button, i) {
          button.classList.toggle("is-current", i === current);
          if (i === current) button.setAttribute("aria-current", "true");
          else button.removeAttribute("aria-current");
        });
      },
    };
  }

  // ---- About / Illust / Develop / Crossover: ページ内の目次 ----
  function initPageToc() {
    var page = document.body.getAttribute("data-page");
    var rows = []; // { name, note, level, target }
    function text(node) {
      return node ? node.textContent.trim() : "";
    }
    function add(name, note, level, target) {
      if (target) rows.push({ name: name, note: note, level: level, target: target });
    }
    var heading = "目次";

    if (page === "about") {
      add("プロフィール", "", 0, document.getElementById("profile"));
      add("Links", "", 0, document.getElementById("links"));
      add("イベント", "", 0, document.getElementById("events"));
      add("公募歴", "", 0, document.getElementById("contests"));
    } else if (page === "illust") {
      add("Pick Up", "", 0, document.querySelector(".carousel"));
      add("Gallery", "", 0, document.getElementById("gallery"));
      Array.prototype.forEach.call(document.querySelectorAll("#gallery figure"), function (figure) {
        add(text(figure.querySelector("figcaption")), "", 1, figure);
      });
    } else if (page === "dev") {
      heading = "作品一覧";
      Array.prototype.forEach.call(document.querySelectorAll(".dev-item"), function (item) {
        add(text(item.querySelector("h3")), text(item.querySelector(".dev-label")), 0, item);
      });
    } else if (page === "crossover") {
      heading = "作品一覧";
      Array.prototype.forEach.call(document.querySelectorAll("#works .card"), function (card) {
        var tags = Array.prototype.map.call(card.querySelectorAll(".tag"), text).join(" × "); // 何と何を掛け合わせているか
        add(text(card.querySelector("h3")), tags, 0, card);
      });
    }
    if (rows.length < 2) return;

    var sideList = createSideList(
      heading,
      rows.map(function (row, i) {
        return {
          name: row.name,
          note: row.note,
          level: row.level,
          onSelect: function () {
            sideList.setCurrent(i);
            row.target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
          },
        };
      })
    );

    // 画面に見えている位置に合わせて、今いる項目を光らせる
    function mark() {
      var current = 0;
      rows.forEach(function (row, i) {
        if (row.target.getBoundingClientRect().top <= window.innerHeight * 0.45) current = i;
      });
      // ページの一番下まで来たら、最後の項目（短くて、上まで届かないことがあるため）
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) current = rows.length - 1;
      sideList.setCurrent(current);
    }
    window.addEventListener("scroll", mark, { passive: true });
    mark();
  }

  // ---- Novel: 1冊の本。作品を切り替えると、ページがめくれる ----
  function initNovels(viewer) {
    var DEPTH = 0.8; // 紙どうしの奥行きの差(px)。重なり順を保つ
    var works = Array.prototype.slice.call(viewer.querySelectorAll(".novel"));
    var controls = viewer.querySelector(".novel-controls");
    var n = works.length;
    if (!controls || n === 0) return;

    var data = works.map(function (work, i) {
      return {
        cover: i === 0 ? work.querySelector(".face-cover").innerHTML : "", // 表紙は、1冊の共通のもの（1作品目）だけ
        catchText: work.querySelector(".cover .endpaper .catch").textContent.trim(),
        title: work.querySelector(".novel-title").textContent.trim(),
        genre: (work.querySelector(".tag") || { textContent: "" }).textContent.trim(),
        info: work.querySelector(".novel-info"),
      };
    });

    function sheet(className, z) {
      var node = el("div", className);
      node.style.setProperty("--z", z + "px");
      return node;
    }
    function face(className, html) {
      var node = el("div", className);
      node.innerHTML = html;
      return node;
    }
    function leftFace() {
      var node = el("div", "face face-left");
      node.appendChild(el("div", "endpaper"));
      return node;
    }

    // 本を組み立てる: 底の板・厚み・最後の右ページ・めくれる紙・表紙
    var m = n - 1; // めくれる紙の枚数
    var body = el("div", "book-body");
    body.appendChild(el("div", "board"));
    body.appendChild(el("div", "slab slab--left"));
    body.appendChild(el("div", "slab"));

    var base = sheet("sheet sheet--static", 0.2);
    base.appendChild(face("face face-right", ""));
    body.appendChild(base);

    var leaves = [];
    for (var k = 0; k < m; k++) {
      var leaf = sheet("sheet leaf", (m - k) * DEPTH);
      leaf.appendChild(face("face face-right", ""));
      leaf.appendChild(leftFace());
      body.appendChild(leaf);
      leaves.push(leaf);
    }

    var cover = sheet("sheet cover", (m + 1) * DEPTH);
    cover.appendChild(face("face face-cover", data[0].cover));
    cover.appendChild(leftFace());
    body.appendChild(cover);

    // キャッチコピー: 左右のページにまたがる、1つの文字の箱。本が開いてから、ページの上に浮かび上がる
    var floating = el("p", "catch-float");
    body.appendChild(floating);
    var catchTimer = null;
    function showCatch(i, delay) {
      floating.classList.remove("is-in");
      window.clearTimeout(catchTimer);
      catchTimer = window.setTimeout(function () {
        floating.textContent = data[i].catchText;
        void floating.offsetWidth; // 浮かび上がる演出を、最初から再生し直す
        floating.classList.add("is-in");
      }, delay);
    }

    var book = el("div", "book");
    book.setAttribute("aria-hidden", "true");
    book.appendChild(body);

    // 右側の情報は、作品ごとに1つだけ表示する
    var infos = el("div", "novel-infos");
    data.forEach(function (item, i) {
      item.info.hidden = i !== 0;
      infos.appendChild(item.info);
    });

    var stage = el("div", "novel-stage");
    stage.appendChild(book);
    stage.appendChild(infos);

    works.forEach(function (work) {
      work.parentNode.removeChild(work);
    });
    viewer.insertBefore(stage, controls);

    // 最初の1回だけ、表紙が開く
    window.setTimeout(function () {
      body.classList.add("is-open");
    }, 500);
    showCatch(0, 1500); // 表紙が開き終わってから

    var prev = controls.querySelector("[data-prev]");
    var next = controls.querySelector("[data-next]");
    var counter = controls.querySelector(".novel-count");
    var index = 0;
    var sideList = null;

    function update() {
      data.forEach(function (item, i) {
        item.info.hidden = i !== index; // 表示し直すと、浮き出る演出が最初から再生される
      });
      counter.textContent = index + 1 + " / " + n;
      prev.disabled = index === 0;
      next.disabled = index === n - 1;
      stage.classList.toggle("is-switched", index > 0 || stage.classList.contains("is-switched"));
      if (sideList) sideList.setCurrent(index);
    }

    function turn(leaf) {
      leaf.classList.add("is-turning");
      window.setTimeout(function () {
        leaf.classList.remove("is-turning");
      }, 1000);
    }

    function goNext() {
      if (index >= n - 1) return;
      leaves[index].classList.add("is-flipped");
      turn(leaves[index]);
      index += 1;
      update();
      showCatch(index, 800); // ページがめくれ終わるころに
    }
    function goPrev() {
      if (index <= 0) return;
      index -= 1;
      leaves[index].classList.remove("is-flipped");
      turn(leaves[index]);
      update();
      showCatch(index, 800);
    }
    next.addEventListener("click", goNext);
    prev.addEventListener("click", goPrev);

    // 本を左右になぞる（スワイプ）と、ページがめくれる（右から左へ＝次、左から右へ＝前）
    // pointer ではなく touch で見る（斜めになぞって、スクロールが始まっても、指を離したときに判定できる）
    var swipeX = null;
    var swipeY = null;
    var swipedAt = 0;
    book.addEventListener(
      "touchstart",
      function (event) {
        if (event.touches.length !== 1) {
          swipeX = null;
          return;
        }
        swipeX = event.touches[0].clientX;
        swipeY = event.touches[0].clientY;
      },
      { passive: true }
    );
    book.addEventListener(
      "touchend",
      function (event) {
        if (swipeX === null || !event.changedTouches.length) return;
        var dx = event.changedTouches[0].clientX - swipeX;
        var dy = event.changedTouches[0].clientY - swipeY;
        swipeX = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          swipedAt = Date.now(); // このあとに来るクリックは、タップとして数えない
          if (dx < 0) goNext();
          else goPrev();
        }
      },
      { passive: true }
    );
    book.addEventListener("touchcancel", function () {
      swipeX = null;
    });

    // 本をタップ（クリック）すると、ページがめくれる（右のページ＝次、左のページ＝前）
    book.addEventListener("click", function (event) {
      if (Date.now() - swipedAt < 500) return;
      if (event.target.closest("a, button")) return;
      var rect = book.getBoundingClientRect();
      if (event.clientX >= rect.left + rect.width / 2) goNext();
      else goPrev();
    });

    // 作品を指定して、ページをめくりながら、その作品まで移る（間のページも、順にめくれる）
    function goTo(target) {
      if (target === index || target < 0 || target >= n) return;
      var from = index;
      var count = Math.abs(target - from);
      for (var s = 0; s < count; s++) {
        (function (s) {
          window.setTimeout(function () {
            var leaf = target > from ? leaves[from + s] : leaves[from - 1 - s];
            leaf.classList.toggle("is-flipped", target > from);
            turn(leaf);
          }, s * 180);
        })(s);
      }
      index = target;
      update();
      showCatch(index, 800 + (count - 1) * 180);
    }

    // 作品一覧（作品名とジャンルだけ）。作品を押すと、ページがめくれて、その作品まで移る
    sideList = createSideList(
      "作品一覧",
      data.map(function (item, i) {
        return {
          name: item.title,
          note: item.genre,
          level: 0,
          onSelect: function () {
            goTo(i);
          },
        };
      })
    );
    controls.hidden = false;
    update();
  }

  // ---- Develop: 大小の四角が上から順に消えて、中身が現れる ----
  function initReveal() {
    var boxes = Array.prototype.slice.call(document.querySelectorAll(".dev-shot, .dev-text"));
    if (!boxes.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      boxes.forEach(function (box) {
        box.classList.add("is-tiled");
      });
      return;
    }

    // 覆いを保険の自動消去から外す。ここから先は、JSが責任を持って開ける
    boxes.forEach(function (box) {
      box.classList.add("is-armed");
    });

    function reveal(box) {
      var width = box.clientWidth;
      var height = box.clientHeight;
      var cell = width * height > 200000 ? 28 : 22; // 大きい箱は、粗い四角にして数を抑える
      var cols = Math.ceil(width / cell);
      var rows = Math.ceil(height / cell);
      var used = [];
      var base = box.classList.contains("dev-text") ? 180 : 0; // 説明の箱は、少し遅らせる
      var tiles = el("div", "tiles");
      var maxDelay = 0;

      for (var i = 0; i < cols * rows; i++) used.push(false);

      function fits(r, c, size) {
        if (r + size > rows || c + size > cols) return false;
        for (var y = r; y < r + size; y++) {
          for (var x = c; x < c + size; x++) {
            if (used[y * cols + x]) return false;
          }
        }
        return true;
      }

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (used[r * cols + c]) continue;
          var roll = Math.random();
          var size = roll < 0.5 ? 1 : roll < 0.8 ? 2 : 3;
          while (size > 1 && !fits(r, c, size)) size -= 1;
          for (var y = r; y < r + size; y++) {
            for (var x = c; x < c + size; x++) used[y * cols + x] = true;
          }
          var tile = el("div", "tile");
          tile.style.left = c * cell + "px";
          tile.style.top = r * cell + "px";
          tile.style.width = size * cell + "px";
          tile.style.height = size * cell + "px";
          // 上の行ほど早く、少しだけランダムにずらす
          var delay = base + (r / rows) * 800 + Math.random() * 280;
          maxDelay = Math.max(maxDelay, delay);
          tile.style.setProperty("--delay", Math.round(delay) + "ms");
          tiles.appendChild(tile);
        }
      }

      box.appendChild(tiles);
      box.classList.add("is-tiled"); // 覆いを外す。同じ見た目の四角が、すでに上に載っている
      window.setTimeout(function () {
        if (tiles.parentNode) tiles.parentNode.removeChild(tiles);
      }, maxDelay + 800);
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          reveal(entry.target);
        });
      },
      { threshold: 0.2 }
    );
    boxes.forEach(function (box) {
      observer.observe(box);
    });
  }

  initToTop();

  var stage = document.querySelector(".stage");
  if (stage) {
    initIntro(stage);
    initGuide(stage);
  }

  Array.prototype.forEach.call(document.querySelectorAll(".carousel"), initCarousel);

  var viewer = document.querySelector(".novel-viewer");
  if (viewer) initNovels(viewer);

  initPageToc();

  initReveal();
})();
