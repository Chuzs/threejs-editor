import { modelList } from "../config/model.js";
import { UIFlexListbox, UIPanel } from "./libs/ui.js";

function LeftbarHotspotAdd(editor) {
  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("hotspotAdd");

  const flexListbox = new UIFlexListbox().onChange((e) => {
    editor.dragModel = flexListbox.getValue();
  });
  flexListbox.setItems(modelList);
  container.add(flexListbox);

  return container;
}

export { LeftbarHotspotAdd };
