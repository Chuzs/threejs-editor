import { LeftbarCreate } from "./Leftbar.Create.js";
import { LeftbarModel } from "./Leftbar.Model.js";
import { LeftbarHotspot } from "./Leftbar.hotspot.js";
import { UITabbedPanel } from "./libs/ui.js";
function Leftbar(editor) {
  const strings = editor.strings;
  const signals = editor.signals;

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

  const create = new LeftbarCreate(editor);
  container.addTab("create", strings.getKey("leftbar/create"), create);
  container.select("model");

  signals.showLeftbarChanged.add((showLeftbar) => {
    container.setHidden(!showLeftbar);
  });
  return container;
}

export { Leftbar };
