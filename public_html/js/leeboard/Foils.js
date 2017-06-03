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
Leeboard.ClCd = function() {
    this.cl = 0;
    this.cd = 0;
    this.cm = 0;
};


/**
 * Computes an approximate stalled Cl/Cd polar curve.
 * @returns {Leeboard.ClCdStall}
 */
Leeboard.ClCdStall = function() {
    this.cl45Deg = 1.08;
    this.cd45Deg = 1.11;
    this.cd90Deg = 1.80;
};
Leeboard.ClCdStall.prototype = {
    constructor: Leeboard.ClCdStall,
    
    /**
     * Loader method.
     * @param {type} data
     */
    load: function(data) {
        this.cl45Deg = Leeboard.assign(data.cl45Deg, this.cl45Deg);
        this.cd45Deg = Leeboard.assign(data.cd45Deg, this.cd45Deg);
        this.cd90Deg = Leeboard.assign(data.cl90Deg, this.cd90Deg);
    },
    
    /**
     * Calculates the coefficients of lift, drag and moment for a given angle of attack in degrees.
     * @param {number} degrees    The angle of attack in degrees.
     * @param {object} store  If not undefined, the object to store the coefficients in.
     * @returns {object}  The object with the lift, drag, and moment coefficients (cl, cd, cm).
     */
    calcCoefsDeg: function(degrees, store) {        
        if (!Leeboard.isVar(store)) {
            store = new Leeboard.ClCd();
        }
        
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
 * Interpolator based Cl/Cd polar curve calculator.
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
     * Loads the interpolation data.
     * @param {type} data 
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
        if (!Leeboard.isVar(store)) {
            store = new Leeboard.ClCd();
        }
        
        var sign;
        if (degrees < 0) {
            degrees = -degrees;
            sign = -1;
        }
        else {
            sign = 1;
        }
        
        var lowIn = this.interpCls.findLowIndex(degrees);
        store.cl = this.interpCls.interpolate(degrees, lowIn) * sign;
        store.cd = this.interpCds.interpolate(degrees, lowIn);
        
        if (this.interpCms !== null) {
            store.cm = this.interpCms.interpolate(degrees, lowIn) * sign;
        }
        else {
            store.cm = 0.25 * sign;
        }
        
        return store;
    }
};


/**
 * A Cl/Cd curve calculates lift (Cl) and drag (Cd) coeffiecients given an angle
 * of attack in radians.
 * @constructor
 * @returns {Leeboard.ClCdCurve}
 */
Leeboard.ClCdCurve = function() {
    this.clCdLifting = new Leeboard.ClCdInterp();
    this.liftingEndDeg = 90;
    
    this.stallStartDeg = 90;
    this.clCdStall = null;
};

Leeboard.ClCdCurve.prototype = {
    constructor: Leeboard.ClCdCurve,
    
    /**
     * The main loading function.
     * @param {type} data
     */
    load: function(data) {
        if (!Leeboard.isVar(data)) {
            return;
        }
        
        if (typeof data.clCdStall === "clCdStall") {
            this.stallStartDeg = Leeboard.assign(data.stallStartDeg, 90);
            this.liftEndDeg = Leeboard.assign(data.liftEndDeg, this.stallStartDeg);
            
            this.clCdStall.load(data.clCdStall);
        }
        else {
            this.liftEndDeg = 90;
            this.stallStartDeg = 90;
            this.clCdStall = null;
        }
        
        if (Leeboard.isVar(data.clCdInterp)) {
            this.clCdLifting = new Leeboard.ClCdInterp();
            this.clCdLifting.load(data.clCdInterp);
        }
    },
    
    
    /**
     * Calculates the coefficients of lift, drag and moment for a given angle of attack in degrees.
     * @param {number} degrees    The angle of attack in degrees.
     * @param {object} store  If not undefined, the object to store the coefficients in.
     * @returns {object}  The object with the lift, drag, and moment coefficients (cl, cd, cm).
     */
    calcCoefsDeg: function(degrees, store) {
        var sign;
        if (degrees < 0) {
            sign = -1;
            degrees = -degrees;
        }
        else {
            sign = 1;
        }
        
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
 * A foil generates a force in a fluid flow.
 * <p>
 * The foil is modeled as a 2D slice in the local x-y plane, but with a span dimension
 * along the z axis. The 2D slice is where the lift/drag/moment coefficients are applied.
 * The leading edge of the foil within this slice is at x=0, y=0, the chord is along the x axis.
 * <p>
 * The z coordinate of the 2D slice is the z coordinate of the center of effort of the foil.
 * @returns {Leeboard.Foil}
 */
Leeboard.Foil = function() {
    /**
     * @property {object} position The 3D position of the base of the foil.
     */
    this.position = Leeboard.createVector3D();
    
    /**
     * @property {object} orientation The quaternion defining the orientation of the leading edge.
     */
    this.orientation = Leeboard.createQuaternion();
    
    /**
     * @property {number} centerOfEffortZ The position along the z axis of the x-y plane
     * containing the center of effort.
     */
    this.centerOfEffortZ = 1;
    
    /**
     * @property {number} area The area to use for the force generation.
     */
    this.area = 1;
    
    /**
     * @property {Leeboard.ClCdCurve} clCdCurve The coefficient of lift/drag/moment curve.
     */
    this.clCdCurve = new Leeboard.ClCdCurve();
};

Leeboard.Foil.prototype = {
    constructor: Leeboard.Foil,
    
    load: function(data) {
        Leeboard.copyCommonProperties(this.position, data.position);
        Leeboard.copyCommonProperties(this.orientation, data.orientation);
        this.centerOfEffortZ = Leeboard.assign(data.centerOfEffortZ, this.centerOfEffortZ);
        this.area = Leeboard.assign(data.area, this.area);
        
        this.clCdCurve.load(data.clCdCurve);
    },
    
    calcForce: function(rho, fluidVel, foilVel, store) {
    }
    
};
