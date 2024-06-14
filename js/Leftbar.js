import { LeftbarGeometryList } from "./Leftbar.GeometryList.js";
import { LeftbarModelList } from "./Leftbar.ModelList.js";
import { UITabbedPanel, UISpan } from "./libs/ui.js";
function Leftbar(editor) {
  const strings = editor.strings;

  const container = new UITabbedPanel();
  container.setId("leftbar");

  const geometryList = new LeftbarGeometryList(editor);
  const modelList = new LeftbarModelList(editor);

  container.addTab("model", strings.getKey("leftbar/models"), modelList);

  container.addTab(
    "geometry",
    strings.getKey("leftbar/geometry"),
    geometryList
  );
  container.select("model");
  return container;
}

export { Leftbar };
