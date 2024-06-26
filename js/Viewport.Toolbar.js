import { UIPanel, UIButton, UICheckbox } from "./libs/ui.js";

function ViewportToolbar(editor) {
  const strings = editor.strings;
  const signals = editor.signals;
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
  // container.add(reset);

  const selectIcon = document.createElement("img");
  selectIcon.title = strings.getKey("viewport/toolbar/select");
  selectIcon.src = "images/select.svg";

  const select = new UIButton();
  select.dom.className = "Button Select selected";
  select.dom.appendChild(selectIcon);
  select.dom.addEventListener("mousedown", function (e) {
    e.stopPropagation();
    signals.selectModeChanged.dispatch("select");
  });
  container.add(select);

  const pointIcon = document.createElement("img");
  pointIcon.title = strings.getKey("viewport/toolbar/point");
  pointIcon.src = "images/point.svg";

  const point = new UIButton();
  point.dom.className = "Button Point";
  point.dom.appendChild(pointIcon);
  point.dom.addEventListener("mousedown", function (e) {
    e.stopPropagation();
    signals.selectModeChanged.dispatch("point");
  });
  container.add(point);

  signals.selectModeChanged.add(function (mode) {
    point.dom.classList.remove("selected");
    select.dom.classList.remove("selected");

    switch (mode) {
      case "point":
        editor.selectMode = "point";
        editor.enablePoint = true;
        point.dom.classList.add("selected");
        break;
      case "select":
        editor.selectMode = "select";
        editor.enablePoint = false;
        select.dom.classList.add("selected");
        break;
    }
  });
  // const enableChildSelect = new UICheckbox(true);
  // enableChildSelect.dom.title = strings.getKey("viewport/toolbar/child_select");
  // enableChildSelect.onChange(function () {
  //   editor.enableChildSelect = this.getValue();
  //   editor.deselect();
  // });
  // container.add(enableChildSelect);

  //

  return container;
}

export { ViewportToolbar };
