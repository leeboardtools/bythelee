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


/* global LBSailSim, LBMath */

LBSailSim.Delft = {};

/**
 * These are the coefficients given in Larsson, p. 78.
 * Fossati has a newer set of coefficients, pg. 24, need to implement those at some point.
 */
LBSailSim.Delft.residuaryResistanceFns = [ 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6 ];
LBSailSim.Delft.residuaryResistanceCoefs = [
    [-0.0014, +0.0004, +0.0014, +0.0027, +0.0056, +0.0032, -0.0064, -0.0171, -0.0201, +0.0495, +0.0808],    // a0
    [+0.0403, -0.1808, -0.1071, +0.0463, -0.8005, -0.1011, +2.3095, +3.4017, +7.1576, +1.5618, -5.3233],
    [+0.0470, +0.1793, +0.0637, -0.1263, +0.4891, -0.0813, -1.5152, -1.9862, -6.3304, -6.0661, -1.1513],
    [-0.0227, -0.0004, +0.0090, +0.0150, +0.0269, -0.0382, +0.0751, +0.3242, +0.5829, +0.8641, +0.9663],
    [-0.0119, +0.0097, +0.0153, +0.0274, +0.0519, +0.0320, -0.0858, -0.1450, +0.1630, +1.1702, +1.6084],    // a4
    [+0.0061, +0.0118, +0.0011, -0.0299, -0.0313, -0.1481, -0.5349, -0.8043, -0.3966, +1.7610, +2.7459],
    [-0.0086, -0.0055, +0.0012, +0.0110, +0.0292, +0.0837, +0.1715, +0.2952, +0.5023, +0.9176, +0.8491],
    [-0.0307, +0.1721, +0.1021, -0.0595, +0.7314, +0.0223, -2.4550, -3.5284, -7.1579, -2.1191, +4.7129],
    [-0.0553, -0.1728, -0.0648, +0.1220, -0.3619, +0.1587, +1.1865, +1.3575, +5.2534, +5.4281, +1.1089]
];
LBSailSim.Delft.residuaryResitanceInterps = [];
for (var i = 0; i < LBSailSim.Delft.residuaryResistanceCoefs.length; ++i) {
    LBSailSim.Delft.residuaryResitanceInterps.push(
            new LBMath.CSpline(LBSailSim.Delft.residuaryResistanceFns, LBSailSim.Delft.residuaryResistanceCoefs[i]));
};

LBSailSim.Delft._workingResiduaryResistanceCoefs = [];

/**
 * Calculates the residuary resistance force based on the Delft series equations as given
 * in Larsson, pg. 78.
 * @param {LBSailSim.Hull} hull The hull parameters.
 * @returns {Number}    The residuary resistance force.
 */
LBSailSim.Delft.calcResiduaryResistance = function(hull) {    
    if (LBMath.isLikeZero(hull.waterSpeed)) {
        return 0;
    }
    
    var vessel = hull.vessel;
    var env = vessel.sailEnv;
    var fn = env.calcFroudeNumber(hull.waterSpeed, hull.lwl);
    if (fn < 0.1) {
        fn = 0.1;
    }
    else if (fn > 0.6) {
        fn = 0.6;
    }
    
    var coefs = LBSailSim.Delft._workingResiduaryResistanceCoefs;
    coefs.length = 0;
    for (var i = 0; i < LBSailSim.Delft.residuaryResitanceInterps.length; ++i) {
        coefs.push(LBSailSim.Delft.residuaryResitanceInterps[i].interpolate(fn));
    }
    
    var result = LBSailSim.Delft.evalResiduaryResistance(hull, fn, coefs);
    return result * hull.delC * env.water.density * env.gravity;
};

/**
 * Evaluates the Delft residuary resistance equation for a given set of coefficients,
 * Larsson p.g 78.
 * @param {LBSailSim.Hull} hull The hull parameters.
 * @param {Number} fn   The Froude number.
 * @param {Array} coefs The array of coefficients.
 * @returns {Number}    Rrc / (delC * rho * g)
 */
