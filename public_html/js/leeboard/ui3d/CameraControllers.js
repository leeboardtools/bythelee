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


/**
 * Object that defines camera limits.
 * @constructor
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
    /**
     * Applies the camera limits to a position and spherical orientation.
     * srcPosition and srcOrientation are not modified unless they are the same as
     * dstPosition and dstOrientation, respectively.
     * @param {LBGeometry.Vector3} srcPosition  The position to be limited if necessary.
     * @param {LBUI3d.SphericalOrientation} srcOrientation  The orientation to be limited if necessary.
     * @param {LBGeometry.Vector3} dstPosition  Set to the position, limited if necessary.
     * @param {LBUI3d.SphericalOrientation} dstOrientation  Set to the orientation, limited if necessary.
     */
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
 * @constructor
 * @returns {CameraControllers_L18.LBUI3d.SphericalOrientation}
 */
LBUI3d.SphericalOrientation = function() {
    this.azimuthDeg = 0;
    this.altitudeDeg = 0;
    this.rotationDeg = 0;
};

LBUI3d.SphericalOrientation.prototype = {
    /**
     * Creates a copy of this.
     * @returns {LBUI3d.SphericalOrientation}   The copy.
     */
    clone: function() {
        var obj = new LBUI3d.SphericalOrientation();
        return obj.copy(this);
    },
    
    /**
     * Sets this to match another orientation.
     * @param {LBUI3d.SphericalOrientation} other   The orientation to copy.
     * @returns {LBUI3d.SphericalOrientation}   this.
     */
    copy: function(other) {
        this.azimuthDeg = other.azimuthDeg;
        this.altitudeDeg = other.altitudeDeg;
        this.rotationDeg = other.rotationDeg;
        return this;
    },
    
    /**
     * Determines if this orientation and another orientation are the same.
     * @param {LBUI3d.SphericalOrientation} other   The orientation to test against.
     * @returns {boolean}   true if they are the same.
     */
    equals: function(other) {
        return LBMath.degreesEqual(this.azimuthDeg, other.azimuthDeg)
            && LBMath.degreesEqual(this.altitudeDeg, other.altitudeDeg)
            && LBMath.degreesEqual(this.rotationDeg, other.rotationDeg);
    },
    
    /**
     * Calculates a point at a distance along the ray defined by the orientation.
     * @param {Number} r    The distance.
     * @param {LBGeometry.Vector3} [store]    If defined the object to store the point in.
     * @returns {LBGeometry.Vector3}    The point.
     */
    calcLookAtPoint: function(r, store) {
        r = r || 1;
        store = store || new LBGeometry.Vector3();
        
        var theta = (90 - this.altitudeDeg) * LBMath.DEG_TO_RAD;
        var phi = this.azimuthDeg * LBMath.DEG_TO_RAD;
        var r_sinTheta = r * Math.sin(theta);
        return store.set(r_sinTheta * Math.cos(phi), r_sinTheta * Math.sin(phi), r * Math.cos(theta));
    },
    
    /**
     * Calculates the {@link LBGeometry.Euler} equivalent.
     * @param {LBGeometry.Euler} [store]    If defined the object to store into.
     * @returns {LBGeometry.Euler}  The Euler object.
     */
    toEuler: function(store) {
        return (store) ? store.set(this.rotationDeg * LBMath.DEG_TO_RAD, this.altitudeDeg * LBMath.DEG_TO_RAD, this.azimuthDeg * LBMath.DEG_TO_RAD, 'ZYX')
            : new LBGeometry.Euler(this.rotationDeg * LBMath.DEG_TO_RAD, this.altitudeDeg * LBMath.DEG_TO_RAD, this.azimuthDeg * LBMath.DEG_TO_RAD, 'ZYX');
    },
    
    /**
     * Calculates the {@link LBGeometry.Quaternion} equivalent.
     * @param {LBGeometry.Quaternion} [store]   If defined the object to store into.
     * @returns {LBGeometry.Quaternion} The quaternion.
     */
    toQuaternion: function(store) {
        store = store || new LBGeometry.Quaternion();
        return store.setFromEuler(this.toEuler(_workingEuler));
    },
    
    /**
     * Calculates a {@link LBGeometry.Matrix4} rotation matrix equivalent of the orientation.
     * @param {LBGeometry.Matrix4} [store]  If defined the object to store into.
     * @returns {LBGeometry.Matrix4}    The rotation matrix.
     */
    toMatrix4: function(store) {
        store = store || new LBGeometry.Matrix4();
        return store.makeRotationFromEuler(this.toEuler(_workingEuler));
    },
    
    constructor: LBUI3d.SpericalOrientation
};

