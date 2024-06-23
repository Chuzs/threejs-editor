import { materialList } from "../config/model.js";
import { UIFlexListbox, UIPanel } from "./libs/ui.js";
function LeftbarCreate(editor) {
  const container = new UIPanel();
  container.setId("materialList");

  const flexListbox = new UIFlexListbox().onChange((e) => {
    editor.dragModel = flexListbox.getValue();
    editor.loader.loadAsyncModel(editor.dragModel).then((res) => {
      editor.toAddMesh = res;
    });
  });
  flexListbox.setItems(materialList);
  container.add(flexListbox);
  container.flexListbox = flexListbox;
  return container;
}

export { LeftbarCreate };
