// 機能ごとに、対象の要素があるページだけで動く
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    var NO_VIDEO_MS = 3500; // 動画が無い間は、この時間で次へ進む
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

    var skip = stage.querySelector(".skip");
    if (skip) skip.addEventListener("click", toMenu);

    var video = stage.querySelector("video");
    if (video) {
      video.addEventListener("ended", toMenu);
      video.addEventListener("error", toMenu);
      var played = video.play();
      if (played && played.catch) played.catch(toMenu);
    } else {
      window.setTimeout(toMenu, NO_VIDEO_MS);
    }
  }

  // ---- Illust: スライダー ----
  function initCarousel(root) {
    var track = root.querySelector(".carousel-track");
    var slides = Array.prototype.slice.call(track.children);
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    var dotsBox = root.querySelector(".carousel-dots");
    var dots = [];
    var ticking = false;

    slides.forEach(function () {
      var dot = document.createElement("span");
      dotsBox.appendChild(dot);
      dots.push(dot);
    });

    function activeIndex() {
      var center = track.scrollLeft + track.clientWidth / 2;
      var best = 0;
      var bestDistance = Infinity;
      slides.forEach(function (slide, i) {
        var distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
        if (distance < bestDistance) {
          best = i;
          bestDistance = distance;
        }
      });
      return best;
    }

    function update() {
      var index = activeIndex();
      root.classList.add("has-active");
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === index);
        dots[i].classList.toggle("is-active", i === index);
      });
      prev.disabled = index === 0;
      next.disabled = index === slides.length - 1;
    }

    function go(index) {
      var target = slides[Math.max(0, Math.min(slides.length - 1, index))];
      track.scrollTo({
        left: target.offsetLeft - (track.clientWidth - target.offsetWidth) / 2,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }

    prev.addEventListener("click", function () {
      go(activeIndex() - 1);
    });
    next.addEventListener("click", function () {
      go(activeIndex() + 1);
    });
    track.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") go(activeIndex() - 1);
      if (event.key === "ArrowRight") go(activeIndex() + 1);
    });
    track.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          update();
        });
      },
      { passive: true }
    );

    update();
  }

  // ---- Novel: 作品の切り替え（切り替えるたびに、また本が開く） ----
  function initNovels(viewer) {
    var items = Array.prototype.slice.call(viewer.querySelectorAll(".novel"));
    var controls = viewer.querySelector(".novel-controls");
    if (items.length < 2 || !controls) return;

    var prev = controls.querySelector("[data-prev]");
    var next = controls.querySelector("[data-next]");
    var counter = controls.querySelector(".novel-count");
    var index = 0;

    // 表示し直すと、CSSのアニメーションが最初から再生される
    function show(i) {
      index = (i + items.length) % items.length;
      items.forEach(function (item, k) {
        item.hidden = k !== index;
      });
      counter.textContent = index + 1 + " / " + items.length;
    }

    prev.addEventListener("click", function () {
      show(index - 1);
    });
    next.addEventListener("click", function () {
      show(index + 1);
    });

    controls.hidden = false;
    show(0);
  }

  initToTop();

  var stage = document.querySelector(".stage");
  if (stage) initIntro(stage);

  Array.prototype.forEach.call(document.querySelectorAll(".carousel"), initCarousel);

  var viewer = document.querySelector(".novel-viewer");
  if (viewer) initNovels(viewer);
})();