/**
 * Creates a copy or a clone of an {@link LBUI3d.SphericalOrientation}, depending
 * upon whether or not the destination exists.
 * @param {LBUI3d.SphericalOrientation} dst If defined, the destination object to be
 * copied into, otherwise a new object is created.
 * @param {LBUI3d.SphericalOrientation} src The object to be copied or cloned.
 * @returns {LBUI3d.SphericalOrientation}   A copy or clone of src.
 */
LBUI3d.SphericalOrientation.copyOrClone = function(dst, src) {
    return (dst) ? dst.copy(src) : src.clone();
};


var _workingPosition = new LBGeometry.Vector3();
var _workingOrientation = new LBUI3d.SphericalOrientation();
var _workingEuler = new LBGeometry.Euler();
var _workingVector3 = new LBGeometry.Vector3();
var _workingMatrix4 = new LBGeometry.Matrix4();

/**
 * Base class for an object that controls a camera. Typical camera controllers
 * are associated with an {@link LBGeometry.Object3D}, which we call the target.
 * <p>
 * Camera controllers normally work within the context of an {@link LBUI3d.View3D}.
 * <p>
 * Depending upon the controller the camera may be panned or rotated.
 * <p>
 * The camera controllers are loosely based upon the camera controllers found in ThreeJS's 
 * examples/js/controls folder, such as OrbitControls.js and FirstPersonControls.js.
 * @constructor
 * @param {LBUI3d.CameraLimits} [worldLimits]   Optional limits on the world camera position.
 * @param {LBUI3d.CameraLimits} [localLimits]   Optional limits on the local camera position.
 * @returns {LBUI3d.CameraController}
 */
LBUI3d.CameraController = function(worldLimits, localLimits) {
    this.worldLimits = worldLimits || new LBUI3d.CameraLimits();
    this.localLimits = localLimits || new LBUI3d.CameraLimits();
    
    this.currentPosition = new LBGeometry.Vector3();
    this.currentQuaternion = new LBGeometry.Quaternion();
    this.destPosition = new LBGeometry.Vector3();
    this.destQuaternion = new LBGeometry.Quaternion();
    
    this.maxLinearAccel = 10;
    this.maxAngularAccel = 10;
    
    this.mouseMode = -1;
    
    this.zoomEnabled = true;
    this.zoomScale = 1;
    this.minZoomScale = 0.025;
    this.maxZoomScale = 150;
    
    this.trackingState = LBUI3d.CameraController.TRACKING_STATE_IDLE;
};

LBUI3d.CameraController.prototype = {
    constructor: LBUI3d.CameraController
};

/**
 * Sets the target for the controller.
 * @param {LBGeometry.Object3D} target  The target.
 */
LBUI3d.CameraController.prototype.setTarget = function(target) {
    this.target = target;
};

LBUI3d.CameraController.MOUSE_PAN_MODE = 0;
LBUI3d.CameraController.MOUSE_ROTATE_MODE = 1;

LBUI3d.CameraController.TRACKING_STATE_IDLE = 0;
LBUI3d.CameraController.TRACKING_STATE_PAN = 1;
LBUI3d.CameraController.TRACKING_STATE_ROTATE = 2;
LBUI3d.CameraController.TRACKING_STATE_ZOOM = 3;

