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
    return null;

    return new LBSailSim.MeshWakes(wakes);
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

/**
 * A mesh based wake. This is kind of hokey looking, but runs faster on lesser GPUs (I hope!)
 * @constructor
 * @param {module:LBSailSim.Wakes3D} wakes  The wakes object creating this.
 * @return {module:LBSailSim.MeshWakes}
 */
LBSailSim.MeshWakes = function(wakes) {
    this.scene3D = wakes.scene3D;
    this.wakes = wakes;
    this.sailEnv = wakes.sailEnv;
    
    this.segmentCount = 20;
    this.pointsPerSegment = 20;
    
    this.segmentCount = 20;
};

LBSailSim.MeshWakes.prototype = {
    vesselAdded: function(vessel) {
        if (!vessel.hull) {
            return;
        }
        
        var material = new THREE.MeshPhongMaterial({
            color: 0x001e0f
        });
        material.transparent = true;
        material.opacity = 0.5;
        
        var portGeometry = new THREE.PlaneBufferGeometry(1, 10, 2, this.segmentCount - 1);
        var portMesh = new THREE.Mesh(portGeometry, material);
        this.scene3D.add(portMesh);
        
        var stbdGeometry = new THREE.PlaneBufferGeometry(1, 10, 2, this.segmentCount - 1);
        var stbdMesh = new THREE.Mesh(stbdGeometry, material);
        this.scene3D.add(stbdMesh);
        
        vessel._lbWakeInfo = {
            material: material,
            port: new LBSailSim.MeshWakeSide(this, portMesh, portGeometry, -1),
            stbd: new LBSailSim.MeshWakeSide(this, stbdMesh, stbdGeometry, 1)
        };
        
        this._updateVesselWake(vessel);
    },
    
    vesselRemoved: function(vessel) {
        var wakeInfo = vessel._lbWakeInfo;
        if (wakeInfo) {
            wakeInfo.port.destroy();
            wakeInfo.port = null;
            wakeInfo.stbd.destroy();
            wakeInfo.stbd = null;
            
            wakeInfo.material = null;
            
            vessel._lbWakeInfo = null;
        }
    },
    
    update: function(dt) {
        this.wakes.vessels.forEach(function(vessel) {
            this._updateVesselWake(vessel, dt);
        }, this);
    },
    
    _updateVesselWake: function(vessel, dt) {
        var wakeInfo = vessel._lbWakeInfo;
        if (wakeInfo) {
            var velocity = vessel.getVelocityMPS();
            var speedSq = velocity.lengthSq();
            var hull = vessel.hull;
            var speed = Math.sqrt(speedSq);
            var wakeAngle = 19.47 * LBMath.DEG_TO_RAD;
            var velocityAngle = Math.atan2(velocity.y, velocity.x);
            var wakeSpeed = speed * Math.sin(wakeAngle);
            var halfWidth = 0.5;
            var deltaFactor = halfWidth / wakeSpeed;

            wakeInfo.port.addNewPoint(vessel, velocity, velocityAngle, wakeAngle, wakeSpeed, hull.wakeEndPort, deltaFactor);
            wakeInfo.stbd.addNewPoint(vessel, velocity, velocityAngle, wakeAngle, wakeSpeed, hull.wakeEndStbd, deltaFactor);

            wakeInfo.port.updatePoints(dt);
            wakeInfo.stbd.updatePoints(dt);
            
        }
    },
    
    destroy: function() {
        if (this.wakes) {
            if (this.wakes.vessels) {
                this.wakes.vessels.forEach(function(vessel) {
                    this.vesselRemoved(vessel);
                }, this);
            }
            this.sailEnv = null;
            this.wakes = null;
            this.scene3D = null;
        }
    },
    
    constructor: LBSailSim.MeshWakes
};

