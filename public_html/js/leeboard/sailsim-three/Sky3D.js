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

LBSailSim.Sky3D = function(scene3D, sailEnv) {
    this.scene3D = scene3D;
    this.sailEnv = sailEnv;
    
    var geometry = new THREE.SphereGeometry(1000, 25, 25);
    var material = new THREE.MeshPhongMaterial({ color: 0xe5ffff, side: THREE.BackSide });
    this.skyMesh = new THREE.Mesh(geometry, material);
    this.scene3D.add(this.skyMesh);
};

LBSailSim.Sky3D.prototype = {
    
    update: function(dt) {
        
    },
    
    destroy: function() {
        
    },
    
    constructor: LBSailSim.Sky3D
};

return LBSailSim;
});