LBUI3d.CameraController.VIEW_FWD            = 0;
LBUI3d.CameraController.VIEW_FWD_STBD       = 1;
LBUI3d.CameraController.VIEW_STBD           = 2;
LBUI3d.CameraController.VIEW_AFT_STBD       = 3;
LBUI3d.CameraController.VIEW_AFT            = 4;
LBUI3d.CameraController.VIEW_AFT_PORT       = 5;
LBUI3d.CameraController.VIEW_PORT           = 6;
LBUI3d.CameraController.VIEW_FWD_PORT       = 7;
LBUI3d.CameraController.VIEW_UP             = 8;
LBUI3d.CameraController.VIEW_DOWN           = 9;

/**
 * Sets whether the camera mouse event handlers apply a rotation or a panning.
 * @param {LBUI3d.CameraController.MOUSE_PAN_MODE|LBUI3d.CameraController.MOUSE_ROTATE_MODE} mode The mouse mode.
 */
LBUI3d.CameraController.prototype.setMouseMode = function(mode) {
    if (this.mouseMode !== mode) {
        this.mouseMode = mode;
    }
};

/**
 * Sets one of the standard views.
 * @param {Number} view One of the LBUI3d.CameraController.VIEW_x values.
 */
LBUI3d.CameraController.prototype.setStandardView = function(view) {
};

/**
 * Rotates the camera point of view horizontally and/or vertically.
 * @param {Number} horzDeg  The number of degrees to rotate horizontally.
 * @param {Number} vertDeg  The number of degrees to rotate vertically.
 */
LBUI3d.CameraController.prototype.rotatePOVDeg = function(horzDeg, vertDeg) {
    
};

/**
 * Pans the camera point of view horizontall or vertically
 * @param {Number} dx   The amount to pan horizontally.
 * @param {Number} dy   The amount to pan vertically.
 */
LBUI3d.CameraController.prototype.panPOV = function(dx, dy) {
    
};

/**
 * Installs event handlers for the controller in a DOM element. The handlers can be
 * uninstalled by calling {@link LBUI3d.CameraController.prototype.uninstallEventHandlers}.
 * @param {Object} domElement   The DOM element to install the handlers into.
 */
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

/**
 * Uninstalls any event handlers that were installed by a call to 
 * {@link LBUI3d.CameraController.prototype.installEventHandlers}.
 */
LBUI3d.CameraController.prototype.uninstallEventHandlers = function() {
    this.endTracking();
    
    if (this.domElement) {
        this.domElement.removeEventListener('wheel', this.onWheelFunction, false);
        this.domElement.removeEventListener('mousedown', this.onMouseDownFunction, false);
        this.domElement.removeEventListener('touchstart', this.onTouchStartFunction, false);
        this.domElement.removeEventListener('touchend', this.onTouchEndFunction, false);
        this.domElement.removeEventListener('touchmove', this.onTouchMoveFunction, false);
        
        this.domElement = null;
    }
};

/**
 * Ends any tracking that had be going on via an installed event handler. This can be
 * used to cancel mouse tracking via say the ESC key.
 * @param {Boolean} isCancel    If true tracking should be cancelled.
 */
LBUI3d.CameraController.prototype.endTracking = function(isCancel) {
    if (this.onMouseUpFunction) {
        document.removeEventListener('mouseup', this.onMouseUpFunction, false);
        this.onMouseUpFunction = null;
    }
    if (this.onMouseMoveFunction) {
        document.removeEventListener('mousemove', this.onMouseMoveFunction, false);
        this.onMouseUpFunction = null;
    }

    switch (this.trackingState) {
        case LBUI3d.CameraController.TRACKING_STATE_PAN :
            this.finishPan(isCancel);
            break;
            
        case LBUI3d.CameraController.TRACKING_STATE_ROTATE:
            this.finishRotate(isCancel);
            break;
            
        case LBUI3d.CameraController.TRACKING_STATE_ZOOM :
            this.finishZoom(isCancel);
            break;
    }
    
    this.trackingState = LBUI3d.CameraController.TRACKING_STATE_IDLE;
};

