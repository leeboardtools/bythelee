/* 
 * Copyright 2017 albert.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/* global THREE, LBUI3d */
define(['three', 'lbscene3d', 'lbcameracontrollers', 'three-orbit'], function(THREE, LBUI3d) {

LBUI3d.View3D = function(scene3D, container, camera, renderer) {
    this.scene3D = scene3D;
    var scene = scene3D.scene;
    
    var width = container.clientWidth;
    var height = container.clientHeight;
    
    if (!camera) {
        camera = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
        camera.position.z = 5;
    }
    this.camera = camera;
    
    scene.add(camera);
    
    this.cameraControllers = [];
    
    if (!renderer) {
        var rendererParameters = {
            alpha: true,
            antialias: true,
            logarithmicDepthBuffer: true
        };
        renderer = new THREE.WebGLRenderer(rendererParameters);
    }
    this.renderer = renderer;
    
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    
    renderer.domElement.style.position = "relative";
    container.appendChild(renderer.domElement);
    
    this.container  = container;
    
    this.isEnabled = true;
    
    this.mouseMode = LBUI3d.View3D.MOUSE_ROTATE_MODE;
    this.setRotateMode();
};

LBUI3d.View3D.MOUSE_ROTATE_MODE = LBUI3d.CameraController.MOUSE_ROTATE_MODE;
LBUI3d.View3D.MOUSE_PAN_MODE = LBUI3d.CameraController.MOUSE_PAN_MODE;

LBUI3d.View3D.prototype = {
    constructor: LBUI3d.View3D
};

LBUI3d.View3D.prototype.addCameraController = function(controller) {
    this.cameraControllers.push(controller);
    controller.camera = this.camera;
    controller.view = this;
    controller.setMouseMode(this.mouseMode);
    
    return this;
};

LBUI3d.View3D.prototype.setActiveCameraController = function(controller) {
    if (this.activeCameraController !== controller) {
        if (this.activeCameraController) {
            this.activeCameraController.uninstallEventHandlers();
        }
        
        this.activeCameraController = controller;
        
        if (this.activeCameraController) {
            this.activeCameraController.installEventHandlers(this.renderer.domElement);
        }
    }
};

LBUI3d.View3D.prototype.setMouseMode = function(mode) {
    if (this.mouseMode !== mode) {
        this.mouseMode = mode;
        
        this.cameraControllers.forEach(function(controller) {
            controller.setMouseMode(mode);
        });
    }
    return this;
};

LBUI3d.View3D.prototype.setPanMode = function() {
    this.setMouseMode(LBUI3d.View3D.MOUSE_PAN_MODE);
};

LBUI3d.View3D.prototype.setRotateMode = function() {
    this.setMouseMode(LBUI3d.View3D.MOUSE_ROTATE_MODE);
};

LBUI3d.View3D.prototype.render = function(dt) {
    if (!this.isEnabled) {
        return;
    }
    
    var activeController = this.activeCameraController;
    this.cameraControllers.forEach(function(controller) {
        controller.update(dt, controller === activeController);
    });
    
    this.renderer.render(this.scene3D.scene, this.camera);
};

LBUI3d.View3D.prototype.onWindowResize = function() {
    var width = this.container.clientWidth;
    var height = this.container.clientHeight;
    
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
};

LBUI3d.View3D.prototype.installOrbitControls = function(minDistance, maxDistance, maxPolarAngle, enableKeys) {
    this.controls = new THREE.OrbitControls(this.camera, this.container);
    if (enableKeys !== undefined) {
        this.controls.enableKeys = enableKeys;
    }
    if (minDistance !== undefined) {
        this.controls.minDistance = minDistance;
    }
    if (maxDistance !== undefined) {
        this.controls.maxDistance = maxDistance;
    }
    if (maxPolarAngle !== undefined) {
        this.controls.maxPolarAngle = maxPolarAngle;
    }
};

return LBUI3d;

});