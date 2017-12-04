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


define(['lbgeometry-three', 'lbmath', 'lbutil', 'lbinterpolate'], 
function(LBGeometry, LBMath, LBUtil, LBInterpolate) {
    
    'use strict';

// This file holds geometry stuff that is not specifically THREE.js based.


var _parametricLineIntersectionLHS = [];
var _parametricLineIntersectionRHS = [];


/**
 * Calculates the intersection point between two lines in parametric terms, that is,
 * the parametric variables t and u of:
 *  ptA = fromA + t * (toA - fromA)
 *  ptB = fromB + u * (toB - fromB)
 * @param {module:LBGeometry.Vector2} fromA
 * @param {module:LBGeometry.Vector2} toA
 * @param {module:LBGeometry.Vector2} fromB
 * @param {module:LBGeometry.Vector2} toB
 * @param {Number[]} [store]    If defined an array to store the result into.
 * @returns {Number[]}  The array containing the result, with result[0] = t and result[1] = u,
 * if the lines are parallel then result.length === 0.
 */
LBGeometry.calcParametricLineIntersection = function(fromA, toA, fromB, toB, store) {
    var dxA = toA.x - fromA.x;
    var dyA = toA.y - fromA.y;
    var dxB = toB.x - fromB.x;
    var dyB = toB.y - fromB.y;
    
    // Solving:
    //  fromA.x + t * dxA = fromB.x + u * dxB
    //  fromA.y + t * dyA = fromB.y + u * dyB
    // Or:
    //  dxA * t - dxB * u = fromB.x - fromA.x
    //  dyA * t - dyB * u = fromB.y - fromA.y
    var lhs = _parametricLineIntersectionLHS;
    var rhs = _parametricLineIntersectionRHS;
    
    lhs[0] = dxA;
    lhs[1] = -dxB;
    lhs[2] = dyA;
    lhs[3] = -dyB;
    
    rhs[0] = fromB.x - fromA.x;
    rhs[1] = fromB.y - fromA.y;
    
    return LBMath.solve2x2Mat(lhs, rhs, store);
};


/**
 * Helper that represents a 2D rotation. Positive angles rotate the +x axis towards
 * the +y axis.
 * @constructor
 * @returns {module:LBGeometry.Rotation2D}
 */
LBGeometry.Rotation2D = function() {
    this._rotationDeg = 0;
    this._rotationRad = 0;
};

LBGeometry.Rotation2D.prototype = {
    /**
     * @property {Number} rotationDeg The rotation angle in degrees. This angle is not wrapped.
     */
    get rotationDeg() {
        return this._rotationDeg;
    },
    
    /**
     * Sets the rotation angle in degrees.
     * @param {Number} value    The angle in degrees.
     * @returns {Number}    value.
     */
    set rotationDeg(value) {
        this._rotationDeg = value;
        this._rotationRad = LBMath.DEG_TO_RAD * value;
        this._rotationChanged();
        return this._rotationDeg;
    },
    
    /**
     * @property {Number} rotationRad The rotation angle in radians. This angle is not wrapped.
     */
    get rotationRad() {
        return this._rotationRad;
    },

    /**
     * Sets the rotation angle in radians.
     * @param {Number} value    The angle in radians.
     * @returns {Number}    value.
     */
    set rotationRad(value) {
        this._rotationRad = value;
        this._rotationDeg = LBMath.RAD_TO_DEG * value;
        this._rotationChanged();
        return this._rotationRad;
    },
    
    _rotationChanged: function() {
        var deg = LBMath.wrapDegrees(this._rotationDeg);
        switch (deg) {
            case 0 :
                this.cosRad = 1.;
                this.sinRad = 0.;
                break;

            case 90 :
                this.cosRad = 0.;
                this.sinRad = 1.;
                break;

            case -90 :
                this.cosRad = 0.;
                this.sinRad = -1.;
                break;
                
            case 180 :
            case -180 :
                this.cosRad = -1.;
                this.sinRad = 0.;
                break;
                
            default :
                this.cosRad = Math.cos(this._rotationRad);
                this.sinRad = Math.sin(this._rotationRad);
                break;
        }
    },
    
    
    /**
     * Sets the rotation from the angle of a vector.
     * @param {module:LBGeometry.Vector2} vec   The vector.
     * @returns {module:LBGeometry.Rotation2D}  this.
     */
    setFromVector2: function(vec) {
        this.rotationRad = Math.atan2(vec.y, vec.x);
        return this;
    },
    
    /**
     * Sets the rotation from the angle formed by the vector end - start.
     * @param {module:LBGeometry.Vector2} start The point at the base of the vector.
     * @param {module:LBGeometry.Vector2} end   The point at the tip of the vector.
     * @returns {module:LBGeometry.Rotation2D}  this.
     */
    setFromTwoPoints: function(start, end) {
        this.rotationRad = Math.atan2(end.y - start.y, end.x - start.x);
        return this;
    },
    
    /**
     * Rotates a vector about the origin by the rotation angle.
     * @param {module:LBGeometry.Vector2} vec   The vector to rotate.
     * @param {module:LBGeometry.Vector2} [store]   If defined the vector to store the
     * result into, may be vec.
     * @returns {module:LBGeometry.Vector2} The rotated vector.
     */
    rotateVector2: function(vec, store) {
        var x = vec.x;
        var y = vec.y;
        store = store || new LBGeometry.Vector2();
        store.x = x * this.cosRad - y * this.sinRad;
        store.y = x * this.sinRad + y * this.cosRad;
        return store;
    },
    
    
    /**
     * Rotates a vector about the origin by the negative of the rotation angle.
     * @param {module:LBGeometry.Vector2} vec   The vector to rotate.
     * @param {module:LBGeometry.Vector2} [store]   If defined the vector to store the
     * result into, may be vec.
     * @returns {module:LBGeometry.Vector2} The rotated vector.
     */
    invRotateVector2: function(vec, store) {
        var x = vec.x;
        var y = vec.y;
        store = store || new LBGeometry.Vector2();
        store.x = x * this.cosRad + y * this.sinRad;
        store.y = -x * this.sinRad + y * this.cosRad;
        return store;
    },
    
    
    /**
     * Rotates a vector about a point by the rotation angle.
     * @param {module:LBGeometry.Vector2} vec   The vector to rotate.
     * @param {module:LBGeometry.Vector2} point The point to rotate about.
     * @param {module:LBGeometry.Vector2} [store]   If defined the vector to store the
     * result into, may be vec.
     * @returns {module:LBGeometry.Vector2} The rotated vector.
     */
    rotateVector2AboutPoint: function(vec, point, store) {
        if (vec !== store) {
            store = LBUtil.copyOrClone(store, vec);
        }
        store.sub(point);
        this.rotateVector2(store, store);
        return store.add(point);
    },
    
    
    /**
     * Rotates a vector about a point by the negative of the rotation angle.
     * @param {module:LBGeometry.Vector2} vec   The vector to rotate.
     * @param {module:LBGeometry.Vector2} point The point to rotate about.
     * @param {module:LBGeometry.Vector2} [store]   If defined the vector to store the
     * result into, may be vec.
     * @returns {module:LBGeometry.Vector2} The rotated vector.
     */
    invRotateVector2AboutPoint: function(vec, point, store) {
        if (vec !== store) {
            store = LBUtil.copyOrClone(store, vec);
        }
        store.sub(point);
        this.invRotateVector2(store, store);
        return store.add(point);
    },
    
    constructor: LBGeometry.Rotation2D
};


/**
 * A basic 2D rectangle represented as minimum and maximum x and y values.
 * @constructor
 * @returns {module:LBGeometry.Rect}
 */
LBGeometry.Rect = function() {
    if (arguments.length === 4) {
        this.minX = arguments[0];
        this.minY = arguments[1];
        this.maxX = arguments[2];
        this.maxY = arguments[3];
    }
    else if (arguments.length === 2) {
        this.minX = arguments[0].x;
        this.minY = arguments[0].y;
        this.maxX = arguments[1].x;
        this.maxY = arguments[1].y;
    }
    else if (arguments.length === 1) {
        this.copy(arguments[0]);
    }
    else {
        this.makeEmpty();
    }
};

LBGeometry.Rect.prototype = {
    /**
     * Clones the rectangle.
     * @returns {module:LBGeometry.Rect}
     */
    clone: function() {
        return new LBGeometry.Rect().copy(this);
    },
    
    /**
     * Sets this to match another rectangle.
     * @param {module:LBGeometry.Rect} other   The rectangle to copy.
     * @returns {module:LBGeometry.Rect}   this.
     */
    copy: function(other) {
        this.minX = other.minX;
        this.maxX = other.maxX;
        this.minY = other.minY;
        this.maxY = other.maxY;
        return this;
    },
    
    /**
     * Sets the properties of the rectangle.
     * @param {Number} minX
     * @param {Number} minY
     * @param {Number} maxX
     * @param {Number} maxY
     * @returns {module:LBGeometry.Rect}   this.
     */
    set: function(minX, minY, maxX, maxY) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
        return this;
    },
    
    /**
     * Determines if the rectangle is empty. The rectangle is empty if either
     * min coordinate is greater than the corresponding max coordinate.
     * @returns {Boolean}   true if the rectangle is empty.
     */
    isEmpty: function() {
        return (this.minX > this.maxX) || (this.minY > this.maxY);
    },
    
    /**
     * Determines if this rectangle is equal to another rectangle. The rectangles
     * are equal if all the rectangle properties are equal.
     * @param {module:LBGeometry.Rect} other   The rectangle to test against.
     * @returns {Boolean}   true if the rectangles are equal.
     */
    isEqual: function(other) {
        return (this.minX === other.minX)
            && (this.maxX === other.maxX)
            && (this.minY === other.minY)
            && (this.maxY === other.maxY);
    },
    
    /**
     * Makes the rectangle empty.
     * @returns {module:LBGeometry.Rect}   this.
     */
    makeEmpty: function() {
        this.minX = this.minY = Number.MAX_VALUE;
        this.maxX = this.maxY = -Number.MAX_VALUE;
        return this;
    },
    
    /**
     * Extends the rectangle as necessary so it encloses a given point.
     * @param {module:LBGeometry.Vector2|Number} pt   The point to enclose, either a point or separate x and y coordinates.
     * @returns {module:LBGeometry.Rect}   this.
     */
    extendToPoint: function(pt) {
        var x;
        var y;
        if (arguments.length === 1) {
            x = arguments[0].x;
            y = arguments[0].y;
        }
        else {
            x = arguments[0];
            y = arguments[1];
        }
        if (this.isEmpty()) {
            this.minX = this.maxX = x;
            this.minY = this.maxY = y;
        }
        else {
            this.minX = Math.min(x, this.minX);
            this.maxX = Math.max(x, this.maxX);
            this.minY = Math.min(y, this.minY);
            this.maxY = Math.max(y, this.maxY);
        }
        return this;
    },
    
    /**
     * Determines if the rectangle contains a given point. The rectdangle
     * contains the point if both coords of the point lie on or between the
     * correspnoding coordinate limits.
     * @param {module:LBGeometry.Vector2|Number} pt   The point to test, either a point or separate x and y coordinates.
     * @returns {Boolean}   true if pt is within the rectangle.
     */
    containsPoint: function(pt) {
        var x;
        var y;
        if (arguments.length === 1) {
            x = arguments[0].x;
            y = arguments[0].y;
        }
        else {
            x = arguments[0];
            y = arguments[1];
        }
        return (x >= this.minX) && (x <= this.maxX)
            && (y >= this.minY) && (y <= this.maxY);
    },
    
    /**
     * Expands the rectangle as necessary so it fully encloses another rectangle.
     * @param {module:LBGeometry.Rect} rect    The rectangle to enclose.
     * @returns {module:LBGeometry.Rect}   this.
     */
    extendToRect: function(rect) {
        if (!rect.isEmpty()) {
            if (this.isEmpty()) {
                this.copy(rect);
            }
            else {
                this.minX = Math.min(rect.minX, this.minX);
                this.maxX = Math.max(rect.maxX, this.maxX);
                this.minY = Math.min(rect.minY, this.minY);
                this.maxY = Math.max(rect.maxY, this.maxY);
            }
        }
        return this;
    },
    
    /**
     * Determines if the rectangle fully encloses another rectangle.
     * @param {module:LBGeometry.Rect} rect    The rectangle to test.
     * @returns {Boolean}   true if rect is fully enclosed by this.
     */
    containsEntireRect: function(rect) {
        return !this.isEmpty() && !rect.isEmpty()
            && (rect.minX >= this.minX) && (rect.maxX <= this.maxX)
            && (rect.minY >= this.minY) && (rect.maxY <= this.maxY);
    },
    
    /**
     * Determines if the rectangle encloses any portion of another rectangle.
     * @param {module:LBGeometry.Rect} rect    The rectangle to test.
     * @returns {Boolean}   true if rect is at least partially enclosed by this.
     */
    containsAnyOfRect: function(rect) {
        return !this.isEmpty() && !rect.isEmpty()
            && (rect.maxX >= this.minX) && (rect.minX <= this.maxX)
            && (rect.maxY >= this.minY) && (rect.minY <= this.maxY);
    },
    
    /**
     * Offsets the rectangle.
     * @param {Number} dx   The amount to add to minX and maxX.
     * @param {Number} [dy=dx]  The amount to add to minY and maxY.
     * @returns {module:LBGeometry.Rect}   this.
     */
    offset: function(dx, dy) {
        dy = ((dy === undefined) || (dy === null)) ? dx : dy;
        this.minX += dx;
        this.maxX += dx;
        this.minY += dy;
        this.maxY += dy;
        
        return this;
    },
    
    /**
     * Multiplies the coordinates of the rectangle. The scaling values should be &ge; 0.
     * @param {Number} sx   The amount to multiply minX and maxX by.
     * @param {Number} [sy=sx]  The amount to multiply minY and maxY by.
     * @returns {module:LBGeometry.Rect}   this.
     */
    multiply: function(sx, sy) {
        sy = ((sy === undefined) || (sy === null)) ? sx : sy;
        this.minX *= sx;
        this.maxX *= sx;
        this.minY *= sy;
        this.maxY *= sy;
        
        return this;
    },

    /**
     * @returns {Number}    The width of the rectangle.
     */
    width: function() {
        return this.maxX - this.minX;
    },
    
    /**
     * Changes the width of the rectangle, the center stays the same.
     * @param {Number} width    The new width.
     * @returns {module:LBGeometry.Rect}   this.
     */
    setWidth: function(width) {
        var x = this.centerX();
        this.minX = x - width / 2;
        this.maxX = this.minX + width;
        return this;
    },
    
    /**
     * @returns {Number}    The height of the rectangle.
     */
    height: function() {
        return this.maxY - this.minY;
    },
    
    /**
     * Changes the height of the rectangle, the center stays the same.
     * @param {Number} height   The new height.
     * @returns {module:LBGeometry.Rect}   this.
     */
    setHeight: function(height) {
        var y = this.centerY();
        this.minY = y - height / 2;
        this.maxY = this.minY + height;
        return this;
    },
    
    /**
     * @returns {Number}    The x coordinate of the center of the rectangle.
     */
    centerX: function() {
        return (this.minX + this.maxX) / 2;
    },
    
    /**
     * @returns {Number}    The y coordinate of the center of the rectangle.
     */
    centerY: function() {
        return (this.minY + this.maxY) / 2;
    },
    
    /**
     * Retrieves the center of the rectangle as a point.
     * @param {module:LBGeometry.Vector2} [store]  If defined the object to store the center into.
     * @returns {module:LBGeometry.Vector2}    A point representing the center.
     */
    getCenter: function(store) {
        store = store || new LBGeometry.Vector2();
        store.x = this.centerX();
        store.y = this.centerY();
        return store;
    },
    
    /**
     * Changes the center of the rectangle. The size stays the same.
     * @param {Number} x    The new x coordinate.
     * @param {Number} y    The new y coordinate.
     * @returns {module:LBGeometry.Rect}   this.
     */
    setCenter: function(x, y) {
        var width = this.width();
        var height = this.height();
        this.minX = x - width / 2;
        this.maxX = this.minX + width;
        this.minY = y - height / 2;
        this.maxY = this.minY + height;
        
        return this;
    },
    
    /**
     * Changes the size of the rectangle, the center stays the same.
     * @param {Number} width    The new width.
     * @param {Number} height   The new height.
     * @returns {module:LBGeometry.Rect}   this.
     */
    setSize: function(width, height) {
        return this.setWidth(width)
                .setHeight(height);
    },
    
    constructor: LBGeometry.Rect
};


/**
 * A 2D ellipse centered at the origin. The major and minor axes are always aligned
 * with the x and y axes.
 * @constructor
 * @param {Number} [xAxis=1]   The half length of the ellipse along the x axis.
 * @param {Number} [yAxis=xAxis/2]   The half length of the ellipse along the y axis..
 * @returns {module:LBGeometry.Ellipse}
 */
LBGeometry.Ellipse = function(xAxis, yAxis) {
    /**
     * The half length of the ellipse along the x axis.
     * @member {Number}
     */
    this._xAxis = xAxis || 1;

    /**
     * The half length of the ellipse along the y axis.
     * @member {Number}
     */
    this._yAxis = yAxis || this._xAxis/2;
    
    this._axisValuesUpdated();
};

LBGeometry.Ellipse.prototype = {
    get xAxis() {
        return this._xAxis;
    },
    set xAxis(value) {
        if (this._xAxis !== value) {
            this._xAxis = value;
            this._axisValuesUpdated();
        }
        return value;
    },
    
    get yAxis() {
        return this._yAxis;
    },
    set yAxis(value) {
        if (this._yAxis !== value) {
            this._yAxis = value;
            this._axisValuesUpdated();
        }
        return value;
    },
    
    _axisValuesUpdated: function() {
        this._yAxis_div_xAxis = this._yAxis / this._xAxis;
        this._yAxis_div_xAxis_2 = this._yAxis_div_xAxis * this._yAxis_div_xAxis;
        this._xAxis_2 = this._xAxis * this._xAxis;
        this._yAxis_2 = this._yAxis * this._yAxis;
        if (this._xAxis >= this._yAxis) {
            this._rotationDeg = 0;
        }
        else {
            this._rotatioDeg = 90;
        }
    },
    
    get rotationDeg() {
        return this._rotationDeg;
    },
    
    /**
     * Creates a copy of this ellipse.
     * @returns {module:LBGeometry.Ellipse}
     */
    clone: function() {
        return new LBGeometry.Ellipse(this._xAxis, this._yAxis);
    },
    
    /**
     * Sets this ellipse to match another.
     * @param {module:LBGeometry.Ellipse} other The ellipse to copy
     * @returns {module:LBGeometry.Ellipse}
     */
    copy: function(other) {
        this._xAxis = other._xAxis;
        this._yAxis = other._yAxis;
        this._axisValuesUpdated();
        return this;
    },
    
    /**
     * Retrieves the two y values for a given x value on the ellipse.
     * @param {Number} x    The x value of interest.
     * @param {Number[]} [store]    If defined the array to store the values into.
     * @returns {Number[]}    If x is not on the ellipse, the array is empty. If x is
     * on the major axis then the result is an array with the single y value, otherwise it is
     * an array with the two y values.
     */
    getYsForX: function(x, store) {
        store = store || [];
        store.length = 0;
        if ((x < -this._xAxis) || (x > this._xAxis)) {
            return store;
        }
        
        var y = Math.sqrt(this._xAxis_2 - x * x) * this._yAxis_div_xAxis;
        store[0] = y;
        if (y) {
            store[1] = -y;
        }
        
        return store;
    },
    
    /**
     * Retrieves the two x values for a given y value on the ellipse.
     * @param {Number} y    The y value of interest.
     * @param {Number[]} [store]    If defined the array to store the values into.
     * @returns {Number[]}    If y is not on the ellipse, the array is empty. If y is
     * on the minor axis then the result is an array with the single x value, otherwise it is
     * an array with the two x values.
     */
    getXsForY: function(y, store) {
        store = store || [];
        store.length = 0;
        if ((y < -this._yAxis) || (y > this._yAxis)) {
            return store;
        }
        
        var x = Math.sqrt(this._yAxis_2 - y * y) / this._yAxis_div_xAxis;
        store[0] = x;
        if (x) {
            store[1] = -x;
        }
        
        return store;
    },
    
    
    /**
     * Retrieves the +/- slopes dy/dx at a given x coordinate on the ellipse.
     * @param {Number} x    The x coordinate.
     * @param {Number[]} [store]    If defined the array to store the results into.
     * @returns {Number[]}  If x is not on the ellipse, the array is empty. If x is
     * on the major axis then the result is an array with the single value {@link Number.POSITIVE_INFINITY}, otherwise it is
     * an array with the two dy/dx values.
     */
    getSlopeAtX: function(x, store) {
        store = store || [];
        store.length = 0;
        if ((x < -this._xAxis) || (x > this._xAxis)) {
            return store;
        }

        var y = Math.sqrt(this._xAxis_2 - x * x) * this._yAxis_div_xAxis;
        if (LBMath.isLikeZero(y)) {
            store.push(Number.POSITIVE_INFINITY);
        }
        else {
            var dydx = -x/y * this._yAxis_div_xAxis_2;
            store.push(dydx);
            if (dydx !== 0) {
                store.push(-dydx);
            }
        }
        return store;
    },
    
    /**
     * Retrieves the +/- slopes dy/dx at a given y coordinate on the ellipse.
     * @param {Number} y    The y coordinate.
     * @param {Number[]} [store]    If defined the array to store the results into.
     * @returns {Number[]}  If y is not on the ellipse, the array is empty. If y is
     * on the minor axis then the result is an array with the single value 0, otherwise it is
     * an array with the two dy/dx values.
     */
    getSlopeAtY: function(y, store) {
        store = store || [];
        store.length = 0;
        if ((y < -this._yAxis) || (y > this._yAxis)) {
            return store;
        }
        if (LBMath.isLikeZero(y)) {
            store.push(Number.POSITIVE_INFINITY);
        }
        else {
            var x = Math.sqrt(this._yAxis * this._yAxis - y * y) / this._yAxis_div_xAxis;
            var dydx = -x / y * this._yAxis_div_xAxis_2;
            store.push(dydx);
            if (dydx !== 0) {
                store.push(-dydx);
            }
        }
        return store;
    },
    
    /**
     * Retrieves the points on the ellipse that have a given slope.
     * @param {Number} dydx
     * @param {Number[]} [store]    If defined the array to receive the results.
     * @returns {Number[]}  The array containing the point coordinates.
     */
    getPointsWithTangent: function(dydx, store) {
        store = store || [];
        store.length = 0;
        
        if (!Number.isFinite(dydx)) {
            // Vertical slope, therefore tangents are at the ends of the major axis.
            store.push(this._xAxis);
            store.push(0);
            store.push(-this._xAxis);
            store.push(0);
            return store;
        }
        else if (dydx === 0) {
            // Horizontal slope, tangents are the ends of the minor axis.
            store.push(0);
            store.push(this._yAxis);
            store.push(0);
            store.push(-this._yAxis);
            return store;
        }
        
        var dydx_2 = dydx * dydx;
        var x0 = Math.sqrt(this._xAxis_2 * dydx_2 / (this._yAxis_div_xAxis_2 + dydx_2));
        var y0 = Math.sqrt(this._xAxis_2 - x0 * x0) * this._yAxis_div_xAxis;
        var testDyDx = -x0 / y0 * this._yAxis_div_xAxis_2;
        store.push(x0);
        if (Math.abs(testDyDx - dydx) < Math.abs(-testDyDx - dydx)) {
            store.push(y0);
            store.push(-x0);
            store.push(-y0);
        }
        else {
            store.push(-y0);
            store.push(-x0);
            store.push(y0);
        }
        
        return store;
    },
    
    /**
     * Determines if a point is in the ellipse.
     * @param {Number} x    The x coordinate of the point.
     * @param {Number} y    The y coordinate of the point.
     * @returns {Boolean}   true if the point is in or on the ellipse.
     */
    isPointInEllipse: function(x, y) {
        var result = x * x / this._xAxis_2 + y * y / this._yAxis_2;
        return result <= 1;
    },
    
    constructor: LBGeometry.Ellipse
};

return LBGeometry;
});
