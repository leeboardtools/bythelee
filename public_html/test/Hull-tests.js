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


/* global QUnit, LBSailSim, LBMath */

QUnit.test( "Hull.calcCM", function( assert ) {
    var hull = new LBSailSim.Hull();
    var cm = LBSailSim.Hull.calcCM(hull);
    
    assert.equal(LBMath.roundDown(cm, 3), 0.752);
    });

QUnit.test( "Hull.estimateSW", function( assert ) {
    var hull = new LBSailSim.Hull();
    var sw = LBSailSim.Hull.estimateSW(hull);
    
    // Hand calculating using the half-displacement data in Larsson gives 24.329, not 24.318 (pg 33).
    assert.equal(LBMath.roundDown(sw, 3), 24.329);
    });

QUnit.test( "Delft.evalResiduaryResistance", function( assert ) {
    var coefs_Fn_0_35 = [ 0.0032, -0.1011, -0.0813, -0.0382, 0.0320,
        -0.1481, 0.0837, 0.0223, 0.1587 ];
    
    var hull = new LBSailSim.Hull();
    var result = LBSailSim.Delft.evalResiduaryResistance(hull, 0.35, coefs_Fn_0_35);
    
    // Hand calculuating, differs from Larsson, which gives 0.00692 (pg 78)
    assert.equal(LBMath.round(result, 5), 0.00646);
    });

QUnit.test( "Delft.calcResiduaryResistance", function( assert ) {
    var sailEnv = new LBSailSim.Env();
    var vessel = new LBSailSim.Vessel(sailEnv);
    
    var hull = new LBSailSim.Hull(vessel);
    
    hull.waterSpeed = 0.35 * Math.sqrt(sailEnv.gravity * hull.lwl);
    var result = LBSailSim.Delft.calcResiduaryResistance(hull);
    assert.equal(LBMath.round(result, 4), 495.9558);
    });

QUnit.test( "Delft.evalWettedSurfaceHeelCorrection", function( assert ) {
    var coefs_10deg = [-4.5220, -0.1320, -0.0770, 8.7380 ];
    var coefs_15deg = [-3.2910, -0.3890, -0.1180, +8.9490 ];
    var hull = new LBSailSim.Hull();
    
    var corr_10deg = LBSailSim.Delft.evalWettedSurfaceHeelCorrection(hull, coefs_10deg);
    var corr_15deg = LBSailSim.Delft.evalWettedSurfaceHeelCorrection(hull, coefs_15deg);
    
    var sw_10deg = hull.swc * corr_10deg;
    var sw_15deg = hull.swc * corr_15deg;
    var swcorr = sw_10deg + (13.6 - 10) * (sw_15deg - sw_10deg) / (15 - 10);
    assert.equal(LBMath.round(swcorr, 1), 24.7);    
    });

QUnit.test( "Delft.calcWettedSurfaceHeelCorrection", function( assert ) {
    var sailEnv = new LBSailSim.Env();
    var vessel = new LBSailSim.Vessel(sailEnv);
    vessel.obj3D.rotation.x = 13.6 * LBMath.DEG_TO_RAD;
    
    var hull = new LBSailSim.Hull(vessel);
    hull._updatePropertiesFromVessel();
    assert.equal(LBMath.round(hull.swc, 1), 24.7);
});

    