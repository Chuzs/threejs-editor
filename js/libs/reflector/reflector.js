import MeshReflectorMaterial from "./MeshReflectorMaterial.js";
const coordinateToVector3 = (coordinate) => {
  return new THREE.Vector3(coordinate.x, coordinate.y, coordinate.z);
};

class Reflector {
  constructor(args) {
    this.id = args.id || Date.now().toString(16);
    this.position = args.position || { x: 0, y: 0, z: 0 };
    this.title = args.title || "";
    this.type = "reflector";
    // 1 反射面 0、反射球
    this.reflectType = args.reflectType || 1;
    this.objectId = undefined;

    if (this.reflectType == 0) {
      this.boundary = args.boundary || 1;
      this.max = args.max || { x: 10, y: 10, z: 10 };
      this.min = args.min || { x: -1, y: -1, z: -1 };
      this.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 30, 30),
        new THREE.MeshBasicMaterial()
      );
      const box = new THREE.Box3(
        coordinateToVector3(this.min),
        coordinateToVector3(this.max)
      );
      this.helper = new THREE.Box3Helper(box);
      this.mesh.add(this.helper);

      this.obb = new THREE.OBB();
    } else {
      // 0圆形 、1方形 plane
      this.shape = args.shape || 1;
      this.radius = args.radius || 20;
      this.brightness = args.brightness || 10;
      this.ambiguity = args.ambiguity || 0;
      this.resolution = args.penblv || 1;
      this.rectangle = args.rectangle || { x: 10, y: 10 };
      let geo = this.createGeo();
      const material = new THREE.MeshBasicMaterial();
      this.mesh = new THREE.Mesh(geo, material);
      this.mesh.rotateX(-Math.PI / 2);
    }
  }
  generate = ({ renderer, cube, camera, scene }) => {
    const pos = this.position;
    this.mesh.position.set(pos.x, pos.y, pos.z);
    if (this.reflectType == 0) {
      cube.position.set(pos.x, pos.y, pos.z);
      cube.update(renderer, scene);

      let texture = cube.renderTarget.texture;
      this.mesh.material.envMap = texture;
      this.mesh.updateMatrixWorld(true);
      this.updateEnvMap(scene, texture);
    } else {
      // 计算box size
      // const ambiguity = this.ambiguity || 200
      const ambiguity = this.ambiguity;
      const rate = ambiguity > 0 ? 11 : 0;
      let fadingReflectorOptions = {
        // 50 - 250
        blur: [(rate - ambiguity) * 100, (rate - ambiguity) * 100],
        mixStrength: this.brightness * 10,
        resolution: 128 * Math.pow(2, this.resolution), // 材質圖的解析度
        mixBlur: 1,
        roughness: 1,
        minDepthThreshold: 0.5, // 從多遠的地方開始淡出
        maxDepthThreshold: 2, // 到多遠的地方會淡出到沒畫面
        depthScale: 1,
        metalness: 0,
        // envMapIntensity = 0.2
      };
      const refelctMat = new MeshReflectorMaterial(
        renderer,
        camera,
        scene,
        this.mesh,
        fadingReflectorOptions
      );
      refelctMat.opacity = 0.15;
      // refelctMat.blending = THREE.CustomBlending;
      refelctMat.blending = THREE.AdditiveBlending;
      refelctMat.blendSrc = THREE.SrcAlphaFactor;
      refelctMat.envMapIntensity = 0;
      this.mesh.material = refelctMat;
    }

    return this.mesh;
  };
  createGeo = () => {
    let geo;
    if (this.shape == 1) {
      geo = new THREE.PlaneGeometry(this.rectangle.x, this.rectangle.y);
    } else {
      geo = new THREE.CircleGeometry(this.radius, 50);
    }
    return geo;
  };
  updateGeo = () => {
    const geo = this.createGeo();
    this.mesh.geometry = geo;
  };
  updateRefProps = ({ renderer, cube, camera, scene }) => {
    // this.mesh.material.reflectorProps.mixStrength = this.brightness * 10
    // this.mesh.material.reflectorProps.blur = [this.ambiguity * 100, this.ambiguity * 100]
    // this.mesh.material.reflectorProps.hasBlur = this.ambiguity > 0
    // if (this.ambiguity) {
    //   this.mesh.material.kawaseBlurPass.setSize(this.ambiguity * 100, this.ambiguity * 100)
    // } else {
    // }
    // this.mesh.material.needsUpdate = true
    this.mesh.material.dispose();
    this.generate({ renderer, cube, camera, scene });
  };
  updateEnvMap = (scene, texture) => {
    let envMapSize = scene.children[0].size.clone();
    const envPosition = coordinateToVector3(this.mesh.position);
    if (this.helper) {
      this.helper.box = new THREE.Box3(
        coordinateToVector3(this.min),
        coordinateToVector3(this.max)
      );
    }

    const max = Math.max(envMapSize.x, envMapSize.z);
    envMapSize.x = max;
    envMapSize.z = max;

    this.mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.mesh);
    this.obb.halfSize
      .copy(box.getSize(new THREE.Vector3()))
      .multiplyScalar(0.5);
    this.obb.center.copy(box.getCenter(new THREE.Vector3()));

    scene.traverse((m) => {
      if (
        m.obb &&
        m.isMesh &&
        m.material.metalness > 0 &&
        m.material.roughness < 1 &&
        !m.material.transmission
      ) {
        const inclued = this.obb.intersectsOBB(m.obb);
        if (inclued) {
          m.material.envMap = texture;
          if (this.boundary) {
            m.material.onBeforeCompile = (shader) =>
              useBoxProjectedEnvMap(shader, envPosition, envMapSize, true);
          } else {
            m.material.onBeforeCompile = function () {};
          }
        } else {
          m.material.envMap = null;
          m.material.onBeforeCompile = function () {};
        }
      }
    });
  };
  dispose = (scene) => {
    if (this.reflectType == 0) {
      scene.traverse((m) => {
        if (
          m.obb &&
          m.isMesh &&
          m.material.metalness > 0 &&
          m.material.roughness < 1 &&
          m.material.transmission == false
        ) {
          const inclued = this.obb.intersectsOBB(m.obb);
          if (inclued) {
            m.material.envMap = null;
            m.material.onBeforeCompile = function () {};
          }
        }
      });
    }
  };
  update = (renderer, camera, scene, pos) => {
    if (this.reflectType == 0) {
      camera.position.set(pos.x, pos.y, pos.z);

      scene.traverse((m) => {
        if (m.isMesh && m.material.envMap == camera.renderTarget.texture) {
          m.material.envMap = null;
        }
      });

      this.helper.visible = this.boundary == 1;
      this.mesh.visible = false;
      camera.update(renderer, scene);
      const texture = camera.renderTarget.texture;
      this.mesh.visible = true;
      this.mesh.material.envMap = texture;
      this.updateEnvMap(scene, texture);
    }
  };
}
export default Reflector;
