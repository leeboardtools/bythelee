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

/* global Leeboard */

/**
 * Object holding lift, drag, and moment coefficients.
 */
Leeboard.ClCd = function(cl, cd, cm) {
    /**
     * @property {number} cl The lift coefficient, Cl
     */
    this.cl = cl || 0;
        
    /**
     * @property {number} cd The drag coefficient, Cd
     */
    this.cd = cd || 0;

    
    /**
     * @property {number} cm The moment coefficient, Cm
     */
    this.cm = cm || 0;
};

Leeboard.ClCd.prototype = {
    constructor: Leeboard.ClCd,
    
    /**
     * Calculates the lift and drag forces and the moment from the coefficients.
     * @param {number} rho    The density.
     * @param {number} area   The area.
     * @param {number} qInfSpeed   The magnitude of the free stream velocity.
     * @param {number} chordLength The chord length, used for calculating the moment.
     * @param {number} aspectRatio  Optional aspect ratio, used for calculating the induced drag.
     * @param {object} store  Optional object to store the lift, drag, and moment into.
     * @returns {object}    The object containing the calculated lift, drag, and moment.
     */
    calcLiftDragMoment : function(rho, area, qInfSpeed, chordLength, aspectRatio, store) {
        var scale = 0.5 * rho * area * qInfSpeed * qInfSpeed;
        store = store || {};
        store.lift = this.cl * scale;
        store.drag = this.cd * scale;
        chordLength = chordLength || 1;
        store.moment = this.cm * scale * chordLength;
        if (Leeboard.isVar(aspectRatio)) {
            var ci = this.cl * this.cl / (Math.PI * aspectRatio);
            store.inducedDrag = scale * ci;
        }
        else {
            store.inducedDrag = undefined;
        }
        return store;
    }
}

/**
 * Calculates the moment coefficient for a given angle of attack, coefficients of lift,
 * drag, and force application point relative to the leading edge.
 * @param {number} degrees  The angle of attack in degrees.
 * @param {number} cl   The coefficient of lift at the angle of attack.
 * @param {number} cd   The coefficient of drag at the angle of attack.
 * @param {number} chordFraction    The point where the force is applied along the chord
 * as a fraction of the chord from the leading edge.
 * @returns {Number}    The moment coefficient.
 */
Leeboard.calcCmForClCd = function(degrees, cl, cd, chordFraction) {
    // Would like the moment to be such that the force is applied at the
    // quarter chord point.
    // For that we have the force:
    // fx = (qInfNorm.x * cl + qInfDir.x * cd) * 1/2 * rho * QInf^2
    // fy = (qInfNorm.y * cl + qInfDir.y * cd) * 1/2 * rho * QInf^2
    // Rx = 0.25
    // Ry = 0
    // c = 1
    // m = Rx * fy - Ry * fx, but Ry = 0 so m = Rx * fy
    // m = 1/4 * (qInfNorm.y * cl + qInfDir.y * cd) * 1/2 * rho * QInf^2
    // cm = m / (1/2 * rho * QInf^2 * c^2)
    // cm = 1/4 * (qInfNorm.y * cl + qInfDir.y * cd)
    // qInfDir.x = cos(alpha)
    // qInfDir.y = sin(alpha)
    // qInfNorm.x = -qInfDir.y = -sin(alpha)
    // qInfNorm.y = qInfDir.y = cos(alpha)
    var alphaRad = degrees * Leeboard.DEG_TO_RAD;
    var cosAlpha = Math.cos(alphaRad);
    var sinAlpha = Math.sin(alphaRad);            
    return chordFraction * (cosAlpha * cl + sinAlpha * cd);
}


/**
 * Object that computes an approximation of the lift/drag/moment coefficients
 * of a flat plate when stalled.
 * @returns {Leeboard.ClCdStall}
 */
