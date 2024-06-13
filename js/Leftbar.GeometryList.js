import {
  UIButton,
  UICheckbox,
  UIPanel,
  UIInput,
  UIRow,
  UIText,
  UIFlexListbox,
} from "./libs/ui.js";

function LeftbarGeometryList(editor) {
  const config = editor.config;
  const signals = editor.signals;
  const strings = editor.strings;

  const save = editor.utils.save;

  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("geometryList");

  // const headerRow = new UIRow();
  // headerRow.add(new UIText(strings.getKey("leftbar/geometry")));
  // container.add(headerRow);

  const flexListbox = new UIFlexListbox().onChange((e) => {
    editor.dragModel = flexListbox.getValue();
  });
  flexListbox.setItems([
    { name: "正方体" },
    { name: "胶囊" },
    { id: "circle", name: "圆", type: "geometry" },
  ]);
  container.add(flexListbox);

  return container;
}

export { LeftbarGeometryList };
