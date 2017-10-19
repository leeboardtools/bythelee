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


define(['lbsailsim', 'lbmath', 'three'],
function(LBSailSim, LBMath, THREE) {

LBSailSim.Water3D = function(scene3D, sailEnv) {
    this.scene3D = scene3D;
    this.sailEnv = sailEnv;
    
    var texture = new THREE.TextureLoader().load('images/three-js/water.jpg');
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(25, 25);
    
    var material = new THREE.MeshBasicMaterial( { 
//        transparent: true, opacity: 0.7,
        color: 0x0086b3, map: texture });
    var geometry = new THREE.PlaneGeometry(10000, 10000, 10, 10);
    geometry.rotateX(-LBMath.PI_2);
    
    this.waterMesh = new THREE.Mesh(geometry, material);
    this.scene3D.add(this.waterMesh);
};

LBSailSim.Water3D.prototype = {
    
    update: function(dt) {
        
    },
    
    destroy: function() {
        
    },
    
    constructor: LBSailSim.Water3D
};

return LBSailSim;
});