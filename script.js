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

    // 左右のスワイプ
    var startX = null;
    track.addEventListener("pointerdown", function (event) {
      startX = event.clientX;
    });
    track.addEventListener("pointerup", function (event) {
      if (startX === null) return;
      var dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    });
    track.addEventListener("pointercancel", function () {
      startX = null;
    });

    render();
  }

  // ---- Novel: 1冊の本。作品を切り替えると、ページがめくれる ----
  function initNovels(viewer) {
    var DEPTH = 0.8; // 紙どうしの奥行きの差(px)。重なり順を保つ
    var works = Array.prototype.slice.call(viewer.querySelectorAll(".novel"));
    var controls = viewer.querySelector(".novel-controls");
    var n = works.length;
    if (!controls || n === 0) return;

    var data = works.map(function (work) {
      return {
        cover: work.querySelector(".face-cover").innerHTML,
        catchHtml: work.querySelector(".cover .endpaper").innerHTML,
        page: work.querySelector(".sheet--static .face-right").innerHTML,
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
    function leftFace(html) {
      var node = el("div", "face face-left");
      var paper = el("div", "endpaper");
      paper.innerHTML = html;
      node.appendChild(paper);
      return node;
    }

    // 本を組み立てる: 底の板・厚み・最後の右ページ・めくれる紙・表紙
    var m = n - 1; // めくれる紙の枚数
    var body = el("div", "book-body");
    body.appendChild(el("div", "board"));
    body.appendChild(el("div", "slab slab--left"));
    body.appendChild(el("div", "slab"));

    var base = sheet("sheet sheet--static", 0.2);
    base.appendChild(face("face face-right", data[m].page));
    body.appendChild(base);

    var leaves = [];
    for (var k = 0; k < m; k++) {
      var leaf = sheet("sheet leaf", (m - k) * DEPTH);
      leaf.appendChild(face("face face-right", data[k].page));
      leaf.appendChild(leftFace(data[k + 1].catchHtml));
      body.appendChild(leaf);
      leaves.push(leaf);
    }

    var cover = sheet("sheet cover", (m + 1) * DEPTH);
    cover.appendChild(face("face face-cover", data[0].cover));
    cover.appendChild(leftFace(data[0].catchHtml));
    body.appendChild(cover);

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

    var prev = controls.querySelector("[data-prev]");
    var next = controls.querySelector("[data-next]");
    var counter = controls.querySelector(".novel-count");
    var index = 0;

    function update() {
      data.forEach(function (item, i) {
        item.info.hidden = i !== index; // 表示し直すと、浮き出る演出が最初から再生される
      });
      counter.textContent = index + 1 + " / " + n;
      prev.disabled = index === 0;
      next.disabled = index === n - 1;
      stage.classList.toggle("is-switched", index > 0 || stage.classList.contains("is-switched"));
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
    }
    function goPrev() {
      if (index <= 0) return;
      index -= 1;
      leaves[index].classList.remove("is-flipped");
      turn(leaves[index]);
      update();
    }
    next.addEventListener("click", goNext);
    prev.addEventListener("click", goPrev);

    // 本をタップ（クリック）すると、ページがめくれる（右のページ＝次、左のページ＝前）
    book.addEventListener("click", function (event) {
      if (event.target.closest("a, button")) return;
      var rect = book.getBoundingClientRect();
      if (event.clientX >= rect.left + rect.width / 2) goNext();
      else goPrev();
    });

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
  if (stage) initIntro(stage);

  Array.prototype.forEach.call(document.querySelectorAll(".carousel"), initCarousel);

  var viewer = document.querySelector(".novel-viewer");
  if (viewer) initNovels(viewer);

  initReveal();
})();
