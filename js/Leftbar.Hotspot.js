import { LeftbarHotspotList } from "./Leftbar.Hotspot.List.js";
import { LeftbarHotspotAdd } from "./Leftbar.Hotspot.add.js";
import { UITabbedPanel } from "./libs/ui.js";
function LeftbarHotspot(editor) {
  const strings = editor.strings;

  const container = new UITabbedPanel();
  container.setStyle("min-width", "0px");

  const hotspostAdd = new LeftbarHotspotAdd(editor);
  const hotspostList = new LeftbarHotspotList(editor);

  container.addTab(
    "hotspostList",
    strings.getKey("leftbar/hotspot/list"),
    hotspostList
  );

  container.addTab(
    "hotspostAdd",
    strings.getKey("leftbar/hotspot/add"),
    hotspostAdd
  );
  container.select("hotspostList");
  return container;
}

export { LeftbarHotspot };