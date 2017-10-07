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

define(['lbcamera', 'lbscene3d'],
function(LBCamera, LBUI3d) {


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
 * @param {Object} domElement   The DOM element the camera is associated with, this
 * is used to handle mouse events.
 * @returns {LBUI3d.CameraController}
 */
LBUI3d.CameraController = function(camera, domElement) {
};

LBUI3d.CameraController.prototype = {
    constructor: LBUI3d.CameraController
};

LBUI3d.CameraController.prototype.setTarget = function(target) {
    this._target = target;
};

/**
 * This is normally called from the {@link LBUI3d.View3d#render} method to handle tracking
 * and updating the camera position.
 * @param {Boolean} updateCamera    If true the camera should be updated, otherwise it
 * is just background tracking.
 * @returns {undefined}
 */
LBUI3d.CameraController.prototype.update = function(updateCamera) {
    
};


/**
 * A camera controller that sets itself to a local position and orientation
 * on a target. Basically a first person point of view.
 * @constructor
 * @param {LBCamera.Camera} camera  The camera to control.
 * @param {Object} domElement   The DOM element the camera is associated with, this
 * is used to handle mouse events.
 * @returns {LBUI3d.FirstPersonCameraController}
 */
LBUI3d.FirstPersonCameraController = function(camera, domElement) {
    LBUI3d.CameraController.call(this, camera, domElement);
};

LBUI3d.FirstPersonCameraController.prototype = Object.create(LBUI3d.CameraController.prototype);
LBUI3d.FirstPersonCameraController.prototype.constructor = LBUI3d.FirstPersonCameraController;


/**
 * A camera controller that tries to follow the target at a given position relative to the
 * target. This differs from {@link LBUI3d.FirstPersonCameraController} in that for this
 * the camera is looking at the target, whereas for the first person controller the
 * camera is looking from the target.
 * @constructor
 * @param {LBCamera.Camera} camera  The camera to control.
 * @param {Object} domElement   The DOM element the camera is associated with, this
 * is used to handle mouse events.
 * @returns {LBUI3d.FirstPersonCameraController}
 */
LBUI3d.FollowCameraController = function(camera, domElement) {
    LBUI3d.CameraController.call(this, camera, domElement);
};

LBUI3d.FollowCameraController.prototype = Object.create(LBUI3d.CameraController.prototype);
LBUI3d.FollowCameraController.prototype.constructor = LBUI3d.FollowCameraController;


return LBUI3d;
});
