import { UIElement } from "./libs/ui.js";

function ResizerLeft(editor) {
  const signals = editor.signals;

  const dom = document.createElement("div");
  dom.id = "resizer-left";

  function onPointerDown(event) {
    if (event.isPrimary === false) return;

    dom.ownerDocument.addEventListener("pointermove", onPointerMove);
    dom.ownerDocument.addEventListener("pointerup", onPointerUp);
  }

  function onPointerUp(event) {
    if (event.isPrimary === false) return;

    dom.ownerDocument.removeEventListener("pointermove", onPointerMove);
    dom.ownerDocument.removeEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(event) {
    // PointerEvent's movementX/movementY are 0 in WebKit

    if (event.isPrimary === false) return;

    const offsetWidth = document.body.offsetWidth;
    const clientX = event.clientX;

    const cX = clientX < 0 ? 0 : clientX > offsetWidth ? offsetWidth : clientX;
    const x = Math.max(335, cX); // .TabbedPanel min-width: 335px

    dom.style.left = x - 5 + "px";

    document.getElementById("leftbar").style.width = x + "px";
    document.getElementById("player").style.left = x + "px";
    document.getElementById("script").style.left = x + "px";
    document.getElementById("viewport").style.left = x + "px";
    document.getElementById("toolbar").style.left = x + 10 + "px";
  }

  dom.addEventListener("pointerdown", onPointerDown);

  signals.windowResize.dispatch();
  signals.showLeftbarChange.add((showLeftbar) => {
    dom.hidden = !showLeftbar;
  });
  return new UIElement(dom);
}

export { ResizerLeft };
