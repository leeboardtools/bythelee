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

/* global Leeboard, LBGeometry, LBPhysics, LBMath */

/**
 * @namespace LBFoils
 */
var LBFoils = LBFoils || {};

/**
 * Object holding lift, drag, and moment coefficients.
 * @constructor
 * @param {number} cl The lift coefficient.
 * @param {number} cd The drag coefficient.
 * @param {number} cm The moment coefficient.
 * @returns {LBFoils.ClCd} 
 */
LBFoils.ClCd = function(cl, cd, cm) {
    /**
     * The lift coefficient, Cl
     * @member {number}
     */
    this.cl = cl || 0;
        
    /**
     * The drag coefficient, Cd
     * @member {number}
     */
    this.cd = cd || 0;

    
    /**
     * The moment coefficient, Cm
     * @member {number}
     */
    this.cm = cm || 0;
    
    /**
     * If true then cm represents the chord fraction rather than the true moment coefficient.
     * @member {Boolean}
     */
    this.cmIsChordFraction = false;
};

/**
 * Calculates the lift and drag forces and the moment from the coefficients.
 * @param {object} coefs    The lift/drag coefficients.
 * @param {number} rho    The density.
 * @param {number} area   The area.
 * @param {number} qInfSpeed   The magnitude of the free stream velocity.
 * @param {number} chordLength The chord length, used for calculating the moment.
 * @param {number} aspectRatio  Optional aspect ratio, used for calculating the induced drag.
 * @param {object} store  Optional object to store the lift, drag, and moment into.
 * @returns {object}    The object containing the calculated lift, drag, and moment.
 */
LBFoils.ClCd.calcLiftDragMoment = function(coefs, rho, area, qInfSpeed, chordLength, aspectRatio, store) {
    var scale = 0.5 * rho * area * qInfSpeed * qInfSpeed;
    store = store || {};
    store.lift = coefs.cl * scale;
    store.drag = coefs.cd * scale;
    chordLength = chordLength || 1;

    var cm = coefs.cm;
    if (coefs.cmIsChordFraction) {
        cm *= Math.sqrt(coefs.cl * coefs.cl + coefs.cd * coefs.cd);
    }
    store.moment = cm * scale * chordLength;

    if (aspectRatio) {
        var ci = coefs.cl * coefs.cl / (Math.PI * aspectRatio);
        store.inducedDrag = scale * ci;
    }
    else {
        store.inducedDrag = undefined;
    }
    return store;
};

LBFoils.ClCd.prototype = {
    constructor: LBFoils.ClCd,

    /**
     * Cleans up the coefficients, such as setting them to zero if they are near zero.
     * @returns {undefined}
     */
    clean: function() {
        this.cd = LBMath.cleanNearZero(this.cd);
        this.cl = LBMath.cleanNearZero(this.cl);
        this.cm = LBMath.cleanNearZero(this.cm);
    }
   
};

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
LBFoils.calcCmForClCd = function(degrees, cl, cd, chordFraction) {
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
    var alphaRad = degrees * LBMath.DEG_TO_RAD;
    var cosAlpha = Math.cos(alphaRad);
    var sinAlpha = Math.sin(alphaRad);            
    return -chordFraction * (cosAlpha * cl + sinAlpha * cd);
};


/**
 * Object that computes an approximation of the lift/drag/moment coefficients
 * of a flat plate when stalled.
 * @constructor
 * @param {number}  cl45Deg The Cl value at 45 degrees angle of attack.
 * @param {number}  cd45Deg The Cd value at 45 degrees angle of attack.
 * @param {number}  cd90Deg The Cd value at 90 degrees angle of attachk.
 * @returns {LBFoils.ClCdStall}
 */
LBFoils.ClCdStall = function(cl45Deg, cd45Deg, cd90Deg) {
    /**
     * The coefficient of lift at 45 degrees angle of attack.
     * @member {number}
     */
    this.cl45Deg = cl45Deg || 1.08;
    
    /**
     * The coefficient of drag at 45 degrees angle of attack.
     * @member {number}
     */
    this.cd45Deg = cd45Deg || 1.11;
    
    /**
     * The coefficient of drag at 90 degrees angle of attack (the lift is 0 at 90 degrees).
     * @member {number}
     */
    this.cd90Deg = cd90Deg || 1.80;
};