/**
 * Starts tracking, called by the mouse down and on touch event handlers when appropriate.
 * @param {Number} x    The x coordinate to start tracking at.
 * @param {Number} y    The y coordinate to start tracking at.
 * @param {Number} timeStamp    The event time stamp.
 * @param {LBUI3d.CameraController.TRACKING_STATE_PAN|LBUI3d.CameraController.TRACKING_STATE_ROTATE} trackingState  The tracking
 * state to enter.
 * @returns {undefined}
 */
LBUI3d.CameraController.prototype.startTracking = function(x, y, timeStamp, trackingState) {
    this.startX = x;
    this.startY = y;

    this.lastX = this.startX;
    this.lastY = this.startY;
    this.lastT = timeStamp;

    this.deltaX = 0;
    this.deltaY = 0;
    this.deltaT = 0;

    this.trackingState = trackingState;
    
    switch (trackingState) {
        case LBUI3d.CameraController.TRACKING_STATE_PAN :
            this.startPan();
            break;

        case LBUI3d.CameraController.TRACKING_STATE_ROTATE :
            this.startRotate();
            break;
            
        case LBUI3d.CameraController.TRACKING_STATE_ZOOM :
            this.startZoom();
            break;
    }
};

/**
 * Called by the mouse and touch move event handlers to track movements.
 * @param {Number} x    The current x coordinate.
 * @param {Number} y    The current y coordinate.
 * @param {Number} timeStamp    The event time stamp.
 * @returns {undefined}
 */
LBUI3d.CameraController.prototype.performTrack = function(x, y, timeStamp) {
    this.deltaX = x - this.lastX;
    this.deltaY = y - this.lastY;
    this.deltaT = timeStamp - this.lastT;

    switch (this.trackingState) {
        case LBUI3d.CameraController.TRACKING_STATE_PAN :
            this.trackPan(x, y, timeStamp);
            break;

        case LBUI3d.CameraController.TRACKING_STATE_ROTATE :
            this.trackRotate(x, y, timeStamp);
            break;
            
        case LBUI3d.CameraController.TRACKING_STATE_ZOOM :
            this.trackZoom(x, y, timeStamp);
            break;
    }

    this.lastX = x;
    this.lastY = y;
    this.lastT = timeStamp;
};


/**
 * Event handler for mouse wheel events.
 * @protected
 * @param {WheelEvent} event   The mouse wheel event.
 */
LBUI3d.CameraController.prototype.onMouseWheel = function(event) {
    if (this.zoomEnabled) {
        event.preventDefault();
        event.stopPropagation();
        
        this.handleMouseWheel(event);
    }
};

/**
 * Event handler for mouse down events.
 * @protected
 * @param {type} event
 */
LBUI3d.CameraController.prototype.onMouseDown = function(event) {
    event.preventDefault();
    
    if (event.button === 0) {
        // Install our mouse move and up event handlers in the document to effectively capture
        // mouse events.
        if (!this.onMouseMoveFuncion) {
            var me = this;
            this.onMouseMoveFunction = function(event) {
                me.onMouseMove(event);
            };

            document.addEventListener('mousemove', this.onMouseMoveFunction, false);
        }

        if (!this.onMouseUpFuncion) {
            var me = this;
            this.onMouseUpFunction = function(event) {
                me.onMouseUp(event);
            };

            document.addEventListener('mouseup', this.onMouseUpFunction, false);
        }
        
        switch (this.mouseMode) {
            case LBUI3d.CameraController.MOUSE_PAN_MODE :
                this.startTracking(event.clientX, event.clientY, event.timeStamp, LBUI3d.CameraController.TRACKING_STATE_PAN);
                break;

            case LBUI3d.CameraController.MOUSE_ROTATE_MODE :
                this.startTracking(event.clientX, event.clientY, event.timeStamp, LBUI3d.CameraController.TRACKING_STATE_ROTATE);
                break;
        }
    }
};

