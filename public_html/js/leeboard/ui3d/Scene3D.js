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

    'use strict';

/**
 * 
 * @namespace LBUI3d
 */
var LBUI3d = LBUI3d || {};


/**
 * Our repesentation of a scene.
 * @constructor
 * @returns {LBUI3d.Scene3D}
 */
LBUI3d.Scene3D = function() {
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0x222222));

    this.mainLight = new THREE.DirectionalLight(0xffffff, 1);
    this.scene.add(this.mainLight);
    
    /**
     * Object used for coordinate mapping to the underlying scene's coordinate system.
     */
    this.coordMapping = LBUI3d.DirectCoordMapping;
};

LBUI3d.Scene3D.prototype = {
    constructor: LBUI3d.Scene3D
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


/**
 * Provides a one-to-one coordinate mapping between our coordinate system and
 * the underlying scene's coordinate system. This mapping presumes the Y axis is up.
 */
LBUI3d.DirectCoordMapping = {
    vector3ToThreeJS: function(vec, vecThree) {
        return vecThree.copy(vec);
    },
    vector3FromThreeJS: function(vecThree, vec) {
        return vec.copy(vecThree);
    },
    quaternionToThreeJS: function(quat, quatThree) {
        return quatThree.copy(quat);
    },
    quaternionFromThreeJS: function(quatThree, quat) {
        return quat.copy(quatThree);
    },
    eulerToThreeJS: function(euler, eulerThree) {
        return eulerThree.copy(euler);
    },
    eulerFromThreeJS: function(eulerThree, euler) {
        return euler.copy(eulerThree);
    }
};

/**
 * Provides a mapping from a Z axis is up coordinate system to the underlying scene's
 * Y axis is up coordinate system.
 */
LBUI3d.ZIsUpCoordMapping = {
    vector3ToThreeJS: function(vec, vecThree) {
        return vecThree.set(vec.x, vec.z, -vec.y);
    },
    vector3FromThreeJS: function(vecThree, vec) {
        return vec.set(vecThree.x, -vecThree.z, vecThree.y);
    },
    quaternionToThreeJS: function(quat, quatThree) {
        return quatThree.set(quat.x, quat.z, -quat.y, quat.w);
    },
    quaternionFromThreeJS: function(quatThree, quat) {
        return quat.set(quatThree.x, -quatThree.z, quatThree.y, quatThree.w);
    },
    eulerToThreeJS: function(euler, eulerThree) {
        var order;
        switch (euler.order) {
            case 'XYZ' :
                order = 'XZY';
                break;
            case 'XZY' :
                order = 'XYZ';
                break;
            case 'YXZ' :
                order = 'ZXY';
                break;
            case 'YZX' :
                order = 'ZYX';
                break;
            case 'ZXY' :
                order = 'YXZ';
                break;
            case 'ZYX' :
                order = 'YZX';
                break;
        }
        return eulerThree.set(euler.x, euler.z, -euler.y, order);
    },
    
    eulerFromThreeJS: function(eulerThree, euler) {
        return euler.copy(eulerThree);
    }
};

return LBUI3d;
});
