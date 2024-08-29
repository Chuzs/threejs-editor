import * as THREE from "three";
import {
  computeBoundsTree,
  MeshBVH,
  disposeBoundsTree,
  acceleratedRaycast,
} from "three-mesh-bvh";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TransformControls } from "three/addons/controls/TransformControlsMerge.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import CameraControls from "three/addons/controls/CameraControls.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { UIPanel } from "./libs/ui.js";
import Reflector from "./libs/reflector/reflector.js";

import { EditorControls } from "./EditorControls.js";

import { ViewportControls } from "./Viewport.Controls.js";
import { ViewportInfo } from "./Viewport.Info.js";

import { ViewHelper } from "./Viewport.ViewHelper.js";
import { XR } from "./Viewport.XR.js";

import { SetPositionCommand } from "./commands/SetPositionCommand.js";
import { SetRotationCommand } from "./commands/SetRotationCommand.js";
import { SetScaleCommand } from "./commands/SetScaleCommand.js";

import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ViewportPathtracer } from "./Viewport.Pathtracer.js";
import { AddObjectCommand } from "./commands/AddObjectCommand.js";
import { ViewportToolbar } from "./Viewport.Toolbar.js";
import { ViewportStats } from "./Viewport.Stats.js";
import { PlayerControls } from "./PlayerControls.js";
import { Character } from "./Character.js";

// 着色器配置
const vertexShader = `
     varying vec2 vUv;
	 void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	 }
`;
// 着色器配置
const fragmentShader = `
		uniform sampler2D baseTexture;
		uniform sampler2D bloomTexture;
		uniform vec3 glowColor; 

		varying vec2 vUv;

		void main() {
			vec4 baseColor = texture2D(baseTexture, vUv);
			vec4 bloomColor = texture2D(bloomTexture, vUv);

			// 调整辉光颜色
			vec4 glow = vec4(glowColor, 1.0);

			gl_FragColor = baseColor + glow * bloomColor;
		}`;
