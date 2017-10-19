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


define(['lbsailsim', 'lbparticles', 'lbgeometry', 'lbmath', 'tween', 'three'], 
function(LBSailSim, LBParticles, LBGeometry, LBMath, TWEEN, THREE) {

'use strict';


/**
 * Manages the generation of wakes for vessels.
 * @constructor
 * @param {LBUI3d.Scene3D} scene3D  The 3D scene where the wake is drawn.
 * @param {LBSailSim.SailEnv} sailEnv   The sailing environment that's created this.
 * @return {Wakes3D_L19.LBSailSim.Wakes3D}
 */
LBSailSim.Wakes3D = function(scene3D, sailEnv) {
    this.scene3D = scene3D;
    this.sailEnv = sailEnv;
    
    var material = this._createParticleMaterial();
    
    /**
     * The particle cache the particles come from.
     * @member {LBParticles.Cache}
     */
    this.particles = new LBParticles.Cache(scene3D, material);
    
    /**
     * The collection of vessels for which wakes are generated.
     * @member {LBSailSim.Vessel[]}
     */
    this.vessels = [];
    
    /**
     * The square of the minimum speed before any wake particles are generated.
     * @member {Number}
     */
    this.minWakeSpeedSq = 0.5 * 0.5;
    
    /**
     * The average life span of a wake particle in seconds.
     * @member {Number}
     */
    this.particleDuration = 10;
    
    this.particleFrequency = 3;
};

var _workingPos = new LBGeometry.Vector3();
var _workingVel = new LBGeometry.Vector3();
var _workingDest = new LBGeometry.Vector3();

LBSailSim.Wakes3D.prototype = {
    addVessel: function(vessel) {
        if (!vessel.hull) {
            // Only support vessels that have a hull.
            return;
        }
        
        this.vessels.push(vessel);
    },
    
    removeVessel: function(vessel) {
        var i = this.vessels.findIndex(vessel);
        if (i >= 0) {
            this.vessels.splice(i, 1);
        }
    },
    
    update: function(dt) {
        if (this.disabled) {
            return;
        }
        
        if (this.delayCount) {
            --this.delayCount;
            return;
        }
        this.delayCount = this.particleFrequency;

        var me = this;
        this.vessels.forEach(function(vessel) {
            me._updateVesselWake(vessel, dt);
        });
    },
    
    _updateVesselWake: function(vessel, dt) {
        // Are we going fast enough?
        var velocity = vessel.getVelocityMPS();
        var speedSq = velocity.lengthSq();
        if (speedSq < this.minWakeSpeedSq) {
            return;
        }
        
        var speed = Math.sqrt(speedSq);
        
        // Get the span of the hull's waterline across the velocity direction.
        var hull = vessel.hull;
        var wakeEndPort = hull.wakeEndPort;
        var wakeEndStbd = hull.wakeEndStbd;
        if (!wakeEndPort || !wakeEndStbd) {
            return;
        }
        
        var wakeAngle = 19.47 * LBMath.DEG_TO_RAD;

        var velVesselAngle = Math.atan2(velocity.y, velocity.x);
        
        // Along that waterline generate a particle.
        // The particle will have an overall velocity such that particles at
        // the edges of the wake will form an angle of 19.47 degrees to the
        // mid-point as the wake progresses.
        
        var spanValue = Math.random();
        
        // TEST!!!
//        spanValue = this.spanValue || 0;
//        this.spanValue = 1 - spanValue;
//        spanValue = (spanValue > 0.5) ? 1 : 0;
        
        _workingPos.lerpVectors(wakeEndStbd, wakeEndPort, spanValue);
        var centerSpanValue = spanValue - 0.5;
        _workingPos.z = 0.01;
        
        var alpha = 2 * centerSpanValue * wakeAngle;
        var wakeVel = Math.sin(wakeAngle);
        var velAlpha = alpha + velVesselAngle;
        _workingVel.x = wakeVel * Math.cos(velAlpha);
        _workingVel.y = wakeVel * Math.sin(velAlpha);
        _workingVel.z = 0;
        
        _workingDest.x = _workingPos.x + _workingVel.x * this.particleDuration;
        _workingDest.y = _workingPos.y + _workingVel.y * this.particleDuration;
        _workingDest.z = _workingPos.z;
        
//        console.log("Wake: " + velocity.x + ' ' + velocity.y + '   ' + spanValue + '   ' + _workingVel.x + ' ' + _workingVel.y);
        
        var particles = this.particles;
        var particle = this.particles.getParticle();
        
        particle.scale.x = particle.scale.y = 0.15;
        this.scene3D.coordMapping.vector3ToThreeJS(_workingPos, particle.position);
        this.scene3D.coordMapping.vector3ToThreeJS(_workingDest, _workingDest);
        particle.visible = true;
        
        var nowMillisecs = this.sailEnv.app3d.runMillisecs;
        var duration_ms = this.particleDuration * 1000;
        
        new TWEEN.Tween(particle.position)
                .to({ x: _workingDest.x, y: _workingDest.y, z: _workingDest.z }, duration_ms)
                .onComplete(function() {
                    particles.returnParticle(particle);
                })
                .start(nowMillisecs);
        new TWEEN.Tween(particle.scale)
                .to({ x: 0.01, y: 0.01 }, duration_ms)
                .easing(TWEEN.Easing.Quadratic.In)
                .start(nowMillisecs);
    },
    
    _createParticleMaterial: function() {
        // Copied from https://github.com/mrdoob/three.js/blob/master/examples/canvas_particles_sprites.html
        var canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        var context = canvas.getContext('2d');
        var gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 
            0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
        gradient.addColorStop(0, 'rgba(60, 60, 60, 1)');
        gradient.addColorStop(0.7, 'rgba(40, 40, 40, 1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        return new THREE.SpriteMaterial( {
            map: new THREE.CanvasTexture(canvas),
            blending: THREE.AdditiveBlending
        });
    },
    
    destroy: function() {
        if (this.particles) {
            this.particles.destroy();
            this.particles = undefined;
        
            this.scene3D = undefined;
            this.sailEnv = undefined;
        }
    },
    
    constructor: LBSailSim.Wakes3D
};

    
return LBSailSim;
});