LBFoils.ClCdStall.prototype = {
    constructor: LBFoils.ClCdStall,
    
    /**
     * Loader method.
     * @param {object} data   The data, typically loaded from a JSON file.
     * @returns {object} this.
     */
    load: function(data) {
        this.cl45Deg = data.cl45Deg || this.cl45Deg;
        this.cd45Deg = data.cd45Deg || this.cd45Deg;
        this.cd90Deg = data.cl90Deg || this.cd90Deg;
        return this;
    },
    
    /**
     * Calculates the coefficients of lift, drag and moment for a given angle of attack in degrees.
     * @param {number} deg    The angle of attack in degrees.
     * @param {object} store  If not undefined, the object to store the coefficients in.
     * @returns {object}  The object with the lift, drag, and moment coefficients (cl, cd, cm).
     */
    calcCoefsDeg: function(deg, store) {        
        store = store || new LBFoils.ClCd();
        
        var clSign;
        if (deg < 0) {
            deg = -deg;
            clSign = -1;
        }
        else {
            clSign = 1;
        }
        
        var deltaDeg;
        var cmSign = clSign;
        if (deg > 90) {
            deltaDeg = 180 - deg;
            clSign = -clSign;
        }
        else {
            deltaDeg = deg;
        }
        var x = (deltaDeg - 45) / 90;
        store.cd = this.cd45Deg + 4 * (this.cd90Deg - this.cd45Deg) * x * (1 - x);   
        
        // 45 degrees is our 0 point...
        store.cl = this.cl45Deg * Math.cos(2 * (deltaDeg - 45) * LBMath.DEG_TO_RAD) * clSign;    
        store.cm = (0.46 + 0.04 * (deg - 30) / 60) * cmSign;
        store.cmIsChordFraction = true;
        
        return store;
    }
};

/**
 * Creates and load a {@link LBFoils.ClCdStall} object from properties in a data object.
 * @param {object} data The data object.
 * @returns {object}    The loaded object, undefined if data is undefined.
 */
LBFoils.ClCdStall.createFromData = function(data) {
    if (!data) {
        return undefined;
    }
    
    var clCdStall;
    if (data.className) {
        clCdStall = Leeboard.newClassInstanceFromData(data);
    }
    else {
        clCdStall = new LBFoils.ClCdStall();
    }
    
    return clCdStall.load(data);
};


/**
 * Interpolator based Cl/Cd/Cm calculator.
 * @constructor
 * @returns {LBFoils.ClCdInterp}
 */
LBFoils.ClCdInterp = function() {    
    this.alphas = [];
    this.cls = [];
    this.cds = [];
    this.cms = [];
    this.interpCls = new LBMath.CSpline();
    this.interpCds = new LBMath.CSpline();
    this.interpCms = null;
    this.cmIsChordFraction = false;
};