Leeboard.ClCdStall = function(cl45Deg, cd45Deg, cd90Deg) {
    /**
     * @property {number} cl45Deg The coefficient of lift at 45 degrees angle of attack.
     */
    this.cl45Deg = cl45Deg || 1.08;
    
    /**
     * @@property {number} cd45Deg The coefficient of drag at 45 degrees angle of attack.
     */
    this.cd45Deg = cd45Deg || 1.11;
    
    /**
     * @property {number} cd90Deg The coefficient of drag at 90 degrees angle of attack (the
     * lift is 0 at 90 degrees).
     */
    this.cd90Deg = cd90Deg || 1.80;
};
Leeboard.ClCdStall.prototype = {
    constructor: Leeboard.ClCdStall,
    
    /**
     * Loader method.
     * @param {object} data   The data, typically loaded from a JSON file.
     */
    load: function(data) {
        this.cl45Deg = data.cl45Deg || this.cl45Deg;
        this.cd45Deg = data.cd45Deg || this.cd45Deg;
        this.cd90Deg = data.cl90Deg || this.cd90Deg;
    },
    
    /**
     * Calculates the coefficients of lift, drag and moment for a given angle of attack in degrees.
     * @param {number} degrees    The angle of attack in degrees.
     * @param {object} store  If not undefined, the object to store the coefficients in.
     * @returns {object}  The object with the lift, drag, and moment coefficients (cl, cd, cm).
     */
    calcCoefsDeg: function(degrees, store) {        
        store = store || new Leeboard.ClCd();
        
        var sign;
        if (degrees < 0) {
            degrees = -degrees;
            sign = -1;
        }
        else {
            sign = 1;
        }
        
        var deltaDeg;
        if (degrees > 90) {
            deltaDeg = 180 - degrees;
        }
        else {
            deltaDeg = degrees;
        }
        var x = (deltaDeg - 45) / 90;
        store.cd = this.cd45Deg + 4 * (this.cd90Deg - this.cd45Deg) * x * (1 - x);   
        
        // 45 degrees is our 0 point...
        store.cl = this.cl45Deg * Math.cos(2 * (degrees - 45) * Leeboard.DEG_TO_RAD) * sign;    
        store.cm = (0.46 + 0.04 * (degrees - 30) / 60) * sign;
        
        return store;
    }
};


/**
 * Interpolator based Cl/Cd/Cm calculator.
 * @returns {Leeboard.ClCdInterp}
 */
Leeboard.ClCdInterp = function() {    
    this.alphas = [];
    this.cls = [];
    this.cds = [];
    this.cms = [];
    this.interpCls = new Leeboard.CSpline();
    this.interpCds = new Leeboard.CSpline();
    this.interpCms = null;
};

Leeboard.ClCdInterp.prototype = {
    constructor: Leeboard.ClCdInterp,
    
    /**
     * Loads the interpolation data. Note that this stores the coefficient arrays
     * by reference, not as copies.
     * @param {object} data   The data, typically loaded from a JSON file.
     */
    load: function(data) {
        this.alphas = data.alphas;
        this.cls = data.cls;
        this.cds = data.cds;
        this.cms = data.cms;
        
        this.interpCls.setup(this.alphas, this.cls);
        this.interpCds.setup(this.alphas, this.cds);
        if (Leeboard.isVar(this.cms) && (this.cms.length === this.alphas.length)) {
            this.interpCms = new Leeboard.CSpline();
            this.interpCms.setup(this.alphas, this.cms);
        }
        else {
            this.interpCms = null;
        }
    },
    
    /**
     * Calculates the coefficients of lift, drag and moment for a given angle of attack in degrees.
     * @param {number} degrees    The angle of attack in degrees.
     * @param {object} store  If not undefined, the object to store the coefficients in.
     * @returns {object}  The object with the lift, drag, and moment coefficients (cl, cd, cm).
     */
    calcCoefsDeg: function(degrees, store) {
        store = store || new Leeboard.ClCd();
        
        var lowIn = this.interpCls.findLowIndex(degrees);
        store.cl = this.interpCls.interpolate(degrees, lowIn);
        store.cd = this.interpCds.interpolate(degrees, lowIn);
        
        if (this.interpCms !== null) {
            store.cm = this.interpCms.interpolate(degrees, lowIn);
        }
        else {
            store.cm = Leeboard.calcCmForClCd(degrees, store.cl, store.cd, 0.25);
        }
        
        return store;
    }
};


