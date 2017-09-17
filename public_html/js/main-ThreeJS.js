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


/* global THREE, LBSailSim, LBUI3d */

var mainScene;
var mainView;

function init() {
    mainScene = new LBUI3d.Scene3D();
    
    var mainViewContainer = document.getElementById('main_view');
    mainView = new LBUI3d.View3D(mainScene, mainViewContainer);
    var scene = mainScene.scene;
    
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshBasicMaterial({color: 0x008800 });
    var cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

//    camera.position.z = 5;

}

function animate() {
    requestAnimationFrame(animate);
    
    //cube.rotation.x += 0.01;
    //cube.rotation.y += 0.01;
    mainView.render();
}

init();
animate();