/**
 * The mouse move event handler used when tracking the mouse.
 * @protected
 * @param {MouseEvent} event    The mouse event.
 */
LBUI3d.CameraController.prototype.onMouseMove = function(event) {
    event.preventDefault();
    
    if ((this.trackingState === LBUI3d.CameraController.TRACKING_STATE_PAN)
     || (this.trackingState === LBUI3d.CameraController.TRACKING_STATE_ROTATE)
     || (this.trackingState === LBUI3d.CameraController.TRACKING_STATE_ZOOM)) {
        this.performTrack(event.clientX, event.clientY, event.timeStamp);
    }
};

/**
 * The mouse up event handler.
 * @protected
 * @param {MouseEvent} event    The mouse event.
 */
LBUI3d.CameraController.prototype.onMouseUp = function(event) {
    event.preventDefault();

    this.endTracking(false);
};

function touchDistance(event) {
    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * The touch start event handler.
 * @protected
 * @param {TouchEvent} event    The touch event.
 */
LBUI3d.CameraController.prototype.onTouchStart = function(event) {
    //event.preventDefault();
    
    switch (event.touches.length) {
        case 1 :
            this.startTracking(event.touches[0].pageX, event.touches[0].pageY, event.timeStamp, 
                LBUI3d.CameraController.TRACKING_STATE_ROTATE);
            break;
            
        case 2 :
            this.startTracking(touchDistance(event), 0, event.timeStamp, LBUI3d.CameraController.TRACKING_STATE_ZOOM);
            break;
            
        case 3 :
            this.startTracking(event.touches[0].pageX, event.touches[0].pageY, event.timeStamp, 
                LBUI3d.CameraController.TRACKING_STATE_PAN);
            break;
    }
};

/**
 * The touch move event handler.
 * @protected
 * @param {TouchEvent} event    The touch event.
 */
LBUI3d.CameraController.prototype.onTouchMove = function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    switch (event.touches.length) {
        case 1 :
        case 3 :
            this.performTrack(event.touches[0].pageX, event.touches[0].pageY, event.timeStamp);
            break;
            
        case 2 :
            this.performTrack(touchDistance(event), 0, event.timeStamp);
            break;
    }
};

/**
 * The touch end event handler.
 * @protected
 * @param {TouchEvent} event    The touch event.
 */
LBUI3d.CameraController.prototype.onTouchEnd = function(event) {
    event.preventDefault();
    
    this.endTracking(false);
};

/**
 * Called to handle mouse wheel events by the mouse wheel event handler.
 * This implementation zooms the camera in and out.
 * @protected
 * @param {WheelEvent} event    The wheel event.
 */
LBUI3d.CameraController.prototype.handleMouseWheel = function(event) {
    if (event.deltaY < 0) {
        this.setZoom(this.zoomScale * 0.75);
    }
    else if (event.deltaY > 0) {
        this.setZoom(this.zoomScale * 1.5);
    }
};

/**
 * Changes the zoom of the camera.
 * @param {Number} zoom The zoom scale.
 */
LBUI3d.CameraController.prototype.setZoom = function(zoom) {
    zoom = LBMath.clamp(zoom, this.minZoomScale, this.maxZoomScale);
    if (zoom !== this.zoomScale) {
        if (this.camera.isPerspectiveCamera) {
            this.camera.zoom = zoom;
            this.camera.updateProjectionMatrix();
        }
        
        this.zoomScale = zoom;
    }
};


/**
 * Called to start zooming.
 * @protected
 */
LBUI3d.CameraController.prototype.startZoom = function() {
    this.startZoomScale = this.zoomScale;
};

/**
 * Called to actively track a zoom.
 * @protected
 * @param {Number} x    The tracked x coordinate.
 * @param {Number} y    The tracked y coordinate.
 * @param {Number} timeStamp    The track event time stamp.
 */
