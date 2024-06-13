import {
  UIButton,
  UICheckbox,
  UIPanel,
  UIInput,
  UIRow,
  UIText,
  UIFlexListbox,
} from "./libs/ui.js";

function LeftbarGeometryList(editor) {
  const config = editor.config;
  const signals = editor.signals;
  const strings = editor.strings;

  const save = editor.utils.save;

  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("geometryList");

  // const headerRow = new UIRow();
  // headerRow.add(new UIText(strings.getKey("leftbar/geometry")));
  // container.add(headerRow);

  const flexListbox = new UIFlexListbox().onChange((e) => {
    editor.dragModel = flexListbox.getValue();
  });
  flexListbox.setItems([
    { name: "正方体" },
    { name: "胶囊" },
    {
      id: 32,
      name: "圆形缓冲几何体",
      modelType: "geometry",
      type: "CircleGeometry",
      radius: 0.5, // 半径
      segments: 32, //分段（三角面）的数量
      thetaStart: 0, // 第一个分段的起始角度
      thetaLength: 6.44, //圆形扇区的中心角
    },
  ]);
  container.add(flexListbox);

  return container;
}

export { LeftbarGeometryList };
