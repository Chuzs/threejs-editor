import * as THREE from "three";
import { Octree } from "three/addons/math/Octree.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { Config } from "./Config.js";
import { Loader } from "./Loader.js";
import { History as _History } from "./History.js";
import { Strings } from "./Strings.js";
import { Storage as _Storage } from "./Storage.js";
import { Selector } from "./Selector.js";

var _DEFAULT_CAMERA = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
_DEFAULT_CAMERA.name = "Camera";

_DEFAULT_CAMERA.position.set(0, 5, 10);
_DEFAULT_CAMERA.lookAt(new THREE.Vector3());

const _DEFAULT_LIGHT = new THREE.AmbientLight(0xffffff, 2);
_DEFAULT_LIGHT.name = "AmbientLight";
window.THREE = THREE;
function Editor() {
  const Signal = signals.Signal; // eslint-disable-line no-undef

  this.signals = {
    // script

    editScript: new Signal(),

    // player

    startPlayer: new Signal(),
    stopPlayer: new Signal(),

    // xr

    enterXR: new Signal(),
    offerXR: new Signal(),
    leaveXR: new Signal(),

    // notifications

    editorCleared: new Signal(),

    savingStarted: new Signal(),
    savingFinished: new Signal(),

    transformModeChanged: new Signal(),
    snapChanged: new Signal(),
    spaceChanged: new Signal(),
    rendererCreated: new Signal(),
    rendererUpdated: new Signal(),
    rendererDetectKTX2Support: new Signal(),

    sceneBackgroundChanged: new Signal(),
    sceneEnvironmentChanged: new Signal(),
    sceneFogChanged: new Signal(),
    sceneFogSettingsChanged: new Signal(),
    sceneGraphChanged: new Signal(),
    sceneRendered: new Signal(),

    cameraChanged: new Signal(),
    cameraResetted: new Signal(),

    geometryChanged: new Signal(),

    objectSelected: new Signal(),
    objectFocused: new Signal(),

    objectAdded: new Signal(),
    objectChanged: new Signal(),
    objectRemoved: new Signal(),

    cameraAdded: new Signal(),
    cameraRemoved: new Signal(),

    helperAdded: new Signal(),
    helperRemoved: new Signal(),

    materialAdded: new Signal(),
    materialChanged: new Signal(),
    materialRemoved: new Signal(),

    scriptAdded: new Signal(),
    scriptChanged: new Signal(),
    scriptRemoved: new Signal(),

    windowResize: new Signal(),

    showHelpersChanged: new Signal(),
    refreshSidebarObject3D: new Signal(),
    refreshSidebarEnvironment: new Signal(),
    historyChanged: new Signal(),

    viewportCameraChanged: new Signal(),
    viewportShadingChanged: new Signal(),

    intersectionsDetected: new Signal(),

    pathTracerUpdated: new Signal(),
    showLeftbarChanged: new Signal(),
    showSidebarChanged: new Signal(),
    selectModeChanged: new Signal(),
    personChanged: new Signal(),
  };

  this.config = new Config();
  this.history = new _History(this);
  this.selector = new Selector(this);
  this.storage = new _Storage();
  this.strings = new Strings(this.config);
  this.video = document.getElementById("video-player");
  this.video.setAttribute("crossorigin", "anonymous");
  this.video.autoplay = !0;
  this.video.playsInline = !0;
  this.mediaPlayer = { mesh: null, dataModel: null, element: this.video };
  this.loader = new Loader(this);
  this.camera = _DEFAULT_CAMERA.clone();
  this.light = _DEFAULT_LIGHT.clone();

  this.scene = new THREE.Scene();
  this.scene.name = "Scene";
  this.htmlScene = new THREE.Scene();
  this.htmlScene.name = "HtmlScene";
  this.sceneHelpers = new THREE.Scene();
  this.sceneHelpers.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2));

  this.mouseHelper = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 2),
    new THREE.MeshNormalMaterial()
  );
  this.mouseHelper.visible = !1;
  this.sceneHelpers.add(this.mouseHelper);

  this.videoState = null;
  this.placeModel = null;
  this.renderer = null;
  this.characterModel = null;
  this.capsule = null;

  this.object = {};
  this.geometries = {};
  this.materials = {};
  this.textures = {};
  this.scripts = {};
  this.dragModel = null;
  this.worldOctree = new Octree();

  const plane = new THREE.PlaneGeometry(1000, 1000);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true, // 定义材质为透明
    opacity: 0,
  });
  const planeMesh = new THREE.Mesh(plane, material);
  planeMesh.rotation.x -= Math.PI / 2;

  this.worldOctree.fromGraphNode(planeMesh);
  this.sceneHelpers.add(planeMesh);
  this.materialsRefCounter = new Map(); // tracks how often is a material used by a 3D object

  this.mixer = new THREE.AnimationMixer(this.scene);

  this.selected = null;

  this.enableSelect = true;
  this.enableChildSelect = false;
  this.enablePoint = false;
  this.enableFocus = true;
  this.showViewportToolbar = true;
  this.showViewportInfo = true;
  this.showViewportControls = true;
  this.showViewHelper = true;
  this.showLeftbar = true;
  this.showSidebar = true;
  this.firstPerson = false;
  this.toAddMesh = null;
  this.editMode = "create";
  this.selectMode = null;
  this.effectComposer = null;
  this.outlinePass = null;
  this.unrealBloomPass = null;
  this.glowComposer = null;
  this.shaderPass = null;
  this.helpers = {};

  this.cameras = {};

  this.viewportCamera = this.camera;
  this.viewportShading = "default";

  this.addCamera(this.camera);
  console.log(
    "[" + /\d\d\:\d\d\:\d\d/.exec(new Date())[0] + "]",
    "editor.js loaded."
  );
}

