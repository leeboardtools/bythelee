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


/* global QUnit */

define(['lbwind', 'lbgeometry'],
function(LBSailSim, LBGeometry) {

var checkVector3 = require('test/Geometry-tests.js').checkVector3;
var checkVector2 = require('test/Geometry-tests.js').checkVector2;

QUnit.module('Wind-tests');

function speedAtDepth(x, depth, leadingWidth, trailingWidth, speed) {
    // S0 = speed
    // S1 = speed * leadingWidth / trailingWidth
    // dSpeed = speed * (leadingWidth / trailingWidth - 1)    
    var s = x / depth;
    var dSpeed = speed * (leadingWidth / trailingWidth - 1);
    return speed + s * dSpeed;
};

QUnit.test( "WindPuff", function( assert ) {
    var test = speedAtDepth(0, 10, 6, 3, 1);
    assert.equal(test, 1);
    test = speedAtDepth(10, 10, 6, 3, 1);
    assert.equal(test, 2);
    
    var leadingEdgePos = new LBGeometry.Vector2(10, 0);
    var speed = 2;
    var velocity = new LBGeometry.Vector2(2, 0).normalize().multiplyScalar(speed);
    var depth = 10;
    var leadingWidth = 7;
    var trailingWidth = 5;
    var distanceToTravel = 100;
    var vRef = new LBGeometry.Vector3();
    
    var puff = new LBSailSim.WindPuff(leadingEdgePos, velocity, depth, leadingWidth, trailingWidth, distanceToTravel);
    var vel = puff.getFlowVelocity(10, 0);
    checkVector3(assert, vel, vRef.x, vRef.y, vRef.z, 'at leadingEdgePos');

    vel = puff.getFlowVelocity(11, 0);
    checkVector3(assert, vel, vRef.x, vRef.y, vRef.z, 'at beyond leadingEdgePos');
    
    puff.getFlowVelocity(9, 0, undefined, vel);
    vRef.copy(velocity).normalize().multiplyScalar(speedAtDepth(1, depth, leadingWidth, trailingWidth, speed));
    checkVector3(assert, vel, vRef.x, vRef.y, vRef.z, 'full speed inside leadingEdgePos');
    
    puff.getFlowVelocity(5, 0, undefined, vel);
    vRef.copy(velocity).normalize().multiplyScalar(speedAtDepth(5, depth, leadingWidth, trailingWidth, speed));
    checkVector3(assert, vel, vRef.x, vRef.y, vRef.z, 'full speed before trailing taper');
    
    puff.getFlowVelocity(2.5, 0, undefined, vel);
    vRef.copy(velocity).normalize().multiplyScalar(speedAtDepth(7.5, depth, leadingWidth, trailingWidth, speed) * 0.5);
    checkVector3(assert, vel, vRef.x, vRef.y, vRef.z, 'half speed to trailing taper');
    
    puff.getFlowVelocity(0, 0, undefined, vel);
    checkVector3(assert, vel, 0, 0, 0, 'at trailingEdge center');
    
    // Check the velocity at the edges by clearing out the tapering.
    puff.taperTStart = 0;
    puff.leadingTaperSStart = 0;
    puff.trailingTaperSStart = 0;
    
    puff.getFlowVelocity(9.999, leadingWidth/2 - 0.001, undefined, vel);
    var vRef = new LBGeometry.Vector2(depth, (leadingWidth - trailingWidth)/2).normalize().multiplyScalar(velocity.length());
    checkVector3(assert, vel, vRef.x, vRef.y, 0, 'at positive leading edge no taper', 1e-2);
    
    puff.getFlowVelocity(9.999, -leadingWidth/2 + 0.001, undefined, vel);
    checkVector3(assert, vel, vRef.x, -vRef.y, 0, 'at negative leading edge no taper', 1e-2);
    
    puff.getFlowVelocity(0.001, leadingWidth/2 - 0.001, undefined, vel);
    checkVector3(assert, vel, 0, 0, 0, 'trailing edge at leaading width no taper');
    
    puff.getFlowVelocity(0.001, trailingWidth/2 - 0.001, undefined, vel);
    vRef.normalize().multiplyScalar(speedAtDepth(9.999, depth, leadingWidth, trailingWidth, speed));
    checkVector3(assert, vel, vRef.x, vRef.y, 0, 'at positive trailing edge no taper', 1e-2);
    
    
    puff.update(1);
    checkVector2(assert, puff.leadingPosition, leadingEdgePos.x + speed, 0, "leadingPos after 1s");
    var edgeSpeed = (leadingWidth - trailingWidth) / (2*depth) * speed;
    //assert.equal(puff.leadingWidth, leadingWidth + 2*edgeSpeed, "leadingWidth after 1s", 1e-2);
});

});