CameraControls.install({ THREE: THREE });
function Viewport(editor) {
  const selector = editor.selector;
  const signals = editor.signals;

  const container = new UIPanel();
  container.setId("viewport");
  container.setPosition("absolute");
  if (editor.showViewportInfo) {
    container.add(new ViewportInfo(editor));
  }
  if (editor.showViewportControls) {
    container.add(new ViewportControls(editor));
  }
  if (editor.showViewportToolbar) {
    container.add(new ViewportToolbar(editor));
  }
  const viewportStats = new ViewportStats(editor);
  container.add(viewportStats.container);

  //

  let renderer = null;
  let pmremGenerator = null;
  let pathtracer = null;

  const camera = editor.camera;
  const scene = editor.scene;
  const sceneHelpers = editor.sceneHelpers;

  // hdr
  // const exrLoader = new EXRLoader();
  // exrLoader.loadAsync("../models/hdr/default.exr").then((res) => {
  //   console.log("初始化hdr");
  //   res.mapping = THREE.EquirectangularReflectionMapping;
  //   scene.environment = res;
  //   // scene.background = res;
  // });
  const rgbLoader = new RGBELoader();

  rgbLoader.loadAsync("../models/hdr/venice_sunset_1k.hdr").then((texture) => {
    console.log("初始化hdr");
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    // scene.background = texture;
    scene.environment = texture;
  });

  editor.capsule = new THREE.Mesh(
    new RoundedBoxGeometry(0.6, 1.5, 0.6, 5, 0.5),
    new THREE.MeshBasicMaterial({ color: "red" })
  );

  // character
  editor.loader
    .loadAsyncModel({
      filePath: "../models/glb/defaultCharacter.glb",
      fileType: "glb",
    })
    .then((res) => {
      console.log(res);
      editor.characterModel = res;
    });
  // helpers

  const GRID_COLORS_LIGHT = [0x999999, 0x777777];
  const GRID_COLORS_DARK = [0x555555, 0x888888];

  const grid = new THREE.Group();

  const grid1 = new THREE.GridHelper(30 * 10, 30 * 10);
  grid1.material.color.setHex(GRID_COLORS_LIGHT[0]);
  grid1.material.vertexColors = false;
  grid.add(grid1);

  const grid2 = new THREE.GridHelper(30 * 10, 6 * 10);
  grid2.material.color.setHex(GRID_COLORS_LIGHT[1]);
  grid2.material.vertexColors = false;
  grid.add(grid2);
  sceneHelpers.add(grid);

  const viewHelper = new ViewHelper(camera, container);
  signals.intersectionsDetected.add((intersects) => {
    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object.name === "play_video") {
        console.log(222);
        playVideo(object.parent, object.parent.userData.url);
      }
    }
  });
  //

  const box = new THREE.Box3();

  const selectionBox = new THREE.Box3Helper(box);
  selectionBox.material.depthTest = false;
  selectionBox.material.transparent = true;
  selectionBox.visible = false;
  sceneHelpers.add(selectionBox);

  let objectPositionOnDown = null;
  let objectRotationOnDown = null;
  let objectScaleOnDown = null;

  const transformControls = new TransformControls(camera, container.dom);
  transformControls.addEventListener("axis-changed", function () {
    if (editor.viewportShading !== "realistic") render();
  });
  transformControls.addEventListener("objectChange", function () {
    signals.objectChanged.dispatch(transformControls.object);
  });
  transformControls.addEventListener("mouseDown", function () {
    const object = transformControls.object;

    objectPositionOnDown = object.position.clone();
    objectRotationOnDown = object.rotation.clone();
    objectScaleOnDown = object.scale.clone();

    controls.enabled = false;
  });
  transformControls.addEventListener("mouseUp", function () {
    const object = transformControls.object;

    if (object !== undefined) {
      switch (transformControls.getMode()) {
        case "translate":
          if (!objectPositionOnDown.equals(object.position)) {
            editor.execute(
              new SetPositionCommand(
                editor,
                object,
                object.position,
                objectPositionOnDown
              )
            );
          }

          break;

        case "rotate":
          if (!objectRotationOnDown.equals(object.rotation)) {
            editor.execute(
              new SetRotationCommand(
                editor,
                object,
                object.rotation,
                objectRotationOnDown
              )
            );
          }

          break;

        case "scale":
          if (!objectScaleOnDown.equals(object.scale)) {
            editor.execute(
              new SetScaleCommand(
                editor,
                object,
                object.scale,
                objectScaleOnDown
              )
            );
          }

          break;
      }
    }

    controls.enabled = true;
  });

  sceneHelpers.add(transformControls);

  // const s = new THREE.WebGLCubeRenderTarget(512, {
  //   format: THREE.RGBAFormat,
  //   generateMipmaps: !0,
  // });
  // const cube = new THREE.CubeCamera(1, 3500, s);
  // scene.add(cube);
  // let reflector = new Reflector({ id: 1 });
  //

  const xr = new XR(editor, transformControls); // eslint-disable-line no-unused-vars

  // events

  function updateAspectRatio() {
    for (const uuid in editor.cameras) {
      const camera = editor.cameras[uuid];

      const aspect = container.dom.offsetWidth / container.dom.offsetHeight;

      if (camera.isPerspectiveCamera) {
        camera.aspect = aspect;
      } else {
        camera.left = -aspect;
        camera.right = aspect;
      }

      camera.updateProjectionMatrix();

      const cameraHelper = editor.helpers[camera.id];
      if (cameraHelper) cameraHelper.update();
    }
  }

  const onDownPosition = new THREE.Vector2();
  const onUpPosition = new THREE.Vector2();
  const onMovePosition = new THREE.Vector2();
  const onDoubleClickPosition = new THREE.Vector2();

  function getMousePosition(dom, x, y) {
    const rect = dom.getBoundingClientRect();
    return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
  }

  function handleClick() {
    if (onDownPosition.distanceTo(onUpPosition) === 0) {
      const intersects = selector.getPointerIntersects(onUpPosition, camera);
      signals.intersectionsDetected.dispatch(intersects);

      render();
    }
  }

  function onMouseDown(event) {
    // event.preventDefault();
    if (event.target !== renderer.domElement) return;

    const array = getMousePosition(container.dom, event.clientX, event.clientY);
    onDownPosition.fromArray(array);

    document.addEventListener("mouseup", onMouseUp);
  }

  function onMouseUp(event) {
    const array = getMousePosition(container.dom, event.clientX, event.clientY);
    onUpPosition.fromArray(array);

    if (event.button === 0) {
      editor.enablePoint ? onMouseLeftClick(event) : handleClick();
    } else if (event.button === 2) {
      editor.enablePoint ? onMouseRightClick(event) : editor.deselect();
    }

    if (viewControls.enabled) {
      const intersects = selector.getPointerIntersects(onUpPosition, camera);
      if (intersects.length > 0) {
        const intersect = intersects[0];
        const position = intersect.point;
        position.y = 2;
        const lookat = camera.position.lerp(position, 1 + 1e-5);
        lookat.y = 2;
        intersect.normal.y === 1 && moveTo(position, lookat);
      }
    }
    document.removeEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(event) {
    if (event.target !== renderer.domElement) return;
    const array = getMousePosition(container.dom, event.clientX, event.clientY);
    onMovePosition.fromArray(array);
    const intersects = selector.getPointerIntersectsIncludeGridHelp(
      onMovePosition,
      camera
    );
    if (intersects.length > 0) {
      const intersect = intersects[0];
      togglePlayIcon(intersect);
      if (!editor.dragModel) return;
      updateDragModel(intersects);
      if (editor.toAddMesh) {
        if (editor.dragModel.point) {
          const { x, y, z } = editor.dragModel.point;
          editor.toAddMesh.position.set(x, y, z);
        }
        if (editor.dragModel.rotation) {
          const { x, y, z } = editor.dragModel.rotation;
          editor.toAddMesh.rotation.x = x;
          editor.toAddMesh.rotation.y = y;
          editor.toAddMesh.rotation.z = z;
        }
        if (editor.enablePoint) {
          selectionBox.box.setFromObject(editor.toAddMesh);
          selectionBox.visible = true;
        }
      } else {
        selectionBox.visible = false;
      }
    }
  }

  function togglePlayIcon(intersect) {
    if (
      editor.mediaPlayer.mesh === intersect.object &&
      intersect.object.children.length > 0 &&
      intersect.object.children[0].name === "play_video" &&
      editor.videoState === "play"
    ) {
      intersect.object.children[0].visible = true;
    }
    if (
      editor.mediaPlayer.mesh != intersect.object &&
      intersect.object.name != "play_video" &&
      editor.videoState === "play"
    ) {
      editor.mediaPlayer.mesh.children[0].visible = false;
    }
  }

  function onTouchStart(event) {
    const touch = event.changedTouches[0];

    const array = getMousePosition(container.dom, touch.clientX, touch.clientY);
    onDownPosition.fromArray(array);

    document.addEventListener("touchend", onTouchEnd);
  }

  function onTouchEnd(event) {
    const touch = event.changedTouches[0];

    const array = getMousePosition(container.dom, touch.clientX, touch.clientY);
    onUpPosition.fromArray(array);
    // 和mouseUp中事件会重复触发
    // handleClick();

    document.removeEventListener("touchend", onTouchEnd);
  }

  function onDoubleClick(event) {
    const array = getMousePosition(container.dom, event.clientX, event.clientY);
    onDoubleClickPosition.fromArray(array);

    const intersects = selector.getPointerIntersects(
      onDoubleClickPosition,
      camera
    );

    if (intersects.length > 0) {
      const intersect = intersects[0];
      intersect.object.userData.guidePosition =
        editor.mouseHelper.guidePosition;
      if (intersect.object.type === "Mesh") {
        signals.objectFocused.dispatch(intersect.object);
      }
    }
  }
  function onMouseRightClick(event) {
    if (onDownPosition.distanceTo(onUpPosition) === 0) {
      editor.deselect();
      const intersectObject = selector.getIntersectObjectParentIsScene(
        onUpPosition,
        camera
      );
      if (intersectObject) {
        editor.removeObject(intersectObject);
      }
    }
  }

  function onMouseLeftClick(event) {
    const dragModel = editor.dragModel;
    if (!dragModel) return;
    const intersects = selector.getPointerIntersectsIncludeGridHelp(
      onUpPosition,
      camera
    );
    if (dragModel.modelType && dragModel.modelType == "geometry") {
      addGeometry(dragModel);
    } else if (dragModel.modelType && dragModel.modelType == "model") {
      addModel(dragModel);
    } else if (dragModel.modelType && dragModel.modelType == "hotspot") {
      addHotspot(dragModel, intersects);
    }
    editor.deselect();
  }
  function updateDragModel(intersects) {
    const dragModel = editor.dragModel;

    if (!dragModel) return;
    dragModel.rotation = { x: 0, y: 0, z: 0 };
    dragModel.point = null;
    if (intersects.length > 0) {
      const intersect = intersects[0];
      // 获取最近的同类型模型对象
      let closestObject = getCloestObject(intersects, "id", dragModel.id);
      if (dragModel.materialType) {
        closestObject = getCloestObject(
          intersects,
          "materialType",
          dragModel.materialType
        );
      }

      if (closestObject && editor.editMode === "create") {
        if (!editor.toAddMesh) {
          editor.toAddMesh = closestObject.clone();
          editor.toAddMesh.rotation.y = 0;
        }
        let closestObjectSize = new THREE.Box3()
          .setFromObject(closestObject)
          .getSize(new THREE.Vector3());
        let toAddMeshSize = new THREE.Box3()
          .setFromObject(editor.toAddMesh)
          .getSize(new THREE.Vector3());
        // console.log(
        //   "🚀 ~ onMouseLeftClick ~ closestObjectSize:",
        //   closestObjectSize
        // );
        let direction = intersect.point.clone().sub(closestObject.position);
        const { x, y, z } = direction.clone();
        if (dragModel.direction === "horizontal") {
          dragModel.point = closestObject.position.clone();
          if (Math.abs(x) > Math.abs(z)) {
            if (closestObject.position.x > intersect.point.x) {
              dragModel.point.x -= closestObjectSize.x;
            } else {
              dragModel.point.x += closestObjectSize.x;
            }
          } else {
            if (closestObject.position.z > intersect.point.z) {
              dragModel.point.z -= closestObjectSize.z;
            } else {
              dragModel.point.z += closestObjectSize.z;
            }
          }
        } else {
          // console.log("intersect", intersect);
          // console.log("closestSize", closestObjectSize);
          // console.log("point", intersect.point.clone());
          // console.log("closest", closestObject.position);
          // console.log(
          //   "direction",
          //   intersect.point.clone().sub(closestObject.position)
          // );
          // console.log(intersects, closestObject);
          if (
            intersect.normal &&
            Math.abs(Math.round(intersect.normal.y)) === 1
          ) {
            dragModel.point = closestObject.position.clone();
            dragModel.point.y +=
              closestObjectSize.y * Math.round(intersect.normal.y);
            if (closestObject.rotation.y === THREE.MathUtils.degToRad(90)) {
              dragModel.rotation = {
                x: 0,
                y: THREE.MathUtils.degToRad(90),
                z: 0,
              };
            }
          } else if (
            intersect.normal &&
            Math.abs(Math.round(intersect.normal.x)) === 1
          ) {
            dragModel.point = closestObject.position.clone();
            if (closestObject.rotation.y === THREE.MathUtils.degToRad(90)) {
              dragModel.point.z -=
                closestObjectSize.z * Math.round(intersect.normal.x);
              dragModel.rotation = {
                x: 0,
                y: THREE.MathUtils.degToRad(90),
                z: 0,
              };
            } else {
              dragModel.point.x +=
                closestObjectSize.x * Math.round(intersect.normal.x);
            }
          } else if (
            intersect.normal &&
            Math.round(Math.abs(intersect.normal.z)) === 1
          ) {
            dragModel.point = closestObject.position.clone();
            if (closestObject.rotation.y === THREE.MathUtils.degToRad(90)) {
              dragModel.point.x +=
                (toAddMeshSize.x / 2 + closestObjectSize.x / 2) *
                Math.round(intersect.normal.z);
              if (closestObject.position.z > intersect.point.z) {
                dragModel.point.z -=
                  closestObjectSize.z / 2 - toAddMeshSize.z / 2;
              } else {
                dragModel.point.z +=
                  closestObjectSize.z / 2 - toAddMeshSize.z / 2;
              }
            } else {
              dragModel.point.z +=
                (toAddMeshSize.z / 2 + closestObjectSize.z / 2) *
                Math.round(intersect.normal.z);
              if (closestObject.position.x > intersect.point.x) {
                dragModel.point.x -=
                  closestObjectSize.x / 2 - toAddMeshSize.x / 2;
              } else {
                dragModel.point.x +=
                  closestObjectSize.x / 2 - toAddMeshSize.x / 2;
              }
              dragModel.rotation = {
                x: 0,
                y: THREE.MathUtils.degToRad(90),
                z: 0,
              };
            }
          } else if (Math.abs(x) > Math.abs(z)) {
            if (closestObject.rotation.y === THREE.MathUtils.degToRad(90)) {
              direction
                .setZ(0)
                .setLength(closestObjectSize.z / 2 + closestObjectSize.x / 2);
              if (intersect.point.z > closestObject.position.z) {
                direction.z -=
                  closestObjectSize.x / 2 - closestObjectSize.z / 2;
              } else {
                direction.z +=
                  closestObjectSize.x / 2 - closestObjectSize.z / 2;
              }
            } else {
              direction.setZ(0).setLength(closestObjectSize.x);
            }
            dragModel.point = closestObject.position.clone().add(direction);
          } else {
            if (closestObject.rotation.y === THREE.MathUtils.degToRad(90)) {
              direction
                .setX(0)
                .setLength(closestObjectSize.x / 2 + closestObjectSize.z / 2);
              if (intersect.point.z > closestObject.position.z) {
                direction.z -=
                  closestObjectSize.x / 2 - closestObjectSize.z / 2;
              } else {
                direction.z +=
                  closestObjectSize.x / 2 - closestObjectSize.z / 2;
              }
              dragModel.rotation = {
                x: 0,
                y: THREE.MathUtils.degToRad(90),
                z: 0,
              };
            } else {
              direction
                .setX(0)
                .setLength(closestObjectSize.x / 2 + closestObjectSize.z / 2);
              if (intersect.point.x > closestObject.position.x) {
                direction.x +=
                  closestObjectSize.x / 2 - closestObjectSize.z / 2;
              } else {
                direction.x -=
                  closestObjectSize.x / 2 - closestObjectSize.z / 2;
              }
              dragModel.rotation = {
                x: 0,
                y: THREE.MathUtils.degToRad(90),
                z: 0,
              };
            }
            dragModel.point = closestObject.position.clone().add(direction);
          }
        }
      } else {
        dragModel.point = intersect.point.clone();
        if (!editor.toAddMesh) return;
        let toAddMeshSize = new THREE.Box3()
          .setFromObject(editor.toAddMesh)
          .getSize(new THREE.Vector3());
        // if (dragModel.direction === "vertical" && editor.toAddMesh) {
        // 吸附辅助线
        // dragModel.point.x += 0.25;
        // dragModel.point.z -= toAddMeshSize.z / 4;
        // }
        if (dragModel.direction === "horizontal" && editor.toAddMesh) {
          // 吸附辅助线
          dragModel.point.z -= (toAddMeshSize.z / 2) % 1;
        }
        if (
          dragModel.direction === "horizontal" &&
          dragModel.position === "top"
        ) {
          closestObject = getCloestObject(intersects, "direction", "vertical");
          if (closestObject) {
            let closestObjectSize = new THREE.Box3()
              .setFromObject(closestObject)
              .getSize(new THREE.Vector3());
            dragModel.point = closestObject.position.clone();
            dragModel.point.y += closestObjectSize.y;
            if (closestObject.rotation.y === THREE.MathUtils.degToRad(90)) {
              if (closestObject.position.x > intersect.point.x) {
                dragModel.point.x -= closestObjectSize.z / 2;
              } else {
                dragModel.point.x += closestObjectSize.z / 2;
              }
              if (closestObject.position.z > intersect.point.z) {
                dragModel.point.z +=
                  toAddMeshSize.z / 2 -
                  closestObjectSize.z / 2 -
                  closestObjectSize.x / 2;
              } else {
                dragModel.point.z -=
                  toAddMeshSize.z / 2 -
                  closestObjectSize.z / 2 -
                  closestObjectSize.x / 2;
              }
            } else {
              if (closestObject.position.x > intersect.point.x) {
                dragModel.point.x -= closestObjectSize.z / 2;
              } else {
                dragModel.point.x += closestObjectSize.z / 2;
              }
              if (closestObject.position.z > intersect.point.z) {
                dragModel.point.z -= toAddMeshSize.z / 2;
              } else {
                dragModel.point.z += toAddMeshSize.z / 2;
              }
            }
          }
        }
        if (dragModel.modelType === "hotspot") {
          dragModel.rotation = editor.mouseHelper.rotation.clone();
        }
      }
    }
    // console.log(dragModel.point);
  }

  function getCloestObject(intersects, key, value) {
    let closestObject = null;
    let closestDistance = Infinity;
    scene.children.forEach((otherObject) => {
      if (!otherObject.isLight) {
        const distance = intersects[0].point.distanceTo(otherObject.position);
        // 只返回同样材质的最近模型对象
        if (distance < closestDistance && otherObject.userData[key] === value) {
          closestDistance = distance;
          closestObject = otherObject;
        }
      }
    });
    return closestObject;
  }

  function onDrop(event) {
    const dragModel = editor.dragModel;
    if (!dragModel) return;
    const array = getMousePosition(container.dom, event.clientX, event.clientY);
    onUpPosition.fromArray(array);
    const intersects = selector.getPointerIntersectsIncludeGridHelp(
      onUpPosition,
      camera
    );
    if (intersects.length > 0) {
      dragModel.point = intersects[0].point;
    }
    // 如果是几何体模型拖拽
    if (dragModel.modelType && dragModel.modelType == "geometry") {
      addGeometry(dragModel);
    } else if (dragModel.modelType && dragModel.modelType == "model") {
      addModel(dragModel);
    } else if (dragModel.modelType && dragModel.modelType == "hotspot") {
      addHotspot(dragModel, intersects);
    }
  }

  function addGeometry(model) {
    const mesh = editor.createGeometry(model);
    mesh.name = model.name;
    if (model && model.point) {
      // 在控制台输出鼠标在场景中的位置
      const { x, y, z } = model.point;
      mesh.position.set(x, y, z);
    }
    editor.execute(new AddObjectCommand(editor, mesh));
  }

  function addModel(model) {
    if (editor.toAddMesh) {
      const toAddMesh = editor.toAddMesh.clone();
      if (model && model.point) {
        const { x, y, z } = model.point;
        toAddMesh.position.set(x, y, z);
      }
      if (model && model.rotation) {
        const { x, y, z } = model.rotation;
        toAddMesh.rotation.x = x;
        toAddMesh.rotation.y = y;
        toAddMesh.rotation.z = z;
      }
      if (model) {
        toAddMesh.userData = { ...model };
      }
      editor.execute(new AddObjectCommand(editor, toAddMesh));
    } else {
      editor.loader.loadModel(model);
    }
  }

  async function addHotspot(model, intersects) {
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const object = intersect.object;
      const intersectPoint = intersect.point.clone();
      if (object.userData.name?.startsWith("Flat_")) {
        const userData = {
          ...model,
          name: object.userData.name,
          id: object.name,
          objectId: object.id,
          textureCenter: new THREE.Vector2(0.5, 0.5),
          textureRotation: 0,
          position: vector3ToCoordinate(intersectPoint),
          guidePosition: vector3ToCoordinate(editor.mouseHelper.guidePosition),
          rotation: vector3ToCoordinate(editor.mouseHelper.rotation),
        };

        const texture = await new THREE.TextureLoader().loadAsync(
          model.coverUrl
        );
        texture.flipY = !1;

        // 立即使用纹理进行材质创建
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: !0,
          side: THREE.DoubleSide,
        });
        intersect.object.material = material;
        if (model.fileType === "video") {
          await addPlayBtn(object, { ...model, ...userData });
        }
        Object.assign(intersect.object.userData, userData);
        render();
      } else {
        const imageMesh = await editor.createImageMesh(model.coverUrl);
        imageMesh.name = model.name;
        imageMesh.position.set(
          intersectPoint.x,
          intersectPoint.y,
          intersectPoint.z
        );
        const rotation = editor.mouseHelper.rotation.clone();
        imageMesh.rotation.set(rotation.x, rotation.y, rotation.z);
        imageMesh.translateZ(0.01);
        const userData = {
          ...model,
          objectId: imageMesh.id,
          position: vector3ToCoordinate(imageMesh.position),
          // guidePosition: vector3ToCoordinate(editor.mouseHelper.guidePosition),
          rotation: vector3ToCoordinate(imageMesh.rotation),
          scale: vector3ToCoordinate(imageMesh.scale),
        };

        imageMesh.userData = userData;
        if (model.fileType === "video") {
          await addPlayBtn(imageMesh, model);
        }
        editor.execute(new AddObjectCommand(editor, imageMesh));
      }
    }
  }
  async function addPlayBtn(e, t) {
    if (e.children.length > 0) {
      if (t.video && 1 == t.video.playBtn)
        return void e.children[0].removeFromParent();
      if (
        ((e.children[0].visible =
          "video" == t.type || ("live" == t.type && 1 != t.liveType)),
        this.mediaPlayer.element)
      ) {
        const e = this.mediaPlayer.element;
        e.pause();
      }
    } else {
      const playTexture = await new THREE.TextureLoader().loadAsync(
        "images/icon_play.png"
      );

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.3),
        new THREE.MeshBasicMaterial({ map: playTexture, transparent: !0 })
      );
      mesh.name = "play_video";
      t.id.startsWith("Flat_") &&
        mesh.rotation.set(t.rotation.x, t.rotation.y, t.rotation.z),
        (mesh.renderOrder = 1);
      const a = e.scale.y - e.scale.x;
      mesh.scale.setY(mesh.scale.y - a);
      e.add(mesh);
      mesh.translateZ(0.051);
    }
  }

  async function playVideo(mesh, videoUrl) {
    if (editor.videoState === "play") {
      if (editor.mediaPlayer.mesh === mesh) {
        editor.video.pause();
        editor.videoState = "pause";
        if (mesh.children.length > 0) {
          const playTexture = await new THREE.TextureLoader().loadAsync(
            "images/icon_play.png"
          );
          mesh.children[0].material.map = playTexture;
          mesh.children[0].visible = true;
        }
      } else {
        const texture = await new THREE.TextureLoader().loadAsync(
          editor.mediaPlayer.mesh.userData.coverUrl
        );
        texture.flipY = !1;
        // 立即使用纹理进行材质创建
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: !0,
          side: THREE.DoubleSide,
        });
        editor.mediaPlayer.mesh.material = material;
        if (editor.mediaPlayer.mesh.children.length > 0) {
          const playTexture = await new THREE.TextureLoader().loadAsync(
            "images/icon_play.png"
          );
          editor.mediaPlayer.mesh.children[0].material.map = playTexture;
          editor.mediaPlayer.mesh.children[0].visible = true;
        }
        videoCallback(mesh, videoUrl);
      }
    } else if (editor.videoState === "pause") {
      if (editor.mediaPlayer.mesh === mesh) {
        editor.video.play();
        editor.videoState = "play";
        if (mesh.children.length > 0) {
          const pauseTexture = await new THREE.TextureLoader().loadAsync(
            "images/icon_pause.png"
          );
          mesh.children[0].material.map = pauseTexture;
          mesh.children[0].visible = false;
        }
      } else {
        const texture = await new THREE.TextureLoader().loadAsync(
          editor.mediaPlayer.mesh.userData.coverUrl
        );
        texture.flipY = !1;
        // 立即使用纹理进行材质创建
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: !0,
          side: THREE.DoubleSide,
        });
        editor.mediaPlayer.mesh.material = material;
        videoCallback(mesh, videoUrl);
      }
    } else {
      videoCallback(mesh, videoUrl);
    }
  }
  async function videoCallback(mesh, videoUrl) {
    console.log(11);
    const meshCover = mesh.material;
    editor.video.src = videoUrl;

    await editor.video.load();
    editor.mediaPlayer.mesh = mesh;
    editor.mediaPlayer.dataModel = mesh.userData;
    editor.video.play().then(() => {
      const videoTexture = new THREE.VideoTexture(editor.video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.mapping = THREE.CubeRefractionMapping;
      videoTexture.wrapS = videoTexture.wrapT = THREE.ClampToEdgeWrapping;
      videoTexture.format = THREE.RGBAFormat;
      // videoTexture.flipY = !1;
      videoTexture.needsUpdate = !0;
      videoTexture.encoding = THREE.sRGBEncoding;
      const material = new THREE.MeshBasicMaterial({
        color: 16777215,
        map: videoTexture,
      });
      mesh.material = material;
      mesh.material.needsUpdate = true;

      editor.video.addEventListener("ended", async () => {
        editor.videoState = null;
        if (mesh.children.length > 0) {
          const playTexture = await new THREE.TextureLoader().loadAsync(
            "images/icon_play.png"
          );
          mesh.children[0].material.map = playTexture;
          mesh.children[0].visible = true;

          mesh.material = meshCover;
        }
      });
      render();
    });
    editor.videoState = "play";
    if (mesh.children.length > 0) {
      const pauseTexture = await new THREE.TextureLoader().loadAsync(
        "images/icon_pause.png"
      );
      mesh.children[0].material.map = pauseTexture;
      mesh.children[0].visible = false;
    }
  }

  function vector3ToCoordinate(e) {
    return { x: Number(e.x), y: Number(e.y), z: Number(e.z) };
  }
  function coordinateToVector3(e) {
    return new THREE.Vector3(Number(e.x), Number(e.y), Number(e.z));
  }
  function onMouseOut(event) {
    if (editor.selectMode === "point") {
      selectionBox.visible = false;
    }
  }
  container.dom.addEventListener("drop", onDrop);
  container.dom.addEventListener("mousemove", onMouseMove);
  container.dom.addEventListener("mouseout", onMouseOut);
  container.dom.addEventListener("mousedown", onMouseDown);
  container.dom.addEventListener("touchstart", onTouchStart, {
    passive: false,
  });
  container.dom.addEventListener("dblclick", onDoubleClick);

  // controls need to be added *after* main logic,
  // otherwise controls.enabled doesn't work.

  const controls = new EditorControls(camera, container.dom);
  controls.addEventListener("change", function () {
    signals.cameraChanged.dispatch(camera);
    signals.refreshSidebarObject3D.dispatch(camera);
  });
  const orbitControls = new OrbitControls(camera, container.dom);
  orbitControls.enabled = false;
  const playerControls = new PlayerControls(
    camera,
    editor.worldOctree,
    container.dom
  );
  const viewControls = new CameraControls(camera, container.dom);
  viewControls.enabled = false;
  viewControls.maxDistance = 1e-5;
  viewControls.minZoom = 0.5;
  viewControls.maxZoom = 5;
  viewControls.dragToOffset = false;
  viewControls.distance = 1;
  viewControls.dampingFactor = 0.01; // 阻尼运动
  viewControls.truckSpeed = 0.01; // 拖动速度
  viewControls.mouseButtons.wheel = CameraControls.ACTION.ZOOM;
  viewControls.mouseButtons.right = CameraControls.ACTION.NONE;
  viewControls.touches.two = CameraControls.ACTION.TOUCH_ZOOM;
  viewControls.touches.three = CameraControls.ACTION.NONE;

  // 逆向控制
  viewControls.azimuthRotateSpeed = -0.5; // 方位角旋转速度。
  viewControls.polarRotateSpeed = -0.5; // 极旋转的速度。
  viewControls.saveState();
  const { position, lookAt } = {
    position: { x: 0, y: 2, z: 0 },
    lookAt: { x: 1, y: 2, z: 1 },
  };
  const lookatV3 = new THREE.Vector3(position.x, position.y, position.z);
  lookatV3.lerp(new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z), 1e-5);
  viewControls.zoomTo(0.8);
  viewControls.setLookAt(
    position.x,
    position.y,
    position.z,
    lookatV3.x,
    lookatV3.y,
    lookatV3.z,
    false
  );
  viewHelper.center = controls.center;
  function moveTo(position, lookat, duration) {
    viewControls.saveState();
    const lookatV3 = new THREE.Vector3(position.x, position.y, position.z);
    lookatV3.lerp(new THREE.Vector3(lookat.x, lookat.y, lookat.z), 1e-5);

    // 获取当前的lookAt参数
    // const fromPosition = new THREE.Vector3();
    // const fromLookAt = new THREE.Vector3();
    // viewControls.getPosition(fromPosition);
    // viewControls.getTarget(fromLookAt);

    // const lookatV32 = new THREE.Vector3(position.x, position.y, position.z);
    // lookatV32.lerp(new THREE.Vector3(lookat.x, lookat.y, lookat.z), 1e-5);

    viewControls.setLookAt(
      position.x,
      position.y,
      position.z,
      lookatV3.x,
      lookatV3.y,
      lookatV3.z,
      true
    );
  }

  function addLocalCharacter(position) {
    if (editor.localCharacter) return;
    const characterPosition = position || { x: 0, y: 0, z: 0 };
    const character = new Character(
      editor.characterModel,
      { position: characterPosition },
      !0,
      camera,
      orbitControls,
      editor.collider
    );
    editor.localCharacter = character;
    // scene.add(character.model);
    editor.addObject(character.model);
    // signals.objectAdded.dispatch(character.model);
    updateCollider(scene.children);
  }
  function removeLocalCharacter() {
    let obj = scene.getObjectById(editor.localCharacter.model.id);
    editor.removeObject(obj);
    editor.localCharacter = null;
  }
  function updateCollider(e) {
    editor.collider && editor.collider.removeFromParent();
    editor.collider = createBVHMesh(e);
    sceneHelpers.add(editor.collider);
    // viewControls.collider = editor.collider;
    // viewControls.capsule = editor.capsule;
    editor.localCharacter &&
      (editor.localCharacter.control.collider = editor.collider);
  }

  function createBVHMesh(e) {
    THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
    THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

    THREE.Mesh.prototype.raycast = acceleratedRaycast;
    const planeGeometry = new THREE.PlaneGeometry(500, 500);
    planeGeometry.rotateX(Math.PI / 2);
    planeGeometry.deleteAttribute("uv");
    planeGeometry.deleteAttribute("normal");
    const a = [planeGeometry];
    for (const t of e)
      1 != t.userData.cannon &&
        t.traverse((e) => {
          const t =
            e.name?.startsWith("pnt_") || e.parent.name?.startsWith("pnt_");
          if (
            e.isMesh &&
            e.geometry &&
            e.geometry.index &&
            e.geometry.attributes.position.isBufferAttribute &&
            e.visible &&
            e.parent.visible &&
            !t
          ) {
            e.geometry.computeBoundsTree(), e.updateMatrixWorld();
            const t = e.geometry.clone();
            t.applyMatrix4(e.matrixWorld);
            for (const e in t.attributes)
              "position" !== e && t.deleteAttribute(e);
            t.morphTargetsRelative &&
              ((t.morphTargetsRelative = !1), (t.morphAttributes = [])),
              a.push(t);
          }
        });
    const l = mergeGeometries(a, !1);
    if (l) {
      l.boundsTree = new MeshBVH(l);
      const e = new THREE.Mesh(l);
      e.visible = !1;
      const t = e.material;
      return (
        (t.wireframe = !0),
        (t.opacity = 0.5),
        (t.transparent = !0),
        (e.name = "collider"),
        e
      );
    }
  }

  // 创建效果合成器
  function createEffectComposer() {
    const { offsetHeight, offsetWidth } = container.dom;
    editor.effectComposer = new EffectComposer(
      renderer,
      new THREE.WebGLRenderTarget(offsetWidth, offsetHeight)
    );
    const renderPass = new RenderPass(scene, camera);

    editor.effectComposer.addPass(renderPass);
    editor.outlinePass = new OutlinePass(
      new THREE.Vector2(offsetWidth, offsetHeight),
      scene,
      camera
    );
    editor.outlinePass.visibleEdgeColor = new THREE.Color("#FF8C00"); // 可见边缘的颜色
    editor.outlinePass.hiddenEdgeColor = new THREE.Color("#8a90f3"); // 不可见边缘的颜色
    editor.outlinePass.edgeGlow = 2; // 发光强度
    editor.outlinePass.usePatternTexture = false; // 是否使用纹理图案
    editor.outlinePass.edgeThickness = 1; // 边缘浓度
    editor.outlinePass.edgeStrength = 4; // 边缘的强度，值越高边框范围越大
    editor.outlinePass.pulsePeriod = 0; // 闪烁频率，值越大频率越低
    editor.effectComposer.addPass(editor.outlinePass);
    let outputPass = new OutputPass();
    editor.effectComposer.addPass(outputPass);

    editor.effectFXAA = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    editor.effectFXAA.uniforms.resolution.value.set(
      1 / (offsetWidth * pixelRatio),
      1 / (offsetHeight * pixelRatio)
    );
    editor.effectFXAA.renderToScreen = true;
    editor.effectFXAA.needsSwap = true;
    editor.effectComposer.addPass(editor.effectFXAA);

    //创建辉光效果
    editor.unrealBloomPass = new UnrealBloomPass(
      new THREE.Vector2(offsetWidth, offsetHeight),
      1.5,
      0.4,
      0.85
    );
    // 辉光合成器
    const renderTargetParameters = {
      minFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
    };
    const glowRender = new THREE.WebGLRenderTarget(
      offsetWidth * 2,
      offsetHeight * 2,
      renderTargetParameters
    );
    editor.glowComposer = new EffectComposer(renderer, glowRender);
    editor.glowComposer.renderToScreen = false;
    editor.glowRenderPass = new RenderPass(scene, camera);
    editor.glowComposer.addPass(editor.glowRenderPass);
    editor.glowComposer.addPass(editor.unrealBloomPass);
    // 着色器
    editor.shaderPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: editor.glowComposer.renderTarget2.texture },
          tDiffuse: { value: null },
          glowColor: { value: null },
        },
        vertexShader,
        fragmentShader,
        defines: {},
      }),
      "baseTexture"
    );

    editor.shaderPass.material.uniforms.glowColor.value = new THREE.Color();
    editor.shaderPass.renderToScreen = true;
    editor.shaderPass.needsSwap = true;
    editor.shaderPass.name = "ShaderColor";
  }

  // signals

  signals.personChanged.add(function (person) {
    switch (person) {
      case "":
        camera.rotation.set(0, 0, 0);
        controls.enabled = true;
        playerControls.enabled = false;
        viewControls.enabled = false;
        orbitControls.enabled = false;
        removeLocalCharacter();
        break;
      case "first":
        camera.rotation.set(0, 0, 0);
        controls.enabled = false;
        playerControls.enabled = true;
        viewControls.enabled = false;
        break;
      case "third":
        camera.rotation.set(0, 0, 0);
        controls.enabled = false;
        playerControls.enabled = false;
        viewControls.enabled = false;
        orbitControls.enabled = true;
        let characterPosition = camera.position.clone().setY(0);
        camera.position.setY(1.9);
        addLocalCharacter(characterPosition);
        const i = camera.quaternion.clone();
        i.set(0, i.y, 0, i.w);
        editor.localCharacter.model.translateZ(-1.8);
        editor.localCharacter.model.position.setY(0);
        editor.localCharacter.model.quaternion.copy(i);
        orbitControls.target.set(
          editor.localCharacter.model.position.x,
          editor.localCharacter.model.position.y + 2,
          editor.localCharacter.model.position.z
        );
        orbitControls.maxDistance = 5;
        orbitControls.minDistance = 0;
        orbitControls.autoRotate = !1;
        orbitControls.enableZoom = !0;
        orbitControls.update();

        break;
      case "view":
        controls.enabled = false;
        playerControls.enabled = false;
        viewControls.enabled = true;
        break;
    }
  });

  signals.objectAdded.add(() => {
    if (editor.dragModel) {
      editor.dragModel.point = null;
      editor.dragModel.rotation = { x: 0, y: 0, z: 0 };
    }
    updateCollider(scene.children);
    // editor.toAddMesh = null;
  });
  signals.selectModeChanged.add(function (mode) {
    switch (mode) {
      case "point":
        transformControls.detach();
        selectionBox.visible = false;
        break;
      case "select":
        selectionBox.visible = false;
        break;
    }
  });
  signals.editorCleared.add(function () {
    // controls.center.set(0, 0, 0);
    pathtracer.reset();

    scene.add(editor.light);
    initPT();
    render();
  });

  signals.transformModeChanged.add(function (mode) {
    transformControls.setMode(mode);

    render();
  });

  signals.snapChanged.add(function (dist) {
    transformControls.setTranslationSnap(dist);
  });

  signals.spaceChanged.add(function (space) {
    transformControls.setSpace(space);

    render();
  });

  signals.rendererUpdated.add(function () {
    scene.traverse(function (child) {
      if (child.material !== undefined) {
        child.material.needsUpdate = true;
      }
    });

    render();
  });

  signals.rendererCreated.add(function (newRenderer) {
    if (renderer !== null) {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      pmremGenerator.dispose();

      container.dom.removeChild(renderer.domElement);
    }
    renderer = newRenderer;
    editor.renderer = renderer;

    renderer.setAnimationLoop(animate);
    renderer.setClearColor(0x000000);

    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", function (event) {
        renderer.setClearColor(event.matches ? 0x333333 : 0xaaaaaa);
        updateGridColors(
          grid1,
          grid2,
          event.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT
        );

        render();
      });

      renderer.setClearColor(mediaQuery.matches ? 0x333333 : 0xaaaaaa);
      updateGridColors(
        grid1,
        grid2,
        mediaQuery.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT
      );
    }

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.dom.offsetWidth, container.dom.offsetHeight);

    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    pathtracer = new ViewportPathtracer(renderer);
    renderer.shadowMap.Enabled = true;
    container.dom.appendChild(renderer.domElement);
    // createEffectComposer();
    // reflector.generate({ renderer, cube, camera, scene });
    // scene.add(reflector.mesh);
    render();
  });

  signals.rendererDetectKTX2Support.add(function (ktx2Loader) {
    ktx2Loader.detectSupport(renderer);
  });

  signals.sceneGraphChanged.add(function () {
    initPT();
    render();
  });

  signals.cameraChanged.add(function () {
    pathtracer.reset();

    render();
  });

  signals.objectSelected.add(function (object) {
    selectionBox.visible = false;
    transformControls.detach();

    if (
      object !== null &&
      object !== scene &&
      object !== camera &&
      !editor.enablePoint &&
      editor.enableSelect
    ) {
      box.setFromObject(object, true);
      if (box.isEmpty() === false) {
        selectionBox.visible = true;
      }
      // editor.outlinePass.selectedObjects = [object];

      transformControls.attach(object);
    }

    render();
  });

  signals.objectFocused.add(function (object) {
    if (editor.enableFocus) {
      controls.focus(object);
    }
  });

  signals.geometryChanged.add(function (object) {
    if (object !== undefined) {
      box.setFromObject(object, true);
    }

    initPT();
    render();
  });

  signals.objectChanged.add(function (object) {
    if (editor.selected === object) {
      box.setFromObject(object, true);
    }

    if (object.isPerspectiveCamera) {
      object.updateProjectionMatrix();
    }

    const helper = editor.helpers[object.id];

    if (helper !== undefined && helper.isSkeletonHelper !== true) {
      helper.update();
    }

    initPT();
    render();
  });

  signals.objectRemoved.add(function (object) {
    controls.enabled = true; // see #14180

    if (object === transformControls.object) {
      transformControls.detach();
    }
  });

  signals.materialChanged.add(function () {
    updatePTMaterials();
    render();
  });

  // background

  signals.sceneBackgroundChanged.add(function (
    backgroundType,
    backgroundColor,
    backgroundTexture,
    backgroundEquirectangularTexture,
    backgroundBlurriness,
    backgroundIntensity,
    backgroundRotation
  ) {
    scene.background = null;

    switch (backgroundType) {
      case "Color":
        scene.background = new THREE.Color(backgroundColor);

        break;

      case "Texture":
        if (backgroundTexture) {
          scene.background = backgroundTexture;
        }

        break;

      case "Equirectangular":
        if (backgroundEquirectangularTexture) {
          backgroundEquirectangularTexture.mapping =
            THREE.EquirectangularReflectionMapping;

          scene.background = backgroundEquirectangularTexture;
          scene.backgroundBlurriness = backgroundBlurriness;
          scene.backgroundIntensity = backgroundIntensity;
          scene.backgroundRotation.y =
            backgroundRotation * THREE.MathUtils.DEG2RAD;

          if (useBackgroundAsEnvironment) {
            scene.environment = scene.background;
            scene.environmentRotation.y =
              backgroundRotation * THREE.MathUtils.DEG2RAD;
          }
        }

        break;
    }

    updatePTBackground();
    render();
  });

  // environment

  let useBackgroundAsEnvironment = false;

  signals.sceneEnvironmentChanged.add(function (
    environmentType,
    environmentEquirectangularTexture
  ) {
    scene.environment = null;

    useBackgroundAsEnvironment = false;

    switch (environmentType) {
      case "Background":
        useBackgroundAsEnvironment = true;

        if (scene.background !== null && scene.background.isTexture) {
          scene.environment = scene.background;
          scene.environment.mapping = THREE.EquirectangularReflectionMapping;
          scene.environmentRotation.y = scene.backgroundRotation.y;
        }

        break;

      case "Equirectangular":
        if (environmentEquirectangularTexture) {
          scene.environment = environmentEquirectangularTexture;
          scene.environment.mapping = THREE.EquirectangularReflectionMapping;
        }

        break;

      case "ModelViewer":
        scene.environment = pmremGenerator.fromScene(
          new RoomEnvironment(),
          0.04
        ).texture;

        break;
    }

    updatePTEnvironment();
    render();
  });

  // fog

  signals.sceneFogChanged.add(function (
    fogType,
    fogColor,
    fogNear,
    fogFar,
    fogDensity
  ) {
    switch (fogType) {
      case "None":
        scene.fog = null;
        break;
      case "Fog":
        scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
        break;
      case "FogExp2":
        scene.fog = new THREE.FogExp2(fogColor, fogDensity);
        break;
    }

    render();
  });

  signals.sceneFogSettingsChanged.add(function (
    fogType,
    fogColor,
    fogNear,
    fogFar,
    fogDensity
  ) {
    switch (fogType) {
      case "Fog":
        scene.fog.color.setHex(fogColor);
        scene.fog.near = fogNear;
        scene.fog.far = fogFar;
        break;
      case "FogExp2":
        scene.fog.color.setHex(fogColor);
        scene.fog.density = fogDensity;
        break;
    }

    render();
  });

  signals.viewportCameraChanged.add(function () {
    const viewportCamera = editor.viewportCamera;

    if (
      viewportCamera.isPerspectiveCamera ||
      viewportCamera.isOrthographicCamera
    ) {
      updateAspectRatio();
    }

    // disable EditorControls when setting a user camera

    controls.enabled = viewportCamera === editor.camera;

    initPT();
    render();
  });

  signals.viewportShadingChanged.add(function () {
    const viewportShading = editor.viewportShading;

    switch (viewportShading) {
      case "realistic":
        pathtracer.init(scene, editor.viewportCamera);
        break;

      case "solid":
        scene.overrideMaterial = null;
        break;

      case "normals":
        scene.overrideMaterial = new THREE.MeshNormalMaterial();
        break;

      case "wireframe":
        scene.overrideMaterial = new THREE.MeshBasicMaterial({
          color: 0x000000,
          wireframe: true,
        });
        break;
    }

    render();
  });

  //

  signals.windowResize.add(function () {
    updateAspectRatio();

    renderer.setSize(container.dom.offsetWidth, container.dom.offsetHeight);
    pathtracer.setSize(container.dom.offsetWidth, container.dom.offsetHeight);

    render();
  });

  signals.showHelpersChanged.add(function (appearanceStates) {
    grid.visible = appearanceStates.gridHelper;
    sceneHelpers.traverse(function (object) {
      switch (object.type) {
        case "CameraHelper": {
          object.visible = appearanceStates.cameraHelpers;
          break;
        }

        case "PointLightHelper":
        case "DirectionalLightHelper":
        case "SpotLightHelper":
        case "HemisphereLightHelper": {
          object.visible = appearanceStates.lightHelpers;
          break;
        }

        case "SkeletonHelper": {
          object.visible = appearanceStates.skeletonHelpers;
          break;
        }

        default: {
          // not a helper, skip.
        }
      }
    });
    render();
  });

  signals.helperAdded.add((helper) => {
    if (helper.type === "SkeletonHelper") {
      helper.visible = false;
    }
  });
  signals.cameraResetted.add(updateAspectRatio);

  signals.showLeftbarChanged.add((showLeftbar) => {
    container.setStyle("left", [showLeftbar ? "350px" : 0]);
    signals.windowResize.dispatch();
  });
  signals.showSidebarChanged.add((showSidebar) => {
    container.setStyle("right", [showSidebar ? "350px" : 0]);
    signals.windowResize.dispatch();
  });

  // animations

  let prevActionsInUse = 0;

  const clock = new THREE.Clock(); // only used for animations
  const FPS = 30; // 指的是 30帧每秒的情况
  const singleFrameTime = 1 / FPS;
  let timeStamp = 0;
  function animate() {
    const delta = clock.getDelta();
    timeStamp += delta;

    if (timeStamp > singleFrameTime) {
      const mixer = editor.mixer;
      let needsUpdate = true;
      // Animations
      const actions = mixer.stats.actions;
      if (actions.inUse > 0 || prevActionsInUse > 0) {
        prevActionsInUse = actions.inUse;
        mixer.update(delta);
        needsUpdate = true;

        if (editor.selected !== null) {
          editor.selected.updateWorldMatrix(false, true); // avoid frame late effect for certain skinned meshes (e.g. Michelle.glb)
          selectionBox.box.setFromObject(editor.selected, true); // selection box should reflect current animation state
        }
      }

      if (editor.localCharacter) {
        editor.localCharacter.update(delta);
      }
      if (controls.enabled) {
        controls.update(delta);
      }
      if (orbitControls.enabled) {
        orbitControls.update(delta);
      }
      if (playerControls.enabled) {
        playerControls.update(delta);
      }
      if (viewControls.enabled) {
        viewControls.update(delta);
      }
      // View Helper

      if (viewHelper.animating === true) {
        viewHelper.update(delta);
        needsUpdate = true;
      }

      if (renderer.xr.isPresenting === true) {
        needsUpdate = true;
      }

      if (needsUpdate === true) render(delta);
      // if (reflector.mesh) {
      //   reflector.mesh.material.update();
      // }
      if (self.onUpdate) {
        self.onUpdate();
      }
      updatePT();
      if (viewportStats) {
        viewportStats.stats.update();
      }
      // 剩余的时间合并进入下次的判断计算 这里使用取余数是因为 当页页面失去焦点又重新获得焦点的时候，delta数值会非常大， 这个时候就需要
      timeStamp = timeStamp % singleFrameTime;
    }
  }

  function initPT() {
    if (editor.viewportShading === "realistic") {
      pathtracer.init(scene, editor.viewportCamera);
    }
  }

  function updatePTBackground() {
    if (editor.viewportShading === "realistic") {
      pathtracer.setBackground(scene.background, scene.backgroundBlurriness);
    }
  }

  function updatePTEnvironment() {
    if (editor.viewportShading === "realistic") {
      pathtracer.setEnvironment(scene.environment);
    }
  }

  function updatePTMaterials() {
    if (editor.viewportShading === "realistic") {
      pathtracer.updateMaterials();
    }
  }

  function updatePT() {
    if (editor.viewportShading === "realistic") {
      pathtracer.update();
      editor.signals.pathTracerUpdated.dispatch(pathtracer.getSamples());
    }
  }

  //

  let startTime = 0;
  let endTime = 0;

  function render() {
    startTime = performance.now();

    renderer.setViewport(
      0,
      0,
      container.dom.offsetWidth,
      container.dom.offsetHeight
    );
    renderer.render(scene, editor.viewportCamera);
    // if (editor.effectComposer) {
    //   editor.effectComposer.render();
    // }
    if (camera === editor.viewportCamera) {
      renderer.autoClear = false;
      if (grid.visible === true) renderer.render(grid, camera);
      if (sceneHelpers.visible === true) renderer.render(sceneHelpers, camera);
      if (renderer.xr.isPresenting !== true && editor.showViewHelper === true)
        viewHelper.render(renderer);
      renderer.autoClear = true;
    }

    endTime = performance.now();
    editor.signals.sceneRendered.dispatch(endTime - startTime);
  }

  return container;
}

function updateGridColors(grid1, grid2, colors) {
  grid1.material.color.setHex(colors[0]);
  grid2.material.color.setHex(colors[1]);
}

export { Viewport };
