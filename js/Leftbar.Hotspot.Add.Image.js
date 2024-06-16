import { hotspotImageList } from "../config/model.js";
import { UIFlexListbox, UIPanel } from "./libs/ui.js";

function LeftbarHotspotAddImage(editor) {
  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("hotspotAddImage");

  const flexListbox = new UIFlexListbox().onChange((e) => {
    editor.dragModel = flexListbox.getValue();
  });

  flexListbox.setItems(hotspotImageList);
  container.add(flexListbox);

  return container;
}

export { LeftbarHotspotAddImage };
