import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import {
  UIDiv,
  UIRow,
  UIText,
  UIInteger,
  UISelect,
  UICheckbox,
  UINumber,
} from "./libs/ui.js";
import { UIPoints3 } from "./libs/ui.three.js";

import { SetGeometryCommand } from "./commands/SetGeometryCommand.js";

function GeometryParametersPanel(editor, object) {
  const strings = editor.strings;

  const container = new UIDiv();

  const geometry = object.geometry;
  const parameters = geometry.parameters;
  console.log(parameters);

  // bevelSize

  const bevelSizeRow = new UIRow();
  bevelSizeRow.add(
    new UIText(
      strings.getKey("sidebar/geometry/text_geometry/bevelSize")
    ).setClass("Label")
  );

  const bevelSize = new UINumber(parameters.options.bevelSize).onChange(update);
  bevelSizeRow.add(bevelSize);

  container.add(bevelSizeRow);

  // closed

  const closedRow = new UIRow();
  const closed = new UICheckbox(parameters.closed).onChange(update);

  closedRow.add(
    new UIText(
      strings.getKey("sidebar/geometry/tube_geometry/closed")
    ).setClass("Label")
  );
  closedRow.add(closed);

  container.add(closedRow);

  //

  function update() {
    editor.execute(
      new SetGeometryCommand(
        editor,
        object,
        new TextGeometry(text, {
          font,
          size: 1,
          depth: 0.1,
          curveSegments: 2,
          bevelThickness: 0.05,
          bevelSize: 0.05,
          bevelEnabled: true,
        })
      )
    );
  }

  return container;
}

export { GeometryParametersPanel };
