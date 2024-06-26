import * as THREE from "three";

import { Capsule } from "three/addons/math/Capsule.js";

class PlayerControls extends THREE.EventDispatcher {
  constructor(camera, worldOctree, domElement) {
    super();
    this.enabled = false;
    const GRAVITY = 30;
    const STEPS_PER_FRAME = 5;

    const playerCollider = new Capsule(
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0, 2, 0),
      0.35
    );

    const playerVelocity = new THREE.Vector3();
    const playerDirection = new THREE.Vector3();

    let playerOnFloor = false;

    const keyStates = {};

    document.addEventListener("keydown", (event) => {
      if (this.enabled === false) return;

      keyStates[event.code] = true;
    });

    document.addEventListener("keyup", (event) => {
      if (this.enabled === false) return;

      keyStates[event.code] = false;
    });

    domElement.addEventListener("mousedown", () => {
      if (this.enabled === false) return;

      domElement.requestPointerLock();
    });

    document.addEventListener("mouseup", () => {});

    document.addEventListener("mousemove", (event) => {
      if (this.enabled === false) return;
      if (document.pointerLockElement === domElement) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;
      }
    });

    function playerCollisions() {
      const result = worldOctree.capsuleIntersect(playerCollider);
      playerOnFloor = false;

      if (result) {
        playerOnFloor = result.normal.y > 0;

        if (!playerOnFloor) {
          playerVelocity.addScaledVector(
            result.normal,
            -result.normal.dot(playerVelocity)
          );
        }

        playerCollider.translate(result.normal.multiplyScalar(result.depth));
      }
    }

    function updatePlayer(deltaTime) {
      let damping = Math.exp(-4 * deltaTime) - 1;

      if (!playerOnFloor) {
        playerVelocity.y -= GRAVITY * deltaTime;

        // small air resistance
        damping *= 0.1;
      }

      playerVelocity.addScaledVector(playerVelocity, damping);

      const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
      playerCollider.translate(deltaPosition);

      playerCollisions();

      camera.position.copy(playerCollider.end);
    }

    function getForwardVector() {
      camera.getWorldDirection(playerDirection);
      playerDirection.y = 0;
      playerDirection.normalize();

      return playerDirection;
    }

    function getSideVector() {
      camera.getWorldDirection(playerDirection);
      playerDirection.y = 0;
      playerDirection.normalize();
      playerDirection.cross(camera.up);

      return playerDirection;
    }

    function controls(deltaTime) {
      // gives a bit of air control
      const speedDelta = deltaTime * (playerOnFloor ? 25 : 8);

      if (keyStates["KeyW"]) {
        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
      }

      if (keyStates["KeyS"]) {
        playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));
      }

      if (keyStates["KeyA"]) {
        playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));
      }

      if (keyStates["KeyD"]) {
        playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
      }

      if (playerOnFloor) {
        if (keyStates["Space"]) {
          playerVelocity.y = 15;
        }
      }
    }

    function teleportPlayerIfOob() {
      if (camera.position.y <= -25) {
        playerCollider.start.set(0, 0.35, 0);
        playerCollider.end.set(0, 1, 0);
        playerCollider.radius = 0.35;
        camera.position.copy(playerCollider.end);
        camera.rotation.set(0, 0, 0);
      }
    }

    this.update = function (delta) {
      if (this.enabled === false) return;
      camera.rotation.order = "YXZ";
      const deltaTime = Math.min(0.05, delta) / STEPS_PER_FRAME;

      // we look for collisions in substeps to mitigate the risk of
      // an object traversing another too quickly for detection.

      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        controls(deltaTime);

        updatePlayer(deltaTime);

        teleportPlayerIfOob();
      }
    };
  }
}

export { PlayerControls };
