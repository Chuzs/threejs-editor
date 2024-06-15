import { LeftbarGeometryList } from "./Leftbar.Model.GeometryList.js";
import { LeftbarModelList } from "./Leftbar.Model.ModelList.js";
import { UITabbedPanel } from "./libs/ui.js";
function LeftbarModel(editor) {
  const strings = editor.strings;

  const container = new UITabbedPanel();
  container.setStyle("min-width", "0px");

  const geometryList = new LeftbarGeometryList(editor);
  const modelList = new LeftbarModelList(editor);

  container.addTab(
    "modelList",
    strings.getKey("leftbar/model/models"),
    modelList
  );

  container.addTab(
    "geometryList",
    strings.getKey("leftbar/model/geometry"),
    geometryList
  );
  container.select("modelList");
  return container;
}

export { LeftbarModel };
