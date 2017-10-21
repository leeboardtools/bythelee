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

define(['lbgeometry', 'three', 'three-gpuparticlesystem'],
function(LBGeometry, THREE) {
    
    'use strict';
    
/**
 * 
 * @namespace LBParticles
 */
var LBParticles = LBParticles || {};

/**
 * A cache of reusable particles, the particles all share the same material and belong
 * to the same scene/group.
 * <p>
 * Particles are retrieved by calling {@link LBParticles.Cache#getParticle}, the object
 * will have its visible property set to false so should be positioned as desired and
 * then have the visible property set to true. The object will already be part of the scene/group.
 * <p>
 * When done with a particle, it should be returned to the cache by calling
 * {@link LBParticles.Cache#returnParticle}. The particle will have its visible property
 * set to false and be made available for the next call to {@link LBParticles.Cache#getParticle}.
 * @constructor
 * @param {LBUI3d.Scene3D|THREE.Group} scene    The scene or group to which the particles
 * are added..
 * @param {THREE.SpriteMaterial} material   The material for the particle sprites.
 * @returns {LBParticles.Cache}
 */
LBParticles.Cache = function(scene, material) {
    this.scene = scene;
    this.material = material;
    
    this._nextAvailableParticle = null;
};

LBParticles.Cache.prototype = {
    /**
     * Retrieves a particle from the cache, creating one if needed.
     * @returns {LBGeometry.Object3D}   A particle. The particle is already
     * part of the scene and will have its visible property set to false.
     */
    getParticle: function() {
        var particle = this._nextAvailableParticle;
        if (!particle) {
            return this._createParticle();
        }
        this._nextAvailableParticle = particle._lbNextParticle;
        particle._lbNextParticle = null;
        return particle;
    },
    
    /**
     * Returns a particle to the cache. The particle should no longer be used
     * outside the cache. It's visible property will be set to false.
     * @param {LBGeometry.Object3D} particle    The particle to return.
     * @returns {undefined}
     */
    returnParticle: function(particle) {
        particle._lbNextParticle = this._nextAvailableParticle;
        this._nextAvailableParticle = particle;
        particle.visible = false;
    },
    
    /**
     * Called to create a new particle. The particle is added to the scene.
     * @returns {LBGeometry.Object3D}   The new particle.
     */
    _createParticle: function() {
        var particle = new THREE.Sprite(this.material);
        particle.visible = false;
        this.scene.add(particle);
        
        return particle;
    },
    
    /**
     * Removes the cache from use, hopefully letting the garbage collector
     * collect all its particles.
     * @returns {undefined}
     */
    destroy: function() {
        while (this._nextAvailableParticle) {
            var particle = this._nextAvailableParticle;
            this._nextAvailableParticle = particle._lbNextParticle;
            
            this.scene.remove(particle);
            particle._lbNextParticle = undefined;
        }
        this._nextAvailableParticle = undefined;
        this.scene = undefined;
        this.material = undefined;
    },
    
    constructor: LBParticles.Cache
};


LBParticles.ParticleSystem = function(options) {
    options = options || {};
    if (!options.PARTICLE_NOISE_TEXTURE || !options.PARTICLE_SPRITE_TEXTURE) {
        var textureLoader = new THREE.TextureLoader();
        options.particleNoiseTex = options.particleNoiseTex || textureLoader.load( 'textures/three-js/perlin-512.png' );
	options.particleSpriteTex = options.particleSpriteTex || textureLoader.load( 'textures/three-js/particle2.png' );
    }
    
    THREE.GPUParticleSystem.call(this, options);
};

LBParticles.ParticleSystem.prototype = Object.create(THREE.GPUParticleSystem.prototype);



return LBParticles;
});
