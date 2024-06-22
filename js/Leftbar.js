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

  const create = new LeftbarCreate(editor);
  container.addTab("create", strings.getKey("leftbar/create"), create);
  const model = new LeftbarModel(editor);
  container
    .addTab("model", strings.getKey("leftbar/model"), model)
    .onChange((e) => {
      if (container.selected != "model") {
        editor.deselect();
      }
      if (container.selected != "create") {
        create.flexListbox.setValue({});
      }
      editor.enableSelect = container.selected != "hotspot";
      editor.dragModel = null;
      console.log(e);
    });

  const hotspot = new LeftbarHotspot(editor);
  container.addTab("hotspot", strings.getKey("leftbar/hotspot"), hotspot);

  container.select("create");

  signals.showLeftbarChanged.add((showLeftbar) => {
    container.setHidden(!showLeftbar);
  });
  return container;
}

export { Leftbar };
