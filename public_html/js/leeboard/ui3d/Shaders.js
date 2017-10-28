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

define(['three'],
function(THREE) {
    
var LBShaders = LBShaders || {};

/**
 * Class that helps with managing shader based computations.
 * <p>
 * Very loosely based upon ThreeJS/examples/GPUComputationRenderer.js
 * 
 * @param {type} gridWidth
 * @param {type} gridHeight
 * @param {type} renderer
 * @returns {Shaders_L18.LBShaders.Computer}
 */
LBShaders.Computer = function(gridWidth, gridHeight, renderer) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    
    this.renderer = renderer || new THREE.WebGLRenderer();
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.camera.position.z = 1;
    
    var wrapS = THREE.ClampToEdgeWrapping;
    var wrapT = THREE.ClampToEdgeWrapping;

    var minFilter = THREE.NearestFilter;
    var magFilter = THREE.NearestFilter;
    var targetOptions = {
        wrapS: wrapS,
        wrapT: wrapT,
        minFilter: minFilter,
        magFilter: magFilter,
        format: THREE.RGBAFormat,
        type: ( /(iPad|iPhone|iPod)/g.test( navigator.userAgent ) ) ? THREE.HalfFloatType : THREE.FloatType,
        stencilBuffer: false

    };
    
    this.currentTarget = new THREE.WebGLRenderTarget(gridWidth, gridHeight, targetOptions);
    this.previousTarget = new THREE.WebGLRenderTarget(gridWidth, gridHeight, targetOptions);
    
    this.passThroughMaterial = new THREE.ShaderMaterial({
        uniforms: {
            texture: { value: null }
        },
        vertexShader: this.getPassThroughVertexShader(),
        fragmentShader: this.getPassThroughFragmentShader()
    });
    this.setupUniforms(this.passThroughMaterial.uniforms);
    
    this.passThroughMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry( 2, 2 ), this.passThroughMaterial);
    this.scene.add(this.passThroughMesh);
};

LBShaders.Computer.prototype = {
    createShaderTexture: function() {
        var data = new Float32Array(this.gridWidth * this.gridHeight * 4);
        var texture = new THREE.DataTexture(data, this.gridWidth, this.gridHeight, THREE.RGBAFormat, THREE.FloatType);
        
        var pixels = texture.image.data;
        var p = 0;
        for (var i = 0; i < this.gridWidth; ++i) {
            for (var i = 0; i < this.gridHeight; ++i) {
                pixels[p++] = 0;
                pixels[p++] = 0;
                pixels[p++] = 0;
                pixels[p++] = 1;
            }
        }
        
        texture.needsUpdate = true;
        return texture;
    },
    
    setupUniforms: function(uniforms) {
        uniforms.gridSize = { value: new THREE.Vector2(this.gridWidth, this.gridHeight) };
        uniforms.gridNorm = { value: new THREE.Vector2(1 / (this.gridWidth - 1), 1 / (this.gridHeight - 1)) };
        uniforms.cellSize = { value: new THREE.Vector2(1 / this.gridWidth, 1 / this.gridHeight) };
        return this;
    },
    
    swapRenderTargets : function() {
        var tmp = this.currentTarget;
        this.currentTarget = this.previousTarget;
        this.previousTarget = tmp;
        return this;
    },
    
    applyTexture: function(texture) {
        this.passThroughMaterial.uniforms.texture.value = texture;
        this.renderer.render(this.scene, this.camera, this.currentTarget);
        this.passThroughMaterial.uniforms.texture.value = null;
        return this;
    },
    
    applyShader: function(shaderMaterial) {
        this.passThroughMesh.material = shaderMaterial;
        this.renderer.render(this.scene, this.camera, this.currentTarget);
        this.passThroughMesh.material = this.passThroughMaterial;
        return this;
    },
    
    getCurrentRenderTarget: function() {
        return this.currentTarget;
    },
    
    getPreviousRenderTarget: function() {
        return this.previousTarget;
    },
    
    getPassThroughVertexShader: function() {
        return passThroughVertexShader;
    },
    
    getPassThroughFragmentShader: function() {
        return passThroughFragmentShader;
    },
    
    destroy: function() {
        if (this.renderer) {
            this.currentTarget.dispose();
            this.currentTarget = null;
            
            this.previousTarget.dispose();
            this.previousTarget = null;
            
            this.scene.remove(this.passThroughMesh);
            this.passThroughMesh.dispose();
            this.passThroughMesh = null;
            
            this.scene.dispose();
            this.scene = null;

            this.passThroughMaterial.dispose();
            this.passThroughMaterial = null;

            this.renderer = null;
        }
    },
    
    constructor: LBShaders.Computer
};

LBShaders.Computer.isSupported = function(renderer) {
    var renderer = renderer || new THREE.WebGLRenderer();
    if (!(renderer instanceof THREE.WebGLRenderer)) {
        return false;
    }
    
    if (!renderer.extensions.get( "OES_texture_float" )) {
        return false;
    }

    return true;
};
//
// Some shader notes:
// position is from -1 to 1
// gl_Position is from -1 to 1, top right corner of display is 1,1
// gl_FragCoord ranges from 0.5 to gridSize - 0.5.
// coord ranges from 0 to 1

var passThroughVertexShader = [
    // From https://github.com/evanw/webgl-water/blob/master/water.js
    'varying vec2 coord;',
    'void main() {',
    '   coord = position.xy * 0.5 + 0.5;',
    '   gl_Position = vec4(position.xyz, 1.0);',
    '}'
].join('\n');

var passThroughFragmentShader = [
    'uniform sampler2D texture;',
    'varying vec2 coord;',
    'void main() {',
    '   gl_FragColor = texture2D(texture, coord);',
    '}'
    
].join('\n');


return LBShaders;
});
