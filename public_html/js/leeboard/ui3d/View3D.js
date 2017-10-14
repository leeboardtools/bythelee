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
define(['three', 'lbscene3d', 'lbcamera', 'lbcameracontrollers', 'three-orbit'], function(THREE, LBUI3d, LBCamera) {


/**
 * A view on a scene. The view provides the association between a DOM element to display 
 * the view of a scene into, and a camera to view through.
 * <p>
 * Views also provide support for one or more {@link LBUI3d.CameraController}s, which are
 * used to control the camera within the view.
 * @constructor
 * @param {LBUI3d.Scene3D} scene3D  The scene being viewed.
 * @param {Object} container    The DOM container to be displayed in.
 * @param {LBCamera.Camera} [camera]  If defined, the camera for the view. 
 * @param {type} [renderer] If defined, the renderer to use.
 * @returns {LBUI3d.View3D}
 */
LBUI3d.View3D = function(scene3D, container, camera, renderer) {
    /**
     * The scene this views.
     * @member {@link LBUI3d.Scene3D}
     */
    this.scene3D = scene3D;
    
    var scene = scene3D.scene;
    
    var width = container.clientWidth;
    var height = container.clientHeight;
    
    if (!camera) {
        camera = new LBCamera.PerspectiveCamera(50, width / height, 0.1, 10000);
        camera.position.z = 5;
    }
    
    /**
     * The camera used to view the scene.
     * @member {@link LBCamera.Camera}
     */
    this.camera = camera;
    
    scene.add(camera);
    
    /**
     * The camera controllers.
     * @member {@link LBUI3d.CameraController[]}
     */
    this.cameraControllers = [];
    
    if (!renderer) {
        var rendererParameters = {
            alpha: true,
            antialias: true,
            logarithmicDepthBuffer: true
        };
        renderer = new THREE.WebGLRenderer(rendererParameters);
    }
    /**
     * The renderer used to render the view.
     * @member {Object}
     */
    this.renderer = renderer;
    
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    
    renderer.domElement.style.position = "relative";
    container.appendChild(renderer.domElement);
    
    /**
     * The DOM container the view displays in.
     * @member {Object}
     */
    this.container  = container;
    
    /**
     * If true the scene is enabled.
     * @member {Boolean}
     */
    this.isEnabled = true;
    
    /**
     * The current mouse mode.
     * @member {LBUI3d.View3D.MOUSE_ROTATE_MODE|LBUI3d.View3D.MOUSE_PAN_MODE}
     */
    this.mouseMode = LBUI3d.View3D.MOUSE_ROTATE_MODE;
    this.setRotateMode();
};

LBUI3d.View3D.MOUSE_ROTATE_MODE = LBUI3d.CameraController.MOUSE_ROTATE_MODE;
LBUI3d.View3D.MOUSE_PAN_MODE = LBUI3d.CameraController.MOUSE_PAN_MODE;

LBUI3d.View3D.prototype = {
    constructor: LBUI3d.View3D
};


/**
 * Adds a camera controller to the view.
 * @param {LBUI3d.CameraController} controller  The controller to add.
 * @returns {LBUI3d.View3D} this.
 */
LBUI3d.View3D.prototype.addCameraController = function(controller) {
    this.cameraControllers.push(controller);
    controller.camera = this.camera;
    controller.view = this;
    controller.setMouseMode(this.mouseMode);
    
    return this;
};

/**
 * Sets the active camera controller. The active camera controller has its event
 * handlers installed in the DOM container.
 * @param {LBUI3d.CameraController} controller  The controller, may be null or undefined.
 */
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

/**
 * Sets the mouse mode for the camera controllers.
 * @param {LBUI3d.View3D.MOUSE_ROTATE_MODE|LBUI3d.View3D.MOUSE_PAN_MODE} mode The mouse mode.
 * @returns {LBUI3d.View3D} this.
 */
LBUI3d.View3D.prototype.setMouseMode = function(mode) {
    if (this.mouseMode !== mode) {
        this.mouseMode = mode;
        
        this.cameraControllers.forEach(function(controller) {
            controller.setMouseMode(mode);
        });
    }
    return this;
};

/**
 * Sets the mouse mode to pan.
 */
LBUI3d.View3D.prototype.setPanMode = function() {
    this.setMouseMode(LBUI3d.View3D.MOUSE_PAN_MODE);
};

/**
 * Sets the mouse mode to rotate.
 */
LBUI3d.View3D.prototype.setRotateMode = function() {
    this.setMouseMode(LBUI3d.View3D.MOUSE_ROTATE_MODE);
};

/**
 * Called from the owner {@link LBUI3d.App3D} every render cycle to have the view
 * render itself.
 * @protected
 * @param {Number} dt   The elapsed seconds since the last render call.
 * @returns {undefined}
 */
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

/**
 * Called by {@link LBUI3d.App3D}'s window resize event handler, updates the camera for the DOM container's size.
 * @protected
 */
LBUI3d.View3D.prototype.onWindowResize = function() {
    var width = this.container.clientWidth;
    var height = this.container.clientHeight;
    
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
};

/**
 * This will go away, currently used to install a {@link THREE.OrbitControls} for testing.
 * @param {type} minDistance
 * @param {type} maxDistance
 * @param {type} maxPolarAngle
 * @param {type} enableKeys
 */
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