LBUI3d.CameraController.prototype.trackZoom = function(x, y, timeStamp) {
    this.setZoom(this.startZoomScale * x / this.startX);
};

/**
 * Called to finish zoom tracking.
 * @protected
 * @param {Boolean} isCancel    If true the zoom should be cancelled.
 */
LBUI3d.CameraController.prototype.finishZoom = function(isCancel) {
    if (isCancel) {
        this.setZoom(this.startZoomScale);
        return;
    }
};


/**
 * Called to start panning.
 * @protected
 */
LBUI3d.CameraController.prototype.startPan = function() {
    
};

/**
 * Called to actively track a pan.
 * @protected
 * @param {Number} x    The tracked x coordinate.
 * @param {Number} y    The tracked y coordinate.
 * @param {Number} timeStamp    The track event time stamp.
 */
LBUI3d.CameraController.prototype.trackPan = function(x, y, timeStamp) {
    
};

/**
 * Called to finish pan tracking.
 * @protected
 * @param {Boolean} isCancel    If true the pan should be cancelled.
 */
LBUI3d.CameraController.prototype.finishPan = function(isCancel) {
    
};

/**
 * Called to start rotating.
 * @protected
 */
LBUI3d.CameraController.prototype.startRotate = function() {
    
};

/**
 * Called to actively track a rotation.
 * @protected
 * @param {Number} x    The tracked x coordinate.
 * @param {Number} y    The tracked y coordinate.
 * @param {Number} timeStamp    The track event time stamp.
 */
LBUI3d.CameraController.prototype.trackRotate = function(x, y, timeStamp) {
    
};

/**
 * Called to finish rotation tracking.
 * @protected
 * @param {Boolean} isCancel    If true the pan should be cancelled.
 */
LBUI3d.CameraController.prototype.finishRotate = function(isCancel) {
    
};


/**
 * Helper used to adjust a rotation matrix to align the camera axis with the presumed
 * local x-axis (the camera view is along its y axis, so we need to rotate the y axis).
 * @protected
 * @param {LBGeometry.Matrix4} mat  The rotation matrix to be adjusted.
 */
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

/**
 * Calculates the presumed distance to the screen based.
 * This currently only supports {@link LBCamera.PerspectiveCamera}s.
 * @returns {Number}    The distance, 0 if not supported.
 */
LBUI3d.CameraController.prototype.calcScreenDistance = function() {
    if (this.camera.isPerspectiveCamera) {
        if (this.view.container) {
            return this.view.container.clientHeight / (2 * Math.tan(this.camera.fov * LBMath.DEG_TO_RAD * 0.5));
        }
    }
    return 0;
};

/**
 * Requests the camera be positioned with a given location and orientation in the local
 * coordinates of the target object.
 * @protected
 * @param {LBGeometry.Vector3} position The requested position.
 * @param {LBUI3d.SphericalOrientation} sphericalOrientation    The requested spherical orientation.
 */
