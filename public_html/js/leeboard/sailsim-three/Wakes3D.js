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


define(['lbsailsim', 'lbparticles', 'lbgeometry', 'lbmath', 'lbshaders', 'three'], 
function(LBSailSim, LBParticles, LBGeometry, LBMath, LBShaders, THREE) {

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
        
        if (this.wakeImpl) {
            this.wakeImpl.update(dt);
        }
    },
    
    destroy: function() {
        if (this.scene3D) {
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
    return null;
/*    
    var renderer = wakes.sailEnv.mainView.renderer;
    if (!LBShaders.Computer.isSupported(renderer)) {
        return null;
    }
    
    var shaderWakes = new LBSailSim.ShaderWakes(wakes);
    if (!shaderWakes.init()) {
        return null;
    }
    return shaderWakes;
*/
};

LBSailSim.ShaderWakes = function(wakes) {
    this.scene3D = wakes.scene3D;
    this.wakes = wakes;
    
    // The grid size is the number of grid points along one side.
    this.wakeGridSize = 128;
    
    // The wake bounds is the length of one side.
    this.wakeBounds = 50;
    
    this.maxVesselDistanceSq = (0.25 * this.wakeBounds * this.wakeBounds);
    
    var renderer = wakes.sailEnv.mainView.renderer;
    this.computer = new LBShaders.Computer(this.wakeGridSize, this.wakeGridSize, renderer);
    
    this._meshOrigin = new LBGeometry.Vector3();
};

var _shaderWakesPrevPos = new LBGeometry.Vector2();
var _shaderWakesOffset = new LBGeometry.Vector2();
var _halfVector3 = new LBGeometry.Vector3(0.5, 0.5, 0.5);

LBSailSim.ShaderWakes.prototype = {
    init: function() {
        var water3D = this.wakes.sailEnv.water3D;
        var color = undefined;
        //color = 0x808080;
        
        // NOTE: water3D.createWaterMaterial() has been removed...
        this.wakeMaterial = water3D.createWaterMaterial(this.wakeBounds, this.wakeGridSize, color);
        
        this.wakeMaterial.wireframe = true;
        
        this.wakeGeometry = new THREE.PlaneBufferGeometry(this.wakeBounds, this.wakeBounds, this.wakeGridSize - 1, this.wakeGridSize - 1);
        this.wakeGeometry.rotateX(-LBMath.PI_2);
        this.wakeMesh = new THREE.Mesh(this.wakeGeometry, this.wakeMaterial);
        this.scene3D.add(this.wakeMesh);
        
        this.vesselShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                heightmap: { value: null }
            },
            vertexShader: this.computer.getPassThroughVertexShader(),
            fragmentShader: vesselTriggerFragmentShader
        });
        
        var uniforms = this.vesselShaderMaterial.uniforms;
        this.computer.setupUniforms(uniforms);

        uniforms.offset = { value : new THREE.Vector2(0, 0) };
        uniforms.ptCount = { value: 0 };
        uniforms.oldPoints = { value: [] };
        uniforms.newPoints = { value: [] };
        for (var i = 0; i < 5; ++i) {
            uniforms.oldPoints.value.push(new THREE.Vector2(0, 0));
            uniforms.newPoints.value.push(new THREE.Vector2(0, 0));
        }
        uniforms.strength = { value: 0.1 };
        uniforms.radius = { value: 0.5 / this.wakeBounds };
        
        
        /**
         * This is the shader material that models the general wave dispersion. It comes after
         * any disturbances are generated by the vessels.
         */
        this.wakeShaderMaterial = new THREE.ShaderMaterial({
            uniforms: { 
                heightmap: { value: null }
            },
            vertexShader: this.computer.getPassThroughVertexShader(),
            fragmentShader: wakeHeightmapFragmentShader
        });
        
        var uniforms = this.wakeShaderMaterial.uniforms;
        this.computer.setupUniforms(uniforms);
        uniforms.offset = { value : new THREE.Vector2(0, 0) };
        uniforms.accelScale = { value: 1.0 };
        
        // TEST!!!
/*        var initialHeightmap = water3D.createWaterTexture(this.wakeGridSize);
        var pixels = initialHeightmap.image.data;
        pixels[this.wakeGridSize * 4 * this.wakeGridSize * 0.5 + this.wakeGridSize * 0.5 * 4] = 2;
        this.computer.applyTexture(initialHeightmap).swapRenderTargets();
        this.computer.applyTexture(initialHeightmap).swapRenderTargets();
 */       
        return true;
    },
    
    update: function(dt) {
        var focusVessel = this.wakes.sailEnv.getFocusVessel();
        if (focusVessel) {
            var startX = this.wakeMesh.position.x;
            var startZ = this.wakeMesh.position.z;
            
            this._meshOrigin.copy(focusVessel.obj3D.position);
            this._meshOrigin.z = 0;

            this.scene3D.coordMapping.vector3ToThreeJS(focusVessel.obj3D.position, this.wakeMesh.position);
            this.wakeMesh.position.y = 0;
            
            // ThreeJS z maps to shader V of UV.
            _shaderWakesOffset.set(this.wakeMesh.position.x - startX, this.wakeMesh.position.z - startZ);
        }
        else {
            this.scene3D.coordMapping.vector3FromThreeJS(this.wakeMesh.position, this._meshOrigin);
            
            _shaderWakesOffset.set(0, 0);
        }
        
        var me = this;
        this._offset = _shaderWakesOffset;
        this.wakes.vessels.forEach(function(vessel) {
            me._updateVessel(vessel, dt);
        });
        
        var uniforms = this.wakeShaderMaterial.uniforms;
        if (this._offset) {
            uniforms.offset.value.copy(this._offset)
                    .divideScalar(this.wakeBounds);
        }
        else {
            uniforms.offset.value.set(0, 0);
        }
        uniforms.accelScale.value = dt * 3;
        
        uniforms.heightmap.value = this.computer.getPreviousRenderTarget().texture;
        this.computer.applyShader(this.wakeShaderMaterial).swapRenderTargets();
        this.wakeMaterial.uniforms.heightmap.value = this.computer.getPreviousRenderTarget().texture;
    },
    
    _updateVessel: function(vessel, dt) {
        var distanceSq = vessel.obj3D.position.distanceToSquared(this._meshOrigin);
        if (distanceSq > this.maxVesselDistanceSq) {
            return;
        }
        
        // Did we move from the last time?
        var lastPos = vessel._lbWakesLastPosition = vessel._lbWakesLastPosition || vessel.obj3D.position.clone();
        if (vessel.obj3D.position.equals(lastPos)) {
            return;
        }
        
        var speed = vessel.obj3D.position.distanceTo(lastPos) / dt;
        
        var uniforms = this.vesselShaderMaterial.uniforms;
        uniforms.strength.value = speed * 1;
        uniforms.ptCount.value = 1;
        uniforms.oldPoints.value[0].set(lastPos.x - this._meshOrigin.x, lastPos.y - this._meshOrigin.y)
                .divideScalar(this.wakeBounds)
                .add(_halfVector3);
        uniforms.newPoints.value[0].set(vessel.obj3D.position.x - this._meshOrigin.x, vessel.obj3D.position.y - this._meshOrigin.y)
                .divideScalar(this.wakeBounds)
                .add(_halfVector3);
        
        if (this._offset) {
            uniforms.offset.value.copy(this._offset)
                    .divideScalar(this.wakeBounds);
            this._offset = null;
        }
        else {
            uniforms.offset.value.set(0, 0);
        }
        
        uniforms.heightmap.value = this.computer.getPreviousRenderTarget().texture;
        this.computer.applyShader(this.vesselShaderMaterial).swapRenderTargets();
        
        lastPos.copy(vessel.obj3D.position);
    },
    
    destroy: function() {
        if (this.scene3D) {
            this.scene3D.remove(this.wakeMesh);
            this.wakeMesh = undefined;
            
            this.wakeGeometry.dispose();
            this.wakeGeometry = undefined;
            
            this.wakeMaterial.dispose();
            this.wakeMaterial = undefined;
            
            this.wakeShaderMaterial.dispose();
            this.wakeShaderMaterila = undefined;
            
            this.computer.destroy();
            this.computer = undefined;
            
            this.meshOrigin = undefined;
            
            this.scene3D = undefined;
        }
    },
    
    constructor: LBSailSim.ShaderWakes
};