/**
 * A Cl/Cd curve calculates lift (Cl), drag (Cd), and moment (Cm) coeffiecients given an angle
 * of attack.
 * @constructor
 * @returns {Leeboard.ClCdCurve}
 */
Leeboard.ClCdCurve = function() {
    this.clCdLifting = new Leeboard.ClCdInterp();
    this.liftingEndDeg = 90;
    this.isSymmetric = true;
    
    this.stallStartDeg = 90;
    this.clCdStall = null;
};

Leeboard.ClCdCurve.prototype = {
    constructor: Leeboard.ClCdCurve,
    
    /**
     * The main loading method.
     * @param {object} data   The data, typically loaded from a JSON file.
     * @return {object} this.
     */
    load: function(data) {
        if (!Leeboard.isVar(data)) {
            return this;
        }
        
        if (typeof data.clCdStall === "clCdStall") {
            this.stallStartDeg = data.stallStartDeg || 90;
            this.liftEndDeg = data.liftEndDeg || this.stallStartDeg;
            
            this.clCdStall.load(data.clCdStall);
        }
        else {
            this.clCdStall = null;
        }
        
        this.isSymmetric = data.isSymmetric || true;
        
        if (Leeboard.isVar(data.clCdInterp)) {
            this.clCdLifting = new Leeboard.ClCdInterp();
            this.clCdLifting.load(data.clCdInterp);
        }
        
        return this;
    },
    
    
    /**
     * Calculates the coefficients of lift, drag and moment for a given angle of attack in degrees.
     * @param {number} degrees    The angle of attack in degrees.
     * @param {object} store  If not undefined, the object to store the coefficients in.
     * @returns {object}  The object with the lift, drag, and moment coefficients (cl, cd, cm).
     */
    calcCoefsDeg: function(degrees, store) {
        var sign;
        if (this.isSymmetric && (degrees < 0)) {
            sign = -1;
            degrees = -degrees;
        }
        else {
            sign = 1;
        }
        
        // TODO: To support a non-symmetric clCdStall, we need to add liftStartDeg and stallEndDeg.
        if ((degrees <= this.stallStartDeg) || (this.clCdStall === null)) {
            store = this.clCdLifting.calcCoefsDeg(degrees, store);
        }
        else if (degrees >= this.liftEndDeg) {
            store = this.clCdStall.calcCoefsDeg(degrees, store);            
        }
        else {
            var store = this.clCdLifting.calcCoefsDeg(degrees, store);
            var stalled = this.clCdStall.calcCoefsDeg(degrees);
            var x = (degrees - this.stallStartDeg) / (this.liftEndDeg - this.stallStartDeg);
            var s = Leeboard.smoothstep3(x);
            var sLift = 1 - s;
            store.cl = store.cl * sLift + stalled.cl * s;
            store.cd = store.cd * sLift + stalled.cd * s;
            store.cm = store.cm * sLift + stalled.cm * s;
        }
        
        store.cl *= sign;
        store.cm *= sign;
        return store;
    },

    test: function(start, end, delta) {
        console.log("Test ClCdCurve:");
        var clCd;
        for (var i = start; i < end; i += delta) {
            clCd = this.calcCoefsDeg(i, clCd);
            console.log(i + "\t" + clCd.cl + "\t" + clCd.cd + "\t" + clCd.cm);
        }
    }
    
};


/**
 * A foil generates a 3D force in a fluid flow, using a 2D slice within a local coordinate
 * frame to calculate the force. The 2D slice lies within the local x-y plane, while the 
 * foil's span lies along the z-axis.
 * <p>
 * The force generated by the foil is presumed to lie within the 2D slice's plane, therefore
 * its local z coordinate will be the same as the z coordinate of the 2D slice in the
 * local coordinate system.
 * @returns {Leeboard.Foil}
 */