LBSailSim.Delft.evalResiduaryResistance = function(hull, fn, coefs) {
    var val = coefs[0];
    var lcb_lwl = hull.lcb / hull.lwl;
    var delC_1_3 = Math.pow(hull.delC, 1/3);
    var delC_2_3 = delC_1_3 * delC_1_3;
    var delC_1_3_lwl = delC_1_3 / hull.lwl;
    val += (coefs[1]  * lcb_lwl + coefs[2] * hull.cp + coefs[3] * delC_2_3 / hull.aw + coefs[4] * hull.bwl / hull.lwl)
        * delC_1_3_lwl;
    val += (coefs[5] * delC_2_3 / hull.swc + coefs[6] * hull.lcb / hull.lcf + coefs[7] * lcb_lwl * lcb_lwl + coefs[8] * hull.cp * hull.cp)
        * delC_1_3_lwl;
    
    return (val > 0) ? val : 0;
};


/**
 * From Larsson, pg. 86.
 */
LBSailSim.Delft.wettedSurfaceHeelDegrees = [ 5, 10, 15, 20, 25, 30, 35 ];
LBSailSim.Delft.wettedSurfaceHeelCoefs = [
    [-4.1120, -4.5220, -3.2910, +1.8500, +6.5100, +12.334, +14.648],
    [+0.0540, -0.1320, -0.3890, -1.2000, -2.3050, -3.9110, -5.1820],
    [-0.0270, -0.0770, -0.1180, -0.1090, -0.0660, +0.0240, +0.1020],
    [+6.3290, +8.7380, +8.9490, +5.3640, +3.4430, +1.7670, +3.4970]
];
LBSailSim.Delft.wettedSurfaceHeelInterps = [];
for (var i = 0; i < LBSailSim.Delft.wettedSurfaceHeelCoefs.length; ++i) {
    LBSailSim.Delft.wettedSurfaceHeelInterps.push(
            new LBMath.CSpline(LBSailSim.Delft.wettedSurfaceHeelDegrees, LBSailSim.Delft.wettedSurfaceHeelCoefs[i]));
};

LBSailSim.Delft._workingWettedSurfaceHeelCoefs = [];

/**
 * Calculates the Delft wetted surface area correction for heel (multiply the result by the unheeled
 * wetted surface area). From Larsson pg. 86, Fossati pg. 28.
 * @param {LBSailSim.Hull} hull The hull parameters.
 * @returns {Number}    The correction to multiply the unheeled wetted surface area by.
 */
LBSailSim.Delft.calcWettedSurfaceHeelCorrection = function(hull) {
    var coefs = LBSailSim.Delft._workingWettedSurfaceHeelCoefs;
    coefs.length = 0;

    var deg = Math.abs(hull.heelAngleDeg);
    for (var i = 0; i < LBSailSim.Delft.wettedSurfaceHeelInterps.length; ++i) {
        coefs.push(LBSailSim.Delft.wettedSurfaceHeelInterps[i].interpolate(deg));
    }
    
    return LBSailSim.Delft.evalWettedSurfaceHeelCorrection(hull, coefs);
};

/**
 * Evaluates the Delft wetted surface area correction equation for a given set of coefficients.
 * @param {LBSailSim.Hull} hull The hull parameters.
 * @param {Array} coefs THe coefficients to use.
 * @returns {Number}    The correction.
 */
LBSailSim.Delft.evalWettedSurfaceHeelCorrection = function(hull, coefs) {
    var bwl_tc = hull.bwl / hull.tc;
    return 1 + 0.01 * (coefs[0] + coefs[1] * bwl_tc + coefs[2] * bwl_tc * bwl_tc + coefs[3] * hull.cm);
};


/**
 * To Add:
 * Residuary resistance corrections due to heel, Fosatti pg 29, Larsson pg 87.
 * Added resistance in waves, Fossati, pg. 89, Larsson pg. 92. Biiiigggg tables!
 */