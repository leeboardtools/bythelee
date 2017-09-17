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


/* global THREE */

var LBUI3d = LBUI3d || {};

LBUI3d.Scene3D = function() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcccccc);
    this.scene.add(new THREE.AmbientLight(0x222222));
    
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1);
    this.mainLight.position.set(100, 100, 100);
    this.scene.add(this.mainLight);
};

LBUI3d.Scene3D.prototype = {
    constructor: LBUI3d.Scene3D
};

