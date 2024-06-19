import { UIPanel, UIButton, UICheckbox } from "./libs/ui.js";

function ViewportToolbar(editor) {
  const strings = editor.strings;

  const container = new UIPanel();
  container.setId("viewportToolbar");

  // translate / rotate / scale

  const translateIcon = document.createElement("img");
  translateIcon.title = strings.getKey("viewport/toolbar/reset");
  translateIcon.src = "images/translate.svg";

  const reset = new UIButton();
  reset.dom.className = "Button Reset";
  reset.dom.appendChild(translateIcon);
  reset.dom.addEventListener("mousedown", function (e) {
    e.stopPropagation();
    editor.resetCamera();
  });
  container.add(reset);

  const enableChildSelect = new UICheckbox(true);
  enableChildSelect.dom.title = strings.getKey("viewport/toolbar/child_select");
  enableChildSelect.onChange(function () {
    editor.enableChildSelect = this.getValue();
    editor.deselect();
  });
  container.add(enableChildSelect);

  //

  return container;
}

export { ViewportToolbar };
