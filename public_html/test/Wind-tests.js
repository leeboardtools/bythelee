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

QUnit.module('Wind-tests');

QUnit.test( "WindPuff", function( assert ) {
    var leadingEdgePos = new LBGeometry.Vector2(10, 0);
    var velocity = new LBGeometry.Vector2(2, 0);
    var depth = 10;
    var leadingWidth = 7;
    var trailingWidth = 5;
    var distanceToTravel = 100;
    
    var puff = new LBSailSim.WindPuff(leadingEdgePos, velocity, depth, leadingWidth, trailingWidth, distanceToTravel);
    var vel = puff.getFlowVelocity(10, 0);
    checkVector3(assert, vel, 0, 0, 0, 'at leadingEdgePos');

    vel = puff.getFlowVelocity(11, 0);
    checkVector3(assert, vel, 0, 0, 0, 'at beyond leadingEdgePos');
    
    puff.getFlowVelocity(9, 0, undefined, vel);
    checkVector3(assert, vel, 2, 0, 0, 'full speed inside leadingEdgePos');
    
    puff.getFlowVelocity(5, 0, undefined, vel);
    checkVector3(assert, vel, 2, 0, 0, 'full speed before trailing taper');
    
    puff.getFlowVelocity(2.5, 0, undefined, vel);
    checkVector3(assert, vel, 1, 0, 0, 'half speed to trailing taper');
    
    puff.getFlowVelocity(0, 0, undefined, vel);
    checkVector3(assert, vel, 0, 0, 0, 'at trailingEdge center');
    
    // Check the velocity at the edges by clearing out the tapering.
    puff.taperTStart = 0;
    puff.leadingTaperSStart = 0;
    puff.trailingTaperSStart = 0;
    
    puff.getFlowVelocity(9.999, leadingWidth/2 - 0.001, undefined, vel);
    var refVel = new LBGeometry.Vector2(depth, (leadingWidth - trailingWidth)/2).normalize().multiplyScalar(velocity.length());
    checkVector3(assert, vel, refVel.x, refVel.y, 0, 'at positive leading edge no taper', 1e-2);
    
    puff.getFlowVelocity(9.999, -leadingWidth/2 + 0.001, undefined, vel);
    checkVector3(assert, vel, refVel.x, -refVel.y, 0, 'at negative leading edge no taper', 1e-2);
    
    puff.getFlowVelocity(0.001, leadingWidth/2 - 0.001, undefined, vel);
    checkVector3(assert, vel, 0, 0, 0, 'trailing edge at leaading width no taper');
    
    puff.getFlowVelocity(0.001, trailingWidth/2 - 0.001, undefined, vel);
    checkVector3(assert, vel, refVel.x, refVel.y, 0, 'at positive trailing edge no taper', 1e-2);
    
});

});