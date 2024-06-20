import * as THREE from "three";

import { TransformControls } from "three/addons/controls/TransformControls.js";

import { UIPanel } from "./libs/ui.js";

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

function Viewport(editor) {
  const selector = editor.selector;
  const signals = editor.signals;

  const container = new UIPanel();
  container.setId("viewport");
  container.setPosition("absolute");

  container.add(new ViewportControls(editor));
  container.add(new ViewportInfo(editor));
  if (editor.showViewportToolbar) {
    container.add(new ViewportToolbar(editor));
  }

  //

  let renderer = null;
  let pmremGenerator = null;
  let pathtracer = null;

  const camera = editor.camera;
  const scene = editor.scene;
  const sceneHelpers = editor.sceneHelpers;

  // helpers

  const GRID_COLORS_LIGHT = [0x999999, 0x777777];
  const GRID_COLORS_DARK = [0x555555, 0x888888];

  const grid = new THREE.Group();

  const grid1 = new THREE.GridHelper(30, 30);
  grid1.material.color.setHex(GRID_COLORS_LIGHT[0]);
  grid1.material.vertexColors = false;
  grid.add(grid1);

  const grid2 = new THREE.GridHelper(30, 6);
  grid2.material.color.setHex(GRID_COLORS_LIGHT[1]);
  grid2.material.vertexColors = false;
  grid.add(grid2);
  sceneHelpers.add(grid);

  const viewHelper = new ViewHelper(camera, container);
  signals.intersectionsDetected.add((intersects) => {
    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object.name === "play_video") {
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
    let a = selector.getDropPointerIntersects(onUpPosition, camera);
    console.log(a);
    // selector.select(a[0]);
    if (onDownPosition.distanceTo(onUpPosition) === 0) {
      const intersects = selector.getPointerIntersects(onUpPosition, camera);
      console.log(intersects);
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
    handleClick();
    onClick(event);
    document.removeEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(event) {
    if (event.target !== renderer.domElement) return;
    const array = getMousePosition(container.dom, event.clientX, event.clientY);
    onMovePosition.fromArray(array);
    // console.log(editor.dragModel);
    const intersects = selector.getPointerIntersects(onMovePosition, camera);
    if (intersects.length > 0) {
      const intersect = intersects[0];
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

    handleClick();

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
      signals.objectFocused.dispatch(intersect.object);
    }
  }

  async function onClick(event) {
    const dragModel = editor.dragModel;
    const array = getMousePosition(container.dom, event.clientX, event.clientY);
    onUpPosition.fromArray(array);
    const intersects = selector.getDropPointerIntersects(onUpPosition, camera);
    if (intersects.length > 0) {
      let closestObject = null;
      let closestDistance = Infinity;
      scene.children.forEach((otherObject) => {
        const distance = intersects[0].object.position.distanceTo(
          otherObject.position
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestObject = otherObject;
        }
      });

      if (closestObject) {
        // 这里可以根据需要调整吸附的距离
        const snapDistance = 1; // 吸附距离
        const direction = intersects[0].object.position
          .clone()
          .sub(closestObject.position)
          .setLength(snapDistance);
        dragModel.point = closestObject.position.clone().add(direction);
        console.log(closestObject.position.clone().add(direction));
      } else {
        dragModel.point = intersects[0].point;
      }
    }
    // 如果是几何体模型拖拽
    if (dragModel.modelType && dragModel.modelType == "geometry") {
      await addGeometry(dragModel);
    } else if (dragModel.modelType && dragModel.modelType == "model") {
      await addModel(dragModel);
    } else if (dragModel.modelType && dragModel.modelType == "hotspot") {
      addHotspot(dragModel, intersects);
    }
    editor.deselect();
  }

  function onDrop(event) {
    const dragModel = editor.dragModel;
    const array = getMousePosition(container.dom, event.clientX, event.clientY);
    onUpPosition.fromArray(array);
    const intersects = selector.getPointerIntersects(onUpPosition, camera);
    if (intersects.length > 0) {
      console.log(intersects[0].point);
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
    const { type } = model;
    // 不需要赋值的key
    const notGeometrykey = ["id", "name", "modelType", "type"];
    const geometryData = Object.keys(model)
      .filter((key) => !notGeometrykey.includes(key))
      .map((v) => model[v]);
    // 创建几何体
    const geometry = new THREE[type](...geometryData);
    const colors = [
      "#FF4500",
      "#90EE90",
      "#00CED1",
      "#1E90FF",
      "#C71585",
      "#FF4500",
      "#FAD400",
      "#1F93FF",
      "#90F090",
      "#C71585",
    ];
    // 随机颜色
    const meshColor = colors[Math.ceil(Math.random() * 10)];
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(meshColor),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = model.name;
    if (model && model.point) {
      // 在控制台输出鼠标在场景中的位置
      const { x, y, z } = model.point;
      mesh.position.set(x, y, z);
    }
    editor.execute(new AddObjectCommand(editor, mesh));
  }

  function addModel(model) {
    editor.loader.loadModel(model);
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
        const imageMesh = await createImageMesh(model.coverUrl);
        imageMesh.position.set(
          intersectPoint.x,
          intersectPoint.y,
          intersectPoint.z
        );
        const roation = editor.mouseHelper.rotation.clone();
        imageMesh.rotation.set(roation.x, roation.y, roation.z);
        imageMesh.translateZ(0.01);
        const userData = {
          ...model,
          objectId: imageMesh.id,
          position: vector3ToCoordinate(imageMesh.position),
          guidePosition: vector3ToCoordinate(editor.mouseHelper.guidePosition),
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
  async function createImageMesh(url) {
    const texture = await new THREE.TextureLoader().loadAsync(url);
    const data = texture.source.data;
    const aspectRatio = data.width / data.height;
    let plane = new THREE.PlaneGeometry(aspectRatio, 1);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: !0,
      side: THREE.DoubleSide,
    });
    material.toneMapped = !1;
    return new THREE.Mesh(plane, material);
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
      videoTexture.flipY = !1;
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
  container.dom.addEventListener("drop", onDrop);
  container.dom.addEventListener("mousemove", onMouseMove);
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
  viewHelper.center = controls.center;

  // signals

  signals.editorCleared.add(function () {
    controls.center.set(0, 0, 0);
    pathtracer.reset();

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

    renderer.setAnimationLoop(animate);
    renderer.setClearColor(0xaaaaaa);

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

    container.dom.appendChild(renderer.domElement);

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

    if (object !== null && object !== scene && object !== camera) {
      box.setFromObject(object, true);

      if (box.isEmpty() === false) {
        selectionBox.visible = true;
      }

      transformControls.attach(object);
    }

    render();
  });

  signals.objectFocused.add(function (object) {
    controls.focus(object);
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

  signals.cameraResetted.add(updateAspectRatio);

  signals.showLeftbarChange.add((showLeftbar) => {
    container.setStyle("left", [showLeftbar ? "350px" : 0]);
    signals.windowResize.dispatch();
  });
  signals.showSidebarChange.add((showSidebar) => {
    container.setStyle("right", [showSidebar ? "350px" : 0]);
    signals.windowResize.dispatch();
  });

  // animations

  let prevActionsInUse = 0;

  const clock = new THREE.Clock(); // only used for animations

  function animate() {
    const mixer = editor.mixer;
    const delta = clock.getDelta();

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

    // View Helper

    if (viewHelper.animating === true) {
      viewHelper.update(delta);
      needsUpdate = true;
    }

    if (renderer.xr.isPresenting === true) {
      needsUpdate = true;
    }
    if (controls.enabled) {
      controls.update(delta);
    }
    if (needsUpdate === true) render();

    updatePT();
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

    if (camera === editor.viewportCamera) {
      renderer.autoClear = false;
      if (grid.visible === true) renderer.render(grid, camera);
      if (sceneHelpers.visible === true) renderer.render(sceneHelpers, camera);
      if (renderer.xr.isPresenting !== true) viewHelper.render(renderer);
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
