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


/* global THREE, LBSailSim, LBUI3d, LBMath, LBUtil */

var mainScene;
var mainView;

var windDeg = 0;
var windForce = 2;

/*
 * Some colors:
 * F0 Light gray:
 * F1 Subdued green:   rgb(0, 173, 0)      hsl(120, 100%, 34%)
 * F2 Green 2:         rgb(114, 210, 45)   hsl(95, 65%, 50%)
 * F3 Faded green:     rgb(200, 245, 77)   hsl(76, 89%, 63%)
 * F4 OK Bright yellow:rgb(255, 255, 112)  hsl(60, 100%, 72%)
 * Brigh yellow:    rgb(255, 255, 0)    hsl(60, 100%, 50%) (Very bright!)
 * F5 Bright orange:   rgb(255, 123, 0)    hsl(29, 100%, 50%)
 * F6 Red x             rgb(167, 22, 22)    hsl(0, 77%, 37%)
 * F6 Subdued red:     rgb(189, 0, 0)      hsl(0, 100%, 37%)
 * F8 Bright red:      rgb(255, 0, 0)      hsl(0, 100%, 50%)
 */

function init() {
    mainScene = new LBUI3d.Scene3D();
    
    var mainViewContainer = document.getElementById('main_view');
    mainView = new LBUI3d.View3D(mainScene, mainViewContainer);
    var scene = mainScene.scene;
    
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshPhongMaterial({color: 0x008800 });
    var cube = new THREE.Mesh(geometry, material);
    cube.rotation.x = 0.3;
    cube.rotation.y = 0.4;
    scene.add(cube);

//    camera.position.z = 5;

    var throttleSlider = document.getElementById('throttle_slider');
    if (throttleSlider) {
//        throttleSlider.hidden = true;
    }
    
    window.addEventListener('resize', onWindowResize, false);
    
    setWindForce(2);
}

function animate() {
    requestAnimationFrame(animate);
    
    //cube.rotation.x += 0.01;
    //cube.rotation.y += 0.01;
    mainView.render();
}

function onWindowResize() {
    mainView.onWindowResize();
}

function windBack() {
    windDeg -= 10;
    windDeg = LBMath.wrapDegrees(windDeg);
    var element = document.getElementById("app_wind_dial");
    element.style.transform = "rotate(" + windDeg + "deg)";
}

function windVeer() {
    windDeg += 10;
    windDeg = LBMath.wrapDegrees(windDeg);
    var element = document.getElementById("app_wind_dial");
    element.style.transform = "rotate(" + windDeg + "deg)";
}

function setColorFunctionAlpha(color, alpha) {
    if (color.startsWith('hsla') || color.startsWith('rgba')) {
        var pos = color.lastIndexOf(',');
        color = color.slice(0, pos+1) + alpha + ')';
    }
    else if (color.startsWith('hsl') || color.startsWith('rgb')) {
        var pos = color.lastIndexOf(')');
        color = color.slice(0, 3) + 'a' + color.slice(3, pos) + ',' + alpha + ')';
    }
    return color;
}

function setWindForce(force) {
    if ((force < 0) || (force > 8)) {
        return;
    }
    windForce = force;
    var element = document.getElementsByClassName("wind_speed_indicator")[0];
    for (var i = 0; i <= force; ++i) {
        var led = element.getElementsByClassName('wind_speed_led_f' + i)[0];
        var style = window.getComputedStyle(led, null);
        led.style.backgroundColor = setColorFunctionAlpha(style.backgroundColor, ' 1.0');
    }
    
    for (var i = force + 1; i <= 8; ++i) {
        var led = element.getElementsByClassName('wind_speed_led_f' + i)[0];
        var style = window.getComputedStyle(led, null);
        led.style.backgroundColor = setColorFunctionAlpha(style.backgroundColor, ' 0.1');
    }
}

function windIncrease() {
    setWindForce(windForce + 1);
}

function windDecrease() {
    setWindForce(windForce - 1);
}

function toggleForceArrows() {
    
}

function toggleVelocityArrows() {
    
}

function toggleWindArrows() {
    
}

function toggleByWidth(element, property, onOffset) {
    onOffset = onOffset || "0px";
    if (element.style[property] === onOffset) {
        element.style[property] = "-" + element.clientWidth + "px";
        return false;
    }

    element.style[property] = onOffset;
    return true;
}

function toggleByHeight(element, property, onOffset) {
    onOffset = onOffset || "0px";
    if (element.style[property] === onOffset) {
        element.style[property] = "-" + element.clientHeight + "px";
        return false;
    }

    element.style[property] = onOffset;
    return true;
}

function toggleHUDBoat() {
    var element = document.getElementById("hud_popup_boat");
    var isOn = toggleByWidth(element, "left");
    
    var label = document.getElementById("hud_label_boat");
    label.style.visibility = (isOn) ? "visible" : "";
}

function toggleHUDWind() {
    var element = document.getElementById("hud_popup_wind");
    var isOn = toggleByWidth(element, "left");
    
    var label = document.getElementById("hud_label_wind");
    label.style.visibility = (isOn) ? "visible" : "";
}

function toggleHUDForce() {
    var element = document.getElementById("hud_popup_force");
    var isOn = toggleByWidth(element, "left");
    
    var label = document.getElementById("hud_label_force");
    label.style.visibility = (isOn) ? "visible" : "";
}

function toggleMap() {
    var element = document.getElementById("pip_map");
    var isOn = toggleByWidth(element, "right");
}

function togglePIPLowerLeft() {
    var element = document.getElementById("pip_lower_left");
    var isOn = toggleByWidth(element, "left");
    
    element = document.getElementById("pip_lower_left_btn");
    var elements = element.getElementsByTagName("i");
    elements[0].innerHTML = (isOn) ? "&#xE5CB;" : "&#xE5CC;";
}

function togglePIPLowerRight() {
    var element = document.getElementById("pip_lower_right");
    var isOn = toggleByWidth(element, "right");
    
    element = document.getElementById("pip_lower_right_btn");
    var elements = element.getElementsByTagName("i");
    elements[0].innerHTML = (isOn) ? "&#xE5CC;" : "&#xE5CB;";
    
}

function onRudderChange(value) {
}

function onThrottleChange(value) {
}

function onJibsheetChange(value) {
    
}

function onMainsheetChange(value) {
    
}


init();
animate();
