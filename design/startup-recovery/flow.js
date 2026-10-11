/* 数据目录恢复对话框 · 设计预览脚本。仅占位演示，不连接任何真实文件或接口。 */
(function () {
  var DEFAULT_ROOT = "C:\\Users\\Administrator\\.xaanink";
  var CUSTOM_ROOT = "D:\\写作数据\\xaanink-data";

  var scenes = {
    "checking": {
      windowTitle: "玄印写作",
      title: "数据目录检查",
      heading: "正在检查数据目录…",
      notice: "配置目录缺失或文件丢失时将自动重建，无需操作。",
      paths: [{ label: "数据目录", value: DEFAULT_ROOT }],
      buttons: []
    },
    "repair-failed": {
      windowTitle: "数据目录恢复 · 玄印写作",
      title: "无法修复数据目录",
      heading: "自动修复未完成",
      notice: "数据目录中的文件丢失或损坏，无法自动修复。可以退出应用保留现状，或重置配置数据后重新开始。",
      paths: [{ label: "数据目录", value: DEFAULT_ROOT }],
      buttons: [
        { id: "reset", label: "重置配置数据", variant: "primary" },
        { id: "quit", label: "退出应用", variant: "outline" }
      ]
    },
    "reset-confirm": {
      windowTitle: "数据目录恢复 · 玄印写作",
      title: "无法修复数据目录",
      heading: "确认重置配置数据",
      notice: "请确认重置后果，此步骤是最终确认。",
      paths: [{ label: "数据目录", value: DEFAULT_ROOT }],
      warning: {
        title: "此操作不可撤销",
        copy: "重置会清空数据目录（" + DEFAULT_ROOT + "）的全部内容，包括收件箱、设置与模型配置、作品索引和应用备份。作品文件保存在各自的独立目录中，不会被删除，但重置后需要重新打开关联。"
      },
      buttons: [
        { id: "confirm", label: "确认清空并重置", variant: "destructive" },
        { id: "back", label: "返回", variant: "outline" }
      ]
    },
    "resetting": {
      windowTitle: "数据目录恢复 · 玄印写作",
      title: "无法修复数据目录",
      heading: "正在重置数据目录…",
      notice: "正在清空并重建配置目录，请勿关闭应用。",
      paths: [{ label: "数据目录", value: DEFAULT_ROOT }],
      buttons: [
        { id: "confirm", label: "确认清空并重置", variant: "destructive", disabled: true },
        { id: "back", label: "返回", variant: "outline", disabled: true }
      ]
    },
    "reset-complete": {
      windowTitle: "数据目录恢复 · 玄印写作",
      title: "无法修复数据目录",
      heading: "重置完成，正在重新打开应用…",
      notice: "应用将自动重新启动，从新手指引开始正常使用。",
      paths: [{ label: "数据目录", value: DEFAULT_ROOT }],
      buttons: []
    },
    "reset-failed": {
      windowTitle: "数据目录恢复 · 玄印写作",
      title: "无法修复数据目录",
      heading: "重置未完成",
      notice: "重置未完成，请关闭可能占用文件的程序后重试。原有文件保持现状。",
      paths: [{ label: "数据目录", value: DEFAULT_ROOT }],
      buttons: [
        { id: "retry", label: "重试", variant: "primary" },
        { id: "quit", label: "退出应用", variant: "outline" }
      ]
    },
    "lost-custom": {
      windowTitle: "定位原数据目录 · 玄印写作",
      title: "定位原数据目录",
      heading: "原数据目录无法访问",
      notice: "请找到原来的数据目录。此入口只接受原物理目录，不会创建空数据或恢复副本。若原目录已无法找回，可以重置配置数据，从默认目录重新开始。",
      paths: [{ label: "原数据目录", value: CUSTOM_ROOT }],
      buttons: [
        { id: "choose", label: "定位原数据目录", variant: "primary" },
        { id: "reset", label: "重置配置数据", variant: "outline" },
        { id: "quit", label: "退出应用", variant: "outline" }
      ]
    }
  };

  var $ = function (id) { return document.getElementById(id) };
  var current = "repair-failed";

  function render(name) {
    var scene = scenes[name] || scenes["repair-failed"];
    current = scenes[name] ? name : "repair-failed";
    $("window-title").textContent = scene.windowTitle;
    $("dialog-title").textContent = scene.title;
    $("status-heading").textContent = scene.heading;
    $("status-notice").textContent = scene.notice;
    $("status-notice").hidden = !scene.notice;
    var paths = $("paths");
    paths.innerHTML = "";
    (scene.paths || []).forEach(function (p) {
      var div = document.createElement("div");
      var dt = document.createElement("dt"); dt.textContent = p.label;
      var dd = document.createElement("dd"); dd.textContent = p.value;
      div.appendChild(dt); div.appendChild(dd); paths.appendChild(div);
    });
    paths.hidden = !(scene.paths || []).length;
    var warning = $("warning");
    if (scene.warning) {
      warning.hidden = false;
      $("warning-title").textContent = scene.warning.title;
      $("warning-copy").textContent = scene.warning.copy;
    } else warning.hidden = true;
    $("error").hidden = true;
    var actions = $("actions");
    actions.innerHTML = "";
    (scene.buttons || []).forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = "btn " + b.variant;
      btn.textContent = b.label;
      btn.dataset.action = b.id;
      if (b.disabled) btn.disabled = true;
      btn.addEventListener("click", function () { act(b.id) });
      actions.appendChild(btn);
    });
    actions.hidden = !(scene.buttons || []).length;
    parent.postMessage({ type: "startup-recovery-scene", scene: current }, "*");
  }

  function act(id) {
    if (id === "reset") render("reset-confirm");
    else if (id === "back") render(current === "reset-confirm" && fromCustom ? "lost-custom" : "repair-failed");
    else if (id === "confirm" || id === "retry") {
      render("resetting");
      /* 预览用假计时，真实实现由主进程执行并重启发新进程 */
      setTimeout(function () { render("reset-complete") }, 1600);
    }
    else if (id === "choose" || id === "quit") {
      var error = $("error");
      error.textContent = id === "choose" ? "设计预览：此处打开系统目录选择框。" : "设计预览：此处退出应用。";
      error.hidden = false;
    }
  }

  var fromCustom = false;
  window.addEventListener("message", function (event) {
    var data = event.data || {};
    if (data.type === "startup-recovery-set") {
      if (data.theme) document.documentElement.className = data.theme;
      if (data.scene) { fromCustom = data.scene === "lost-custom" || (data.scene === "reset-confirm" && fromCustom); render(data.scene) }
    }
  });

  var params = new URLSearchParams(location.search);
  var initial = params.get("scene") || "repair-failed";
  fromCustom = initial === "lost-custom";
  if (params.get("theme")) document.documentElement.className = params.get("theme");
  render(initial);
})();
