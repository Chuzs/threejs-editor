import {
  UIButton,
  UICheckbox,
  UIPanel,
  UIInput,
  UIRow,
  UIText,
} from "./libs/ui.js";

function LeftbarModelList(editor) {
  const config = editor.config;
  const signals = editor.signals;
  const strings = editor.strings;

  const save = editor.utils.save;

  const container = new UIPanel();
  container.setBorderTop("0");
  container.setId("modelList");

  const headerRow = new UIRow();
  headerRow.add(new UIText(strings.getKey("leftbar/models")));
  container.add(headerRow);

  return container;
}

export { LeftbarModelList };
