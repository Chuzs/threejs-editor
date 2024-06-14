import { modelList } from "../config/model.js";
import { UIFlexListbox, UIPanel } from "./libs/ui.js";

function LeftbarModelList(editor) {
  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("geometryList");

  const flexListbox = new UIFlexListbox().onChange((e) => {
    editor.dragModel = flexListbox.getValue();
  });
  flexListbox.setItems(modelList);
  container.add(flexListbox);

  return container;
}

export { LeftbarModelList };