Leeboard.Foil = function() {
    /**
     * @property {object} chord A line describing the chord, with the chord.start treated as the
     * leading edge of the chord. This is used to resolve the angle of attack.
     */
    this.chordLine = Leeboard.createLine2D();
    
    /**
     * @property {number} sliceZ The z coordinate of the 2D slice.
     */
    this.sliceZ = 0;
    
    /**
     * @property {number} area The area to use in computing the forces from the coefficients.
     */
    this.area = 1;
    
    /**
     * @property {number} aspectRatio The aspect ratio of the foil, this may be null.
     */
    this.aspectRatio = null;
    
    /**
     * @property {Leeboard.ClCdCurve} clCdCurve The coefficient of lift/drag/moment curve.
     */
    this.clCdCurve = new Leeboard.ClCdCurve();
};

Leeboard.Foil.prototype = {
    constructor: Leeboard.Foil,
        
    /**
     * The main loading method.
     * @param {object} data   The data, typically loaded from a JSON file.
     * @return {object} this.
     */
    load: function(data) {
        this.chordLine = Leeboard.copyCommonProperties(this.chordLine, data.chordLine);
        this.sliceZ = data.sliceZ || this.sliceZ;
        this.area = data.area || this.area;
        this.aspectRatio = data.aspectRatio || this.aspectRatio;
        
        this.clCdCurve.load(data.clCdCurve);
        
        return this;
    },
    
    /**
     * Calculates the lift and drag forces, and the moment, all in local coordinates.
     * The moment is about the leading edge, or this.chordLine.start.
     * @param {number} rho  The fluid density.
     * @param {object} qInfLocal    The free stream velocity in the local x-y plane.
     * @param {type} store  If defined, the object to receive the forces and moment.
     * @returns {object}    The object containing the forces and moment.
     */
    calcLocalLiftDragMoment: function(rho, qInfLocal, store) {
        var chord = this.chordLine.delta();
        var angleDeg = chord.angleTo(qInfLocal) * Leeboard.RAD_TO_DEG;
        var coefs = this.clCdCurve.calcCoefsDeg(angleDeg);
        var qInfSpeed = qInfLocal.length();
        var chordLength = chord.length();
        
        if (Leeboard.isVar(store)) {
            store.angleDeg = angleDeg;
            store.qInfLocal = qInfLocal.clone();
            Object.assign(store, coefs);            
        }
        return coefs.calcLiftDragMoment(rho, this.area, qInfSpeed, chordLength, this.aspectRatio, store);
    },
    
    /**
     * Calculates the forces and moment in the local x-y plane coordinates.
     * The moment is about the leading edge, or this.chordLine.start.
     * @param {number} rho  The fluid density.
     * @param {object} qInfLocal    The free stream velocity in the local x-y plane.
     * @param {object} details   If defined, an object that will receive details such
     * as lift, drag, induced drag, moment.
     * @returns {Leeboard.Resultant3D}  The resultant force in local coordinates.
     */
    calcLocalForce: function(rho, qInfLocal, details) {
        details = this.calcLocalLiftDragMoment(rho, qInfLocal, details);
        
        var drag = details.drag;
        if (Leeboard.isVar(details.inducedDrag)) {
            drag += details.inducedDrag;
        }
        
        var qInfSpeed = qInfLocal.length();
        var qInfNormal = Leeboard.tangentToNormalXY(qInfLocal);
        var fx = qInfNormal.x * details.lift + qInfLocal.x * drag / qInfSpeed;
        var fy = qInfNormal.y * details.lift + qInfLocal.y * drag / qInfSpeed;
        
        var force = Leeboard.createVector3D(fx, fy, 0);
        var moment = Leeboard.createVector3D(0, 0, details.moment);
        return new Leeboard.Resultant3D(force, moment, this.chordLine.start);
    }
};
