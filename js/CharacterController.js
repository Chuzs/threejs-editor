"use strict";

import { RoundedBoxGeometry } from "../examples/jsm/geometries/RoundedBoxGeometry.js";
const CharacterAnimationName = {
  WAVE: "PlayOne-Wave",
  Headnod: "PlayOne-Headnod",
  Thump: "PlayOne-Thump",
  Clap: "PlayOne-Clap",
  Dance: "PlayOne-Dance",
  RUN: "PlayOne-Run",
  WALK: "PlayOne-Walk",
  IDLE: "PlayOne-Idle",
  WAVING: "PlayOne-Waving",
  SITTING_IDLE: "PlayOne-SittingIdle",
  STAND_TO_SIT: "PlayOne-Sit",
  SIT_TO_STAND: "PlayOne-SitToStand",
  JUMP: "PlayOne-Jump",
  LOCKING: "PlayOne-LockingHipHop",
  Clapping: "PlayOne-Clapping",
  SitClapping: "PlayOne-SittingClapping",
};
const tempVector2 = new THREE.Vector3();
const tempBox = new THREE.Box3();
const tempMat = new THREE.Matrix4();
const tempSegment = new THREE.Line3();
class MoveConfig {
  constructor() {
    this.directionOffset = 0;
    this.tempVector = new THREE.Vector3();
  }
}
const W = "w";
const A = "a";
const S = "s";
const D = "d";
const DIRECTIONS = [W, A, S, D];
class CharacterController {
  constructor(
    mixer,
    currentActionName,
    camera,
    orbitControls,
    isLocal,
    collider,
    runSpeed
  ) {
    this.toggleRun = false;
    this.lock = false;
    this.walkDirection = new THREE.Vector3();
    this.moving = false;
    this.rotateAngle = new THREE.Vector3(0, 1, 0);
    this.rotateQuaternion = new THREE.Quaternion();
    this.fadeDuration = 0.2;
    this.playerVelocity = new THREE.Vector3();
    this.gravity = -9.82;
    // this.runVelocity = 6;
    // this.walkVelocity = 2.5;
    this.playerIsOnGround = false;
    this.cameraY = 0;
    this.navigationAgent = false;
    this.isSit = false;
    this.direction = void 0;
    this.agentPoint = null;
    this.points = [];
    this.keyCollideCount = 0;
    this.moveConfig = new MoveConfig();
    this.joystickActive = false;
    this.onAnimationActionFinish = () => {
      if (
        this.currentActionName == CharacterAnimationName.STAND_TO_SIT ||
        this.currentActionName == CharacterAnimationName.SitClapping
      ) {
        // this.startAnimationWithName(CharacterAnimationName.SITTING_IDLE);
        this.isSit = true;
        this.mixer.removeEventListener(
          "finished",
          this.onAnimationActionFinish
        );
      } else {
        this.startAnimationWithName(CharacterAnimationName.IDLE);
        this.lock = false;
        this.mixer.removeEventListener(
          "finished",
          this.onAnimationActionFinish
        );
      }
    };
    this.keydownEvent = (event) => {
      const key = event.key.toLowerCase();
      let objectKeys = Object.keys(this.lastKeys);
      if (objectKeys.length > 0 && !objectKeys.includes(key)) {
        this.keyCollideCount = 0;
      }
      if (window.inpFocus == 1 || this.keyCollideCount > 6) return;
      // if (event.key.toLowerCase() == 'shift' && Object.keys(this.keysBinding).length == 0) {
      //   this.toggleRun = !this.toggleRun;
      // } else {
      //   if (event.shiftKey) {
      //     this.toggleRun = event.shiftKey
      //   }

      if (key == "shift") {
        this._keydownTimeStamp = event.timeStamp;
      }
      if (DIRECTIONS.includes(key)) {
        if (objectKeys.length > 0) {
          for (const key of objectKeys) {
            this.keysBinding[key] = true;
          }
          this.lastKeys = {};
        }
        this.keysBinding[key] = true;
        if (this.isSit) {
          this.lock = false;
        }
      }
      // }
      // console.log(this.toggleRun)
      if (this.lock) {
        if (event.code == "Escape") {
          this.lock = !this.lock;
        }
      }
    };
    this.keyupEvent = (event) => {
      if (window.inpFocus == 1) return;
      // if (event.key == "Shift" && this.toggleRun) {
      //   this.toggleRun = false;
      // } else {
      const timeStamp = event.timeStamp;
      const subtime = timeStamp - this._keydownTimeStamp;
      if (event.key == "Shift" && subtime < 1000) {
        this.toggleRun = !this.toggleRun;
      }
      const key = event.key.toLowerCase();
      if (DIRECTIONS.includes(key)) {
        delete this.keysBinding[key];
        delete this.lastKeys[key];
        // this.keysBinding[key] = false;
      }
      this.keyCollideCount = 0;
      this.lastPoint = undefined;
      // }
    };
    this.mixer = mixer;
    this.model = mixer.getRoot().parent;
    const box = new THREE.Box3().setFromObject(this.model.userData.capsule);
    box.getSize(new THREE.Vector3());
    this.cameraY = 2.1;
    this.orbitControls = orbitControls;
    this.startAnimationWithName(currentActionName);
    this.isLocal = isLocal;
    this.collider = collider;
    this.keysBinding = {};
    this.lastKeys = {};
    // if (runSpeed) {
    //   this.runVelocity = runSpeed;
    // }
    if (isLocal) {
      this.camera = camera;
      this.model.position.clone();
      document.addEventListener("keydown", this.keydownEvent);
      document.addEventListener("keyup", this.keyupEvent);
    }
  }
  setLock(lock) {
    this.lock = lock;
  }
  startAnimationWithName(name, force) {
    var _a, _b;
    if (
      this.currentActionName == name &&
      ((_a = this.currentAction) === null || _a === void 0
        ? void 0
        : _a.getClip().name) == name &&
      !force
    ) {
      return;
    }
    if (
      this.lock &&
      this.currentActionName == CharacterAnimationName.SITTING_IDLE &&
      name !== CharacterAnimationName.SIT_TO_STAND &&
      name !== CharacterAnimationName.SitClapping
    ) {
      this.isSit = false;
      return;
    }
    // console.log("startAnimationWithName ", this.currentActionName, name)
    this.moving =
      name == CharacterAnimationName.RUN || name == CharacterAnimationName.WALK;
    (_b = this.currentAction) === null || _b === void 0
      ? void 0
      : _b.fadeOut(this.fadeDuration);
    this.currentActionName = name;
    const animationClip = this.getAnimationAction(this.currentActionName);
    // if (!animationClip) return;
    const action = this.mixer
      .clipAction(animationClip)
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .play();
    if (
      name !== CharacterAnimationName.IDLE &&
      name !== CharacterAnimationName.RUN &&
      name !== CharacterAnimationName.WALK
    ) {
      this.lock = true;
      this.moving = false;
      this.mixer.addEventListener("finished", this.onAnimationActionFinish);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    this.currentAction = action;
    if (this.onAnimationActionChange && this.isLocal) {
      this.onAnimationActionChange(name);
    }
  }
  navigationAgentToPoint(point, toSit) {
    this.toSit = true;
    this.agentPoint = point;
    this.navigationAgent = true;
  }
  /**
   * 运行动画
   */
  updateAnimate(delta) {
    this.mixer.update(delta);
  }
  agentReset(auto) {
    this.direction = void 0;
    this.navigationAgent = false;
    this.agentPoint = void 0;
    this.toSit = false;
    this.points = [];
    // wasee3d.engine.removeIndicator();
    if (auto && this.navigationAgentCallback) {
      this.navigationAgentCallback();
    }
  }

  movement2(delta) {
    if (!this.cameraGroup) {
      this.cameraGroup = new THREE.Group();
      this.cameraGroup.userData.position = new THREE.Vector3();
      this.cameraGroup.translateZ(2);
      const cap = new THREE.Mesh(
        new RoundedBoxGeometry(0.6, 1.5, 0.6, 5, 0.5),
        new THREE.MeshBasicMaterial({ color: "red" })
      );
      if (!this.development) cap.visible = false;
      this.cameraGroup.add(cap);
      // wasee3d.engine.scene.add(this.cameraGroup);
    }
    if (
      this.movement2Lock ||
      !this.cameraGroup ||
      !this.cameraGroup.userData.navigationAgent ||
      !this.agentPoint
    )
      return;

    if (this.cameraGroup.userData.navigationAgent && this.agentPoint) {
      let diffX = Math.abs(this.cameraGroup.position.x - this.agentPoint.x);
      let diffZ = Math.abs(this.cameraGroup.position.z - this.agentPoint.z);
      let radian = Math.atan2(
        this.cameraGroup.position.x - this.agentPoint.x,
        this.cameraGroup.position.z - this.agentPoint.z
      );
      this.direction = radian;
      this.moveConfig.directionOffset = this.direction;
      this.moveConfig.tempVector.setX(-Math.sin(this.direction));
      this.moveConfig.tempVector.setZ(-Math.cos(this.direction));
      const distance = Math.sqrt(diffX * diffX + diffZ * diffZ);
      if (distance < 2) {
        this.cameraGroup.userData.navigationAgent = false;
        return;
      }
    }

    const walkVelocity = this.tourSpeed || 2.5;
    const velocity =
      this.currentActionName == CharacterAnimationName.RUN
        ? walkVelocity * 0.5
        : walkVelocity;
    this.angle = this.moveConfig.directionOffset;
    this.rotateQuaternion.setFromAxisAngle(this.rotateAngle, this.angle);
    // this.cameraGroup.quaternion.rotateTowards(this.rotateQuaternion, 0.2);
    this.camera.getWorldDirection(this.walkDirection);
    this.walkDirection.y = 0;
    this.walkDirection.normalize();
    this.walkDirection.applyAxisAngle(
      this.rotateAngle,
      this.moveConfig.directionOffset
    );
    const tempVector = this.moveConfig.tempVector.clone();
    this.cameraGroup.userData.position.addScaledVector(
      tempVector,
      velocity * delta
    );

    const newPosition = this.moveConfig.tempVector.clone();
    newPosition.copy(tempSegment.start).applyMatrix4(this.collider.matrixWorld);
    const deltaVector = tempVector2.clone();
    deltaVector.subVectors(newPosition, this.cameraGroup.userData.position);
    this.cameraGroup.position.set(
      this.cameraGroup.userData.position.x,
      this.cameraGroup.userData.position.y + 0.5,
      this.cameraGroup.userData.position.z
    );
  }

  movement(delta) {
    if (this.lock) return;
    if (this.isLocal && !this.joystickActive) {
      if (this.navigationAgent) {
        let diffX = Math.abs(this.model.position.x - this.agentPoint.x);
        let diffZ = Math.abs(this.model.position.z - this.agentPoint.z);
        let radian = Math.atan2(
          this.model.position.x - this.agentPoint.x,
          this.model.position.z - this.agentPoint.z
        );
        this.direction = radian;
        this.moveConfig.directionOffset = this.direction;
        this.moveConfig.tempVector.setX(-Math.sin(this.direction));
        this.moveConfig.tempVector.setZ(-Math.cos(this.direction));
        const distance = Math.sqrt(diffX * diffX + diffZ * diffZ);
        if (this.points.length > 15) {
          this.points.shift();
        }
        this.points.push(new THREE.Vector2(distance, this.model.position.y));
        if ((diffX < 0.2 || diffZ < 0.2) && distance < 0.1) {
          this.agentReset(true);
          return;
        }
        // console.log(distance);
        if (this.toSit && distance < 0.8) {
          this.agentReset(true);
          // if (wasee3d.guide && wasee3d.guide.isThirdMove) {
          //   wasee3d.guide.isThirdMove = false;
          //   wasee3d.guide.thirdArrived();
          // }
          return;
        }

        if (this.points.length > 15) {
          const point = this.points[0];
          const lastPoint = this.points[this.points.length - 1];
          if (
            point.x - distance < 0.1 &&
            point.y.toFixed(2) == lastPoint.y.toFixed(2)
          ) {
            this.agentReset(true);
          }
        }
      }
      const directionPressed = DIRECTIONS.some((key) => this.keysBinding[key]);
      if (!directionPressed && this.navigationAgent == false) {
        this.currentActionName = CharacterAnimationName.IDLE;
        this.startAnimationWithName(this.currentActionName);
        // const quaternion = new THREE.Quaternion();
        // const anlge = Math.atan2(
        //   this.camera.position.x - this.model.position.x,
        //   this.camera.position.z - this.model.position.z
        // );
        // quaternion.setFromAxisAngle(this.rotateAngle, anlge);
        // this.model.quaternion.rotateTowards(quaternion, 0.2);
        return;
      }
      if (directionPressed) {
        if (this.navigationAgent) {
          this.agentReset();
        }
        const d = this.lastPoint
          ? this.lastPoint.distanceTo(this.model.position)
          : 1;
        // console.log("keyCollideCount ", this.keyCollideCount, 0.05*(this.tourSpeed||2.5), d);
        if (d < (this.toggleRun ? 0.05 * (this.tourSpeed || 2.5) : 0.01))
          this.keyCollideCount++;
        this.lastPoint = this.model.position.clone();
        if (this.keyCollideCount > 6) {
          this.lastKeys = this.keysBinding;
          this.keysBinding = {};
        }
        this.currentActionName = this.toggleRun
          ? CharacterAnimationName.RUN
          : CharacterAnimationName.WALK;
        this.moveConfig = this.keypressDirectionOffset(this.keysBinding);
        this.startAnimationWithName(this.currentActionName);
      } else if (this.navigationAgent) {
        this.startAnimationWithName(
          this.toggleRun
            ? CharacterAnimationName.RUN
            : CharacterAnimationName.WALK
        );
      }
    }
    if (
      this.currentActionName === CharacterAnimationName.RUN ||
      this.currentActionName === CharacterAnimationName.WALK
    ) {
      const rotateStep = 0.2;
      let moveX = 0,
        moveZ = 0,
        moveY = 0,
        angleYCameraDirection;
      const walkVelocity = this.tourSpeed || 2.5;
      const velocity =
        this.currentActionName == CharacterAnimationName.RUN
          ? walkVelocity * 1.5
          : walkVelocity;
      if (this.isLocal) {
        angleYCameraDirection = Math.atan2(
          this.camera.position.x - this.model.position.x,
          this.camera.position.z - this.model.position.z
        );
        if (this.navigationAgent) {
          this.angle = this.moveConfig.directionOffset;
        } else {
          this.angle = angleYCameraDirection + this.moveConfig.directionOffset;
        }
        this.rotateQuaternion.setFromAxisAngle(this.rotateAngle, this.angle);
        this.model.quaternion.rotateTowards(this.rotateQuaternion, rotateStep);
        this.camera.getWorldDirection(this.walkDirection);
        this.walkDirection.y = 0;
        this.walkDirection.normalize();
        this.walkDirection.applyAxisAngle(
          this.rotateAngle,
          this.moveConfig.directionOffset
        );
        const angleOrbit = this.orbitControls.getAzimuthalAngle();
        const tempVector = this.moveConfig.tempVector.clone();
        if (this.navigationAgent == false) {
          tempVector.applyAxisAngle(this.rotateAngle, angleOrbit);
        }
        this.model.userData.capsule.position.addScaledVector(
          tempVector,
          velocity * delta
        );
        this.model.userData.capsule.updateMatrixWorld();
        if (this.collider) {
          const capsuleInfo = this.model.userData.capsuleInfo;
          tempBox.makeEmpty();
          tempMat.copy(this.collider.matrixWorld).invert();
          tempSegment.copy(capsuleInfo.segment);
          tempSegment.start
            .applyMatrix4(this.model.userData.capsule.matrixWorld)
            .applyMatrix4(tempMat);
          tempSegment.end
            .applyMatrix4(this.model.userData.capsule.matrixWorld)
            .applyMatrix4(tempMat);
          tempSegment.end.sub(new THREE.Vector3(0, 0.5, 0));
          tempBox.expandByPoint(tempSegment.start);
          tempBox.expandByPoint(tempSegment.end);
          tempBox.min.addScalar(-capsuleInfo.radius);
          tempBox.max.addScalar(capsuleInfo.radius);
          tempBox.max.setY(tempSegment.start.y);

          this.collider.geometry.boundsTree.shapecast({
            intersectsBounds: (box) => {
              return box.intersectsBox(tempBox);
            },
            intersectsTriangle: (tri) => {
              const triPoint = this.moveConfig.tempVector.clone();
              const capsulePoint = tempVector2.clone();
              const distance = tri.closestPointToSegment(
                tempSegment,
                triPoint,
                capsulePoint
              );
              if (distance < capsuleInfo.radius) {
                const depth = capsuleInfo.radius - distance;
                const direction = capsulePoint.sub(triPoint).normalize();
                tempSegment.start.addScaledVector(direction, depth);
                tempSegment.end.addScaledVector(direction, depth);
              }
            },
          });
          const newPosition = this.moveConfig.tempVector.clone();
          newPosition
            .copy(tempSegment.start)
            .applyMatrix4(this.collider.matrixWorld);
          const deltaVector = tempVector2.clone();
          deltaVector.subVectors(
            newPosition,
            this.model.userData.capsule.position
          );
          this.playerIsOnGround =
            deltaVector.y > Math.abs(delta * this.playerVelocity.y * 0.5);
          const offset = Math.max(0, deltaVector.length() - 1e-5);
          deltaVector.normalize().multiplyScalar(offset);
          this.model.userData.capsule.position.add(deltaVector);
          if (!this.playerIsOnGround) {
            deltaVector.normalize();
            this.playerVelocity.addScaledVector(
              deltaVector,
              -deltaVector.dot(this.playerVelocity)
            );
            this.playerVelocity.y += delta * this.gravity;
            if (
              this.model.userData.capsule.position.y +
                this.playerVelocity.y * delta >
              1.8
            ) {
              this.model.userData.capsule.position.addScaledVector(
                this.playerVelocity,
                delta
              );
            }
          } else {
            this.playerVelocity.set(0, 0, 0);
          }
          moveY =
            this.model.userData.capsule.position.y - this.model.position.y - 2;
          moveX =
            this.model.userData.capsule.position.x - this.model.position.x;
          moveZ =
            this.model.userData.capsule.position.z - this.model.position.z;
          this.model.position.set(
            this.model.userData.capsule.position.x,
            // this.model.position.y,
            //  高度移动有问题 先不根据胶囊体的高度移动
            this.model.userData.capsule.position.y - 2,
            this.model.userData.capsule.position.z
          );

          if (this.cameraGroup) {
            const dis = this.cameraGroup.position.distanceTo(
              this.model.position
            );
            if (dis > 3) {
              this.cameraGroup.userData.navigationAgent = true;
            }
          }

          // if (wasee3d.engine.renderer.xr.enabled) {
          //   this.guidePoints.push(this.model.position);
          //   wasee3d.engine.vr.vrGUI(this.guidePoints.length+", "+this.outDisIndex, this.guidePoints[this.guidePoints.length-1].x + "");
          //   if (!this.outDisIndex) {
          //     const dis = wasee3d.engine.vr.cameraGroup.position.distanceTo(this.guidePoints[this.guidePoints.length-1]);
          //     if (dis > 2) this.outDisIndex = this.guidePoints.length-1;
          //     wasee3d.engine.vr.vrGUI(dis+", "+this.outDisIndex, this.guidePoints.length + "");
          //   }
          //   if (this.outDisIndex!=undefined) {
          //     this.outDisIndex++;
          //     wasee3d.engine.vr.cameraGroup.position.copy(this.guidePoints[this.guidePoints.length-this.outDisIndex]);
          //   }
          // }
        }
        this.camera.position.setX(this.camera.position.x + moveX);
        this.camera.position.setZ(this.camera.position.z + moveZ);
        this.camera.position.setY((this.camera.position.y += moveY));
        this.orbitControls.target.set(
          this.model.position.x,
          this.model.position.y + 2,
          this.model.position.z
        );
        if (this.model.position.y < -20 || this.model.position.y > 50) {
          this.reset();
        }
        // let object = [
        //   [
        //     this.model.userData.capsule.position.x,
        //     this.model.userData.capsule.position.y,
        //     this.model.userData.capsule.position.z,
        //   ],
        //   [
        //     this.model.quaternion._x,
        //     this.model.quaternion._y,
        //     this.model.quaternion._z,
        //     this.model.quaternion._w,
        //   ],
        //   this.currentActionName,
        // ];
        // window.handleMoveVirtually(object);
        // wasee3d.engine.handleMoveVirtually(object);
      }
    }
  }
  // public onMoving(moveX: number, moveZ: number, moveY: number, angle: number) {
  //   this.camera.position.x += moveX
  //   this.camera.position.z += moveZ
  //   this.camera.position.y += moveY
  //   this.orbitControls.target.x += moveX
  //   this.orbitControls.target.z += moveZ
  //   this.orbitControls.target.y += moveY
  // }
  keyReset() {
    this.keysBinding = {};
  }
  reset() {
    this.playerVelocity.set(0, 0, 0);
    this.model.userData.capsule.position.set(0, 1, 0);
    this.camera.position.sub(this.orbitControls.target);
    this.orbitControls.target.copy(this.model.userData.capsule.position);
    this.camera.position.add(this.model.userData.capsule.position);
    this.orbitControls.update();
  }
  /**
   * 根据按键追踪偏移角度
   * @param keysPressed
   */
  keypressDirectionOffset(keysPressed) {
    const moveConfig = new MoveConfig();
    if (keysPressed[W]) {
      moveConfig.tempVector.set(0, 0, -1);
      if (keysPressed[A]) {
        // moveConfig.tempVector.set(
        //   -Math.PI / 4 * Math.sin(Math.PI / 4),
        //   0,
        //   -Math.PI / 4 * Math.cos(Math.PI / 4)
        // );
        moveConfig.tempVector.set(-Math.PI / 4, 0, -Math.PI / 4);
        moveConfig.directionOffset = Math.PI / 4;
      } else if (keysPressed[D]) {
        moveConfig.tempVector.set(Math.PI / 4, 0, -Math.PI / 4);
        moveConfig.directionOffset = -Math.PI / 4;
      }
    } else if (keysPressed[S]) {
      moveConfig.tempVector.set(0, 0, 1);
      if (keysPressed[A]) {
        moveConfig.tempVector.set(-Math.PI / 4, 0, Math.PI / 4);
        moveConfig.directionOffset = Math.PI / 4 + Math.PI / 2;
      } else if (keysPressed[D]) {
        moveConfig.tempVector.set(Math.PI / 4, 0, Math.PI / 4);
        moveConfig.directionOffset = -Math.PI / 4 - Math.PI / 2;
      } else {
        moveConfig.directionOffset = Math.PI;
      }
    } else if (keysPressed[A]) {
      moveConfig.tempVector.set(-1, 0, 0);
      moveConfig.directionOffset = Math.PI / 2;
    } else if (keysPressed[D]) {
      moveConfig.tempVector.set(1, 0, 0);
      moveConfig.directionOffset = -Math.PI / 2;
    }
    return moveConfig;
  }
  getAnimationAction(action) {
    const characterModel = this.model.getObjectByName("character");
    return characterModel.animations.find((an) => an.name.indexOf(action) > -1);
  }
}
export { CharacterController };
