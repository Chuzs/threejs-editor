import { UIPanel, UIDiv } from "./libs/ui.js";
import Stats from "three/addons/libs/stats.module.js";

function ViewportStats(editor) {
  const container = new UIPanel();
  container.setId("viewportStats");
  //创建stats对象
  const stats = new Stats();
  container.dom.appendChild(stats.domElement);

  this.stats = stats;
  this.container = container;
}

export { ViewportStats };
