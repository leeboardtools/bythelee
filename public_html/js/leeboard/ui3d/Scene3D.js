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


/* global THREE, LBMath */
define(['three'], function(THREE) {

/**
 * 
 * @namespace LBUI3d
 */
var LBUI3d = LBUI3d || {};

/**
 * @constructor
 * @returns {LBUI3d.Scene3D}
 */
LBUI3d.Scene3D = function() {
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0x222222));
    
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1);
    this.scene.add(this.mainLight);
   
};

LBUI3d.Scene3D.prototype = {
    constructor: LBUI3d.Scene3D
};

LBUI3d.Scene3D.prototype.getBackgroundColor = function() {
    return this.scene.background;
};

/**
 * Loads a Blender model that was exported to a JSON. This currently encapsulates the
 * model in a {@link THREE.Group} and rotates it 90 degrees about the x-axis in order
 * to line up the Blender and ThreeJS axes.
 * @param {String} url  The URL to load from.
 * @param {Function} onLoad The load callback function, if undefined the model is added
 * to the scene. If defined, this has the following signature:
 * <p>
 *      function(model, scene3D) {
 *      }
 * <p>
 * If defined the function is presumed to handle adding it to the scene if it wants to.
 * @param {Function} [onProgress] If defined a callback called with the progress, see THREE.JSONLoader.load().
 * @param {Function} [onError]  If defined a callback called on load errors, see THREE.JSONLoader.load().
 * @returns {undefined}
 */
LBUI3d.Scene3D.prototype.loadBlenderJSONModel = function(url, onLoad, onProgress, onError) {
    var me = this;
    this.loadJSONModel(url, function(mesh) {
        var group = new THREE.Group();
        group.add(mesh);
        mesh.rotateX(LBMath.PI_2);
        if (onLoad) {
            onLoad(group, me);
        }
        else {
            me.scene.add(group);
        }
    }, onProgress, onError);
};

/**
 * Loads a JSON model.
 * @param {String} url  The URL to load from.
 * @param {Function} onLoad The load callback function, if undefined the model is added
 * to the scene. If defined, this has the following signature:
 * <p>
 *      function(model, scene3D) {
 *      }
 * <p>
 * If defined the function is presumed to handle adding it to the scene if it wants to.
 * @param {Function} [onProgress] If defined a callback called with the progress, see THREE.JSONLoader.load().
 * @param {Function} [onError]  If defined a callback called on load errors, see THREE.JSONLoader.load().
 * @returns {undefined}
 */
LBUI3d.Scene3D.prototype.loadJSONModel = function(url, onLoad, onProgress, onError) {
    if (!this.loaderJSON) {
        this.loaderJSON = new THREE.JSONLoader();
    }
    
    var me = this;
    this.loaderJSON.load(url, function(geometry, materials) {
        var mesh = new THREE.Mesh(geometry, materials);
        if (onLoad) {
            onLoad(mesh, me);
        }
        else {
            me.add(mesh);
        }
    }, onProgress, onError);
};

return LBUI3d;
});
