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


define(['lbsailsim', 'lbparticles', 'lbgeometry', 'lbmath', 'lbshaders', 'three', 'lbutil'], 
function(LBSailSim, LBParticles, LBGeometry, LBMath, LBShaders, THREE, LBUtil) {

'use strict';


/**
 * Manages the generation of wakes for vessels.
 * @constructor
 * @param {module:LBUI3d.Scene3D} scene3D  The 3D scene where the wake is drawn.
 * @param {LBSailSim.SailEnv} sailEnv   The sailing environment that's created this.
 * @return {Wakes3D_L19.LBSailSim.Wakes3D}
 */
LBSailSim.Wakes3D = function(scene3D, sailEnv) {
    this.scene3D = scene3D;
    this.sailEnv = sailEnv;

    this.wakeImpl = createShaderWakes(this);
    if (!this.wakeImpl) {
        this.wakeImpl = new LBSailSim.ParticleWakes(this);
    }
    
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
};

LBSailSim.Wakes3D.prototype = {
    addVessel: function(vessel) {
        if (!vessel.hull) {
            // Only support vessels that have a hull.
            return;
        }
        
        this.vessels.push(vessel);
        
        this.wakeImpl.vesselAdded(vessel);
    },
    
    removeVessel: function(vessel) {
        var i = this.vessels.findIndex(vessel);
        if (i >= 0) {
            this.vessels.splice(i, 1);
            
            this.wakeImpl.vesselRemoved(vessel);
        }
    },
    
    update: function(dt) {
        if (this.disabled) {
            return;
        }
        
        if (this.wakeImpl) {
            this.wakeImpl.update(dt);
        }
    },
    
    destroy: function() {
        if (this.scene3D) {
            while (this.vessels.length > 0) {
                this.removeVessel(0);
            }
            
            if (this.wakeImpl) {
                this.wakeImpl.destroy();
                this.wakeImpl = undefined;
            }
            
            this.vessels.length = 0;
            this.vessels = undefined;
            
            this.scene3D = undefined;
            this.sailEnv = undefined;
        }
    },
    
    constructor: LBSailSim.Wakes3D
};

/**
 * A particle based wake. This is rather slow on iPads and lesser GPUs.
 * @constructor
 * @param {module:LBSailSim.Wakes3D} wakes  The wakes object creating this.
 * @return {module:LBSailSim.ParticleWakes}
 */
LBSailSim.ParticleWakes = function(wakes) {
    this.wakes = wakes;
    this.scene3D = wakes.scene3D;
    this.sailEnv = wakes.sailEnv;
    
    this.particles = new LBParticles.ParticleSystem({
        maxParticles: 1000
    });
    this.scene3D.add(this.particles);

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
     * The average life span of a wake particle in seconds.
     * @member {Number}
     */
    this.particleDuration = 10;
    
    this.particleFrequency = 0;
    
    this.particlesToGenerate = 1;
};

LBSailSim.ParticleWakes.prototype = {
    vesselAdded: function(vessel) {
    },
    
    vesselRemoved: function(vessel) {
        
    },
    
    update: function(dt) {
        if (this.delayCount) {
            --this.delayCount;
        }
        else {
            this.delayCount = this.particleFrequency;

            var me = this;
            this.wakes.vessels.forEach(function(vessel) {
                me._updateVesselWake(vessel, dt);
            });
        }
        
        this.particles.update(this.sailEnv.app3D.runMillisecs / 1000);
    },
    
    _updateVesselWake: function(vessel, dt) {
        // Are we going fast enough?
        var velocity = vessel.getVelocityMPS();
        var speedSq = velocity.lengthSq();
        if (speedSq < this.wakes.minWakeSpeedSq) {
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
    
    constructor: LBSailSim.ParticleWakes
};


function createShaderWakes(wakes) {
    //return null;

    return new LBSailSim.MeshWakes(wakes);
};


/**
 * Mesh based wakes, a little crude, but faster on lesser GPUs like iPads.
 * @constructor
 * @param {module:LBSailSim.Wakes3D} wakes  The wakes object creating this.
 * @return {module:LBSailSim.MeshWakes}
 */
LBSailSim.MeshWakes = function(wakes) {
    this.wakes = wakes;
    
    this.segmentCount = 20;
    this.wakeDuration = 10;
    
    // TEST!!!
    //this.segmentCount = 4;
    //this.wakeDuration = 2;
};

LBSailSim.MeshWakes.prototype = {
    vesselAdded: function(vessel) {
        if (!vessel.trajectory) {
            return;
        }
        
        var material = this.wakes.sailEnv.water3D.wakesMaterial;
        if (!material) {
            material = new THREE.MeshDepthMaterial({
            //material = new THREE.MeshPhongMaterial({
                //color: 0x001e0f
                color: 0x004663
            });
            //material.transparent = true;
            material.opacity = 0.5;
            //material.specular = new THREE.Color('lightblue');
            //material.shininess = 10;

            // TEST!!
            //material.side = THREE.DoubleSide;
            material.side = THREE.BackSide;
        }

        vessel._lbWake = new LBSailSim.VesselWake(this, material, vessel);
    },
    
    vesselRemoved: function(vessel) {
        if (vessel._lbWake) {
            vessel._lbWake.destroy();
            vessel._lbWake = null;
        }
    },
    
    update: function(dt) {
        this.wakes.vessels.forEach(function(vessel) {
            this._updateVesselWake(vessel, dt);
        }, this);
    },
    
    _updateVesselWake: function(vessel, dt) {
        if (vessel._lbWake) {
            vessel._lbWake.update(dt);
        }
    },
    
    destroy: function() {
        this.wakes = null;
    },
    
    constructor: LBSailSim.MeshWakes
};


LBSailSim.VesselWake = function(meshWakes, material, vessel) {
    this.meshWakes = meshWakes;
    this.vessel = vessel;
    
    this.portWave = new LBSailSim.MeshWave(meshWakes, material, -1);
    this.stbdWave = new LBSailSim.MeshWave(meshWakes, material, 1);
    
    this._allocatedTrajectoryStates = [];
    this.trajectoryStates = [];
};

var _wakeSpeedScale = Math.sin(19.47 * LBMath.DEG_TO_RAD);
LBSailSim.VesselWake.prototype = {
    update: function(dt) {
        if (!this.vessel.trajectory.areStatesAvailable()) {
            this.portWave.mesh.visible = false;
            this.stbdWave.mesh.visible = false;
            return;
        }
        this.portWave.mesh.visible = true;
        this.stbdWave.mesh.visible = true;
        
        var stateCount = this.meshWakes.segmentCount + 1;
        var dt = this.meshWakes.wakeDuration / this.meshWakes.segmentCount;
        var heightTaperTimeStart = this.meshWakes.wakeDuration * 0.75;
        
        // TODO: Determine the max wave height from the vessel's mass (or something else)
        // TODO: Determine the max wave height speed from the hull speed.
        var maxWaveHeight = 0.25;
        var maxWaveHeightSpeed = 3;
        
        for (var i = 0; i < stateCount; ++i) {
            // We need a separate _allocatedTrajectoryStates object so we can duplicate
            // the states if getPastState() returns undefined.
            var t = i * dt;
            var state = this._allocatedTrajectoryStates[i] = this.vessel.trajectory.getPastState(t, this._allocatedTrajectoryStates[i]);
            if (state) {
                this.trajectoryStates[i] = state;
                state.wakeHalfWidth = _wakeSpeedScale * state.speed * t;

                state.waveHeight = maxWaveHeight * LBMath.smoothstep(-maxWaveHeightSpeed, maxWaveHeightSpeed, state.speed);
                state.waveLength = 15 * state.waveHeight;
                
                // Taper down the wake towards the end.
                state.waveHeight *= 1 - LBMath.smoothstep(heightTaperTimeStart, this.meshWakes.wakeDuration, t);
            }
            else {
                this.trajectoryStates[i] = this.trajectoryStates[i - 1];
            }
        }
        
        this.portWave.update(this.trajectoryStates, this.vessel);
        this.stbdWave.update(this.trajectoryStates, this.vessel);
    },
    
    destroy: function() {
        if (this.meshWakes) {
            this.portWave.destroy();
            this.portWave = null;
            
            this.stbdWave.destroy();
            this.stbdWave = null;
            
            this.meshWakes = null;
        }
    },
    
    constructor: LBSailSim.VesselWake
};



LBSailSim.MeshWave = function(meshWakes, material, dir) {
    this.meshWakes = meshWakes;
    this.material = material;
    
    this.geometry = new THREE.PlaneBufferGeometry(1, 10, 2, meshWakes.segmentCount - 1);
    this.mesh = new THREE.Mesh(this.geometry, this.material);

    //meshWakes.wakes.sailEnv.water3D.wakesScene.add(this.mesh);
    this.meshWakes.wakes.scene3D.add(this.mesh);
    
    this.dir = dir;
};

var _meshWavePositions = [];
var _meshWaveNormals = [];

LBSailSim.MeshWave.prototype = {
    update: function(trajectoryStates, vessel) {
        var positionAttribute = this.geometry.getAttribute('position');
        var positions = positionAttribute.array;
        
        var normalAttribute = this.geometry.getAttribute('normal');
        var normals = normalAttribute.array;
        
        var currentTime = vessel.trajectory.currentTime;
        var stateCount = trajectoryStates.length;
        var valueIndex = 0;
        var delta = 0;
        for (var i = 0; i < stateCount; ++i) {
            var state = trajectoryStates[i];
            var dt = currentTime - state.time;
            
            valueIndex = this._updateValuesFromState(dt, state, positions, normals, valueIndex, delta);
            delta = 0.25 * state.waveLength;
        }

        positionAttribute.needsUpdate = true;
        normalAttribute.needsUpdate = true;
        
        if (this.geometry.boundingBox) {
            this.geometry.computeBoundingBox();
        }
        if (this.geometry.boundingSphere) {
            this.geometry.computeBoundingSphere();
        }
    },
    
    _updateValuesFromState: function(dt, state, positions, normals, valueIndex, delta) {
        var coordMapping = this.meshWakes.wakes.scene3D.coordMapping;
        
        var dx = state.travelDir.y * this.dir;
        var dy = -state.travelDir.x * this.dir;
        _meshWavePositions[0] = state.position.x + dx * (state.wakeHalfWidth - this.dir * delta);
        _meshWavePositions[1] = state.position.y + dy * (state.wakeHalfWidth - this.dir * delta);
        _meshWavePositions[2] = 0;

        _meshWavePositions[3] = state.position.x + dx * (state.wakeHalfWidth);
        _meshWavePositions[4] = state.position.y + dy * (state.wakeHalfWidth);
        _meshWavePositions[5] = state.waveHeight;

        _meshWavePositions[6] = state.position.x + dx * (state.wakeHalfWidth + this.dir * delta);
        _meshWavePositions[7] = state.position.y + dy * (state.wakeHalfWidth + this.dir * delta);
        _meshWavePositions[8] = 0;


        // a = dx, dy, 0
        // b = vdx, vdy, z
        // n = dy * z, -dx * z, dx * vdy - dy * vdx
        _meshWaveNormals[0] = dy * state.waveHeight;
        _meshWaveNormals[1] = -dx * state.waveHeight;
        _meshWaveNormals[2] = dx * state.travelDir.x - dy * state.travelDir.y;
        
        var length = Math.sqrt(_meshWaveNormals[0] * _meshWaveNormals[0] 
                + _meshWaveNormals[1] * _meshWaveNormals[1]
                + _meshWaveNormals[2] * _meshWaveNormals[2]);
        _meshWaveNormals[0] /= length;
        _meshWaveNormals[1] /= length;
        _meshWaveNormals[2] /= length;

        // The mid-point normal is always pointing straight up.
        _meshWaveNormals[3] = 0;
        _meshWaveNormals[4] = 0;
        _meshWaveNormals[5] = 1;

        // this is the same as the other point except pointing in the reverse x and y directions.
        _meshWaveNormals[6] = -_meshWaveNormals[0];
        _meshWaveNormals[7] = -_meshWaveNormals[1];
        _meshWaveNormals[8] = _meshWaveNormals[2];

        coordMapping.xyzToThreeJS(_meshWavePositions, 0, positions, valueIndex);
        coordMapping.xyzToThreeJS(_meshWaveNormals, 0, normals, valueIndex);
        valueIndex += 3;

        coordMapping.xyzToThreeJS(_meshWavePositions, 3, positions, valueIndex);
        coordMapping.xyzToThreeJS(_meshWaveNormals, 3, normals, valueIndex);
        valueIndex += 3;

        coordMapping.xyzToThreeJS(_meshWavePositions, 6, positions, valueIndex);
        coordMapping.xyzToThreeJS(_meshWaveNormals, 6, normals, valueIndex);
        valueIndex += 3;
        
        return valueIndex;
    },
    
    destroy: function() {
        if (this.mesh) {
            this.meshWakes.wakes.scene3D.remove(this.mesh);
            this.mesh = null;
            this.geometry = null;
            this.material = null;
            this.meshWakes = null;
        }
    },
    
    constructor: LBSailSim.MeshWave
};

    
return LBSailSim;
});