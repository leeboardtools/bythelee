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

define(['lbcamera', 'lbscene3d', 'lbgeometry', 'lbmath'],
function(LBCamera, LBUI3d, LBGeometry, LBMath) {

// TEST!!!
var debugEuler = new LBGeometry.Euler();

/**
 * Object that defines camera limits.
 * @returns {LBUI3d.CameraLimits}
 */
LBUI3d.CameraLimits = function() {
    this.minPos = new LBGeometry.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    this.maxPos = new LBGeometry.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    this.azimuthRange = new LBMath.DegRange(-180, 360);
    this.altitudeRange = new LBMath.DegRange(-90, 360);
    this.rotationRange = new LBMath.DegRange(-180, 360);
};

LBUI3d.CameraLimits.prototype = {
    applyLimits: function(srcPosition, srcOrientation, dstPosition, dstOrientation) {
        dstPosition.set(
                LBMath.clamp(srcPosition.x, this.minPos.x, this.maxPos.x), 
                LBMath.clamp(srcPosition.y, this.minPos.y, this.maxPos.y), 
                LBMath.clamp(srcPosition.z, this.minPos.z, this.maxPos.z));
        dstOrientation.azimuthDeg = this.azimuthRange.clampToRange(srcOrientation.azimuthDeg);
        dstOrientation.altitudeDeg = this.altitudeRange.clampToRange(srcOrientation.altitudeDeg);
        dstOrientation.rotationDeg = this.rotationRange.clampToRange(srcOrientation.rotationDeg);
    },

    constructor: LBUI3d.CameraLimits
};


/**
 * Defines an orientation in spherical coordinates. This is basically Euler angles in
 * the order z,y,x, expressed in degrees.
 * <p>
 * An azimuth of 0 degrees points towards the +x axis.
 * An altitude of + degrees points towards the +z axis.
 * The rotation angle is around the azimuth/altitude axis
 * @returns {CameraControllers_L18.LBUI3d.SphericalOrientation}
 */
LBUI3d.SphericalOrientation = function() {
    this.azimuthDeg = 0;
    this.altitudeDeg = 0;
    this.rotationDeg = 0;
};

LBUI3d.SphericalOrientation.prototype = {
    calcLookAtPoint: function(r, store) {
        r = r || 1;
        store = store || new LBGeometry.Vector3();
        
        var theta = (90 - this.altitudeDeg) * LBMath.DEG_TO_RAD;
        var phi = this.azimuthDeg * LBMath.DEG_TO_RAD;
        var r_sinTheta = r * Math.sin(theta);
        return store.set(r_sinTheta * Math.cos(phi), r_sinTheta * Math.sin(phi), r * Math.cos(theta));
    },
    
    toEuler: function(store) {
        return (store) ? store.set(this.rotationDeg * LBMath.DEG_TO_RAD, this.altitudeDeg * LBMath.DEG_TO_RAD, this.azimuthDeg * LBMath.DEG_TO_RAD, 'ZYX')
            : new LBGeometry.Euler(this.rotationDeg * LBMath.DEG_TO_RAD, this.altitudeDeg * LBMath.DEG_TO_RAD, this.azimuthDeg * LBMath.DEG_TO_RAD, 'ZYX');
    },
    
    toQuaternion: function(store) {
        store = store || new LBGeometry.Quaternion();
        return store.setFromEuler(this.toEuler(_workingEuler));
    },
    
    toMatrix4: function(store) {
        store = store || new LBGeometry.Matrix4();
        return store.makeRotationFromEuler(this.toEuler(_workingEuler));
    },
    
    constructor: LBUI3d.SpericalOrientation
};

var _workingPosition = new LBGeometry.Vector3();
var _workingOrientation = new LBUI3d.SphericalOrientation();
var _workingEuler = new LBGeometry.Euler();
var _workingVector3 = new LBGeometry.Vector3();
var _workingMatrix4 = new LBGeometry.Matrix4();

/**
 * Base class for an object that controls a camera. Typical camera controllers
 * are associated with an object, which we call the target.
 * <p>
 * Depending upon the controller the camera may be panned or rotated.
 * <p>
 * The camera controllers are loosely based upon the camera controllers found in ThreeJS's 
 * examples/js/controls folder, such as OrbitControls.js and FirstPersonControls.js.
 * @constructor
 * @param {LBCamera.Camera} camera  The camera to control.
 * @param {LBUI3d.CameraLimits} [worldLimits]   Optional limits on the world camera position.
 * @param {LBUI3d.CameraLimits} [localLimits]   Optional limits on the local camera position.
 * @returns {LBUI3d.CameraController}
 */
LBUI3d.CameraController = function(camera, worldLimits, localLimits) {
    //this.camera = camera;

    this.worldLimits = worldLimits || new LBUI3d.CameraLimits();
    this.localLimits = localLimits || new LBUI3d.CameraLimits();
    
    this.currentPosition = new LBGeometry.Vector3(camera ? camera.position : undefined);
    this.currentQuaternion = new LBGeometry.Quaternion(camera ? camera.rotation : undefined);
    this.destPosition = new LBGeometry.Vector3();
    this.destQuaternion = new LBGeometry.Quaternion();
    
    this.maxLinearAccel = 10;
    this.maxAngularAccel = 10;
    
    this.mouseMode = -1;
    
    this.zoomEnabled = true;
};

LBUI3d.CameraController.prototype = {
    constructor: LBUI3d.CameraController
};

LBUI3d.CameraController.prototype.setTarget = function(target) {
    this.target = target;
};

LBUI3d.CameraController.MOUSE_PAN_MODE = 0;
LBUI3d.CameraController.MOUSE_ROTATE_MODE = 1;

LBUI3d.CameraController.TRACKING_STATE_IDLE = 0;
LBUI3d.CameraController.TRACKING_STATE_PAN = 1;
LBUI3d.CameraController.TRACKING_STATE_END_PAN = 2;
LBUI3d.CameraController.TRACKING_STATE_ROTATE = 3;
LBUI3d.CameraController.TRACKING_STATE_END_ROTATE = 4;

LBUI3d.CameraController.prototype.setMouseMode = function(mode) {
    if (this.mouseMode !== mode) {
        this.mouseMode = mode;
    }
};

LBUI3d.CameraController.prototype.installEventHandlers = function(domElement) {
    if (this.domElement !== domElement) {
        if (this.domElement) {
            this.uninstallEventHandlers();
        }

        this.domElement = domElement;
        
        if (this.domElement) {
            var me = this;
            this.onWheelFunction = function(event) {
                me.onMouseWheel(event);
            };
            domElement.addEventListener('wheel', this.onWheelFunction, false);
            
            this.onMouseDownFunction = function(event) {
                me.onMouseDown(event);
            };
            domElement.addEventListener('mousedown', this.onMouseDownFunction, false);
            
            this.onTouchStartFunction = function(event) {
                me.onTouchStart(event);
            };
            domElement.addEventListener('touchstart', this.onTouchStartFunction, false);
            
            this.onTouchEndFunction = function(event) {
                me.onTouchEnd(event);
            };
            domElement.addEventListener('touchend', this.onTouchEndFunction, false);
            
            this.onTouchMoveFunction = function(event) {
                me.onTouchMove(event);
            };
            domElement.addEventListener('touchmove', this.onTouchMoveFunction, false);
        }
    }
};

LBUI3d.CameraController.prototype.uninstallEventHandlers = function() {
    if (this.domElement) {
        this.domElement.removeEventListener('wheel', this.onWheelFunction, false);
        this.domElement.removeEventListener('mousedown', this.onMouseDownFunction, false);
        this.domElement.removeEventListener('touchstart', this.onTouchStartFunction, false);
        this.domElement.removeEventListener('touchend', this.onTouchEndFunction, false);
        this.domElement.removeEventListener('touchmove', this.onTouchMoveFunction, false);
        
        if (this.onMouseUpFunction) {
            document.removeEventListener('mouseup', this.onMouseUpFunction, false);
            this.onMouseUpFunction = null;
        }
        if (this.onMouseMoveFunction) {
            document.removeEventListener('mousemove', this.onMouseMoveFunction, false);
            this.onMouseUpFunction = null;
        }

        this.domElement = null;
    }
};

LBUI3d.CameraController.prototype.onMouseWheel = function(event) {
    if (this.zoomEnabled) {
        event.preventDefault();
        event.stopPropagation();
        
        this.handleMouseWheel(event);
    }
};

LBUI3d.CameraController.prototype.onMouseDown = function(event) {
    
};

LBUI3d.CameraController.prototype.onMouseMove = function(event) {
    
};

LBUI3d.CameraController.prototype.onMouseUp = function(event) {
    
};

LBUI3d.CameraController.prototype.onTouchStart = function(event) {
    
};

LBUI3d.CameraController.prototype.onTouchMove = function(event) {
    
};

LBUI3d.CameraController.prototype.onTouchEnd = function(event) {
    
};

LBUI3d.CameraController.prototype.handleMouseWheel = function(event) {
    if (event.deltaY < 0) {
        console.log("Zoom Out");
    }
    else if (event.deltaY > 0) {
        console.log("Zoom In");
    }
};

LBUI3d.CameraController.adjustMatForCameraAxis = function(mat) {
    // The camera view is along its y axis, so we need to rotate the y axis by 90 degrees about
    // the local z axis to align the camera's y axis with  the spherical orientation's x axis. 
    // We can do that by hand, since the rotation matrix is simple:
    //  0   1   0
    // -1   0   0
    //  0   0   1
    var old11 = mat.elements[0];
    var old21 = mat.elements[1];
    var old31 = mat.elements[2];
    mat.elements[0] = -mat.elements[4];
    mat.elements[1] = -mat.elements[5];
    mat.elements[2] = -mat.elements[6];
    mat.elements[4] = old11;
    mat.elements[5] = old21;
    mat.elements[6] = old31;
};

LBUI3d.CameraController.prototype.requestLocalCameraPOV = function(position, sphericalOrientation) {
    this.localLimits.applyLimits(position, sphericalOrientation, _workingPosition, _workingOrientation);
    
    var mat = _workingOrientation.toMatrix4(_workingMatrix4);
    LBUI3d.CameraController.adjustMatForCameraAxis(mat);
    mat.setPosition(_workingPosition);

    if (this.target) {
        this.target.updateMatrixWorld();
        mat.premultiply(this.target.matrixWorld);
    }
    
    mat.decompose(this.destPosition, this.destQuaternion, _workingVector3);
};

LBUI3d.CameraController.prototype.requestWorldCameraPOV = function(dir, up) {
};

/**
 * This is normally called from the {@link LBUI3d.View3d#render} method to handle tracking
 * and updating the camera position.
 * @param {Number}  dt  The time step in milliseconds.
 * @param {Boolean} updateCamera    If true the camera should be updated, otherwise it
 * is just background tracking.
 * @returns {undefined}
 */
LBUI3d.CameraController.prototype.update = function(dt, updateCamera) {
    this.updateDestination(dt);
    
    if (!this.currentPosition.equals(this.destPosition)) {
        this.currentPosition.copy(this.destPosition);
    }
    if (!this.currentQuaternion.equals(this.destQuaternion)) {
        this.currentQuaternion.copy(this.destQuaternion);
    }
    
    if (updateCamera) {
        var coordMapping = (this.view && this.view.scene3D) ? this.view.scene3D.coordMapping : LBUI3d.DirectCoordMapping;
        coordMapping.vector3ToThreeJS(this.currentPosition, this.camera.position);
        coordMapping.quaternionToThreeJS(this.currentQuaternion, this.camera.quaternion);
    }
};


/**
 * Called by {@link LBUI3d.CameraController#update} to update the desired camera destination.
 * @param {Number}  dt  The time step in milliseconds.
 * @returns {undefined}
 */
LBUI3d.CameraController.prototype.updateDestination = function(dt) {
    
};

/**
 * A camera controller that sets itself to a local position and orientation
 * on a target. Basically a first person point of view.
 * @constructor
 * @param {LBCamera.Camera} camera  The camera to control.
 * @param {LBUI3d.CameraLimits} [localLimits]   Optional limits on the local camera position.
 * @returns {LBUI3d.LocalPOVCameraController}
 */
LBUI3d.LocalPOVCameraController = function(camera, localLimits) {
    LBUI3d.CameraController.call(this, camera, null, localLimits);
    
    this.localPosition = new LBGeometry.Vector3();
    this.localSphericalOrientation = new LBUI3d.SphericalOrientation();
};

LBUI3d.LocalPOVCameraController.prototype = Object.create(LBUI3d.CameraController.prototype);
LBUI3d.LocalPOVCameraController.prototype.constructor = LBUI3d.LocalPOVCameraController;

LBUI3d.LocalPOVCameraController.prototype.updateDestination = function(dt) {
    if (this.target) {
        this.requestLocalCameraPOV(this.localPosition, this.localSphericalOrientation);
    }
};


/**
 * A camera controller that tries to follow the target at a given position relative to the
 * target. This differs from {@link LBUI3d.LocalPOVCameraController} in that for this
 * the camera is looking at the target, whereas for the first person controller the
 * camera is looking from the target.
 * @constructor
 * @param {LBCamera.Camera} camera  The camera to control.
 * @param {LBUI3d.CameraLimits} [globalLimits]   Optional limits on the global camera position.
 * @returns {LBUI3d.LocalPOVCameraController}
 */
LBUI3d.FollowCameraController = function(camera, globalLimits) {
    LBUI3d.CameraController.call(this, camera, globalLimits);
};

LBUI3d.FollowCameraController.prototype = Object.create(LBUI3d.CameraController.prototype);
LBUI3d.FollowCameraController.prototype.constructor = LBUI3d.FollowCameraController;


return LBUI3d;
});
