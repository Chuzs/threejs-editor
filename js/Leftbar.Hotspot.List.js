import { modelList } from "../config/model.js";
import { UIListbox, UIPanel } from "./libs/ui.js";

function LeftbarHotspotList(editor) {
  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("hotspostList");

  const listbox = new UIListbox();
  listbox.setItems(modelList);
  container.add(listbox);

  return container;
}

export { LeftbarHotspotList };
