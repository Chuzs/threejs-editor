import * as THREE from "three";

import { UIButton, UIDiv, UIPanel, UISpan, UIText } from "./libs/ui.js";
import { UIBoolean } from "./libs/ui.three.js";

function MenubarStatus(editor) {
  const strings = editor.strings;

  const container = new UIPanel();
  container.setClass("menu right");

  const childIcon = document.createElement("img");
  childIcon.title = strings.getKey("menubar/status/child_select");
  childIcon.src = "images/child.svg";

  const child = new UIButton();
  child.dom.className = "Button child";
  child.dom.appendChild(childIcon);
  child.dom.addEventListener("mousedown", function (e) {
    e.stopPropagation();
    editor.enableChildSelect = !editor.enableChildSelect;
    child.toggleClass("active", editor.enableChildSelect);
  });
  container.add(child);

  const previewBtn = new UIButton();
  previewBtn.setTextContent(strings.getKey("menubar/status/preview"));
  previewBtn.onClick(() => {
    editor.signals.savingStarted.dispatch();
    editor.storage.set(editor.toJSON());
    editor.signals.savingFinished.dispatch();
    window.open("preview.html");
  });
  container.add(previewBtn);

  const saveBtn = new UIButton();
  saveBtn.setTextContent(strings.getKey("menubar/status/save"));
  saveBtn.onClick(() => {
    editor.signals.savingStarted.dispatch();
    editor.storage.set(editor.toJSON());
    editor.signals.savingFinished.dispatch();
  });
  container.add(saveBtn);
  // container.add(preview);

  const autosave = new UIBoolean(
    editor.config.getKey("autosave"),
    strings.getKey("menubar/status/autosave")
  );
  autosave.text.setColor("#888");
  autosave.onChange(function () {
    const value = this.getValue();

    editor.config.setKey("autosave", value);

    if (value === true) {
      editor.signals.sceneGraphChanged.dispatch();
    }
  });
  // container.add(autosave);

  editor.signals.savingStarted.add(function () {
    autosave.text.setTextDecoration("underline");
  });

  editor.signals.savingFinished.add(function () {
    autosave.text.setTextDecoration("none");
  });

  const version = new UIText("r" + THREE.REVISION);
  version.setClass("title");
  version.setOpacity(0.5);
  container.add(version);

  return container;
}

export { MenubarStatus };
