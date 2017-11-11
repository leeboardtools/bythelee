/* 
 * Copyright 2017 Albert Santos.
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


define(['three'],
function(THREE) {

    'use strict';

/**
 * This is our encapsulation of ThreeJS' camera objects, such as {@link https://threejs.org/docs/index.html#api/cameras/Camera|THREE.Camera}.
 * @exports   LBCamera
 */
var LBCamera = LBCamera || {};

/**
 * A camera, our encapsulation of {@link https://threejs.org/docs/index.html#api/cameras/Camera|THREE.Camera}.
 * @constructor
 * @extends THREE.Camera
 * @returns {module:LBCamera.Camera}
 */
LBCamera.Camera = function() {
    THREE.Camera.call(this);
};
LBCamera.Camera.prototype = Object.create(THREE.Camera.prototype);
LBCamera.Camera.prototype.constructor = LBCamera.Camera;


/**
 * An orhtographic camera, our encapsulation of {@link https://threejs.org/docs/index.html#api/cameras/OrthographicCamera|THREE.OrthographicCamera}.
 * @constructor
 * @extends THREE.OrthographicCamera
 * @param {Number} left The left edge of the view.
 * @param {Number} right The right edge of the view.
 * @param {Number} top The top edge of the view.
 * @param {Number} bottom The bottom edge of the view.
 * @param {Number} near The near plane distance.
 * @param {Number} far  The far plane distance.
 * @returns {module:LBCamera.OrthographicCamera}
 */
LBCamera.OrthographicCamera = function(left, right, top, bottom, near, far) {
    THREE.OrthographicCamera.call(this, left, right, top, bottom, near, far);
};
LBCamera.OrthographicCamera.prototype = Object.create(THREE.OrthographicCamera.prototype);
LBCamera.OrthographicCamera.prototype.constructor = LBCamera.OrthographicCamera;


/**
 * An perspective camera, our encapsulation of {@link https://threejs.org/docs/index.html#api/cameras/PerspectiveCamera|THREE.PerspectiveCamera}.
 * @constructor
 * @extends THREE.PerspectiveCamera
 * @param {Number} [fov=50]  The field of view angle in degrees
 * @param {Number} [aspect=1] The width to height aspect ratio.
 * @param {Number} [near=0.1] The near plane distance.
 * @param {Number} [far=2000] The far plane distance.
 * @returns {module:LBCamera.PerspectiveCamera}
 */
LBCamera.PerspectiveCamera = function(fov, aspect, near, far) {
    THREE.PerspectiveCamera.call(this, fov, aspect, near, far);
};
LBCamera.PerspectiveCamera.prototype = Object.create(THREE.PerspectiveCamera.prototype);
LBCamera.PerspectiveCamera.prototype.constructor = LBCamera.PerspectiveCamera;

return LBCamera;
});
