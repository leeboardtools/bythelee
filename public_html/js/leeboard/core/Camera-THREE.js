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


/* global THREE */

var LBCamera = LBCamera || {};

LBCamera.Camera = function() {
    THREE.Camera.call(this);
};
LBCamera.Camera.prototype = Object.create(THREE.Camera.prototype);
LBCamera.Camera.prototype.constructor = LBCamera.Camera;


LBCamera.OrthographicCamera = function(left, right, top, bottom, near, far) {
    THREE.OrthographicCamera.call(this, left, right, top, bottom, near, far);
};
LBCamera.OrthographicCamera.prototype = Object.create(THREE.OrthographicCamera.prototype);
LBCamera.OrthographicCamera.prototype.constructor = LBCamera.OrthographicCamera;


LBCamera.PerspectiveCamera = function(fov, aspect, near, far) {
    THREE.PerspectiveCamera.call(this, fov, aspect, near, far);
};
LBCamera.PerspectiveCamera.prototype = Object.create(THREE.PerspectiveCamera.prototype);
LBCamera.PerspectiveCamera.prototype.constructor = LBCamera.PerspectiveCamera;
