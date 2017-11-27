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

define(['lbsailsim', 'lbgeometry', 'lbmath', 'three'],
function(LBSailSim, LBGeometry, LBMath, THREE) {
    
    'use strict';
    
    // TODO:
    // Do we need sailEnv?
    // What exactly are we? A THREE model, so we end up being part of RigidBody._lbThreeModel in SailEnvTHREE.
    // 
    
LBSailSim.Telltale3D = function(sailEnv, color, length, segCount, softness) {
    LBGeometry.Object3D.call(this);
    
    // We figure out our own orientation...
    this.noLBOrientationCopy = true;
    
    this.sailEnv = sailEnv;
    this.coordMapping = sailEnv.app3D.mainScene.coordMapping;
    
    color = color || new LBGeometry.Color("brown");
    length = length || 0.25;
    segCount = segCount || 5;
    
    this.bufferGeometry = new THREE.BufferGeometry();
    var material = new THREE.LineBasicMaterial( {
        vertexColors: color
    });
    
    var positions = [];
    var colors = [];
    
    this.segLength = length / segCount;
    this.segCount = segCount;
    positions.push(0, 0, 0);
    colors.push(color.r, color.g, color.b);
    
    var z = this.segLength;
    for (var i = 0; i < segCount; ++i) {
        positions.push(0, 0, z);
        this.coordMapping.xyzToThreeJS(positions, (i + 1) * 3, positions, (i + 1) * 3);
        z -= this.segLength;
        
        colors.push(color.r, color.g, color.b);
    }
    
    this.bufferGeometry.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3).setDynamic(true));
    this.bufferGeometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    this.mesh = new THREE.Line(this.bufferGeometry, material);
    
    this.softness = LBMath.clamp(softness || 0.5, 0, 1);
    
    this.add(this.mesh);
};

LBSailSim.Telltale3D.PORT_COLOR = new THREE.Color('darkred');
LBSailSim.Telltale3D.STBD_COLOR = new THREE.Color('darkgreen');

/**
 * This is the wind speed^2 at which the telltale is streaming straight back.
 * 36 = 6 m/s ~= 11.7 kts
 */
LBSailSim.Telltale3D.MAX_WIND_SPEED_SQ = 25;

LBSailSim.Telltale3D.prototype = Object.create(LBGeometry.Object3D.prototype);
LBSailSim.Telltale3D.prototype.constructor = LBSailSim.Telltale3D;


var _worldMatrix = new LBGeometry.Matrix4();
var _quaternion;
var _pos = new LBGeometry.Vector3();
var _scale = new LBGeometry.Vector3();
var _xfrmMatrix = new LBGeometry.Matrix4();
var _invXfrmMatrix = new LBGeometry.Matrix4();
var _worldPos;

LBSailSim.Telltale3D.prototype.update = function(windVel, dt) {
    dt = dt || 1/60;
    
    // We need to figure out the shape of the telltale based on the wind speed.
    // The telltale will always lie in the x-z plane (z is vertical).
    
    this._updateShape(windVel, dt);

    // We need to set the orientation such that our x axis is in the direction
    // of the wind, while the z axis is vertical.
    _worldMatrix.makeRotationZ(Math.atan2(windVel.y, windVel.x));
    _worldPos = this.getWorldPosition(_worldPos);
    this.coordMapping.vector3FromThreeJS(_worldPos, _worldPos);
    _worldMatrix.setPosition(_worldPos);
    
    // _worldMatrix now represents the desired world coordinates and orientation of the 
    // telltale's local coordinate system.
    // We need to figure out how it will be transformed to the parent's local
    // coordinate system, as that's what we'll be specifying - the orientation of
    // the telltale in the parent's coordinate system.
    _quaternion = this.parent.getWorldQuaternion(_quaternion);
    this.coordMapping.quaternionFromThreeJS(_quaternion, _quaternion);
    _xfrmMatrix.makeRotationFromQuaternion(_quaternion);
    _xfrmMatrix.setPosition(_worldPos);
    
    _invXfrmMatrix.getInverse(_xfrmMatrix);
    _worldMatrix.premultiply(_invXfrmMatrix);
    
    _worldMatrix.decompose(_pos, _quaternion, _scale);
    this.coordMapping.quaternionToThreeJS(_quaternion, _quaternion);
    
    this.quaternion.copy(_quaternion);
    
    return this;
};

var _workingCurrentPos = [];

LBSailSim.Telltale3D.prototype._updateShape = function(windVel, dt) {
    // For now only take the x-y velocity.
    var speedSq = windVel.x * windVel.x + windVel.y * windVel.y;
    var speedRatio = LBMath.clamp(speedSq / LBSailSim.Telltale3D.MAX_WIND_SPEED_SQ, 0, 1);
    var theta = speedRatio * LBMath.PI_2;
    var fluctuation = theta * 0.25;
    
    var positionAttribute = this.bufferGeometry.getAttribute('position');
    var positions = positionAttribute.array;
    var index = 3;
    this.coordMapping.xyzFromThreeJS(positions, 0, _workingCurrentPos, 0);
    for (var i = 0; i < this.segCount; ++i) {
        var angle = theta + (Math.random() - 0.5) * fluctuation;
        _workingCurrentPos[0] += this.segLength * Math.sin(angle);
        _workingCurrentPos[2] += -this.segLength * Math.cos(angle);
        this.coordMapping.xyzToThreeJS(_workingCurrentPos, 0, positions, index);
        index += 3;
    }
    positionAttribute.needsUpdate = true;
};

LBSailSim.Telltale3D.createFromData = function(sailEnv, data, defColor) {
    var color;
    if (data.color === 'PORT_COLOR') {
        color = LBSailSim.Telltale3D.PORT_COLOR;
    }
    else if (data.color === 'STBD_COLOR') {
        color = LBSailSim.Telltale3D.STBD_COLOR;
    }
    else {
        color = LBGeometry.Color.createFromData(data, defColor);
    }
    
    var telltale = new LBSailSim.Telltale3D(sailEnv, color, data.length, data.segCount);
    var obj3DData = data.obj3D || data;
    return LBGeometry.loadObject3DBasic(obj3DData, telltale);
};

return LBSailSim;
});
