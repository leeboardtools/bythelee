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


/* global THREE, LBUI3d */

LBUI3d.View3D = function(scene3D, container, camera, renderer) {
    this.scene3D = scene3D;
    var scene = scene3D.scene;
    
    var width = container.clientWidth;
    var height = container.clientHeight;
    
    if (!camera) {
        camera = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
        camera.position.z = 5;
    }
    this.camera = camera;
    
    scene.add(camera);

    
    if (!renderer) {
        rendererParameters = {
            antialias: true,
            logarithmicDepthBuffer: true
        };
        renderer = new THREE.WebGLRenderer(rendererParameters);
    }
    this.renderer = renderer;
    
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    
    renderer.domElement.style.position = "relative";
    container.appendChild(renderer.domElement);
    
    this.container  = container;
};

LBUI3d.View3D.prototype = {
    constructor: LBUI3d.View3D
};

LBUI3d.View3D.prototype.render = function() {
    this.renderer.render(this.scene3D.scene, this.camera);
};

LBUI3d.View3D.prototype.onWindowResize = function() {
    var width = this.container.clientWidth;
    var height = this.container.clientHeight;
    
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
};
