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
define(['three', 'lbgeometry', 'lbui3dbase'], 
function(THREE, LBGeometry, LBUI3d) {

    'use strict';

/**
 * My 3D application framework module, these classes all rely upon ThreeJS.
 * If this description and the LBUI3d static members appear multiple times in the docs,
 * that's a limitation of JSDoc: {@link https://github.com/jsdoc3/jsdoc/issues/515}.
 * @exports LBUI3d
 */
var LBUI3d = LBUI3d || {};


/**
 * Our repesentation of a scene.
 * @constructor
 * @returns {module:LBUI3d.Scene3D}
 */
LBUI3d.Scene3D = function() {
    this.scene = new THREE.Scene();
    //this.scene.background = new THREE.Color('gray');
    this.scene.add(new THREE.AmbientLight(0x444444));

    this.mainLight = new THREE.DirectionalLight(0xffffff, 1);
    this.mainLight.position.set(0, 30, 25);
    
    this.scene.add(this.mainLight);
    
    /**
     * Object used for coordinate mapping to the underlying scene's coordinate system.
     */
    this.coordMapping = LBUI3d.DirectCoordMapping;
};

LBUI3d.Scene3D.prototype = {
    /**
     * Adds one or more 3D objects to the scene.
     * @param {module:LBGeometry.Object3D} object3D    The object(s) to add.
     * @returns {module:LBUI3d.Scene3D}    this.
     */
    add: function(object3D) {
        this.scene.add.apply(this.scene, arguments);
    },
    
    /**
     * Removes one or more 3D objects from the scene.
     * @returns {module:LBUI3d.Scene3D}    this.
     */
    remove: function() {
        this.scene.remove.apply(this.scene, arguments);
    },
    
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

LBUI3d.Scene3D.prototype.loadModelFromData = function(data, onLoad, onProgress, onError) {
    if (data.threeModel) {
        this.loadJSONModel(data.threeModel, onLoad, onProgress, onError);
    }
    else if (data.line3D) {
        this.loadLine3D(data.line3D, onLoad, onProgress, onError);
    }
};

LBUI3d.Scene3D.prototype.loadLine3D = function(data, onLoad, onProgress, onError) {
    var me = this;
    
    var color = LBGeometry.Color.createFromData(data.color, "black");
    if (!data.vertices) {
        return;
    }
    
    var vertexCount = data.vertices.length / 3;
    var vertices;
    var colors = [];
    if (this.coordMapping === LBUI3d.DirectCoordMapping) {
        vertices = data.vertices;
        for (var i = 0; i < vertexCount; ++i) {
            colors.push(color.r, color.g, color.b);
        }
    }
    else {
        vertices = [];
        for (var i = 0; i < vertexCount; ++i) {
            colors.push(color.r, color.g, color.b);
            this.coordMapping.xyzToThreeJS(data.vertices, i * 3, vertices, i * 3);
        }
    }
    
    var geometry = new THREE.BufferGeometry();
    var material = new THREE.LineBasicMaterial( {
        vertexColors: color
    });
    
    geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    var mesh = new THREE.Line(geometry, material);
    if (onLoad) {
        onLoad(mesh, me);
    }
    else {
        me.add(mesh);
    }
};


function setXYZ(x, y, z, outXYZ, outIndex) {
    outXYZ[outIndex++] = x;
    outXYZ[outIndex++] = y;
    outXYZ[outIndex] = z;
}


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
    xyzToThreeJS: function(inXYZ, inIndex, outXYZ, outIndex) {
        setXYZ(inXYZ[inIndex++], inXYZ[inIndex++], inXYZ[inIndex], outXYZ, outIndex);
    },
    xyzFromThreeJS: function(inXYZ, inIndex, outXYZ, outIndex) {
        setXYZ(inXYZ[inIndex++], inXYZ[inIndex++], inXYZ[inIndex], outXYZ, outIndex);
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
    xyzToThreeJS: function(inXYZ, inIndex, outXYZ, outIndex) {
        setXYZ(inXYZ[inIndex], inXYZ[inIndex+2], -inXYZ[inIndex+1], outXYZ, outIndex);
    },
    xyzFromThreeJS: function(inXYZ, inIndex, outXYZ, outIndex) {
        setXYZ(inXYZ[inIndex], -inXYZ[inIndex+2], inXYZ[inIndex+1], outXYZ, outIndex);
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