/**
 * Holds the information for one wavefront of the wake.
 * @param {module:LBSailSim.MeshWake} meshWake  The mesh wake object creating this.
 * @param {THREE.Mesh} mesh The mesh object.
 * @param {THREE.PlaneBufferGeometry} geometry The geometry object.
 * @param {Number} dir  The direction the wake travels, either -1 for port, or +1 for starboard
 * @return {Wakes3D_L19.LBSailSim.MeshWakeSide}
 */
LBSailSim.MeshWakeSide = function(meshWake, mesh, geometry, dir) {
    this.meshWake = meshWake;
    this.mesh = mesh;
    this.geometry = geometry; 
    this.dir = dir;
    
    var pointCount = meshWake.segmentCount * meshWake.pointsPerSegment + 1;
    this.wakePoints = new LBUtil.RollingBuffer(pointCount);
    
};

var _meshWakeSideVector3 = new LBGeometry.Vector3();
var _meshWakeSidePos = [];
var _meshWakeSideNormal = [];

LBSailSim.MeshWakeSide.prototype = {
    addNewPoint: function(vessel, velocity, velocityAngle, wakeAngle, wakeSpeed, startPos, deltaFactor) {
        var wakePoint;
        if (this.wakePoints.isFull()) {
            // Recycle the oldest.
            wakePoint = this.wakePoints.popOldest();
        }
        else {
            wakePoint = {
                position: new LBGeometry.Vector3(),
                velocity: new LBGeometry.Vector3()
            };
        }
        if (!startPos || LBMath.isLikeZero(wakeSpeed)) {
            // Not moving, we'll just get rid of the last wake point.
            return;
        }
        
        this.wakePoints.push(wakePoint);
        
        var angle = velocityAngle + Math.PI + this.dir * wakeAngle;
        
        // TODO: Make the z coordinate a function of speed...
        // TODO: Make the z velocity a function of the time to live.

        wakePoint.position.set(startPos.x, startPos.y, 0.1);
        wakePoint.velocity.set(wakeSpeed * Math.cos(angle), wakeSpeed * Math.sin(angle), 0);
        
        deltaFactor *= this.dir;
        wakePoint.dx = wakePoint.velocity.x * deltaFactor;
        wakePoint.dy = wakePoint.velocity.y * deltaFactor;
    },
    
    updatePoints: function(dt) {
        var activePointCount = this.wakePoints.getCurrentSize();
        if (activePointCount <= 1) {
            this.mesh.visible = false;
            return;
        }
        else {
            this.mesh.visible = true;
        }
        
        for (var i = 0; i < activePointCount; ++i) {
            var wakePoint = this.wakePoints.get(i);
            _meshWakeSideVector3.copy(wakePoint.velocity).multiplyScalar(dt);
            wakePoint.position.add(_meshWakeSideVector3);
        }

        var positionAttribute = this.geometry.getAttribute('position');
        var positions = positionAttribute.array;
        
        var normalAttribute = this.geometry.getAttribute('normal');
        var normals = normalAttribute.array;
        
        var coordMapping = this.meshWake.wakes.sailEnv.app3D.mainScene.coordMapping;
        var valueIndex = 0;
        var pointsPerSegment = this.meshWake.pointsPerSegment;
        
        // We start from the boat end and skip our way back...
        for (var wakePointIndex = activePointCount - 1; wakePointIndex >= 0; wakePointIndex -= pointsPerSegment) {
            valueIndex = this._updateForWakePoint(wakePointIndex, valueIndex, positions, normals, coordMapping);
        }
        
        var endValueIndex = (this.meshWake.segmentCount + 1) * 3 * 3;
        if ((wakePointIndex < 0) && (valueIndex < endValueIndex)) {
            // Set the last filler point to the last point we have.
            valueIndex = this._updateForWakePoint(0, valueIndex, positions, normals, coordMapping);
        }
        
        // Repeat the last point until we're done.
        for ( ; valueIndex < endValueIndex; ) {
            coordMapping.xyzToThreeJS(_meshWakeSidePos, 0, positions, valueIndex);
            coordMapping.xyzToThreeJS(_meshWakeSideNormal, 0, normals, valueIndex);
            valueIndex += 3;

            coordMapping.xyzToThreeJS(_meshWakeSidePos, 3, positions, valueIndex);
            coordMapping.xyzToThreeJS(_meshWakeSideNormal, 3, normals, valueIndex);
            valueIndex += 3;

            coordMapping.xyzToThreeJS(_meshWakeSidePos, 6, positions, valueIndex);
            coordMapping.xyzToThreeJS(_meshWakeSideNormal, 6, normals, valueIndex);
            valueIndex += 3;
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
    
    _updateForWakePoint: function(wakePointIndex, valueIndex, positions, normals, coordMapping) {
        var wakePoint = this.wakePoints.get(wakePointIndex);

        // We set up the array for all three vertices so we can reuse the last computed values to fill
        // in any leftover segments.
        _meshWakeSidePos[0] = wakePoint.position.x - wakePoint.dx;
        _meshWakeSidePos[1] = wakePoint.position.y - wakePoint.dy;
        _meshWakeSidePos[2] = 0;
        
        _meshWakeSidePos[3] = wakePoint.position.x;
        _meshWakeSidePos[4] = wakePoint.position.y;
        _meshWakeSidePos[5] = wakePoint.position.z;

        _meshWakeSidePos[6] = wakePoint.position.x + wakePoint.dx;
        _meshWakeSidePos[7] = wakePoint.position.y + wakePoint.dy;
        _meshWakeSidePos[8] = 0;

        // a = -dy, dx, 0
        // b = -dx, -dy, z
        // n = dx * z, dy*z, dy*dy+dx*dx
        _meshWakeSideNormal[0] = wakePoint.dx * wakePoint.position.z;
        _meshWakeSideNormal[1] = wakePoint.dy * wakePoint.position.z;
        _meshWakeSideNormal[2] = wakePoint.dy * wakePoint.dy + wakePoint.dx * wakePoint.dx;
        
        var length = Math.sqrt(_meshWakeSideNormal[0] * _meshWakeSideNormal[0] 
                + _meshWakeSideNormal[1] * _meshWakeSideNormal[1]
                + _meshWakeSideNormal[2] * _meshWakeSideNormal[2]);
        _meshWakeSideNormal[0] /= length;
        _meshWakeSideNormal[1] /= length;
        _meshWakeSideNormal[2] /= length;

        // The mid-point normal is always pointing straight up.
        _meshWakeSideNormal[3] = 0;
        _meshWakeSideNormal[4] = 0;
        _meshWakeSideNormal[5] = 1;

        // this is the same as the other point except pointing in the reverse x and y directions.
        _meshWakeSideNormal[6] = -_meshWakeSideNormal[0];
        _meshWakeSideNormal[7] = -_meshWakeSideNormal[1];
        _meshWakeSideNormal[8] = _meshWakeSideNormal[2];

        coordMapping.xyzToThreeJS(_meshWakeSidePos, 0, positions, valueIndex);
        coordMapping.xyzToThreeJS(_meshWakeSideNormal, 0, normals, valueIndex);
        valueIndex += 3;

        coordMapping.xyzToThreeJS(_meshWakeSidePos, 3, positions, valueIndex);
        coordMapping.xyzToThreeJS(_meshWakeSideNormal, 3, normals, valueIndex);
        valueIndex += 3;

        coordMapping.xyzToThreeJS(_meshWakeSidePos, 6, positions, valueIndex);
        coordMapping.xyzToThreeJS(_meshWakeSideNormal, 6, normals, valueIndex);
        valueIndex += 3;
        
        return valueIndex;
    },

    destroy: function() {
        if (this.mesh) {
            this.meshWake.scene3D.remove(this.mesh);
            
            this.mesh = null;
            this.meshWake = null;
            this.geometry = null;
            this.pointCount = null;
            this.delta = null;
            
            while (this.wakePoints.popNewest()) {
            }
        }
    },
    
    constructor: LBSailSim.MeshWakeSide
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