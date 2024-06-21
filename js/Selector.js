import * as THREE from "three";

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

class Selector {
  constructor(editor) {
    const signals = editor.signals;

    this.editor = editor;
    this.signals = signals;

    // signals

    signals.intersectionsDetected.add((intersects) => {
      if (intersects.length > 0 && editor.enableSelect) {
        const object = intersects[0].object;

        if (object.userData.object !== undefined) {
          // helper

          this.select(object.userData.object);
        } else if (editor.enableChildSelect) {
          this.select(object);
        } else {
          this.select(this.findParentIsScene(object));
        }
      } else {
        this.select(null);
      }
    });
  }

  getIntersects(raycaster) {
    const objects = [];

    this.editor.scene.traverseVisible(function (child) {
      objects.push(child);
    });
    this.editor.sceneHelpers.traverseVisible(function (child) {
      if (child.name === "picker") objects.push(child);
    });
    const intersects = raycaster.intersectObjects(objects, false);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const object = intersect.object;
      const point = intersect.point;
      this.editor.mouseHelper.position.copy(point);
      const normal = intersect.face.normal.clone();
      normal.transformDirection(object.matrixWorld);
      normal.multiplyScalar(3);
      normal.add(intersect.point);
      this.editor.mouseHelper.lookAt(normal);
      this.editor.mouseHelper.guidePosition = normal;
      // const o = intersect.face.normal.clone();
      // o.transformDirection(object.matrixWorld);
      // o.multiplyScalar(0.5);
      // o.add(intersect.point);
      // this.editor.mouseHelper.spritePosition = o;
    }
    return intersects;
  }
  findParentIsScene(obj) {
    if (obj.parent instanceof THREE.Scene) {
      return obj;
    } else {
      return this.findParentIsScene(obj.parent);
    }
  }
  getPointerIntersects(point, camera) {
    mouse.set(point.x * 2 - 1, -(point.y * 2) + 1);

    raycaster.setFromCamera(mouse, camera);

    return this.getIntersects(raycaster);
  }
  getIntersectObjectParentIsScene(point, camera) {
    const intersects = this.getPointerIntersects(point, camera);
    if (intersects.length > 0 && editor.enablePoint) {
      const object = intersects[0].object;
      return this.findParentIsScene(object);
    }
  }
  getDropPointerIntersects(point, camera) {
    mouse.set(point.x * 2 - 1, -(point.y * 2) + 1);

    raycaster.setFromCamera(mouse, camera);

    return this.getDropIntersects(raycaster);
  }

  getDropIntersects(raycaster) {
    const objects = [];

    this.editor.sceneHelpers.traverseVisible(function (child) {
      if (child.type === "GridHelper") objects.push(child);
    });

    return raycaster.intersectObjects(objects, false);
  }

  select(object) {
    if (this.editor.selected === object) return;

    let uuid = null;

    if (object !== null) {
      uuid = object.uuid;
    }

    this.editor.selected = object;
    this.editor.config.setKey("selected", uuid);

    this.signals.objectSelected.dispatch(object);
  }

  deselect() {
    this.select(null);
  }
}

export { Selector };
