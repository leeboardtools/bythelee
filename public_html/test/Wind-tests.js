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

define(['lbwind', 'lbgeometry', 'lbmath'],
function(LBSailSim, LBGeometry, LBMath) {

var checkVector3 = require('test/Geometry-tests.js').checkVector3;
var checkVector2 = require('test/Geometry-tests.js').checkVector2;

QUnit.module('Wind-tests');

function checkVel(assert, puff, radius, arcDeg, z, speed, msg, vel) {
    var dx = Math.cos(arcDeg * LBMath.DEG_TO_RAD);
    var dy = Math.sin(arcDeg * LBMath.DEG_TO_RAD);
    var x = puff.centerPos.x + radius * dx;
    var y = puff.centerPos.y + radius * dy;
    var vx = dx * speed;
    var vy = dy * speed;
    
    vel = puff.getFlowVelocity(x, y, z, vel);
    checkVector3(assert, vel, vx, vy, 0, msg, 1e-3);
    
    return vel;
}

QUnit.test( "WindPuff-Basic", function( assert ) {
    var centerPos = new LBGeometry.Vector2(10, 0);
    var leadingRadius = 100;
    var velDir = new LBGeometry.Vector2(1, 0).normalize();
    
    var leadingPos = velDir.clone()
            .multiplyScalar(leadingRadius)
            .add(centerPos);
    
    var leadingSpeed = 2;
    var leadingVel = velDir.clone().multiplyScalar(leadingSpeed);
    var depth = 5;
    var expansionDeg = 10;
    var leadingWidth = LBMath.TWO_PI * leadingRadius * expansionDeg / 360;
    var distanceToTravel = 1000;
    
    var puff = new LBSailSim.WindPuff(leadingPos, leadingVel, depth, leadingWidth, expansionDeg, distanceToTravel);
    checkVector2(assert, puff.centerPos, centerPos.x, centerPos.y, "centerPos");
    checkVector2(assert, puff.leadingPosition, leadingPos.x, leadingPos.y, "leadingPos");
    
    puff.taperRadialStartLeading = 0;
    puff.taperRadialStartTrailing = 0;
    puff.taperArcStart = 0;
    
    var small = 0.00001;
    var trailingRadius = leadingRadius - depth;

    var vel = puff.getFlowVelocity(111, 0);
    checkVector3(assert, vel, 0, 0, 0, "vel beyond leading A");
    checkVel(assert, puff, trailingRadius - small, 0, undefined, 0, "vel beyond trailing A");
    checkVel(assert, puff, leadingRadius - small, (0.5 + small) * expansionDeg, undefined, 0, "vel beyond max side");
    checkVel(assert, puff, leadingRadius - small, -(0.5 + small) * expansionDeg, undefined, 0, "vel beyond min side");
    
    vel = checkVel(assert, puff, leadingRadius - small, 0, undefined, leadingSpeed, "vel leading Pos", vel);
    
    vel = checkVel(assert, puff, leadingRadius - small, (0.5 - small) * expansionDeg, undefined, leadingSpeed, "vel Max Side Leading");
    vel = checkVel(assert, puff, leadingRadius - small, -(0.5 - small) * expansionDeg, undefined, leadingSpeed, "vel Min Side Leading");
    
    // vel * r = const, so vel2 * r2 = vel1 * r1, vel2 = vel1 * r1 / r2
    var trailingSpeed = leadingSpeed * leadingRadius / trailingRadius;
    vel = checkVel(assert, puff, trailingRadius + small, 0, undefined, trailingSpeed, "vel trailing Pos");
    vel = checkVel(assert, puff, trailingRadius + small, (0.5 - small) * expansionDeg, undefined, trailingSpeed, "vel Max Side Trailing");
    vel = checkVel(assert, puff, trailingRadius + small, -(0.5 - small) * expansionDeg, undefined, trailingSpeed, "vel Min Side Trailing");
    
});

QUnit.test( "WindPuff-Rotated", function( assert ) {
    var centerPos = new LBGeometry.Vector2(10, 20);
    var leadingRadius = 100;
    var velDeg = 30;
    var velRad = velDeg * LBMath.DEG_TO_RAD;
    var velDir = new LBGeometry.Vector2(Math.cos(velRad), Math.sin(velRad)).normalize();
    
    var leadingPos = velDir.clone()
            .multiplyScalar(leadingRadius)
            .add(centerPos);
    
    var leadingSpeed = 2;
    var leadingVel = velDir.clone().multiplyScalar(leadingSpeed);
    var depth = 5;
    var expansionDeg = 10;
    var leadingWidth = LBMath.TWO_PI * leadingRadius * expansionDeg / 360;
    var distanceToTravel = 1000;
    
    var puff = new LBSailSim.WindPuff(leadingPos, leadingVel, depth, leadingWidth, expansionDeg, distanceToTravel);
    checkVector2(assert, puff.centerPos, centerPos.x, centerPos.y, "centerPos");
    checkVector2(assert, puff.leadingPosition, leadingPos.x, leadingPos.y, "leadingPos");
    
    puff.taperRadialStartLeading = 0;
    puff.taperRadialStartTrailing = 0;
    puff.taperArcStart = 0;
    
    var small = 0.00001;
    var trailingRadius = leadingRadius - depth;

    var vel;
/*    var vel = puff.getFlowVelocity(111, 0);
    checkVector3(assert, vel, 0, 0, 0, "vel beyond leading A");
    checkVel(assert, puff, trailingRadius - small, 0, undefined, 0, "vel beyond trailing A");
    checkVel(assert, puff, leadingRadius - small, (0.5 + small) * expansionDeg, undefined, 0, "vel beyond max side");
    checkVel(assert, puff, leadingRadius - small, -(0.5 + small) * expansionDeg, undefined, 0, "vel beyond min side");
*/    
    vel = checkVel(assert, puff, leadingRadius - small, velDeg, undefined, leadingSpeed, "vel leading Pos", vel);
    
    vel = checkVel(assert, puff, leadingRadius - small, (0.5 - small) * expansionDeg + velDeg, undefined, leadingSpeed, "vel Max Side Leading");
    vel = checkVel(assert, puff, leadingRadius - small, -(0.5 - small) * expansionDeg + velDeg, undefined, leadingSpeed, "vel Min Side Leading");
    
    // vel * r = const, so vel2 * r2 = vel1 * r1, vel2 = vel1 * r1 / r2
    var trailingSpeed = leadingSpeed * leadingRadius / trailingRadius;
    vel = checkVel(assert, puff, trailingRadius + small,  + velDeg, undefined, trailingSpeed, "vel trailing Pos");
    vel = checkVel(assert, puff, trailingRadius + small, (0.5 - small) * expansionDeg + velDeg, undefined, trailingSpeed, "vel Max Side Trailing");
    vel = checkVel(assert, puff, trailingRadius + small, -(0.5 - small) * expansionDeg + velDeg, undefined, trailingSpeed, "vel Min Side Trailing");
    
});

});