Editor.prototype = {
  setScene: function (scene) {
    this.scene.uuid = scene.uuid;
    this.scene.name = scene.name;

    this.scene.background = scene.background;
    this.scene.environment = scene.environment;
    this.scene.fog = scene.fog;
    this.scene.backgroundBlurriness = scene.backgroundBlurriness;
    this.scene.backgroundIntensity = scene.backgroundIntensity;

    this.scene.userData = JSON.parse(JSON.stringify(scene.userData));

    // avoid render per object

    this.signals.sceneGraphChanged.active = false;

    while (scene.children.length > 0) {
      this.addObject(scene.children[0]);
    }

    this.signals.sceneGraphChanged.active = true;
    this.signals.sceneGraphChanged.dispatch();
  },
  setHtmlScene: function (htmlScene) {
    this.htmlScene.uuid = htmlScene.uuid;
    this.htmlScene.name = htmlScene.name;

    this.htmlScene.background = htmlScene.background;
    this.htmlScene.environment = htmlScene.environment;
    this.htmlScene.fog = htmlScene.fog;
    this.htmlScene.backgroundBlurriness = htmlScene.backgroundBlurriness;
    this.htmlScene.backgroundIntensity = htmlScene.backgroundIntensity;

    this.htmlScene.userData = JSON.parse(JSON.stringify(htmlScene.userData));

    // avoid render per object

    this.signals.sceneGraphChanged.active = false;

    htmlScene.children.forEach((element) => {
      this.htmlScene.add(this.createHtml(element.userData));
    });

    this.signals.sceneGraphChanged.active = true;
    this.signals.sceneGraphChanged.dispatch();
  },

  //

  addObject: function (object, parent, index) {
    var scope = this;
    console.log("🚀 ~ object:", object, parent, index);

    object.traverse(function (child) {
      if (child.geometry !== undefined) scope.addGeometry(child.geometry);
      if (child.material !== undefined) scope.addMaterial(child.material);

      scope.addCamera(child);
      scope.addHelper(child);
    });

    if (parent === undefined || parent === null) {
      this.scene.add(object);
      console.log(this.scene.children.length);

      // let n = performance.now();
      // this.worldOctree.fromGraphNode(object);
      // console.log(performance.now() - n);
    } else {
      parent.children.splice(index, 0, object);
      object.parent = parent;
    }

    this.signals.objectAdded.dispatch(object);
    this.signals.sceneGraphChanged.dispatch();
  },
  addObjectVcs: function (object, parent, index) {
    if (parent === undefined) {
      this.scene.add(object);
    } else {
      parent.children.splice(index, 0, object);
      object.parent = parent;
    }
  },
  moveObject: function (object, parent, before) {
    if (parent === undefined) {
      parent = this.scene;
    }

    parent.add(object);

    // sort children array

    if (before !== undefined) {
      var index = parent.children.indexOf(before);
      parent.children.splice(index, 0, object);
      parent.children.pop();
    }

    this.signals.sceneGraphChanged.dispatch();
  },

  nameObject: function (object, name) {
    object.name = name;
    this.signals.sceneGraphChanged.dispatch();
  },

  removeObject: function (object) {
    if (object.parent === null) return; // avoid deleting the camera or scene

    var scope = this;

    object.traverse(function (child) {
      scope.removeCamera(child);
      scope.removeHelper(child);

      if (child.material !== undefined) scope.removeMaterial(child.material);
    });

    object.parent.remove(object);

    this.signals.objectRemoved.dispatch(object);
    this.signals.sceneGraphChanged.dispatch();
  },

  addGeometry: function (geometry) {
    this.geometries[geometry.uuid] = geometry;
  },

  setGeometryName: function (geometry, name) {
    geometry.name = name;
    this.signals.sceneGraphChanged.dispatch();
  },

  addMaterial: function (material) {
    if (Array.isArray(material)) {
      for (var i = 0, l = material.length; i < l; i++) {
        this.addMaterialToRefCounter(material[i]);
      }
    } else {
      this.addMaterialToRefCounter(material);
    }

    this.signals.materialAdded.dispatch();
  },

  addMaterialToRefCounter: function (material) {
    var materialsRefCounter = this.materialsRefCounter;

    var count = materialsRefCounter.get(material);

    if (count === undefined) {
      materialsRefCounter.set(material, 1);
      this.materials[material.uuid] = material;
    } else {
      count++;
      materialsRefCounter.set(material, count);
    }
  },

  removeMaterial: function (material) {
    if (Array.isArray(material)) {
      for (var i = 0, l = material.length; i < l; i++) {
        this.removeMaterialFromRefCounter(material[i]);
      }
    } else {
      this.removeMaterialFromRefCounter(material);
    }

    this.signals.materialRemoved.dispatch();
  },

  removeMaterialFromRefCounter: function (material) {
    var materialsRefCounter = this.materialsRefCounter;

    var count = materialsRefCounter.get(material);
    count--;

    if (count === 0) {
      materialsRefCounter.delete(material);
      delete this.materials[material.uuid];
    } else {
      materialsRefCounter.set(material, count);
    }
  },

  getMaterialById: function (id) {
    var material;
    var materials = Object.values(this.materials);

    for (var i = 0; i < materials.length; i++) {
      if (materials[i].id === id) {
        material = materials[i];
        break;
      }
    }

    return material;
  },

  setMaterialName: function (material, name) {
    material.name = name;
    this.signals.sceneGraphChanged.dispatch();
  },

  addTexture: function (texture) {
    this.textures[texture.uuid] = texture;
  },

  //

  addCamera: function (camera) {
    if (camera.isCamera) {
      this.cameras[camera.uuid] = camera;

      this.signals.cameraAdded.dispatch(camera);
    }
  },

  removeCamera: function (camera) {
    if (this.cameras[camera.uuid] !== undefined) {
      delete this.cameras[camera.uuid];

      this.signals.cameraRemoved.dispatch(camera);
    }
  },

  //

  addHelper: (function () {
    var geometry = new THREE.SphereGeometry(2, 4, 2);
    var material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      visible: false,
    });

    return function (object, helper) {
      if (helper === undefined) {
        if (object.isCamera) {
          helper = new THREE.CameraHelper(object);
        } else if (object.isPointLight) {
          helper = new THREE.PointLightHelper(object, 1);
        } else if (object.isDirectionalLight) {
          helper = new THREE.DirectionalLightHelper(object, 1);
        } else if (object.isSpotLight) {
          helper = new THREE.SpotLightHelper(object);
        } else if (object.isHemisphereLight) {
          helper = new THREE.HemisphereLightHelper(object, 1);
        } else if (object.isSkinnedMesh) {
          helper = new THREE.SkeletonHelper(object.skeleton.bones[0]);
        } else if (
          object.isBone === true &&
          object.parent &&
          object.parent.isBone !== true
        ) {
          helper = new THREE.SkeletonHelper(object);
        } else {
          // no helper for this object type
          return;
        }

        const picker = new THREE.Mesh(geometry, material);
        picker.name = "picker";
        picker.userData.object = object;
        helper.add(picker);
      }

      this.sceneHelpers.add(helper);
      this.helpers[object.id] = helper;

      this.signals.helperAdded.dispatch(helper);
    };
  })(),

  removeHelper: function (object) {
    if (this.helpers[object.id] !== undefined) {
      var helper = this.helpers[object.id];
      helper.parent.remove(helper);

      delete this.helpers[object.id];

      this.signals.helperRemoved.dispatch(helper);
    }
  },

  //

  addScript: function (object, script) {
    if (this.scripts[object.uuid] === undefined) {
      this.scripts[object.uuid] = [];
    }

    this.scripts[object.uuid].push(script);

    this.signals.scriptAdded.dispatch(script);
  },

  removeScript: function (object, script) {
    if (this.scripts[object.uuid] === undefined) return;

    var index = this.scripts[object.uuid].indexOf(script);

    if (index !== -1) {
      this.scripts[object.uuid].splice(index, 1);
    }

    this.signals.scriptRemoved.dispatch(script);
  },

  getObjectMaterial: function (object, slot) {
    var material = object.material;

    if (Array.isArray(material) && slot !== undefined) {
      material = material[slot];
    }

    return material;
  },

  setObjectMaterial: function (object, slot, newMaterial) {
    if (Array.isArray(object.material) && slot !== undefined) {
      object.material[slot] = newMaterial;
    } else {
      object.material = newMaterial;
    }
  },

  setViewportCamera: function (uuid) {
    this.viewportCamera = this.cameras[uuid];
    this.signals.viewportCameraChanged.dispatch();
  },

  setViewportShading: function (value) {
    this.viewportShading = value;
    this.signals.viewportShadingChanged.dispatch();
  },

  //

  select: function (object) {
    this.selector.select(object);
  },

  selectById: function (id) {
    if (id === this.camera.id) {
      this.select(this.camera);
      return;
    }
    if (this.scene.getObjectById(id)) {
      this.select(this.scene.getObjectById(id));
    } else if (this.htmlScene.getObjectById(id)) {
      this.select(this.htmlScene.getObjectById(id));
    }
  },

  selectByUuid: function (uuid) {
    var scope = this;

    this.scene.traverse(function (child) {
      if (child.uuid === uuid) {
        scope.select(child);
      }
    });
  },

  deselect: function () {
    this.selector.deselect();
  },

  focus: function (object) {
    if (object !== undefined) {
      this.signals.objectFocused.dispatch(object);
    }
  },

  focusById: function (id) {
    this.focus(this.scene.getObjectById(id));
  },
  resetCamera() {
    this.camera.copy(_DEFAULT_CAMERA);
    this.signals.cameraResetted.dispatch();
  },
  clear: function () {
    this.history.clear();
    this.storage.clear();

    this.camera.copy(_DEFAULT_CAMERA);
    this.signals.cameraResetted.dispatch();

    this.scene.name = "Scene";
    this.scene.userData = {};
    this.scene.background = null;
    this.scene.environment = null;
    this.scene.fog = null;

    var objects = this.scene.children;

    this.signals.sceneGraphChanged.active = false;

    while (objects.length > 0) {
      this.removeObject(objects[0]);
    }

    this.signals.sceneGraphChanged.active = true;

    this.geometries = {};
    this.materials = {};
    this.textures = {};
    this.scripts = {};

    this.materialsRefCounter.clear();

    this.animations = {};
    this.mixer.stopAllAction();

    this.deselect();

    this.signals.editorCleared.dispatch();
  },

  //

  fromJSON: async function (json) {
    var loader = new THREE.ObjectLoader();
    var camera = await loader.parseAsync(json.camera);

    const existingUuid = this.camera.uuid;
    const incomingUuid = camera.uuid;

    // copy all properties, including uuid
    this.camera.copy(camera);
    this.camera.uuid = incomingUuid;

    delete this.cameras[existingUuid]; // remove old entry [existingUuid, this.camera]
    this.cameras[incomingUuid] = this.camera; // add new entry [incomingUuid, this.camera]

    this.signals.cameraResetted.dispatch();

    this.history.fromJSON(json.history);
    this.scripts = json.scripts;
    // if (json.scene.geometries.length > 0) {
    //   json.scene.geometries = json.scene.geometries.filter(
    //     (item) => item.type != "TextGeometry"
    //   );
    // }

    if (json.scene) {
      this.setScene(await loader.parseAsync(json.scene));
    }
    if (json.htmlScene) {
      this.setHtmlScene(await loader.parseAsync(json.htmlScene));
    }

    if (json.environment === "ModelViewer") {
      this.signals.sceneEnvironmentChanged.dispatch(json.environment);
      this.signals.refreshSidebarEnvironment.dispatch();
    }
  },
  fromJSONVcs: async function (json) {
    var loader = new THREE.ObjectLoader();
    var camera = await loader.parseAsync(json.camera);

    const existingUuid = this.camera.uuid;
    const incomingUuid = camera.uuid;

    // copy all properties, including uuid
    this.camera.copy(camera);
    this.camera.uuid = incomingUuid;

    delete this.cameras[existingUuid]; // remove old entry [existingUuid, this.camera]
    this.cameras[incomingUuid] = this.camera; // add new entry [incomingUuid, this.camera]

    this.signals.cameraResetted.dispatch();

    this.history.fromJSON(json.history);
    this.scripts = json.scripts;
  },
  toJSON: function () {
    // scripts clean up

    var scene = this.scene;
    var scripts = this.scripts;

    for (var key in scripts) {
      var script = scripts[key];

      if (
        script.length === 0 ||
        scene.getObjectByProperty("uuid", key) === undefined
      ) {
        delete scripts[key];
      }
    }

    // honor modelviewer environment

    let environment = null;

    if (
      this.scene.environment !== null &&
      this.scene.environment.isRenderTargetTexture === true
    ) {
      environment = "ModelViewer";
    }

    //

    return {
      metadata: {},
      project: {
        shadows: this.config.getKey("project/renderer/shadows"),
        shadowType: this.config.getKey("project/renderer/shadowType"),
        toneMapping: this.config.getKey("project/renderer/toneMapping"),
        toneMappingExposure: this.config.getKey(
          "project/renderer/toneMappingExposure"
        ),
      },
      camera: this.viewportCamera.toJSON(),
      scene: this.scene.toJSON(),
      htmlScene: this.htmlScene.toJSON(),
      scripts: this.scripts,
      history: this.history.toJSON(),
      environment: environment,
    };
  },
  toJSONWithoutScene: function () {
    // scripts clean up

    var scene = this.scene;
    var scripts = this.scripts;

    for (var key in scripts) {
      var script = scripts[key];

      if (
        script.length === 0 ||
        scene.getObjectByProperty("uuid", key) === undefined
      ) {
        delete scripts[key];
      }
    }

    // honor modelviewer environment

    let environment = null;

    if (
      this.scene.environment !== null &&
      this.scene.environment.isRenderTargetTexture === true
    ) {
      environment = "ModelViewer";
    }

    //

    return {
      metadata: {},
      project: {
        shadows: this.config.getKey("project/renderer/shadows"),
        shadowType: this.config.getKey("project/renderer/shadowType"),
        toneMapping: this.config.getKey("project/renderer/toneMapping"),
        toneMappingExposure: this.config.getKey(
          "project/renderer/toneMappingExposure"
        ),
      },
      htmlScene: this.htmlScene.toJSON(),
      camera: this.viewportCamera.toJSON(),
      scripts: this.scripts,
      history: this.history.toJSON(),
      environment: environment,
    };
  },
  getAnimations: function () {
    const animations = [];

    this.scene.traverse(function (object) {
      animations.push(...object.animations);
    });

    return animations;
  },
  objectByUuid: function (uuid) {
    return this.scene.getObjectByProperty("uuid", uuid, true);
  },

  execute: function (cmd, optionalName) {
    this.history.execute(cmd, optionalName);
  },

  undo: function () {
    this.history.undo();
  },

  redo: function () {
    this.history.redo();
  },
  createImageMesh: async function (url) {
    const texture = await new THREE.TextureLoader().loadAsync(url);
    texture.flipY = !1;
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
  },
  createGeometry: function (model) {
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
    return mesh;
  },
  createText: async function (text) {
    let fontName = "FZKai-Z03S", // helvetiker, optimer, gentilis, droid sans, droid serif
      fontWeight = "regular"; // normal bold
    let font = undefined;
    const loader = new FontLoader();
    font = await loader.loadAsync(
      "../examples/fonts/" + fontName + "_" + fontWeight + ".typeface.json"
    );
    const textGeo = new TextGeometry(text, {
      font,
      size: 1,
      depth: 0.1,
      curveSegments: 2,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelEnabled: true,
    });

    textGeo.computeBoundingBox();
    const materials = [
      new THREE.MeshPhysicalMaterial({ color: 0xff00ff }), // front
      new THREE.MeshPhysicalMaterial({ color: 0xff00ff }), // side
    ];
    const textMesh = new THREE.Mesh(textGeo, materials);
    textMesh.name = text;
    textMesh.rotation.x = 0;
    textMesh.rotation.y = Math.PI * 2;

    return textMesh;
  },
  createHtml: function (model) {
    const { width, height, scale, url, position, name, rotation } = model;
    let iframe = document.createElement("iframe");
    iframe.src = url || "http://127.0.0.1:8080";
    iframe.style.height = height;
    iframe.style.width = width;
    iframe.style.border = "none";
    let domEle = document.createElement("div");
    domEle.appendChild(iframe);
    let domEleObj = new CSS3DObject(domEle);
    domEleObj.name = name;
    domEleObj.scale.set(scale.x, scale.y, scale.z);
    if (position) {
      domEleObj.position.set(position.x, position.y, position.z);
    }
    if (rotation) {
      domEleObj.rotation.set(rotation.x, rotation.y, rotation.z);
    }
    domEleObj.userData = { ...model };
    domEleObj.url = iframe.src;
    domEleObj.width = parseFloat(width) / 100;
    domEleObj.height = parseFloat(height) / 100;
    return domEleObj;
  },
  utils: {
    save: save,
    saveArrayBuffer: saveArrayBuffer,
    saveString: saveString,
    formatNumber: formatNumber,
  },
};

const link = document.createElement("a");

function save(blob, filename) {
  if (link.href) {
    URL.revokeObjectURL(link.href);
  }

  link.href = URL.createObjectURL(blob);
  link.download = filename || "data.json";
  link.dispatchEvent(new MouseEvent("click"));
}

function saveArrayBuffer(buffer, filename) {
  save(new Blob([buffer], { type: "application/octet-stream" }), filename);
}

function saveString(text, filename) {
  save(new Blob([text], { type: "text/plain" }), filename);
}

function formatNumber(number) {
  return new Intl.NumberFormat("en-us", { useGrouping: true }).format(number);
}

export { Editor };
