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

define(['lbui3dbase', 'lbgeometry', 'lbmath', 'lbutil', 'lbspherical', 'lbtracking'],
function(LBUI3d, LBGeometry, LBMath, LBUtil, LBSpherical, LBTracking) {

    'use strict';
    

/**
 * My 3D application framework module, these classes all rely upon ThreeJS.
 * If this description and the LBUI3d static members appear multiple times in the docs,
 * that's a limitation of JSDoc: {@link https://github.com/jsdoc3/jsdoc/issues/515}.
 * @exports LBUI3d
 */
var LBUI3d = LBUI3d || {};


/**
 * Object that defines camera limits.
 * @constructor
 * @returns {module:LBUI3d.CameraLimits}
 */
LBUI3d.CameraLimits = function() {
    /**
     * The minimum allowed position.
     * @member {module:LBGeometry.Vector3}
     */
    this.minPos = new LBGeometry.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

    /**
     * The maximum allowed position.
     * @member {module:LBGeometry.Vector3}
     */
    this.maxPos = new LBGeometry.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    
    /**
     * The allowed range for azimuth degrees.
     * @member {module:LBMath.DegRange}
     */
    this.azimuthRange = new LBMath.DegRange(-180, 360);
    
    /**
     * The allowed range for elevation degrees. Note that by default we avoid
     * 90 and -90 degrees, which become degenerate.
     * @member {module:LBMath.DegRange}
     */
    this.elevationRange = new LBMath.DegRange(LBUI3d.CameraLimits.LOWER_ELEVATION_DEG_LIMIT, 
            LBUI3d.CameraLimits.UPPER_ELEVATION_DEG_LIMIT - LBUI3d.CameraLimits.LOWER_ELEVATION_DEG_LIMIT);
    
    /**
     * The allowed range for rotation degrees.
     * @member {module:LBMath.DegRange}
     */
    this.rotationRange = new LBMath.DegRange(-180, 360);
};

/**
 * The recommended and default upper limit for the elevation angle, in degrees.
 * @constant
 */
LBUI3d.CameraLimits.UPPER_ELEVATION_DEG_LIMIT = 89.99;

/**
 * The recommended and default lower limit for the elevation angle, in degrees.
 * @constant
 */
LBUI3d.CameraLimits.LOWER_ELEVATION_DEG_LIMIT = -89.99;

LBUI3d.CameraLimits.prototype = {
    /**
     * Applies the camera limits to a position and spherical orientation.
     * srcPosition and srcOrientation are not modified unless they are the same as
     * dstPosition and dstOrientation, respectively.
     * @param {module:LBGeometry.Vector3} srcPosition  The position to be limited if necessary.
     * @param {module:LBSpherical.Orientation} srcOrientation  The orientation to be limited if necessary.
     * @param {module:LBGeometry.Vector3} dstPosition  Set to the position, limited if necessary.
     * @param {module:LBSpherical.Orientation} dstOrientation  Set to the orientation, limited if necessary.
     */
    applyLimits: function(srcPosition, srcOrientation, dstPosition, dstOrientation) {
        if (dstPosition && srcPosition) {
            this.applyPositionLimits(srcPosition, dstPosition);
        }
        
        if (dstOrientation && srcOrientation) {
            this.applyOrientationLimits(srcOrientation, dstOrientation);
        }
    },
    
    /**
     * Applies the camera limits to a position.
     * @param {module:LBGeometry.Vector3} srcPosition  The position to be limited if necessary. This
     * is not modified unless it is the same object as dstPosition.
     * @param {module:LBGeometry.Vector3} dstPosition  Set to srcPosition, limited as necessary.
     * @returns {module:LBUI3d.CameraLimits}   this.
     */
    applyPositionLimits: function(srcPosition, dstPosition) {
        dstPosition.set(
                LBMath.clamp(srcPosition.x, this.minPos.x, this.maxPos.x), 
                LBMath.clamp(srcPosition.y, this.minPos.y, this.maxPos.y), 
                LBMath.clamp(srcPosition.z, this.minPos.z, this.maxPos.z));
        return this;
    },
    
    /**
     * Applies the camera limits to a orientation.
     * @param {module:LBSpherical.Orientation} srcOrientation  The orientation to be limited if necessary. This
     * is not modified unless it is the same object as dstOrientation.
     * @param {module:LBSpherical.Orientation} dstOrientation  Set to srcOrientation, limited if necessary.
     * @returns {module:LBUI3d.CameraLimits}   this.
     */
    applyOrientationLimits: function(srcOrientation, dstOrientation) {
        dstOrientation.azimuthDeg = this.azimuthRange.clampToRange(srcOrientation.azimuthDeg);
        dstOrientation.elevationDeg = this.elevationRange.clampToRange(srcOrientation.elevationDeg);
        dstOrientation.rotationDeg = this.rotationRange.clampToRange(srcOrientation.rotationDeg);
        return this;
    },

    constructor: LBUI3d.CameraLimits
};


var _workingPosition = new LBGeometry.Vector3();
var _workingOrientation = new LBSpherical.Orientation();
var _workingVector3 = new LBGeometry.Vector3();
var _workingMatrix4 = new LBGeometry.Matrix4();

/**
 * Base class for an object that controls a camera. Typical camera controllers
 * are associated with an {@link module:LBGeometry.Object3D}, which we call the target.
 * <p>
 * Camera controllers normally work within the context of an {@link module:LBUI3d.View3D}.
 * <p>
 * Depending upon the controller the camera may be panned or rotated.
 * <p>
 * The camera controllers are loosely based upon the camera controllers found in ThreeJS's 
 * examples/js/controls folder, such as OrbitControls.js and FirstPersonControls.js.
 * @constructor
 * @param {module:LBUI3d.CameraLimits} [worldLimits]   Optional limits on the world camera position.
 * @param {module:LBUI3d.CameraLimits} [localLimits]   Optional limits on the local camera position.
 * @returns {module:LBUI3d.CameraController}
 */
LBUI3d.CameraController = function(worldLimits, localLimits) {
    /**
     * The world limits applied to the camera position.
     * @member {module:LBUI3d.CameraLimits}
     */
    this.worldLimits = worldLimits || new LBUI3d.CameraLimits();

    /**
     * The local limits applied to the camera position.
     * @member {module:LBUI3d.CameraLimits}
     */
    this.localLimits = localLimits || new LBUI3d.CameraLimits();
    
    /**
     * The current camera position in world coordinates.
     * @member {module:LBGeometry.Vector3}
     */
    this.currentPosition = new LBGeometry.Vector3();
    
    /**
     * The current camera orientation in world coordinates.
     * @member {module:LBGeometry.Quaternion}
     */
    this.currentQuaternion = new LBGeometry.Quaternion();
    
    /**
     * The current mouse mode.
     * @member {module:LBUI3d.CameraController.MOUSE_PAN_MODE|LBUI3d.CameraController.MOUSE_ROTATE_MODE}
     */
    this.mouseMode = -1;
    
    /**
     * Enables tracked zooming if true.
     * @member {Boolean}
     */
    this.zoomEnabled = true;
    
    /**
     * The current camera zoom scale.
     * @member {Number}
     */
    this.zoomScale = 1;
    
    /**
     * The minimum camera zoom scale.
     * @member {Number}
     */
    this.minZoomScale = 0.025;
    
    /**
     * The maximum camera zoom scale.
     * @member {Number}
     */
    this.maxZoomScale = 150;
    
    /**
     * The current tracking state.
     * @member {module:LBUI3d.CameraController.TRACKING_STATE_IDLE|LBUI3d.CameraController.TRACKING_STATE_PAN|LBUI3d.CameraController.TRACKING_STATE_ROTATE|LBUI3d.CameraController.TRACKING_STATE_ZOOM}
     */
    this.trackingState = LBUI3d.CameraController.TRACKING_STATE_IDLE;
};

LBUI3d.CameraController.prototype = {
    constructor: LBUI3d.CameraController
};

/**
 * Sets the target for the controller.
 * @param {module:LBGeometry.Object3D} target  The target.
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
 * @param {module:LBUI3d.CameraController.MOUSE_PAN_MODE|LBUI3d.CameraController.MOUSE_ROTATE_MODE} mode The mouse mode.
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
 * Pans the camera point of view horizontarrow_forwardall or vertically
 * @param {Number} dx   The amount to pan horizontally.
 * @param {Number} dy   The amount to pan vertically.
 */
LBUI3d.CameraController.prototype.panPOV = function(dx, dy) {
    
};

/**
 * Installs event handlers for the controller in a DOM element. The handlers can be
 * uninstalled by calling {@link module:LBUI3d.CameraController.prototype.uninstallEventHandlers}.
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
 * {@link module:LBUI3d.CameraController.prototype.installEventHandlers}.
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
 * @param {module:LBUI3d.CameraController.TRACKING_STATE_PAN|LBUI3d.CameraController.TRACKING_STATE_ROTATE} trackingState  The tracking
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
    this.deltaT = (timeStamp - this.lastT) / 1000;

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
 * Calculates the presumed distance to the screen based.
 * This currently only supports {@link module:LBCamera.PerspectiveCamera}s.
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
 * Calculates the spherical orientation from the camera POV to a point on the screen.
 * Presumes {@link module:LBUI3d.LocalPOVCameraController#screenDistance} has been set to a valid distance.
 * @param {Number} x    The x coordinate of the point on the screen in the view container's client coordinates.
 * @param {Number} y    The y coordinate of the point on the screen in the view container's client coordinates.
 * @param {Number} screenDistance   The screen distance.
 * @param {module:LBSpherical.Orientation} [store] If defined the object to store the orientation into.
 * @returns {module:LBSpherical.Orientation}   The spherical orientation
 */
LBUI3d.CameraController.prototype.calcOrientationFromScreenPos = function(x, y, screenDistance, store) {
    store = store || new LBSpherical.Orientation();
    
    if (screenDistance > 0) {
        var dx = x - this.view.container.clientWidth / 2;
        var dy = y - this.view.container.clientHeight / 2;

        store.azimuthDeg = -Math.atan2(dx, screenDistance) * LBMath.RAD_TO_DEG;
        store.elevationDeg = Math.atan2(dy, screenDistance) * LBMath.RAD_TO_DEG;
    }
    else {
        store.zero();
    }

    return store;
};


/**
 * Helper used to adjust a rotation matrix to align the camera axis with the presumed
 * local x-axis (the camera view is along its y axis, so we need to rotate the y axis).
 * @protected
 * @param {module:LBGeometry.Matrix4} mat  The rotation matrix to be adjusted.
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
 * Converts a camera position and spherical orientation in target local coordinates to
 * a world position and quaternion.
 * @param {module:LBGeometry.Vector3} localPos The local position.
 * @param {module:LBSpherical.Orientation} localOrientation    The local spherical orientation.
 * @param {module:LBGeometry.Vector3} worldPos Set to the world position.
 * @param {module:LBGeometry.Quaternion} worldQuaternion   Set to the quaternion representing the orientation in world coordinates.
 * @returns {undefined}
 */
LBUI3d.CameraController.prototype.localPosOrientationToWorldPosQuaternion = function(localPos, localOrientation, worldPos, worldQuaternion) {
    this.localLimits.applyLimits(localPos, localOrientation, _workingPosition, _workingOrientation);
    
    var mat = _workingOrientation.toMatrix4(_workingMatrix4);
    LBUI3d.CameraController.adjustMatForCameraAxis(mat);
    mat.setPosition(_workingPosition);

    if (this.target) {
        this.target.updateMatrixWorld();
        mat.premultiply(this.target.matrixWorld);
    }
    
    mat.decompose(worldPos, worldQuaternion, _workingVector3);
};


/**
 * Converts a camera position and spherical orientation in world coordinates to
 * a world position and quaternion, adjusting for the camera alignment.
 * @param {module:LBSpherical.Orientation} worldOrientation    The local spherical orientation.
 * @param {module:LBGeometry.Quaternion} worldQuaternion   Set to the quaternion representing the orientation in world coordinates.
 * @returns {undefined}
 */
LBUI3d.CameraController.prototype.worldOrientationToWorldQuaternion = function(worldOrientation, worldQuaternion) {
    this.worldLimits.applyOrientationLimits(worldOrientation, _workingOrientation);
    
    var mat = _workingOrientation.toMatrix4(_workingMatrix4);
    LBUI3d.CameraController.adjustMatForCameraAxis(mat);
    
    mat.decompose(_workingPosition, worldQuaternion, _workingVector3);
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
    this.updateCameraPosition(dt, this.currentPosition, this.currentQuaternion);

    if (updateCamera) {
        var coordMapping = (this.view && this.view.scene3D) ? this.view.scene3D.coordMapping : LBUI3d.DirectCoordMapping;
        coordMapping.vector3ToThreeJS(this.currentPosition, this.camera.position);
        coordMapping.quaternionToThreeJS(this.currentQuaternion, this.camera.quaternion);
    }
};


/**
 * Called by {@link module:LBUI3d.CameraController#update} to update the current camera position
 * @protected
 * @param {Number}  dt  The time step in milliseconds.
 * @param {module:LBGeometry.Vector3} position The camera world coordinates position to be updated.
 * @param {module:LBGeometry.Quaternion} quaternion    The camera world coordinates quaternion to be update.
 * @returns {undefined}
 */
LBUI3d.CameraController.prototype.updateCameraPosition = function(dt, position, quaternion) {
    
};



/**
 * A camera controller that sets itself to a local position and orientation
 * on a target. Basically a first person point of view.
 * @constructor
 * @param {module:LBUI3d.CameraLimits} [localLimits]   Optional limits on the local camera position.
 * @returns {module:LBUI3d.LocalPOVCameraController}
 */
LBUI3d.LocalPOVCameraController = function(localLimits) {
    LBUI3d.CameraController.call(this, null, localLimits);
    
    /**
     * The current local camera position.
     * @member {module:LBGeometry.Vector3}
     */
    this.localPosition = new LBGeometry.Vector3();
    
    /**
     * The current camera spherical orientation.
     * @member {module:LBSpherical.Orientation}
     */
    this.localOrientation = new LBSpherical.Orientation();
    
    /**
     * This is used to determine the azimuth of the forward direction for the standard views.
     * @member {Number}
     */
    this.forwardAzimuthDeg = 0;
    
    /**
     * The deceleration value to use for position, when decelerating after a mouse up
     * with position velocity. In position units/second^2.
     * @member {Number}
     */
    this.positionDecel = 1;
    
    /**
     * The deceleration value to use for orientation degrees, when decelerating after a mouse up
     * with orientation velocity. In degrees/second^2.
     * @member {Number}
     */
    this.degDecel = 1800;
    
    /**
     * The maximum number of seconds to allow for decelerating after a mouse up with position
     * or orientation velocity.
     * @member {Number}
     */
    this.maxTransitionTime = 5;
    
    /**
     * The current transition time in seconds when decelerating after a mouse up with position or orientation
     * velocity. 0 if not decelerating.
     */
    this.currentDecelerationTime = 0;
};

LBUI3d.LocalPOVCameraController.prototype = Object.create(LBUI3d.CameraController.prototype);
LBUI3d.LocalPOVCameraController.prototype.constructor = LBUI3d.LocalPOVCameraController;

/**
 * Updates a velocity value for decelerating to zero velocity.
 * @param {Number} dt   The time step.
 * @param {Number} vel  The velocity to decelerate towards zero.
 * @param {Number} decel    The deceleration rate, must be &geq; 0.
 * @returns {Number}    The updated velocity.
 */
function decelVelTowardsZero(dt, vel, decel) {
    if (vel > 0) {
        vel -= dt * decel;
        return Math.max(vel, 0);
    }
    else if (vel < 0) {
        vel += dt * decel;
        return Math.min(vel, 0);
    }
    return vel;
};

/**
 * Calculates the time to decelerate a velocity to zero given the deceleration rate.
 * @param {Number} vel  The velocity.
 * @param {Number} decel    The deceleration, the sign is ignored.
 * @returns {Number}    The time required to decelerate vel to 0.
 */
function calcDecelTimeToZero(vel, decel) {
    // dV / dT = a
    return Math.abs(vel / decel);
};

/**
 * Calculates the deceleration rate for decelerating a velocity to zero over a given time.
 * @param {Number} vel  The velocity.
 * @param {Number} time The time.
 * @returns {Number}    The absolute value of the deceleration.
 */
function calcDecelRateForTime(vel, time) {
    // dV / dT = a
    return Math.abs(vel / time);
};


/**
 * Called by {@link module:LBUI3d.CameraController#update} to update the current camera position
 * @protected
 * @override
 * @param {Number}  dt  The time step in milliseconds.
 * @param {module:LBGeometry.Vector3} position The camera world coordinates position to be updated.
 * @param {module:LBGeometry.Quaternion} quaternion    The camera world coordinates quaternion to be update.
 * @returns {undefined}
 */
LBUI3d.LocalPOVCameraController.prototype.updateCameraPosition = function(dt, position, quaternion) {
    if (this.target) {
        if (this.currentDecelerationTime > 0) {
            dt = Math.min(dt, this.currentDecelerationTime);
            this.currentDecelerationTime -= dt;
            
            this.localPosition.x += this.localPositionVel.x * dt;
            this.localPosition.y += this.localPositionVel.y * dt;
            this.localPositionVel.x = decelVelTowardsZero(dt, this.localPositionVel.x, this.localPositionDecel.x);
            this.localPositionVel.y = decelVelTowardsZero(dt, this.localPositionVel.y, this.localPositionDecel.y);
            
            // Probably want to convert this to quaternion based...
            this.localOrientation.elevationDeg += this.localOrientationVel.elevationDeg * dt;
            this.localOrientation.azimuthDeg += this.localOrientationVel.azimuthDeg * dt;
            
            this.localOrientationVel.elevationDeg = decelVelTowardsZero(dt, this.localOrientationVel.elevationDeg, 
                this.localOrientationDecel.elevationDeg);
            this.localOrientationVel.azimuthDeg = decelVelTowardsZero(dt, this.localOrientationVel.azimuthDeg, 
                this.localOrientationDecel.azimuthDeg);
        }
        
        this.localPosOrientationToWorldPosQuaternion(this.localPosition, this.localOrientation, position, quaternion);
    }
};

/**
 * Sets the point of view of the camera to a specific position and spherical orientation.
 * @param {module:LBGeometry.Vector3} position The local position.
 * @param {module:LBSpherical.Orientation} sphericalOrientation    The spherical orientation.
 * @returns {undefined}
 */
LBUI3d.LocalPOVCameraController.prototype.setLocalCameraPOV = function(position, sphericalOrientation) {
    this.localPosition.copy(position);
    this.localOrientation.copy(sphericalOrientation);
};

/**
 * Requests the point of view of the camera be decelerated to 0 velocity given an initial velocity.
 * @param {module:LBGeometry.Vector3} positionVel The local position velocity.
 * @param {module:LBSpherical.Orientation} orientationVel    The spherical orientation velocity.
 * @returns {undefined}
 */
LBUI3d.LocalPOVCameraController.prototype.requestLocalCameraPOVDeceleration = function(positionVel, orientationVel) {
    // Figure out the longest time to decel to zero.
    // Then figure out the deceleration rates to take that time to zero.
    var dt = calcDecelTimeToZero(positionVel.x, this.positionDecel);
    dt = Math.max(dt, calcDecelTimeToZero(positionVel.y, this.positionDecel));
    dt = Math.max(dt, calcDecelTimeToZero(orientationVel.azimuthDeg, this.degDecel));
    dt = Math.max(dt, calcDecelTimeToZero(orientationVel.elevationDeg, this.degDecel));
    dt = Math.min(dt, this.maxTransitionTime);
    
    if (LBMath.isLikeZero(dt)) {
        this.currentDecelerationTime = 0;
        return;
    }
    
    this.currentDecelerationTime = dt;
    this.localPositionVel = LBUtil.copyOrClone(this.localPositionVel, positionVel);
    this.localOrientationVel = LBUtil.copyOrClone(this.localOrientationVel, orientationVel);
    
    this.localPositionDecel = this.localPositionDecel || new LBGeometry.Vector3();
    this.localPositionDecel.x = calcDecelRateForTime(positionVel.x, dt);
    this.localPositionDecel.y = calcDecelRateForTime(positionVel.y, dt);
    
    this.localOrientationDecel = this.localOrientationDecel || new LBSpherical.Orientation();
    this.localOrientationDecel.azimuthDeg = calcDecelRateForTime(orientationVel.azimuthDeg, dt);
    this.localOrientationDecel.elevationDeg = calcDecelRateForTime(orientationVel.elevationDeg, dt);
};


/**
 * Sets one of the standard views.
 * @override
 * @param {Number} view One of the LBUI3d.CameraController.VIEW_x values.
 */
LBUI3d.LocalPOVCameraController.prototype.setStandardView = function(view) {
    var azimuthDeg = 0;
    this.localOrientation.elevationDeg = 0;
    
    switch (view) {
        case LBUI3d.CameraController.VIEW_FWD :
            azimuthDeg = 0;
            break;
        case LBUI3d.CameraController.VIEW_FWD_STBD :
            azimuthDeg = 45;
            break;
        case LBUI3d.CameraController.VIEW_STBD :
            azimuthDeg = 90;
            break;
        case LBUI3d.CameraController.VIEW_AFT_STBD :
            azimuthDeg = 135;
            break;
        case LBUI3d.CameraController.VIEW_AFT :
            azimuthDeg = 180;
            break;
        case LBUI3d.CameraController.VIEW_AFT_PORT :
            azimuthDeg = -135;
            break;
        case LBUI3d.CameraController.VIEW_PORT :
            azimuthDeg = -90;
            break;
        case LBUI3d.CameraController.VIEW_FWD_PORT :
            azimuthDeg = -45;
            break;
        case LBUI3d.CameraController.VIEW_UP :
            azimuthDeg = this.localOrientation.azimuthDeg - this.forwardAzimuthDeg;
            this.localOrientation.elevationDeg = 89;
            break;
            
        default :
            return;
    }
    
    this.localOrientation.azimuthDeg = azimuthDeg + this.forwardAzimuthDeg;
    this.setLocalCameraPOV(this.localPosition, this.localOrientation);
};


/**
 * Rotates the camera point of view horizontally and/or vertically.
 * @override
 * @param {Number} horzDeg  The number of degrees to rotate horizontally.
 * @param {Number} vertDeg  The number of degrees to rotate vertically.
 */
LBUI3d.LocalPOVCameraController.prototype.rotatePOVDeg = function(horzDeg, vertDeg) {
    this.localOrientation.azimuthDeg += horzDeg;
    this.localOrientation.elevationDeg += vertDeg;
    this.setLocalCameraPOV(this.localPosition, this.localOrientation);
};


/**
 * Pans the camera point of view horizontall or vertically
 * @param {Number} dx   The amount to pan horizontally.
 * @param {Number} dy   The amount to pan vertically.
 */
LBUI3d.LocalPOVCameraController.prototype.panPOV = function(dx, dy) {
    this.localPosition.x += dx;
    this.localPosition.y += dy;
    this.setLocalCameraPOV(this.localPosition, this.localOrientation);
};


/**
 * Called to start panning.
 * @override
 * @protected
 */
LBUI3d.LocalPOVCameraController.prototype.startPan = function() {
    this.originalLocalPosition = LBUtil.copyOrClone(this.originalLocalPosition, this.localPosition);
    this.originalLocalOrientation = LBUtil.copyOrClone(this.originalLocalOrientation, 
        this.localOrientation);
        
    this.screenDistance = this.calcScreenDistance();
};


/**
 * Called to actively track a pan.
 * @protected
 * @override
 * @param {Number} x    The tracked x coordinate.
 * @param {Number} y    The tracked y coordinate.
 * @param {Number} timeStamp    The track event time stamp.
 */
LBUI3d.LocalPOVCameraController.prototype.trackPan = function(x, y, timeStamp) {
};


/**
 * Called to finish pan tracking.
 * @protected
 * @override
 * @param {Boolean} isCancel    If true the pan should be cancelled.
 */
LBUI3d.LocalPOVCameraController.prototype.finishPan = function(isCancel) {
    if (isCancel) {
        this.localPosition.copy(this.originalLocalPosition);
        this.localOrientation.copy(this.originalLocalOrientation);
        this.setLocalCameraPOV(this.localPosition, this.localOrientation);
        return;
    }
};


/**
 * Called to start rotating.
 * @override
 * @protected
 */
LBUI3d.LocalPOVCameraController.prototype.startRotate = function() {
    this.currentDecelerationTime = 0;
    
    this.originalLocalPosition = LBUtil.copyOrClone(this.originalLocalPosition, this.localPosition);
    this.originalLocalOrientation = LBUtil.copyOrClone(this.originalLocalOrientation, 
        this.localOrientation);
        

    this.screenDistance = this.calcScreenDistance();
    if (this.screenDistance) {
        this.startOrientation = this.calcOrientationFromScreenPos(this.startX, this.startY, this.screenDistance, this.startOrientation);
    }
};


/**
 * Called to actively track a rotation.
 * @protected
 * @override
 * @param {Number} x    The tracked x coordinate.
 * @param {Number} y    The tracked y coordinate.
 * @param {Number} timeStamp    The track event time stamp.
 */
LBUI3d.LocalPOVCameraController.prototype.trackRotate = function(x, y, timeStamp) {
    if (!this.screenDistance) {
        return;
    }
    
    this.prevLocalOrientation = LBUtil.copyOrClone(this.prevLocalOrientation, 
        this.localOrientation);

    this.workingOrientation = this.calcOrientationFromScreenPos(x, y, this.screenDistance, this.workingOrientation);
    
    this.workingOrientation.azimuthDeg += this.originalLocalOrientation.azimuthDeg - this.startOrientation.azimuthDeg;
    this.workingOrientation.elevationDeg += this.originalLocalOrientation.elevationDeg - this.startOrientation.elevationDeg;
    
    this.localOrientation.copy(this.workingOrientation);
    this.setLocalCameraPOV(this.localPosition, this.localOrientation);
};


/**
 * Called to finish rotation tracking.
 * @protected
 * @override
 * @param {Boolean} isCancel    If true the pan should be cancelled.
 */
LBUI3d.LocalPOVCameraController.prototype.finishRotate = function(isCancel) {
    if (isCancel) {
        this.localOrientation.copy(this.originalLocalOrientation);
        this.setLocalCameraPOV(this.localPosition, this.localOrientation);
        return;
    }
    
    if ((this.deltaT > 0) && (this.degDecel > 0)) {
        this.localOrientationVel = this.localOrientationVel || new LBSpherical.Orientation();
        
        // If we have an orientation change, then we have a velocity that we can 
        // decelerate to 0.
        this.localOrientationVel.azimuthDeg = (this.localOrientation.azimuthDeg - this.prevLocalOrientation.azimuthDeg) / this.deltaT;
        this.localOrientationVel.elevationDeg = (this.localOrientation.elevationDeg - this.prevLocalOrientation.elevationDeg) / this.deltaT;
        
        this.requestLocalCameraPOVDeceleration(LBGeometry.ZERO, this.localOrientationVel);
    }
};


/**
 * A camera controller that acts as a chase, it follows the target at a given location relative to the
 * target's local coordinate system. This differs from {@link module:LBUI3d.LocalPOVCameraController} in that for this
 * the camera is looking towards the target, whereas for the first person controller the
 * camera is looking from the target.
 * <p>
 * How the controller updates the camera's position and orientation is determined by the
 * chase mode.
 * <p>
 * For {@link module:LBUI3d.ChaseCameraController.CHASE_MODE_LOCAL}, the controller tries to
 * update the camera such that the target stays fixed relative to the camera. The location
 * of the camera is specified relative to the target via {@link module:LBUI3d.ChaseCameraController#desiredCoordinates},
 * which is a {@link module:LBSpherical.CoordinatesRAE}. The reference orientation of the camera
 * is based upon a local reference orientation frame relative to the target's local
 * coordinates where the x axis points to the target and the z axis is in the same direction
 * as the target's z axis when the elevation and azimuth angles are zero. 
 * {@link module:LBUI3d.ChaseCameraController#desiredOrientation} is then added to this local
 * reference orientation to obtain the camera's orientation in the target's local
 * coordinate system.
 * <p>
 * For {@link module:LBUI3d.ChaseCameraController.CHASE_MODE_WORLD}, the controller tries to
 * update the camera such that the camera maintains a fixed world height, but in the horizontal
 * plane stays at the same azimuth angle relative to the target's local coordinates.
 * The reference orientation of the camera is based upon a reference orientation frame
 * that is pointed at the target. This reference frame is in world coordinates.
 * {@link module:LBUI3d.ChaseCameraController#desiredOrientation} is then added to this 
 * orientation reference frame to obtain the camera's orientation in world coordinates.
 * <p>
 * Rotation/zoom have the effect of moving the location of the camera relative to the target's
 * local coordinate system, while panning has the effect of changing the orientation of the camera
 * within its local orientation frame.
 * @constructor
 * @param {Number} [distance]   The distance from the target to set up the camera at.
 * @param {module:LBUI3d.ChaseCameraController.CHASE_MODE_LOCAL|LBUI3d.ChaseCameraController.CHASE_MODE_LOCAL} 
 * [chaseMode=LBUI3d.ChaseCameraController.CHASE_MODE_LOCAL]  The orientation mode, determines how
 * the camera's orientation is changed as the camera tracks the target.
 * @param {module:LBUI3d.CameraLimits} [globalLimits]   Optional limits on the global camera position.
 * @returns {module:LBUI3d.LocalPOVCameraController}
 */
LBUI3d.ChaseCameraController = function(distance, chaseMode, globalLimits) {
    distance = distance || 10;
    
    LBUI3d.CameraController.call(this, globalLimits);
    
    /**
     * The chase mode, how the camera's orientation is updated as the target is
     * tracked.
     * @member {module:LBUI3d.ChaseCameraController.CHASE_MODE_LOCAL|LBUI3d.ChaseCameraController.CHASE_MODE_LOCAL} 
     */
    this.chaseMode = chaseMode || LBUI3d.ChaseCameraController.CHASE_MODE_LOCAL;
    
    /**
     * The desired position of the camera relative to the target's local coordinate system, in
     * spherical coordinates.
     * @member {module:LBSpherical.CoordinatesRAE}
     */
    this.desiredCoordinates = new LBSpherical.CoordinatesRAE(distance);
    
    /**
     * The desired orientation of the camera relative to a reference frame that has
     * the camera pointing at the target and the z axis up.
     * @member {module:LBSpherical.Orientation}
     */
    this.desiredOrientation = new LBSpherical.Orientation();
    
    /**
     * The deceleration value to use for the desired coodrinates, when decelerating after a mouse up
     * with coordinates velocity. In position units/second^2.
     * @member {Number}
     */
    this.coordinatesDecel = 1800;
    
    /**
     * The deceleration value to use for orientation degrees, when decelerating after a mouse up
     * with orientation velocity. In degrees/second^2.
     * @member {Number}
     */
    this.degDecel = 1800;
    
    /**
     * The maximum number of seconds to allow for decelerating after a mouse up with position
     * or orientation velocity.
     * @member {Number}
     */
    this.maxTransitionTime = 5;
    
    /**
     * The value follower used to track the target's z coordinate in world chase mode,
     * helps prevent the camera from bouncing up and down if the target's z coordinate
     * is only varying slightly.sw
     */
    this.worldZValueFollower = new LBTracking.ValueFollower();
    
    this.currentDecelerationTime = 0;
    
    this.desiredCoordinatesVel = new LBSpherical.CoordinatesRAE();
    this.desiredOrientationVel = new LBSpherical.Orientation();
    
    this.desiredCoordinatesDecel = new LBSpherical.CoordinatesRAE();
    this.desiredOrientationDecel = new LBSpherical.Orientation();
    
    this.zoomScale = distance;
};

var _chasePos;
var _chaseOrientation;
var _chaseWorldCoordinates;
var _chaseEuler;
var _chaseWorkingOrientation;

/**
 * Chase mode where the camera's orientation follows that of the target.
 * @constant
 */
LBUI3d.ChaseCameraController.CHASE_MODE_LOCAL = 0;

/**
 * Chase mode where the camera's orientation maintains its world orientation except
 * for pointing at the target.
 * @constant
 */
LBUI3d.ChaseCameraController.CHASE_MODE_WORLD = 1;

LBUI3d.ChaseCameraController.prototype = Object.create(LBUI3d.CameraController.prototype);
LBUI3d.ChaseCameraController.prototype.constructor = LBUI3d.ChaseCameraController;



/**
 * Called by {@link module:LBUI3d.CameraController#update} to update the current camera position
 * @protected
 * @override
 * @param {Number}  dt  The time step in milliseconds.
 * @param {module:LBGeometry.Vector3} position The camera world coordinates position to be updated.
 * @param {module:LBGeometry.Quaternion} quaternion    The camera world coordinates quaternion to be update.
 * @returns {undefined}
 */
LBUI3d.ChaseCameraController.prototype.updateCameraPosition = function(dt, position, quaternion) {
    if (this.target) {
        if (this.currentDecelerationTime > 0) {
            // The current transition is for decelerating via the desired coordinate and orientation
            // velocities. This gives us a new desired coordinates and orientation.
            dt = Math.min(dt, this.currentDecelerationTime);
            this.currentDecelerationTime -= dt;
            
            this.desiredCoordinates.radius += this.desiredCoordinatesVel.radius * dt;
            this.desiredCoordinates.azimuthDeg += this.desiredCoordinatesVel.azimuthDeg * dt;
            this.desiredCoordinates.elevationDeg += this.desiredCoordinatesVel.elevationDeg * dt;
            
            this.desiredCoordinatesVel.radius = decelVelTowardsZero(dt, 
                    this.desiredCoordinatesVel.radius, this.desiredCoordinatesDecel.radius);
            this.desiredCoordinatesVel.azimuthDeg = decelVelTowardsZero(dt, 
                    this.desiredCoordinatesVel.azimuthDeg, this.desiredCoordinatesDecel.azimuthDeg);
            this.desiredCoordinatesVel.elevationDeg = decelVelTowardsZero(dt, 
                    this.desiredCoordinatesVel.elevationDeg, this.desiredCoordinatesDecel.elevationDeg);

            this.desiredOrientation.azimuthDeg += this.desiredOrientationVel.azimuthDeg * dt;
            this.desiredOrientation.elevationDeg += this.desiredOrientationVel.elevationDeg * dt;

            this.desiredOrientationVel.azimuthDeg = decelVelTowardsZero(dt, 
                    this.desiredOrientationVel.azimuthDeg, this.desiredOrientationDecel.azimuthDeg);
            this.desiredOrientationVel.elevationDeg = decelVelTowardsZero(dt, 
                    this.desiredOrientationVel.elevationDeg, this.desiredOrientationDecel.elevationDeg);
        }
        
        switch (this.chaseMode) {
            case LBUI3d.ChaseCameraController.CHASE_MODE_LOCAL :
                this.handleLocalChaseMode(position, quaternion);
                break;
                
            case LBUI3d.ChaseCameraController.CHASE_MODE_WORLD :
                this.handleWorldChaseMode(position, quaternion);
                break;
        }
    }
};


/**
 * Converts the desired coordinates and orientation in local chase mode to the world
 * position and quaternion for the camera.
 * @param {module:LBGeometry.Vector3} position The camera world coordinates position to be updated.
 * @param {module:LBGeometry.Quaternion} quaternion    The camera world coordinates quaternion to be update.
 * @returns {undefined}
 */
LBUI3d.ChaseCameraController.prototype.handleLocalChaseMode = function(position, quaternion) {

    // Now update the desired world position/quaternion
    // We figure out the position in the target's local coordinates.
    _chasePos = this.desiredCoordinates.toVector3(_chasePos);

    // For the local orientation, first determine the reference frame, which is
    // along the line to the target, which in turn is the reverse of the azimuth/elevation
    // of the camera position.
    _chaseOrientation = _chaseOrientation || new LBSpherical.Orientation();
    _chaseOrientation.azimuthDeg = this.desiredCoordinates.azimuthDeg + 180;
    _chaseOrientation.elevationDeg = -this.desiredCoordinates.elevationDeg;

    // Now adjust the reference frame by the desired orientation.
    _chaseOrientation.azimuthDeg += this.desiredOrientation.azimuthDeg;
    _chaseOrientation.elevationDeg += this.desiredOrientation.elevationDeg;
    
    this.localPosOrientationToWorldPosQuaternion(_chasePos, _chaseOrientation, position, quaternion);
};


/**
 * Converts the desired coordinates and orientation in world chase mode to the world
 * position and quaternion for the camera.
 * @param {module:LBGeometry.Vector3} position The camera world coordinates position to be updated.
 * @param {module:LBGeometry.Quaternion} quaternion    The camera world coordinates quaternion to be update.
 * @returns {undefined}
 */
LBUI3d.ChaseCameraController.prototype.handleWorldChaseMode = function(position, quaternion) {
    // The azimuth of the desired coordinates is relative to the target's azimuth, but
    // the elevation and radial distance are in world coordinates.
    _chaseWorldCoordinates = LBUtil.copyOrClone(_chaseWorldCoordinates, this.desiredCoordinates);
    _chaseEuler = _chaseEuler || new LBGeometry.Euler();
    _chaseEuler.setFromQuaternion(this.target.quaternion, 'ZYX');
    _chaseWorldCoordinates.azimuthDeg += -_chaseEuler.z * LBMath.RAD_TO_DEG;
    
    position = _chaseWorldCoordinates.toVector3(position);
    position.x += this.target.position.x;
    position.y += this.target.position.y;
    position.z += this.worldZValueFollower.follow(this.target.position.z);
    
    _chasePos = LBUtil.copyOrClone(_chasePos, position);
    
    this.worldLimits.applyPositionLimits(position, position);
    if (!_chasePos.equals(position)) {
        // The position's been limited, update the desired coordinates to reflect this
        // limited position.
        if ((position.x === _chasePos.x) && (position.y === _chasePos.y)) {
            // We want to try to keep the same azimuth and radius, but adjust the altitude.
            _chasePos.copy(position).sub(this.target.position);
            this.desiredCoordinates.adjustElevationForZ(_chasePos.z);
            _chaseWorldCoordinates.elevationDeg = this.desiredCoordinates.elevationDeg;
        }
        else {
            _chasePos.copy(position).sub(this.target.position);
            _chaseWorldCoordinates.setFromVector3(_chasePos);
            this.desiredCoordinates.copy(_chaseWorldCoordinates);
            this.desiredCoordinates.azimuthDeg -= -_chaseEuler.z * LBMath.RAD_TO_DEG;
        }
    }

    // For the orientation, first determine the reference frame, which is
    // along the line to the target, which in turn is the reverse of the azimuth/elevation
    // of the camera position.
    _chaseOrientation = _chaseOrientation || new LBSpherical.Orientation();
    _chaseOrientation.azimuthDeg = _chaseWorldCoordinates.azimuthDeg + 180;
    _chaseOrientation.elevationDeg = -_chaseWorldCoordinates.elevationDeg;

    // Now adjust the reference frame by the desired orientation.
    _chaseOrientation.azimuthDeg += this.desiredOrientation.azimuthDeg;
    _chaseOrientation.elevationDeg += this.desiredOrientation.elevationDeg;
    
    this.worldOrientationToWorldQuaternion(_chaseOrientation, quaternion);
};


LBUI3d.ChaseCameraController.prototype.decelerateToZero = function(coordinatesVel, orientationVel) {
    // Figure out the longest time to decel to zero.
    // Then figure out the deceleration rates to take that time to zero.
    var dt = calcDecelTimeToZero(coordinatesVel.azimuthDeg, this.coordinatesDecel);
    dt = Math.max(dt, calcDecelTimeToZero(coordinatesVel.elevationDeg, this.coordinatesDecel));
    dt = Math.max(dt, calcDecelTimeToZero(orientationVel.azimuthDeg, this.degDecel));
    dt = Math.max(dt, calcDecelTimeToZero(orientationVel.elevationDeg, this.degDecel));
    dt = Math.min(dt, this.maxTransitionTime);
    
    if (LBMath.isLikeZero(dt)) {
        this.currentDecelerationTime = 0;
        return;
    }
    
    this.currentDecelerationTime = dt;
    this.desiredCoordinatesVel = LBUtil.copyOrClone(this.desiredCoordinatesVel, coordinatesVel);
    this.desiredOrientationVel = LBUtil.copyOrClone(this.desiredOrientationVel, orientationVel);
    
    this.desiredCoordinatesDecel = this.desiredCoordinatesDecel || new LBSpherical.CoordinatesRAE();
    this.desiredCoordinatesDecel.azimuthDeg = calcDecelRateForTime(coordinatesVel.azimuthDeg, dt);
    this.desiredCoordinatesDecel.elevationDeg = calcDecelRateForTime(coordinatesVel.elevationDeg, dt);
    
    this.desiredOrientationDecel = this.desiredOrientationDecel || new LBSpherical.Orientation();
    this.desiredOrientationDecel.azimuthDeg = calcDecelRateForTime(orientationVel.azimuthDeg, dt);
    this.desiredOrientationDecel.elevationDeg = calcDecelRateForTime(orientationVel.elevationDeg, dt);

};

LBUI3d.ChaseCameraController.prototype.desiredCameraPositionUpdated = function() {
    this.currentDecelerationTime = 0;
};


/**
 * Sets one of the standard views.
 * @override
 * @param {Number} view One of the LBUI3d.CameraController.VIEW_x values.
 */
LBUI3d.ChaseCameraController.prototype.setStandardView = function(view) {
    var azimuthDeg = 0;
    this.desiredCoordinates.elevationDeg = 30;
    this.desiredOrientation.zero();
    
    switch (view) {
        case LBUI3d.CameraController.VIEW_FWD :
            azimuthDeg = 0;
            break;
        case LBUI3d.CameraController.VIEW_FWD_STBD :
            azimuthDeg = 45;
            break;
        case LBUI3d.CameraController.VIEW_STBD :
            azimuthDeg = 90;
            break;
        case LBUI3d.CameraController.VIEW_AFT_STBD :
            azimuthDeg = 135;
            break;
        case LBUI3d.CameraController.VIEW_AFT :
            azimuthDeg = 180;
            break;
        case LBUI3d.CameraController.VIEW_AFT_PORT :
            azimuthDeg = -135;
            break;
        case LBUI3d.CameraController.VIEW_PORT :
            azimuthDeg = -90;
            break;
        case LBUI3d.CameraController.VIEW_FWD_PORT :
            azimuthDeg = -45;
            break;
        case LBUI3d.CameraController.VIEW_UP :
            azimuthDeg = this.desiredCoordinates.azimuthDeg - this.forwardAzimuthDeg;
            this.desiredCoordinates.elevationDeg = 89;
            break;
            
        default :
            return;
    }
    
    this.desiredCoordinates.azimuthDeg = azimuthDeg + this.forwardAzimuthDeg;
    this.desiredCameraPositionUpdated();
};



/**
 * Rotates the camera point of view horizontally and/or vertically.
 * @override
 * @param {Number} horzDeg  The number of degrees to rotate horizontally.
 * @param {Number} vertDeg  The number of degrees to rotate vertically.
 */
LBUI3d.ChaseCameraController.prototype.rotatePOVDeg = function(horzDeg, vertDeg) {
    this.desiredCoordinates.azimuthDeg += horzDeg;
    this.desiredCoordinates.elevationDeg += vertDeg;
    this.desiredCameraPositionUpdated();
};


/**
 * Pans the camera point of view horizontall or vertically
 * @override
 * @param {Number} dx   The amount to pan horizontally.
 * @param {Number} dy   The amount to pan vertically.
 */
LBUI3d.ChaseCameraController.prototype.panPOV = function(dx, dy) {
    this.desiredOrientation.azimuthDeg += dx;
    this.desiredOrientation.elevationDeg.y += dy;
    this.desiredCameraPositionUpdated();
};

LBUI3d.ChaseCameraController.prototype.setZoom = function(zoom) {
    zoom = LBMath.clamp(zoom, this.minZoomScale, this.maxZoomScale);
    if (zoom !== this.zoomScale) {
        this.zoomScale = zoom;
        this.desiredCoordinates.radius = zoom;
        this.desiredCameraPositionUpdated();
    }
};


/**
 * Called to start panning.
 * @override
 * @protected
 */
LBUI3d.ChaseCameraController.prototype.startPan = function() {
    this.currentDecelerationTime = 0;

    this.originalDesiredOrientation = LBUtil.copyOrClone(this.originalDesiredOrientation, this.desiredOrientation);

    this.screenDistance = this.calcScreenDistance();
    this.startOrientation = this.calcOrientationFromScreenPos(this.startX, this.startY, this.screenDistance, this.startOrientation);
};


/**
 * Called to actively track a pan.
 * @protected
 * @override
 * @param {Number} x    The tracked x coordinate.
 * @param {Number} y    The tracked y coordinate.
 * @param {Number} timeStamp    The track event time stamp.
 */
LBUI3d.ChaseCameraController.prototype.trackPan = function(x, y, timeStamp) {
    if (!this.screenDistance) {
        return;
    }
    
    this.prevDesiredOrientation = LBUtil.copyOrClone(this.prevDesiredOrientation, 
        this.desiredOrientation);

    this.calcOrientationFromScreenPos(x, y, this.screenDistance, this.desiredOrientation);
    
    this.desiredOrientation.azimuthDeg += this.originalDesiredOrientation.azimuthDeg - this.startOrientation.azimuthDeg;
    this.desiredOrientation.elevationDeg += this.originalDesiredOrientation.elevationDeg - this.startOrientation.elevationDeg;
    
    this.desiredCameraPositionUpdated();
};

/**
 * Called to finish pan tracking.
 * @protected
 * @override
 * @param {Boolean} isCancel    If true the pan should be cancelled.
 */
LBUI3d.ChaseCameraController.prototype.finishPan = function(isCancel) {
    if (isCancel) {
        this.desiredOrientation.copy(this.originalDesiredOrientation);
        this.desiredCameraPositionUpdated();
        return;
    }
    
    if ((this.deltaT > 0) && (this.degDecel > 0)) {
        this.desiredOrientationVel = this.desiredOrientationVel || new LBSpherical.Orientation();
        
        // If we have an orientation change, then we have a velocity that we can 
        // decelerate to 0.
        this.desiredOrientationVel.azimuthDeg = (this.desiredOrientation.azimuthDeg - this.prevDesiredOrientation.azimuthDeg) / this.deltaT;
        this.desiredOrientationVel.elevationDeg = (this.desiredOrientation.elevationDeg - this.prevDesiredOrientation.elevationDeg) / this.deltaT;
        
        this.decelerateToZero(LBSpherical.CoordinatesRAE.ZERO, this.desiredOrientationVel);
    }
};


/**
 * Called to start rotating.
 * @override
 * @protected
 */
LBUI3d.ChaseCameraController.prototype.startRotate = function() {
    this.currentDecelerationTime = 0;
    
    this.originalCoordinates = LBUtil.copyOrClone(this.originalCoordinates, this.desiredCoordinates);

    this.screenDistance = this.calcScreenDistance();
    this.startOrientation = this.calcOrientationFromScreenPos(this.startX, this.startY, this.screenDistance, this.startOrientation);
};


/**
 * Called to actively track a rotation.
 * @protected
 * @override
 * @param {Number} x    The tracked x coordinate.
 * @param {Number} y    The tracked y coordinate.
 * @param {Number} timeStamp    The track event time stamp.
 */
LBUI3d.ChaseCameraController.prototype.trackRotate = function(x, y, timeStamp) {
    if (!this.screenDistance) {
        return;
    }

    this.prevDesiredCoordinates = LBUtil.copyOrClone(this.prevDesiredCoordinates, 
        this.desiredCoordinates);

    _chaseWorkingOrientation = this.calcOrientationFromScreenPos(x, y, this.screenDistance, _chaseWorkingOrientation);
    
    this.desiredCoordinates.azimuthDeg = this.originalCoordinates.azimuthDeg + this.startOrientation.azimuthDeg - _chaseWorkingOrientation.azimuthDeg;
    this.desiredCoordinates.elevationDeg = this.originalCoordinates.elevationDeg - this.startOrientation.elevationDeg + _chaseWorkingOrientation.elevationDeg;

    this.desiredCameraPositionUpdated();
};


/**
 * Called to finish rotation tracking.
 * @protected
 * @override
 * @param {Boolean} isCancel    If true the pan should be cancelled.
 */
LBUI3d.ChaseCameraController.prototype.finishRotate = function(isCancel) {
    if (isCancel) {
        this.desiredCoordinates.copy(this.originalDesiredCoordinates);
        this.setLocalCameraPOV(this.localPosition, this.localOrientation);
        return;
    }

    if ((this.deltaT > 0) && (this.coordinatesDecel > 0)) {
        this.desiredCoordinatesVel = this.desiredCoordinatesVel || new LBSpherical.CoordinatesRAE();
        
        this.desiredCoordinatesVel.radius = 0;
        this.desiredCoordinatesVel.azimuthDeg = (this.desiredCoordinates.azimuthDeg - this.prevDesiredCoordinates.azimuthDeg) / this.deltaT;
        this.desiredCoordinatesVel.elevationDeg = (this.desiredCoordinates.elevationDeg - this.prevDesiredCoordinates.elevationDeg) / this.deltaT;
        
        this.decelerateToZero(this.desiredCoordinatesVel, LBSpherical.Orientation.ZERO);
    }
};

return LBUI3d;
});
