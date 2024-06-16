import { hotspotVideoList } from "../config/model.js";
import { UIFlexListbox, UIPanel } from "./libs/ui.js";

function LeftbarHotspotAddVideo(editor) {
  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("hotspotAddVideo");

  const flexListbox = new UIFlexListbox().onChange((e) => {
    editor.dragModel = flexListbox.getValue();
  });
  flexListbox.setItems(hotspotVideoList);
  container.add(flexListbox);

  return container;
}

export { LeftbarHotspotAddVideo };
