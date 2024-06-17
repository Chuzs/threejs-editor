import { LeftbarModel } from "./Leftbar.Model.js";
import { LeftbarHotspot } from "./Leftbar.hotspot.js";
import { UITabbedPanel } from "./libs/ui.js";
function Leftbar(editor) {
  const strings = editor.strings;

  const container = new UITabbedPanel();
  container.setMode("vertical");
  container.setId("leftbar");

  const model = new LeftbarModel(editor);
  container
    .addTab("model", strings.getKey("leftbar/model"), model)
    .onChange(() => {
      if (container.selected != "model") {
        editor.deselect();
      }
      editor.enableSelect = container.selected === "model";
    });

  const hotspot = new LeftbarHotspot(editor);
  container.addTab("hotspot", strings.getKey("leftbar/hotspot"), hotspot);

  container.select("model");
  return container;
}

export { Leftbar };
