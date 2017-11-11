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

define(['lbmath', 'lbgeometry'],
function(LBMath, LBGeometry) {

    'use strict';


/**
 * This module contains some classes for generating mathematical curves.
 * @exports LBCurve
 */
var LBCurve = LBCurve || {};

/**
 * A parametic 2D quadratic Bezier curve.
 * @constructor
 * @param {module:LBGeometry.Vector2} [p0=0,0] The point on the curve when t = 0.
 * @param {module:LBGeometry.Vector2} [p1=0,0] The midpoint control point of the curve.
 * @param {module:LBGeometry.Vector2} [p2=0,0] The point on the curve when t = 1.
 * @return {module:LBCurve.QuadraticBezier2}
 */
LBCurve.QuadraticBezier2 = function(p0, p1, p2) {
    /**
     * The point at t = 0.
     * @readonly
     * @member {module:LBGeometry.Vector2}
     */
    this.p0 = p0 || new LBGeometry.Vector2();

    /**
     * The midpoint control point.
     * @readonly
     * @member {module:LBGeometry.Vector2}
     */
    this.p1 = p1 || new LBGeometry.Vector2();

    /**
     * The point at t = 1.
     * @readonly
     * @member {module:LBGeometry.Vector2}
     */
    this.p2 = p2 || new LBGeometry.Vector2();
    
    this._curveLength = Number.NaN;
};

LBCurve.QuadraticBezier2.prototype = {};
LBCurve.QuadraticBezier2.prototype.constructor = LBCurve.QuadraticBezier2;

LBCurve.QuadraticBezier2.prototype.destroy = function() {
    this.p0 = null;
    this.p1 = null;
    this.p2 = null;
};

/**
 * Sets the control points of the curve.
 * @param {module:LBGeometry.Vector2} [p0=0,0,0] The point on the curve when t = 0.
 * @param {module:LBGeometry.Vector2} [p1=0,0,0] The midpoint control point of the curve.
 * @param {module:LBGeometry.Vector2} [p2=0,0,0] The point on the curve when t = 1.
 * @return {module:LBCurve.QuadraticBezier2}   this.
 */
LBCurve.QuadraticBezier2.prototype.setControlPoints = function(p0, p1, p2) {
    if ((p0 !== this.p0) || (p1 !== this.p1) || (p2 !== this.p2)) {
        this.p0.copy(p0);
        this.p1.copy(p1);
        this.p2.copy(p2);
        this._curveLength = Number.NaN;
    }
    return this;
};

/**
 * Returns the length of the curve from t = 0 to t = 1.
 * @return {Number} The length of the curve.
 */
LBCurve.QuadraticBezier2.prototype.getCurveLength = function() {
    if (Number.isNaN(this._curveLength)) {
        var ax = this.p0.x - 2 * this.p1.x + this.p2.x;
        var ay = this.p0.y - 2 * this.p1.y + this.p2.y;
        var bx = 2 * this.p1.x - this.p0.x;
        var by = 2 * this.p1.y - this.p0.y;
        if (LBMath.isLikeZero(ax) && LBMath.isLikeZero(ay) && LBMath.isLikeZero(bx) && LBMath.isLikeZero(by)) {
            this._curveLength = 0;
        }
        else {
            var A = 4 * (ax * ax + ay * ay);
            var B = 4 * (ax * bx + ay * by);
            var C = bx * bx + by * by;
            var twoSqrt_ABC = 2 * Math.sqrt(A + B + C);
            var sqrt_A = Math.sqrt(A);
            var twoA_Sqrt_A = 2 * A * sqrt_A;
            var twoSqrt_C = 2 * Math.sqrt(C);
            var BdivSqrtA = B / sqrt_A;
            var logTerm = (2 * sqrt_A + BdivSqrtA + twoSqrt_ABC) / (BdivSqrtA + twoSqrt_C);
            this._curveLength = (twoA_Sqrt_A * twoSqrt_ABC + sqrt_A * B * (twoSqrt_ABC - twoSqrt_C)
				+ (4 * C * A - B * B) * Math.log(logTerm)) / (4 * twoA_Sqrt_A);
        }
    }
    return this._curveLength;
};

/**
 * Calculates the coordinates of a point on the curve.
 * @param {Number} t    The parameter defining the point on the curve, normally within the range [0, 1].
 * @param {module:LBGeometry.Vector2} [store]  If defined the object to store the coordinates into.
 * @return {module:LBGeometry.Vector2} The coordinates of the point.
 */
LBCurve.QuadraticBezier2.prototype.calcPoint = function(t, store) {
    var oneMinusT = 1 - t;
    var oneMinusT_2 = oneMinusT * oneMinusT;
    var s0 = oneMinusT_2;
    var s1 = 2 * oneMinusT * t;
    var s2 = t * t;
    var x = s0 * this.p0.x + s1 * this.p1.x + s2 * this.p2.x;
    var y = s0 * this.p0.y + s1 * this.p1.y + s2 * this.p2.y;
    return (store) ? store.set(x, y) : new LBGeometry.Vector2(x, y);
};

/**
 * Calculates the tangent at a point on the curve.
 * @param {Number} t    The parameter defining the point on the curve, normally within the range [0, 1].
 * @param {module:LBGeometry.Vector2} [store]  If defined the object to store the tangent into.
 * @return {module:LBGeometry.Vector2} The tangent at the point.
 */
LBCurve.QuadraticBezier2.prototype.calcTangent = function(t, store) {
    var oneMinusT = 1 - t;
    var s1_0 = 2 * oneMinusT;
    var s2_1 = 2 * t;
    
    var x = s1_0 * (this.p1.x - this.p0.x) + s2_1 * (this.p2.x - this.p1.x);
    var y = s1_0 * (this.p1.y - this.p0.y) + s2_1 * (this.p2.y - this.p1.y);
    return (store) ? store.set(x, y) : new LBGeometry.Vector2(x, y);
};

return LBCurve;
});
