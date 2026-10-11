/* 审核壳脚本：场景/主题/尺寸切换，与 flow.html 通过 postMessage 通信。 */
(function () {
  var frame = document.getElementById("preview");
  var wrap = document.getElementById("frame-wrap");
  var sceneSelect = document.getElementById("scene");
  var caption = document.getElementById("preview-caption");
  var status = document.getElementById("review-status");
  var flowList = document.getElementById("flow-list");
  var theme = "paper";

  var captions = {
    "checking": "自动检查（自动初始化/修复）",
    "repair-failed": "无法修复 · 恢复对话框",
    "reset-confirm": "重置二次确认",
    "resetting": "正在重置",
    "reset-complete": "重置完成 · 自动重启",
    "reset-failed": "重置失败 · 可重试",
    "lost-custom": "自定义目录丢失 · 重置出口"
  };

  function post(scene) {
    frame.contentWindow.postMessage({ type: "startup-recovery-set", theme: theme, scene: scene }, "*");
  }
  function markScene(scene) {
    caption.textContent = captions[scene] || scene;
    sceneSelect.value = scene;
    flowList.querySelectorAll("li").forEach(function (li) {
      li.classList.toggle("active", li.dataset.scene === scene);
    });
  }

  sceneSelect.addEventListener("change", function () { post(sceneSelect.value); markScene(sceneSelect.value) });
  document.querySelectorAll("[data-look]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      theme = btn.dataset.look;
      document.querySelectorAll("[data-look]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)) });
      post(sceneSelect.value);
    });
  });
  document.querySelectorAll("[data-size]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      wrap.classList.toggle("narrow", btn.dataset.size === "narrow");
      wrap.classList.toggle("short", btn.dataset.size === "short");
      document.querySelectorAll("[data-size]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)) });
    });
  });
  window.addEventListener("message", function (event) {
    var data = event.data || {};
    if (data.type === "startup-recovery-scene") markScene(data.scene);
  });
  frame.addEventListener("load", function () { post(sceneSelect.value) });
})();
