import { UIPanel, UIButton, UICheckbox } from "./libs/ui.js";

function ViewportToolbar(editor) {
  const signals = editor.signals;
  const strings = editor.strings;

  const container = new UIPanel();
  container.setId("viewportToolbar");

  // translate / rotate / scale

  const translateIcon = document.createElement("img");
  translateIcon.title = strings.getKey("toolbar/translate");
  translateIcon.src = "images/translate.svg";

  const translate = new UIButton();
  translate.dom.className = "Button selected";
  translate.dom.appendChild(translateIcon);
  translate.dom.addEventListener("mousedown", function (e) {
    e.stopPropagation();
    signals.transformModeChanged.dispatch("translate");
  });
  container.add(translate);

  const rotateIcon = document.createElement("img");
  rotateIcon.title = strings.getKey("toolbar/rotate");
  rotateIcon.src = "images/rotate.svg";

  const rotate = new UIButton();
  rotate.dom.appendChild(rotateIcon);
  rotate.dom.addEventListener("mousedown", function () {
    signals.transformModeChanged.dispatch("rotate");
  });
  container.add(rotate);

  const scaleIcon = document.createElement("img");
  scaleIcon.title = strings.getKey("toolbar/scale");
  scaleIcon.src = "images/scale.svg";

  const scale = new UIButton();
  scale.dom.appendChild(scaleIcon);
  scale.dom.addEventListener("mousedown", function () {
    signals.transformModeChanged.dispatch("scale");
  });
  container.add(scale);

  const enableChildSelect = new UICheckbox(true);
  enableChildSelect.dom.title = strings.getKey("viewport/toolbar/child_select");
  enableChildSelect.onChange(function () {
    editor.enableChildSelect = this.getValue();
    editor.deselect();
  });
  container.add(enableChildSelect);

  //

  signals.transformModeChanged.add(function (mode) {
    translate.dom.classList.remove("selected");
    rotate.dom.classList.remove("selected");
    scale.dom.classList.remove("selected");

    switch (mode) {
      case "translate":
        translate.dom.classList.add("selected");
        break;
      case "rotate":
        rotate.dom.classList.add("selected");
        break;
      case "scale":
        scale.dom.classList.add("selected");
        break;
    }
  });

  return container;
}

export { ViewportToolbar };
