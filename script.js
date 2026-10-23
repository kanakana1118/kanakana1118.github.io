// 下にスクロールすると右下に出る「上に戻る」ボタン
(function () {
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
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  window.addEventListener("scroll", update, { passive: true });
  update();
})();
