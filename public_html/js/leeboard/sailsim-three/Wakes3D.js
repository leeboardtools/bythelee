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

    this.particles = new LBParticles.ParticleSystem({
        maxParticles: 10000
    });
    scene3D.add(this.particles);
    
    this.particleOptions = {
        position: new LBGeometry.Vector3(),
        positionRandomness: .1,
        velocity: new LBGeometry.Vector3(),
        velocityRandomness: .0,
        //color: 0xaa88ff,
        color: 0x808080,
        colorRandomness: .1,
        turbulence: .0,
        lifetime: 10,
        size: 10,
        sizeRandomness: 1
    };
    
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
    
    this.particleFrequency = 0;
    
    this.particlesToGenerate = 1;
};

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
        }
        else {
            this.delayCount = this.particleFrequency;

            var me = this;
            this.vessels.forEach(function(vessel) {
                me._updateVesselWake(vessel, dt);
            });
        }
        
        this.particles.update(this.sailEnv.app3d.runMillisecs / 1000);
        
    },
    
    _updateVesselWake: function(vessel, dt) {
        // Are we going fast enough?
        var velocity = vessel.getVelocityMPS();
        var speedSq = velocity.lengthSq();
        if (speedSq < this.minWakeSpeedSq) {
            return;
        }
        
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
        
        for (var i = this.particlesToGenerate; i > 0; --i) {
            var spanValue = Math.random();

            var pos = this.particleOptions.position;
            pos.lerpVectors(wakeEndStbd, wakeEndPort, spanValue);
            var centerSpanValue = spanValue - 0.5;
            pos.z = 0.01;

            var alpha = 2 * centerSpanValue * wakeAngle;
            var wakeVel = Math.sin(wakeAngle);
            var velAlpha = alpha + velVesselAngle;

            var vel = this.particleOptions.velocity;
            wakeVel = 0;
            vel.x = wakeVel * Math.cos(velAlpha);
            vel.y = wakeVel * Math.sin(velAlpha);
            vel.z = 0;
            
            //pos.z = 1;
            //vel.x = velocity.x / 9;
            //vel.y = velocity.y / 9;

            this.scene3D.coordMapping.vector3ToThreeJS(pos, pos);
            this.scene3D.coordMapping.vector3ToThreeJS(vel, vel);

            this.particles.spawnParticle(this.particleOptions);
        }
    },
    
    destroy: function() {
        if (this.particles) {
            this.particles.dispose();
            this.particles = undefined;
        
            this.scene3D = undefined;
            this.sailEnv = undefined;
        }
    },
    
    constructor: LBSailSim.Wakes3D
};

    
return LBSailSim;
});