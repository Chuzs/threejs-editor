import { LeftbarHotspotAddImage } from "./Leftbar.Hotspot.Add.Image.js";
import { LeftbarHotspotAddVideo } from "./Leftbar.Hotspot.Add.Video.js";
import { UITabbedPanel } from "./libs/ui.js";

function LeftbarHotspotAdd(editor) {
  const strings = editor.strings;

  const container = new UITabbedPanel();
  container.setBorderTop("0");
  container.setStyle("min-width", "0px");
  container.setId("hotspotAdd");
  const hotspostAddImage = new LeftbarHotspotAddImage(editor);
  container.addTab(
    "hotspostAddImage",
    strings.getKey("leftbar/hotspot/add/image"),
    hotspostAddImage
  );
  const hotspostAddVideo = new LeftbarHotspotAddVideo(editor);
  container.addTab(
    "hotspostAddVideo",
    strings.getKey("leftbar/hotspot/add/video"),
    hotspostAddVideo
  );
  container.select("hotspostAddImage");
  return container;
}

export { LeftbarHotspotAdd };
