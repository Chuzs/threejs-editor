import { UIFlexListbox, UIPanel } from "./libs/ui.js";

function LeftbarHotspotAddText(editor) {
  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("hotspotAddText");

  const flexListbox = new UIFlexListbox().onChange(async (e) => {
    editor.dragModel = flexListbox.getValue();
    console.log(editor.dragModel);

    const imageMesh = await editor.createText(editor.dragModel.name);
    editor.toAddMesh = imageMesh;
  });
  const textList = [
    {
      id: "text1",
      name: "平面文字",
      modelType: "hotspot",
      type: "text",
    },
    {
      id: "text2",
      name: "3D文字",
      modelType: "hotspot",
      type: "3DText",
    },
  ];
  flexListbox.setItems(textList);
  container.add(flexListbox);

  return container;
}

export { LeftbarHotspotAddText };
