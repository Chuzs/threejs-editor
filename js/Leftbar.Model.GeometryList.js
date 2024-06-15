import { geometryModelList } from "../config/model.js";
import { UIPanel, UIFlexListbox } from "./libs/ui.js";

function LeftbarGeometryList(editor) {
  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("geometryList");

  const flexListbox = new UIFlexListbox().onChange((e) => {
    editor.dragModel = flexListbox.getValue();
  });
  flexListbox.setItems(geometryModelList);
  container.add(flexListbox);

  return container;
}

export { LeftbarGeometryList };