//
// Some shader notes:
// gl_Position is from -1 to 1, top right corner of display is 1,1
// gl_FragCoord ranges from 0.5 to wakeGridSize - 0.5.
// coord ranges from 0 to 1
//
var vesselTriggerFragmentShader = [
    // Adapted from https://github.com/evanw/webgl-water/blob/master/water.js
    '#include <common>',
    //'const float PI = 3.14159265;',

    'uniform sampler2D heightmap;',
    'uniform vec2 offset;',
    'uniform vec2 cellSize;',
    'uniform vec2 oldPoints[5];',
    'uniform vec2 newPoints[5];',
    'uniform float strength;',
    'uniform float radius;',
    'uniform vec2 gridNorm;',
    
    'float pointVol(vec2 uv, vec2 vertex, float radius) {',
    '   float dist = length(uv - vertex);',
    '   float t = dist / radius;',
    '   float dy = 1. - smoothstep(0.75, 1.25, t);',
    '   return dy * strength;',
    '}',
    
    'float volume(vec2 vertices[5]) {',
    '   float vol = 0.;',
    '   return vol;',
    '}',

    'void main()	{',
    '   vec2 uv = gl_FragCoord.xy * cellSize;',
    
    '   float oldVol = pointVol(uv, oldPoints[0], radius);',
    '   float newVol = pointVol(uv, newPoints[0], radius);',
    '   float delta = newVol - oldVol;',
    
    '   vec4 value = texture2D(heightmap, uv + offset);',
    '   value.x += delta;',
    
    //'value.x = delta * 10.;',
    //'value.x = newVol * 10.;',
    //'value.x = step(63. - 0.0001, gl_FragCoord.x);',
    //'value.x = step(0.5 - 0.0001, uv.x + offset.x);',
    //'value.x = gl_FragCoord.x;',
    
    '   gl_FragColor = value;',
    
    '}'    
].join('\n');