LBUI3d.CameraController.prototype.requestLocalCameraPOV = function(position, sphericalOrientation) {
    // TODO:
    // Need to think about this a bit more.
    // For a local POV, we need to update the local destination, and then convert that
    // to the world POV.
    // For a world POV, we need to update the world destination directly.
    
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
 * @protected
 * @param {Number}  dt  The time step in milliseconds.
 * @returns {undefined}
 */
LBUI3d.CameraController.prototype.updateDestination = function(dt) {
    
};



/**
 * A camera controller that sets itself to a local position and orientation
 * on a target. Basically a first person point of view.
 * @constructor
 * @param {LBUI3d.CameraLimits} [localLimits]   Optional limits on the local camera position.
 * @returns {LBUI3d.LocalPOVCameraController}
 */
LBUI3d.LocalPOVCameraController = function(localLimits) {
    LBUI3d.CameraController.call(this, null, localLimits);
    
    this.localPosition = new LBGeometry.Vector3();
    this.localOrientation = new LBUI3d.SphericalOrientation();
    
    this.forwardAzimuthDeg = 0;
    
    this.deceleration = 1;
};

LBUI3d.LocalPOVCameraController.prototype = Object.create(LBUI3d.CameraController.prototype);
LBUI3d.LocalPOVCameraController.prototype.constructor = LBUI3d.LocalPOVCameraController;

LBUI3d.LocalPOVCameraController.prototype.updateDestination = function(dt) {
    if (this.target) {
        this.requestLocalCameraPOV(this.localPosition, this.localOrientation);
    }
};

LBUI3d.LocalPOVCameraController.prototype.setStandardView = function(view) {
    var azimuthDeg = 0;
    this.localOrientation.altitudeDeg = 0;
    
    switch (view) {
        case LBUI3d.CameraController.VIEW_FWD :
            azimuthDeg = 0;
            break;
        case LBUI3d.CameraController.VIEW_FWD_STBD :
            azimuthDeg = -45;
            break;
        case LBUI3d.CameraController.VIEW_STBD :
            azimuthDeg = -90;
            break;
        case LBUI3d.CameraController.VIEW_AFT_STBD :
            azimuthDeg = -135;
            break;
        case LBUI3d.CameraController.VIEW_AFT :
            azimuthDeg = 180;
            break;
        case LBUI3d.CameraController.VIEW_AFT_PORT :
            azimuthDeg = 135;
            break;
        case LBUI3d.CameraController.VIEW_PORT :
            azimuthDeg = 90;
            break;
        case LBUI3d.CameraController.VIEW_FWD_PORT :
            azimuthDeg = 45;
            break;
        case LBUI3d.CameraController.VIEW_UP :
            azimuthDeg = this.localOrientation.azimuthDeg - this.forwardAzimuthDeg;
            this.localOrientation.altitudeDeg = -90;
            break;
            
        default :
            return;
    }
    
    this.localOrientation.azimuthDeg = azimuthDeg + this.forwardAzimuthDeg;
    this.requestLocalCameraPOV(this.localPosition, this.localOrientation);
};

LBUI3d.LocalPOVCameraController.prototype.rotatePOVDeg = function(horzDeg, vertDeg) {
    this.localOrientation.azimuthDeg += horzDeg;
    this.localOrientation.altitudeDeg += vertDeg;
    this.requestLocalCameraPOV(this.localPosition, this.localOrientation);
};


LBUI3d.LocalPOVCameraController.prototype.panPOV = function(dx, dy) {
    this.localPosition.x += dx;
    this.localPosition.y += dy;
    this.requestLocalCameraPOV(this.localPosition, this.localOrientation);
};


LBUI3d.LocalPOVCameraController.prototype.startPan = function() {
    this.originalLocalPosition = LBGeometry.copyOrCloneVector3(this.originalLocalPosition, this.localPosition);
    this.originalLocalOrientation = LBUI3d.SphericalOrientation.copyOrClone(this.originalLocalOrientation, 
        this.localOrientation);
        
    this.screenDistance = this.calcScreenDistance();
};


LBUI3d.LocalPOVCameraController.prototype.trackPan = function(x, y, timeStamp) {
};


LBUI3d.LocalPOVCameraController.prototype.finishPan = function(isCancel) {
    if (isCancel) {
        this.localPosition.copy(this.originalLocalPosition);
        this.localOrientation.copy(this.originalLocalOrientation);
        this.requestLocalCameraPOV(this.localPosition, this.localOrientation);
        return;
    }
};


LBUI3d.LocalPOVCameraController.prototype.calcOrientationFromScreenPos = function(x, y, store) {
    store = store || new LBUI3d.SphericalOrientation();
    
    var dx = x - this.view.container.clientWidth / 2;
    var dy = y - this.view.container.clientHeight / 2;
    
    store.azimuthDeg = Math.atan2(dx, this.screenDistance) * LBMath.RAD_TO_DEG;
    store.altitudeDeg = -Math.atan2(dy, this.screenDistance) * LBMath.RAD_TO_DEG;

    return store;
};


LBUI3d.LocalPOVCameraController.prototype.startRotate = function() {
    this.originalLocalPosition = LBGeometry.copyOrCloneVector3(this.originalLocalPosition, this.localPosition);
    this.originalLocalOrientation = LBUI3d.SphericalOrientation.copyOrClone(this.originalLocalOrientation, 
        this.localOrientation);
        

    this.screenDistance = this.calcScreenDistance();
    if (this.screenDistance) {
        this.startOrientation = this.calcOrientationFromScreenPos(this.startX, this.startY, this.startOrientation);
    }
};


LBUI3d.LocalPOVCameraController.prototype.trackRotate = function(x, y, timeStamp) {
    if (!this.screenDistance) {
        return;
    }
    
    this.prevLocalOrientation = LBUI3d.SphericalOrientation.copyOrClone(this.prevLocalOrientation, 
        this.localOrientation);

    this.workingOrientation = this.calcOrientationFromScreenPos(x, y, this.workingOrientation);
    
    this.workingOrientation.azimuthDeg += this.originalLocalOrientation.azimuthDeg - this.startOrientation.azimuthDeg;
    this.workingOrientation.altitudeDeg += this.originalLocalOrientation.altitudeDeg - this.startOrientation.altitudeDeg;
    
    this.localOrientation.copy(this.workingOrientation);
    this.requestLocalCameraPOV(this.localPosition, this.localOrientation);
};


LBUI3d.LocalPOVCameraController.prototype.finishRotate = function(isCancel) {
    if (isCancel) {
        this.localOrientation.copy(this.originalLocalOrientation);
        this.requestLocalCameraPOV(this.localPosition, this.localOrientation);
        return;
    }
    
    if ((this.deltaT > 0) && (this.deceleration > 0)) {
        // If we have an orientation change, then we have a velocity that we can 
        // decelerate to 0.
        var vAzimuthDeg = (this.localOrientation.azimuthDeg - this.prevLocalOrientation.azimuthDeg) / this.deltaT;
        if (LBMath.isLikeZero(vAzimuthDeg)) {
            vAzimuthDeg = 0;
        }

        var vAltitudeDeg = (this.localOrientation.altitudeDeg - this.prevLocalOrientation.altitudeDeg) / this.deltaT;
        if (LBMath.isLikeZero(vAltitudeDeg)) {
            vAltitudeDeg = 0;
        }
        
        // a = dV/dt
        // dt = V/a
        var dtAzimuth = vAzimuthDeg / this.deceleration;
        var dtAltitude = vAltitudeDeg / this.deceleration;
        var dt = Math.max(dtAzimuth, dtAltitude);
        var dtSq = dt * dt;
        var deltaAzimuthDeg = vAzimuthDeg * dtSq;
        var deltaAltitudeDeg = vAltitudeDeg * dtSq;
        
        this.localOrientation.azimuthDeg += deltaAzimuthDeg;
        this.localOrientation.altitudeDeg += deltaAltitudeDeg;
        
        // TODO:
        // Now we need to set the destination, along with how we're going to get there.
        
    }
};


/**
 * A camera controller that tries to follow the target at a given position relative to the
 * target. This differs from {@link LBUI3d.LocalPOVCameraController} in that for this
 * the camera is looking at the target, whereas for the first person controller the
 * camera is looking from the target.
 * @constructor
 * @param {LBUI3d.CameraLimits} [globalLimits]   Optional limits on the global camera position.
 * @returns {LBUI3d.LocalPOVCameraController}
 */
LBUI3d.FollowCameraController = function(globalLimits) {
    LBUI3d.CameraController.call(this, globalLimits);
};

LBUI3d.FollowCameraController.prototype = Object.create(LBUI3d.CameraController.prototype);
LBUI3d.FollowCameraController.prototype.constructor = LBUI3d.FollowCameraController;


return LBUI3d;
});
