import * as THREE from "three";
import { RoundedBoxGeometry } from "../examples/jsm/geometries/RoundedBoxGeometry.js";
import * as SkeletonUtils from "../examples/jsm/utils/SkeletonUtils.js";

import { CharacterController } from "./CharacterController.js";
class CharacterTransform {
  constructor(arg) {
    // vec3
    this.position = arg.position
      ? new THREE.Vector3(arg.position.x, arg.position.y, arg.position.z)
      : new THREE.Vector3(0, 0, 0);
    // animation name
    this.action = arg.action || "Idle";
    // angle
    this.angle = arg.angle || 0;
  }
}

class Character {
  constructor(model, trans, isLocal, camera, orbitControls, collider) {
    this.isLocal = isLocal;
    const cloneModel = SkeletonUtils.clone(model);
    cloneModel.name = "character";
    cloneModel.animations = model.animations;
    const mixer = new THREE.AnimationMixer(cloneModel);
    this.camera = camera;
    this.orbitControls = orbitControls;
    this.collider = collider;
    this.model = new THREE.Object3D();
    this.model.attach(cloneModel);
    this.model.position.set(
      trans.position.x,
      trans.position.y,
      trans.position.z
    );
    const capsule = new THREE.Mesh(
      new RoundedBoxGeometry(0.6, 1.6, 0.6, 5, 0.5),
      new THREE.MeshStandardMaterial()
    );
    capsule.geometry.translate(0, -0.5, 0);
    capsule.position.set(
      trans.position.x,
      this.model.position.y + 2,
      trans.position.z
    );
    this.model.userData.capsule = capsule;
    this.model.userData.capsuleInfo = {
      radius: 0.5,
      segment: new THREE.Line3(
        new THREE.Vector3(),
        new THREE.Vector3(0, -1, 0)
      ),
    };

    this.control = new CharacterController(
      mixer,
      trans.action || "PlayOne-Idle",
      camera,
      orbitControls,
      this.isLocal,
      collider
    );

    // this.model.userData.body = new CANNON.Body({
    //   mass:10,
    //   linearDamping:0,
    //   angularDamping:1,
    //   fixedRotation:true,
    //   collisionFilterGroup:2,   //设置碰撞体所在分组，默认值为1
    //   collisionFilterMask:1,    //设置碰撞体与某一指定组发生碰撞
    //   position: new CANNON.Vec3(this.model.position.x , trans.position.y + 0.36, this.model.position.z),
    //   type: CANNON.Body.DYNAMIC,
    //   shape: new CANNON.Sphere(0.36)
    // })
  }
  update(delta) {
    this.control.updateAnimate(delta);
    if (this.isLocal) {
      this.control.movement(delta);
      this.control.movement2(delta);
    }
  }
}

export { Character };