var wakeHeightmapFragmentShader = [
    // Adapted from https://github.com/evanw/webgl-water/blob/master/water.js
    // Also ThreeJS/examples/webgl_gpgpu_water.html
    '#include <common>',

    'uniform sampler2D heightmap;',
    'uniform vec2 offset;',
    'uniform vec2 cellSize;',
    'uniform vec2 gridNorm;',
    'uniform float accelScale;',

    'void main()	{',

    //'   vec2 uv = (gl_FragCoord.xy - 0.5) * gridNorm + offset;',
    //'   vec2 uv = gl_FragCoord.xy * cellSize - offset;',
    '   vec2 uv = gl_FragCoord.xy * cellSize;',

    // value.x == height
    // value.y == velocity
    // value.z, value.w not used
    '   vec4 value = texture2D( heightmap, uv );',
    '   vec2 dx = vec2(cellSize.x, 0);',
    '   vec2 dy = vec2(0, cellSize.y);',
    '   float average = 0.25 * (',
    '       texture2D(heightmap, uv - dx).x',
    '       + texture2D(heightmap, uv - dy).x',
    '       + texture2D(heightmap, uv + dx).x',
    '       + texture2D(heightmap, uv + dy).x);',
    
    '   value.y += (average - value.x) * accelScale;',
    '   value.y *= 0.98;',
    '   value.x += value.y;',
    
    // Taper down towards the edges.
    '   float radius = length(gl_FragCoord.xy * cellSize - vec2(0.5, 0.5));',
    '   float atten = smoothstep(0.0, 0.25, 0.5 - radius);',
    '   value.xy *= atten;',
    
    //'value.x = step(63.45 / 64., gl_FragCoord.x * cellSize.x);',
    //'value = texture2D(heightmap, uv);',
    //'value.x = step(60. - 0.0001, value.x);',
    //'value.x = step(1.0 - 0.0001, uv.x);',
    
    '   gl_FragColor = value;',

    '}'
    
].join('\n');
    
return LBSailSim;
});