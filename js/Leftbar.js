import { LeftbarModel } from "./Leftbar.Model.js";
import { UITabbedPanel } from "./libs/ui.js";
function Leftbar(editor) {
  const strings = editor.strings;

  const container = new UITabbedPanel();
  container.setMode("vertical");
  container.setId("leftbar");

  const model = new LeftbarModel(editor);

  container.addTab("model", strings.getKey("leftbar/model"), model);

  container.select("model");
  return container;
}

export { Leftbar };