LBFoils.ClCdInterp.prototype = {
    constructor: LBFoils.ClCdInterp,
    
    /**
     * Loads the interpolation data. Note that this stores the coefficient arrays
     * by reference, not as copies, unless there are symmetries involved.
     * @param {object} data   The data, typically loaded from a JSON file.
     * @param {object} isForeAftSymmetric   If true the data is presumed to be symmetric
     * about the 90 degrees point.
     * @returns {object} this.
     */
    load: function(data, isForeAftSymmetric) {
        this.alphas = data.alphas;
        this.cls = data.cls;
        this.cds = data.cds;
        this.cms = data.cms;
        
        if (isForeAftSymmetric) {
            var alphas = this.alphas.slice();
            for (var i = this.alphas.length - 1; i >= 0; --i) {
                alphas.push(180 - this.alphas[i]);
            }
            this.alphas = alphas;
            this.cls = Leeboard.copyAndMirrorArray(this.cls);
            this.cds = Leeboard.copyAndMirrorArray(this.cds);
            this.cms = Leeboard.copyAndMirrorArray(this.cms);
        }
        
        this.interpCls.setup(this.alphas, this.cls);
        this.interpCds.setup(this.alphas, this.cds);
        if (this.cms && (this.cms.length === this.alphas.length)) {
            this.interpCms = new LBMath.CSpline();
            this.interpCms.setup(this.alphas, this.cms);
            this.cmIsChordFraction = data.cmIsChordFraction || false;
        }
        else {
            this.interpCms = null;
        }
        return this;
    },
    
    /**
     * Calculates the coefficients of lift, drag and moment for a given angle of attack in degrees.
     * @param {number} deg    The angle of attack in degrees.
     * @param {object} store  If not undefined, the object to store the coefficients in.
     * @returns {object}  The object with the lift, drag, and moment coefficients (cl, cd, cm).
     */
    calcCoefsDeg: function(deg, store) {
        store = store || new LBFoils.ClCd();
        deg = LBMath.wrapDegrees(deg);
        
        var lowIn = this.interpCls.findLowIndex(deg);
        store.cl = this.interpCls.interpolate(deg, lowIn);
        store.cd = this.interpCds.interpolate(deg, lowIn);        
        
        if (this.interpCms !== null) {
            store.cm = this.interpCms.interpolate(deg, lowIn);
            store.cmIsChordFraction = this.cmIsChordFraction;
        }
        else {
            var absDeg = Math.abs(deg);
            // If the angle is greater than 90 then the leading and trailing edges
            // are swapped.
            store.cm = (absDeg <= 90) ? 0.25 : 0.75;
            store.cmIsChordFraction = true;
        }
        
        return store;
    }
};


/**
 * A Cl/Cd curve calculates lift (Cl), drag (Cd), and moment (Cm) coeffiecients given an angle
 * of attack.
 * @constructor
 * @returns {LBFoils.ClCdCurve}
 */
LBFoils.ClCdCurve = function() {
    this.name = "";
    this.aspectRatio = Number.POSITIVE_INFINITY;
    this.re = Number.POSITIVE_INFINITY;
    this.clCdLifting = new LBFoils.ClCdInterp();
    this.isSymmetric = true;
    
    this.liftingEndDeg = 90;
    this.stallStartDeg = 90;
    this.aftLiftingEndDeg = 90;
    this.aftStallStartDeg = 90;
    this.clCdStall = null;
};

LBFoils.ClCdCurve._workingCoefs = new LBFoils.ClCd();

