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



/* global LBPhaser, LBCamera, LBGeometry */

LBPhaser.Project3D = function(env, group, camera) {
    this.env = env;

    this.graphics = env.game.add.graphics(0, 0, group);
    
    if (camera) {
        this.camera = camera;
    }
    else {
        this.camera = new LBCamera.PerspectiveCamera();
        this.camera.lookAt(new LBGeometry.Vector3(0, 0, -1));
    }
    
    this.zOrderedItems = [];
    
    this.matrixWorldToProjection = new LBGeometry.Matrix4();
    this.matrixWorldToLocal = new LBGeometry.Matrix4();
};

LBPhaser.Project3D.prototype = {
    start: function() {
        this.matrixWorldToLocal.getInverse(this.camera.matrixWorld);
        this.matrixWorldToProjection.copy(this.camera.projectionMatrix);
        this.matrixWorldToProjection.multiply(this.matrixWorldToLocal);
        
        this.graphics.clear();
    },
    
    addPanel: function(frameColor, fillColor, alpha, vertices, indices) {
        
    },
    
    end: function() {
        // Generate the graphics...
    },
    
    destroy: function() {
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
            this.env = null;
            this.camera = null;
            this.zOrderedItems = null;
            this.matrixWorldToLocal = null;
            this.matrixWorldToProjection = null;
        }
    },
    
    constructor: LBPhaser.Project3D
};
