import { UIFlexListbox, UIPanel } from "./libs/ui.js";

function LeftbarHotspotAddHTML(editor) {
  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("hotspotAddText");

  const flexListbox = new UIFlexListbox().onChange(async (e) => {
    editor.dragModel = flexListbox.getValue();
    console.log(editor.dragModel);

    const imageMesh = editor.createHtml(editor.dragModel);
    editor.toAddMesh = imageMesh;
  });
  const htmlList = [
    {
      id: "html1",
      name: "H5页面",
      modelType: "hotspot",
      fileType: "html",
      width: "300px",
      height: "600px",
      scale: { x: 0.01, y: 0.01, z: 0.01 },
    },
  ];
  flexListbox.setItems(htmlList);
  container.add(flexListbox);

  return container;
}

export { LeftbarHotspotAddHTML };