LBFoils.ClCdCurve.prototype = {
    constructor: LBFoils.ClCdCurve,
    
    /**
     * The main loading method.
     * @param {object} data   The data, typically loaded from a JSON file.
     * @return {object} this.
     */
    load: function(data) {
        if (!data) {
            return this;
        }
        
        this.name = data.name || "";
        this.aspectRatio = data.aspectRatio || Number.POSITIVE_INFINITY;
        this.re = data.re || Number.POSITIVE_INFINITY;
        
        this.clCdStall = LBFoils.ClCdStall.createFromData(data.clCdStall);
        if (this.clCdStall) {
            this.stallStartDeg = data.stallStartDeg || 90;
            this.liftEndDeg = data.liftEndDeg || this.stallStartDeg;
            
            if (data.isForeAftSymmetric) {
                this.aftStallStartDeg = 180 - this.stallStartDeg;
                this.aftLiftEndDeg = 180 - this.liftEndDeg;
            }
        }
        
        this.isSymmetric = data.isSymmetric || true;
        
        if (data.clCdInterp) {
            this.clCdLifting = new LBFoils.ClCdInterp();
            this.clCdLifting.load(data.clCdInterp, data.isForeAftSymmetric);
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
        
        // TEST!!!
        store = store || new LBFoils.ClCd();
        store.clLift = undefined;
        store.cdLift = undefined;
        store.cmLift = undefined;
        store.clStalled = undefined;
        store.cdStalled = undefined;
        store.cmStalled = undefined;
        
        // TODO: To support a non-symmetric clCdStall, we need to add liftStartDeg and stallEndDeg.
        // Also need to support reverse direction stall angles.
        if (this.clCdStall === null) {
            store = this.clCdLifting.calcCoefsDeg(degrees, store);
            store.stallFraction = 0;
        }
        else {
            if ((degrees <= this.stallStartDeg) || (degrees >= this.aftStallStartDeg)) {
                store = this.clCdLifting.calcCoefsDeg(degrees, store);
                store.stallFraction = 0;
                if (degrees >= this.aftStallStartDeg) {
                    store.cl = -store.cl;
                    //store.cm = -store.cm;
                }

                // TEST!!!
                store.clLift = store.cl;
                store.cdLift = store.cd;
                store.cmLift = store.cm;
            }
            else if ((degrees >= this.liftEndDeg) && (degrees <= this.aftLiftEndDeg)) {
                store = this.clCdStall.calcCoefsDeg(degrees, store);            
                store.stallFraction = 1;

                // TEST!!!
                store.clStalled = store.cl;
                store.cdStalled = store.cd;
                store.cmStalled = store.cm;
            }
            else {
                store = this.clCdLifting.calcCoefsDeg(degrees, store);
                if (degrees >= this.aftLiftEndDeg) {
                    store.cl = -store.cl;
                    //store.cm = -store.cm;
                }

                var stalled = this.clCdStall.calcCoefsDeg(degrees, LBFoils.ClCdCurve._workingCoefs);
                var x;
                if (degrees < this.liftEndDeg) {
                    x = (degrees - this.stallStartDeg) / (this.liftEndDeg - this.stallStartDeg);
                }
                else {
                    x = (degrees - this.aftStallStartDeg) / (this.aftLiftEndDeg - this.aftStallStartDeg);
                }
                
                // TEST!!!
                store.clLift = store.cl;
                store.cdLift = store.cd;
                store.cmLift = store.cm;
                store.clStalled = stalled.cl;
                store.cdStalled = stalled.cd;
                store.cmStalled = stalled.cm;
                
                var s = LBMath.smoothstep3(x);
                var sLift = 1 - s;
                store.cl = store.cl * sLift + stalled.cl * s;
                store.cd = store.cd * sLift + stalled.cd * s;
                store.cm = store.cm * sLift + stalled.cm * s;
                store.stallFraction = s;
            }
        }
        
        store.cl *= sign;
        store.cm *= sign;
        
        store.clean();
        return store;
    },

    test: function(start, end, delta) {
        console.log("Test ClCdCurve:");
        var clCd;
        for (var i = start; i < end; i += delta) {
            clCd = this.calcCoefsDeg(i, clCd);
            console.log(i + "\t" + clCd.cl + "\t" + clCd.cd + "\t" + clCd.cm + "\t" + clCd.stallFraction + "\t"
                    + "\t" + clCd.clLift + "\t" + clCd.cdLift + "\t" + clCd.cmLift + "\t"
                    + "\t" + clCd.clStalled + "\t" + clCd.cdStalled + "\t" + clCd.cmStalled + "\t");
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
 * @constructor
 * @returns {LBFoils.Foil}
 */
LBFoils.Foil = function() {
    /**
     * A line describing the chord, with the chord.start treated as the
     * leading edge of the chord. This is used to resolve the angle of attack.
     * @member {object}
     */
    this.chordLine = new LBGeometry.Line2();
    
    /**
     * The z coordinate of the 2D slice.
     * @member {number}
     */
    this.sliceZ = 0;
    
    /**
     * The area to use in computing the forces from the coefficients.
     * @member {number}
     */
    this.area = 1;
    
    /**
     * The aspect ratio of the foil, this may be null.
     * @member {number}
     */
    this.aspectRatio = null;
    
    /**
     * The coefficient of lift/drag/moment curve.
     * @member {LBFoils.ClCdCurve}
     */
    this.clCdCurve = new LBFoils.ClCdCurve();
    
    this.workingVel = new LBGeometry.Vector3();
    this.workingVelResults = {
        'worldPos': new LBGeometry.Vector3(), // For testing...
        'worldVel': new LBGeometry.Vector3()
    };
};

LBFoils.Foil.prototype = {
    constructor: LBFoils.Foil,
        
    /**
     * The main loading method.
     * @param {object} data   The data, typically loaded from a JSON file.
     * @param {object} curveLib The optional curve library used to obtain pre-loaded
     * ClCdCurves, used for 'libClCdCurve' properties.
     * @return {object} this.
     */
    load: function(data, curveLib) {
        this.chordLine = Leeboard.copyCommonProperties(this.chordLine, data.chordLine);
        this.sliceZ = data.sliceZ || this.sliceZ;
        this.area = data.area || this.area;
        this.aspectRatio = data.aspectRatio || this.aspectRatio;
        
        this.clCdCurve = undefined;
        if (data.libClCdCurve) {
            this.clCdCurve = curveLib.getClCdCurve(data.libClCdCurve);
        }
        if (!this.clCdCurve) {
            this.clCdCurve = new LBFoils.ClCdCurve();
            this.clCdCurve.load(data.clCdCurve);
        }
        
        return this;
    },
    
    /**
     * Calculates the lift and drag forces, and the moment, all in local coordinates.
     * The moment is about the leading edge, or this.chordLine.start.
     * @param {number} rho  The fluid density.
     * @param {object} qInfLocal    The free stream velocity in the local x-y plane.
     * @param {object} [details]  If defined, an object to receive details about the calculation.
     * @param {object} [store]  If defined, the object to receive the forces and moment.
     * @returns {object}    The object containing the forces and moment.
     */
    calcLocalLiftDragMoment: function(rho, qInfLocal, details, store) {
        var chord;
        var coefs;
        if (details) {
            details.chord = this.chordLine.delta(details.chord);
            chord = details.chord;
            coefs = details.coefs || (details.coefs = new LBFoils.ClCd());
        }
        else {
            chord = this.chordLine.delta();
            coefs = new LBFoils.ClCd();
        }
        
        var angleDeg = chord.angleToSigned(qInfLocal) * LBMath.RAD_TO_DEG;
        this.clCdCurve.calcCoefsDeg(angleDeg, coefs);
        var qInfSpeed = qInfLocal.length();
        var chordLength = chord.length();
        
        if (details) {
            details.angleDeg = angleDeg;
            details.qInfLocal = qInfLocal.clone();
        }
        return LBFoils.ClCd.calcLiftDragMoment(coefs, rho, this.area, qInfSpeed, chordLength, this.aspectRatio, store);
    },
    
    /**
     * Calculates the forces and moment in the local x-y plane coordinates.
     * The moment is about the leading edge, or this.chordLine.start.
     * @param {number} rho  The fluid density.
     * @param {object} qInfLocal    The free stream velocity in the local x-y plane.
     * @param {object} [details]   If defined, an object that will receive details such
     * as lift, drag, induced drag, moment.
     * @param {object} [resultant]  If defined, the object set to the resultant force.
     * @returns {LBPhysics.Resultant3D}  The resultant force in local coordinates.
     */
    calcLocalForce: function(rho, qInfLocal, details, resultant) {
        details = this.calcLocalLiftDragMoment(rho, qInfLocal, details, details);
        
        var drag = details.drag;
        if (details.inducedDrag) {
            drag += details.inducedDrag;
        }
        
        var qInfSpeed = qInfLocal.length();
        var fx;
        var fy;
        if (!LBMath.isLikeZero(qInfSpeed)) {
            fx = (-qInfLocal.y * details.lift + qInfLocal.x * drag) / qInfSpeed;
            fy = (qInfLocal.x * details.lift + qInfLocal.y * drag) / qInfSpeed;
        }
        else {
            fx = 0;
            fy = 0;
        }
        
        resultant = resultant || new LBPhysics.Resultant3D();
        resultant.force.set(fx, fy, 0);
        resultant.moment.set(0, 0, details.moment);
        resultant.applPoint.set(this.chordLine.start.x, this.chordLine.start.y, this.sliceZ);
        return resultant;
    },
    
    
    /**
     * Calculates the force and moment in world coordinates. Note that because we treat
     * the foil as a 2D slice, we end up projecting the apparent wind onto the local
     * x-y plane. Cross wind effects are ignored for now.
     * @param {number} rho    The fluid density.
     * @param {object} qInfWorld  The free stream velocity in world coordinates.
     * @param {LBPhysics.CoordSystemState} coordSystemState   The coordinate system state, this defines the
     *  world-local transformations as well as the change in world position/orientation.
     * @param {object} [details]  If defined, an object that will receive details such
     * as lift, drag, induced drag, moment.
     * @param {object} [resultant]  If defined, the object set to the resultant force.
     * @returns {LBPhysics.Resultant3D}  The resultant force in world coordinates.
     */
    calcWorldForce: function(rho, qInfWorld, coordSystemState, details, resultant) {
        coordSystemState.calcVectorLocalToWorld(this.chordLine.start, this.workingVelResults);
        
        this.workingVel.copy(this.workingVelResults.worldVel);
        
        coordSystemState.calcVectorLocalToWorld(this.chordLine.end, this.workingVelResults);
        this.workingVel.add(this.workingVelResults.worldVel).multiplyScalar(0.5);
        
        this.workingVel.negate();
        this.workingVel.add(qInfWorld);
        
        this.workingVel.applyMatrix4Rotation(coordSystemState.localXfrm);
        
        resultant = this.calcLocalForce(rho, this.workingVel, details, resultant);
        resultant.applyMatrix4(coordSystemState.worldXfrm);
        
        return resultant;
    },
    
    
    localForceTest: function(rho, qInfSpeed, start, end, delta) {
        console.log("LBFoils.Foil.localForceTest:");
        console.log("Deg\t\tApplPoint.x\tApplPoint.y\t\tForce.x\tForce.y\t\tMoment.z");
        var resultant = new LBPhysics.Resultant3D();
        var details = {};
        var qInfLocal = new LBGeometry.Vector2();
        for (var deg = start; deg < end; deg += delta) {
            var rad = deg * LBMath.DEG_TO_RAD;
            qInfLocal.set(Math.cos(rad) * qInfSpeed, Math.sin(rad) * qInfSpeed);
            this.calcLocalForce(rho, qInfLocal, details, resultant);
            var string = deg + "\t" 
                    //+ "\t" + resultant.applPoint.x + "\t" + resultant.applPoint.y + "\t" 
                    + "\t" + resultant.force.x + "\t" + resultant.force.y + "\t"
                    + "\t" + resultant.moment.z
                    + "\t" + details.coefs.stallFraction;
            console.log(string);
        }
    }
};


/**
 * Helper that creates and loads a foil from a data object. If the data object contains
 * a 'className' property, it is passed to {@link Leeboard#stringToNewClassInstance} to
 * create the object, otherwise if defCreatorFunc is defined it is called to create the
 * foil object, otherwise LBFoils.Foil() is used.
 * @param {object} data The data to load from.
 * @param {object} curveLib The optional curve library used to obtain pre-loaded
 * ClCdCurves, used for 'libClCdCurve' properties.
 * @param {object} [defCreatorFunc] If defined the function used to create the foil if the
 * data object does not contain a construct property, or data is not defined. The argument
 * passed to this function is the data argument.
 * @returns {object}    The foil object, undefined if both data and defCreatorFunc are not defined.
 */
LBFoils.Foil.createFromData = function(data, curveLib, defCreatorFunc) {
    if (!data) {
        if (defCreatorFunc) {
            return defCreatorFunc();
        }
        return undefined;
    }
    
    var foil;
    if (data.className) {
        foil = Leeboard.newClassInstanceFromData(data);
    }
    else if (defCreatorFunc) {
        foil = defCreatorFunc(data);
    }
    else {
        foil = new LBFoils.Foil();
    }
    
    return foil.load(data, curveLib);
};
