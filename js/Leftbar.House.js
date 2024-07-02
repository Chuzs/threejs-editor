import { houseList } from "../config/model.js";
import { UIFlexListbox, UIPanel } from "./libs/ui.js";
function LeftbarHouse(editor) {
  const container = new UIPanel();
  container.setId("materialList");

  const flexListbox = new UIFlexListbox().onChange((e) => {
    editor.dragModel = flexListbox.getValue();
    editor.loader.loadAsyncModel(editor.dragModel).then((res) => {
      editor.toAddMesh = res;
    });
  });
  flexListbox.setItems(houseList);
  container.add(flexListbox);
  container.flexListbox = flexListbox;
  return container;
}

export { LeftbarHouse };
