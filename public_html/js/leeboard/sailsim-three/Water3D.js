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


define(['lbsailsim', 'lbmath', 'three', 'lbshaders'],
function(LBSailSim, LBMath, THREE, LBShaders) {
    
    
// TODO
// Need to figure out how to improve the pixel resolution of the puffs.

LBSailSim.Water3D = function(scene3D, sailEnv) {
    this.scene3D = scene3D;
    this.sailEnv = sailEnv;
    
    this.puffsEnabled = true;
    
    if (!this.loadWater()) {
        var WIDTH = 64;    
        var BOUNDS = 128;
        var material = this.createWaterMaterial(BOUNDS, WIDTH);

        var texture = this.createWaterTexture(WIDTH);
        material.uniforms.heightmap.value = texture;

        var geometry = new THREE.PlaneBufferGeometry(10000, 10000, WIDTH - 1, WIDTH - 1);
        geometry.rotateX(-LBMath.PI_2);

        this.waterMesh = new THREE.Mesh(geometry, material);

        // TEST!!!
        //this.waterMesh.position.y = 0.98;
        //material.wireframe = true;

        this.scene3D.add(this.waterMesh);
    }
};

LBSailSim.Water3D.prototype = {
    loadWater: function() {
        var waterNormals = new THREE.TextureLoader().load( 'textures/three-js/waternormals.jpg' );
        waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

        // 4000 seems to be small enough to get decent resolution at close zoom.
        var meshSize = 4000;
        
        // TEST!!!
        //meshSize = 220;

        var water = new LBSailSim.WaterShader( this, {
            meshWidth: meshSize,
            meshHeight: meshSize,
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: waterNormals,
                alpha: 	1.0,
                sunDirection: this.scene3D.mainLight.position.clone().normalize(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 5.0,
                fog: this.scene3D.scene.fog !== undefined
        } );
        this.waterShader = water;

        var mirrorMesh = new THREE.Mesh(
                new THREE.PlaneBufferGeometry( meshSize, meshSize ),
                water.material
        );

        mirrorMesh.add( water );
        mirrorMesh.rotation.x = - Math.PI * 0.5;
        this.scene3D.add( mirrorMesh );
        
        
        // TEST!!!
//        this.testPuff = new LBSailSim.WindPuff();
        return true;
    },
    
    update: function(dt) {
        if (this.testPuff) {
            this.testPuff.update(dt);
            if (this.testPuff.speedLeading <= 0) {
                var puffOptions = {};
                puffOptions.depth = Math.max(this._depthRNG.nextValue(), 1);
                puffOptions.leadingWidth = Math.max(this._leadingWidthRNG.nextValue(), 10);
                puffOptions.expansionDeg = Math.max(this._expansionDegRNG.nextValue(), 1);
                puffOptions.timeToLive = Math.max(this._timeToLiveRNG.nextValue(), 5);
                this.testPuff.setupPuff(new THREE.Vector3(20, 0, 0), new THREE.Vector2(-2, 0), puffOptions);
            }
            
            if (this.wasPointInPuff) {
                if (!this.testPuff.isPointInPuff(0, 0)) {
                    console.log("End Puff");
                    this.wasPointInPuff = false;
                }
            }
            else {
                if (this.testPuff.isPointInPuff(0, 0)) {
                    console.log("Start Puff");
                    this.wasPointInPuff = true;
                }
            }
        }
        
        if (this.waterShader) {
            // Slow down the water a bit.
            this.waterShader.material.uniforms.time.value += 1.0 / 120.0;
            this.waterShader.render();
        }
    },
    
    destroy: function() {
        
    },
    
    constructor: LBSailSim.Water3D
};


/**
 * This is based on ThreeJS' examples/js/WaterShader.js
 * @param {LBSailSim.Water3D} water3D   The water 3D object this belongs to.
 * @param {Object} [options] Optional options object.
 * @returns {Water3D_L19.LBSailSim.WaterShader}
 */
LBSailSim.WaterShader = function(water3D, options) {
    this.water3D = water3D;

    THREE.Object3D.call( this );
    this.name = 'water_' + this.id;

    function optionalParameter( value, defaultValue ) {

            return value !== undefined ? value : defaultValue;

    }

    var scene = water3D.scene3D.scene;
    var camera = water3D.sailEnv.mainView.camera;
    var renderer = water3D.sailEnv.mainView.renderer;

    options = options || {};

    this.matrixNeedsUpdate = true;

    var width = optionalParameter( options.textureWidth, 512 );
    var height = optionalParameter( options.textureHeight, 512 );
    this.clipBias = optionalParameter( options.clipBias, 0.0 );
    this.alpha = optionalParameter( options.alpha, 1.0 );
    this.time = optionalParameter( options.time, 0.0 );
    this.normalSampler = optionalParameter( options.waterNormals, null );
    this.sunDirection = optionalParameter( options.sunDirection, new THREE.Vector3( 0.70707, 0.70707, 0.0 ) );
    this.sunColor = new THREE.Color( optionalParameter( options.sunColor, 0xffffff ) );
    this.waterColor = new THREE.Color( optionalParameter( options.waterColor, 0x7F7F7F ) );
    this.eye = optionalParameter( options.eye, new THREE.Vector3( 0, 0, 0 ) );
    this.distortionScale = optionalParameter( options.distortionScale, 20.0 );
    this.side = optionalParameter( options.side, THREE.FrontSide );
    this.fog = optionalParameter( options.fog, false );
    
    this.meshWidth = optionalParameter(options.meshWidth, 1);
    this.meshHeight = optionalParameter(options.meshHeight, 1);

    this.renderer = renderer;
    this.scene = scene;
    this.mirrorPlane = new THREE.Plane();
    this.normal = new THREE.Vector3( 0, 0, 1 );
    this.mirrorWorldPosition = new THREE.Vector3();
    this.cameraWorldPosition = new THREE.Vector3();
    this.rotationMatrix = new THREE.Matrix4();
    this.lookAtPosition = new THREE.Vector3( 0, 0, - 1 );
    this.clipPlane = new THREE.Vector4();

    if ( camera instanceof THREE.PerspectiveCamera ) {        this.testPuff = null;


            this.camera = camera;

    } else {

            this.camera = new THREE.PerspectiveCamera();
            console.log( this.name + ': camera is not a Perspective Camera!' );

    }

    this.textureMatrix = new THREE.Matrix4();

    this.mirrorCamera = this.camera.clone();

    this.renderTarget = new THREE.WebGLRenderTarget( width, height );
    this.renderTarget2 = new THREE.WebGLRenderTarget( width, height );

    var mirrorShader = this.getMirrorShader();
    var mirrorUniforms = THREE.UniformsUtils.clone( mirrorShader.uniforms );

    this.material = new THREE.ShaderMaterial( {
            fragmentShader: mirrorShader.fragmentShader,
            vertexShader: mirrorShader.vertexShader,
            uniforms: mirrorUniforms,
            transparent: true,
            side: this.side,
            fog: this.fog
    } );

    this.material.uniforms.mirrorSampler.value = this.renderTarget.texture;
    this.material.uniforms.textureMatrix.value = this.textureMatrix;
    this.material.uniforms.alpha.value = this.alpha;
    this.material.uniforms.time.value = this.time;
    this.material.uniforms.normalSampler.value = this.normalSampler;
    this.material.uniforms.sunColor.value = this.sunColor;
    this.material.uniforms.waterColor.value = this.waterColor;
    this.material.uniforms.sunDirection.value = this.sunDirection;
    this.material.uniforms.distortionScale.value = this.distortionScale;

    this.material.uniforms.eye.value = this.eye;

    if ( ! THREE.Math.isPowerOfTwo( width ) || ! THREE.Math.isPowerOfTwo( height ) ) {

            this.renderTarget.texture.generateMipmaps = false;
            this.renderTarget.texture.minFilter = THREE.LinearFilter;
            this.renderTarget2.texture.generateMipmaps = false;
            this.renderTarget2.texture.minFilter = THREE.LinearFilter;

    }
    
    this.puffComputer = new LBShaders.Computer(width, height, renderer);
    this.initialPuffTexture = this.puffComputer.createShaderTexture();
    
    this.puffShaderMaterial = new THREE.ShaderMaterial( {
        fragmentShader: this.getPuffFragmentShader(),
        vertexShader: this.getPuffVertexShader(),
        uniforms: this.getPuffUniforms()
    });
    
    this.material.uniforms.puffSampler.value = this.initialPuffTexture;

    this.updateTextureMatrix();
    this.render();
};

LBSailSim.WaterShader.prototype = Object.create(THREE.Object3D.prototype);
LBSailSim.WaterShader.prototype.constructor = LBSailSim.WaterShader;

LBSailSim.WaterShader.prototype.getMirrorShader = function() {
    return {
            uniforms: this.getMirrorUniforms(),

            vertexShader: this.getMirrorVertexShader(),

            fragmentShader: this.getMirrorFragmentShader()

    };
};

LBSailSim.WaterShader.prototype.getMirrorUniforms = function() {
    return THREE.UniformsUtils.merge( [
                    THREE.UniformsLib[ 'fog' ],
                    {
                        puffSampler: { value: null },
                        meshSize: { value: new THREE.Vector2(this.meshWidth, this.meshHeight) },
                        
                            normalSampler: { value: null },
                            mirrorSampler: { value: null },
                            alpha: { value: 1.0 },
                            time: { value: 0.0 },
                            distortionScale: { value: 20.0 },
                            noiseScale: { value: 1.0 },
                            textureMatrix: { value: new THREE.Matrix4() },
                            sunColor: { value: new THREE.Color( 0x7F7F7F ) },
                            sunDirection: { value: new THREE.Vector3( 0.70707, 0.70707, 0 ) },
                            eye: { value: new THREE.Vector3() },
                            waterColor: { value: new THREE.Color( 0x555555 ) }
                    }
            ] );
};

LBSailSim.WaterShader.prototype.getMirrorVertexShader = function() {
    return [
        'uniform vec2 meshSize;',
        'varying vec2 uvCoord;',

                    'uniform mat4 textureMatrix;',
                    'uniform float time;',

                    'varying vec4 mirrorCoord;',
                    'varying vec3 worldPosition;',
                    
                    THREE.ShaderChunk[ 'fog_pars_vertex' ],

                    'void main() {',
                    
                    // position is in world coords and ranges over the mesh' world dimensions.
                    '   uvCoord = position.xy / meshSize + 0.5;',
                    
                    // mirrorCoord, worldPosition are projected into the view.
                    '	mirrorCoord = modelMatrix * vec4( position, 1.0 );',
                    '	worldPosition = mirrorCoord.xyz;',
                    '	mirrorCoord = textureMatrix * mirrorCoord;',
                    '	vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );',
                    '	gl_Position = projectionMatrix * mvPosition;',

                    THREE.ShaderChunk[ 'fog_vertex' ],

                    '}'
            ].join( '\n' );
};

LBSailSim.WaterShader.prototype.getMirrorFragmentShader = function() {
    return [
                    'precision highp float;',

        'uniform sampler2D puffSampler;',
        'varying vec2 uvCoord;',

                    'uniform sampler2D mirrorSampler;',
                    'uniform float alpha;',
                    'uniform float time;',
                    'uniform float distortionScale;',
                    'uniform sampler2D normalSampler;',
                    'uniform vec3 sunColor;',
                    'uniform vec3 sunDirection;',
                    'uniform vec3 eye;',
                    'uniform vec3 waterColor;',

                    'varying vec4 mirrorCoord;',
                    'varying vec3 worldPosition;',

                    'vec4 getNoise( vec2 uv ) {',
                    '	vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);',
                    '	vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );',
                    '	vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );',
                    '	vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );',
                    
                    // uv2 seems to impart a wind blowing effect.
                    'uv2 *= 0.01;',
                    
                    '	vec4 noise = texture2D( normalSampler, uv0 ) +',
                    '		texture2D( normalSampler, uv1 ) +',
                    '		texture2D( normalSampler, uv2 ) +',
                    '		texture2D( normalSampler, uv3 );',
                    '	return noise * 0.5 - 1.0;',
                    '}',

                    'void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {',
                    '	vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );',
                    '	float direction = max( 0.0, dot( eyeDirection, reflection ) );',
                    '	specularColor += pow( direction, shiny ) * sunColor * spec;',
                    '	diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;',
                    '}',

                    THREE.ShaderChunk[ 'common' ],
                    THREE.ShaderChunk[ 'fog_pars_fragment' ],

                    'void main() {',
                    '	vec4 noise = getNoise( worldPosition.xz );',
                    '	vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',

                    '	vec3 diffuseLight = vec3(0.0);',
                    '	vec3 specularLight = vec3(0.0);',

                    '	vec3 worldToEye = eye-worldPosition;',
                    '	vec3 eyeDirection = normalize( worldToEye );',
                    '	sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );',

                    '	float distance = length(worldToEye);',

                    '	vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;',
                    '	vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.z + distortion ) );',

                    '	float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );',
                    '	float rf0 = 0.3;',
                    '	float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );',
                    '	vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',
                    
                    '   reflectance *= (1. - texture2D(puffSampler, uvCoord).a) * 0.25 + 0.75;',
                    
                    '	vec3 albedo = mix( sunColor * diffuseLight * 0.3 + scatter, ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance );',
                    '	vec3 outgoingLight = albedo;',
                    '	gl_FragColor = vec4( outgoingLight, alpha );',

                    THREE.ShaderChunk[ 'fog_fragment' ],

                    '}'
            ].join( '\n' );
};


LBSailSim.WaterShader.prototype.getPuffUniforms = function() {
    var uniforms = {
        puffSampler : { value: null },
        puffCenter : { value: new THREE.Vector2() },
        rLeading : { value: 0 },
        rTrailing : { value: 0 },
        edge0Rad : { value: 0 },
        edge1Rad : { value: 0 },
        cosEdge0 : { value: 0 },
        sinEdge0 : { value: 0 },
        maxTanTheta: { value: 0 },
        refAlpha: { value: 1 }
    };
    
    this.puffComputer.setupUniforms(uniforms);
    return uniforms;
};


LBSailSim.WaterShader.prototype.getPuffVertexShader = function() {
    return this.puffComputer.getPassThroughVertexShader();
};


LBSailSim.WaterShader.prototype.getPuffFragmentShader = function() {
    return [
        'uniform sampler2D puffSampler;',
        'uniform vec2 puffCenter;',
        'uniform float rLeading;',
        'uniform float rTrailing;',
        'uniform float edge0Rad;',
        'uniform float edge1Rad;',
        'uniform float cosEdge0;',
        'uniform float sinEdge0;',
        'uniform float maxTanTheta;',
        'uniform float refAlpha;',
        
        'varying vec2 uvCoord;',
        'void main() {',
        '   vec2 delta = uvCoord - puffCenter;',
        '   float radius = length(delta);',
        '   float alpha = refAlpha;',
        
        '   float taper = 0.1;',
        '   float rTrans = taper * (rLeading - rTrailing);',
        '   alpha *= smoothstep(rTrailing, rTrailing + rTrans, radius);',
        '   alpha *= 1. - smoothstep(rLeading - rTrans, rLeading, radius);',
        
        '   if (alpha > 0.) {',
        '       float localX = delta.x * cosEdge0 + delta.y * sinEdge0;',
        '       float localY = -delta.x * sinEdge0 + delta.y * cosEdge0;',
        '       float tanTheta = localY / localX;',
        '       float tanThetaTrans = taper * maxTanTheta;',
        '       alpha *= smoothstep(0., tanThetaTrans, tanTheta);',
        '       alpha *= 1. - smoothstep(maxTanTheta - tanThetaTrans, maxTanTheta, tanTheta);',
        '   }',
        
        '   alpha = clamp(alpha + texture2D(puffSampler, uvCoord).a, 0., 1.);',

        '   gl_FragColor.a = alpha;',
        '}'
    ].join('\n');
};

LBSailSim.WaterShader.prototype._updatePuffs = function() {
    if (!this.water3D.puffsEnabled) {
        return;
    }
    
    this.puffComputer.applyTexture(this.puffInitialTexture).swapRenderTargets();
    
    // TEST!!!
    if (this.water3D.testPuff) {
        this._applyPuff(this.water3D.testPuff);
    }
    else if (this.water3D.sailEnv.wind) {
        var me = this;
        this.water3D.sailEnv.wind.forEachPuff(function(puff) {
            me._applyPuff(puff);
        });
    }
    
    this.material.uniforms.puffSampler.value = this.puffComputer.getPreviousRenderTarget().texture;
    this.material.uniforms.puffSampler.value.magFilter = THREE.LinearFilter;
    this.material.uniforms.puffSampler.value.minFilter = THREE.LinearMipMapLinearFilter;
};

var _workingPos = new THREE.Vector2();

LBSailSim.WaterShader.prototype._applyPuff = function(puff) {
    
    var uniforms = this.puffShaderMaterial.uniforms;
    
    uniforms.refAlpha.value = puff.speedLeading / puff.refSpeed;
    
    uniforms.puffCenter.value.copy(puff.centerPos);
    this._worldToUVCoord(uniforms.puffCenter.value);
    
    _workingPos.set(puff.centerPos.x + puff.rLeading * puff.velDir.x, puff.centerPos.y + puff.rLeading * puff.velDir.y);
    this._worldToUVCoord(_workingPos);
    uniforms.rLeading.value = _workingPos.distanceTo(uniforms.puffCenter.value);
    
    _workingPos.set(puff.centerPos.x + puff.rTrailing * puff.velDir.x, puff.centerPos.y + puff.rTrailing * puff.velDir.y);
    this._worldToUVCoord(_workingPos);
    uniforms.rTrailing.value = _workingPos.distanceTo(uniforms.puffCenter.value);
    
    uniforms.edge0Rad.value = puff.edge0Rad;
    uniforms.edge1Rad.value = puff.edge1Rad;
    
    uniforms.cosEdge0.value = puff.cosEdge0;
    uniforms.sinEdge0.value = puff.sinEdge0;
    uniforms.maxTanTheta.value = puff.maxTanTheta;
    
    uniforms.puffSampler.value = this.puffComputer.getPreviousRenderTarget().texture;
    this.puffComputer.applyShader(this.puffShaderMaterial).swapRenderTargets();
};

LBSailSim.WaterShader.prototype._worldToUVCoord = function(coord) {
    coord.x = coord.x / this.meshWidth + 0.5;
    coord.y = coord.y / this.meshHeight + 0.5;
};

LBSailSim.WaterShader.prototype.render = function() {
    if ( this.matrixNeedsUpdate ) this.updateTextureMatrix();

    this.matrixNeedsUpdate = true;

    // Render the mirrored view of the current scene into the target texture
    var scene = this;

    while ( scene.parent !== null ) {

            scene = scene.parent;

    }

    if ( scene !== undefined && scene instanceof THREE.Scene ) {
        
        this._updatePuffs();

            this.material.visible = false;

            this.renderer.render( scene, this.mirrorCamera, this.renderTarget, true );

            this.material.visible = true;

    }
};

LBSailSim.WaterShader.prototype.updateTextureMatrix = function() {
    this.updateMatrixWorld();
    this.camera.updateMatrixWorld();

    this.mirrorWorldPosition.setFromMatrixPosition( this.matrixWorld );
    this.cameraWorldPosition.setFromMatrixPosition( this.camera.matrixWorld );

    this.rotationMatrix.extractRotation( this.matrixWorld );

    this.normal.set( 0, 0, 1 );
    this.normal.applyMatrix4( this.rotationMatrix );

    var view = this.mirrorWorldPosition.clone().sub( this.cameraWorldPosition );
    view.reflect( this.normal ).negate();
    view.add( this.mirrorWorldPosition );

    this.rotationMatrix.extractRotation( this.camera.matrixWorld );

    this.lookAtPosition.set( 0, 0, - 1 );
    this.lookAtPosition.applyMatrix4( this.rotationMatrix );
    this.lookAtPosition.add( this.cameraWorldPosition );

    var target = this.mirrorWorldPosition.clone().sub( this.lookAtPosition );
    target.reflect( this.normal ).negate();
    target.add( this.mirrorWorldPosition );

    this.up.set( 0, - 1, 0 );
    this.up.applyMatrix4( this.rotationMatrix );
    this.up.reflect( this.normal ).negate();

    this.mirrorCamera.position.copy( view );
    this.mirrorCamera.up = this.up;
    this.mirrorCamera.lookAt( target );
    this.mirrorCamera.aspect = this.camera.aspect;

    this.mirrorCamera.updateProjectionMatrix();
    this.mirrorCamera.updateMatrixWorld();

    // Update the texture matrix
    this.textureMatrix.set(
            0.5, 0.0, 0.0, 0.5,
            0.0, 0.5, 0.0, 0.5,
            0.0, 0.0, 0.5, 0.5,
            0.0, 0.0, 0.0, 1.0
    );
    this.textureMatrix.multiply( this.mirrorCamera.projectionMatrix );
    this.textureMatrix.multiply( this.mirrorCamera.matrixWorldInverse );

    // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
    // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
    this.mirrorPlane.setFromNormalAndCoplanarPoint( this.normal, this.mirrorWorldPosition );
    this.mirrorPlane.applyMatrix4( this.mirrorCamera.matrixWorldInverse );

    this.clipPlane.set( this.mirrorPlane.normal.x, this.mirrorPlane.normal.y, this.mirrorPlane.normal.z, this.mirrorPlane.constant );

    var q = new THREE.Vector4();
    var projectionMatrix = this.mirrorCamera.projectionMatrix;

    q.x = ( Math.sign( this.clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
    q.y = ( Math.sign( this.clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
    q.z = - 1.0;
    q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];

    // Calculate the scaled plane vector
    var c = this.clipPlane.multiplyScalar( 2.0 / this.clipPlane.dot( q ) );

    // Replacing the third row of the projection matrix
    projectionMatrix.elements[ 2 ] = c.x;
    projectionMatrix.elements[ 6 ] = c.y;
    projectionMatrix.elements[ 10 ] = c.z + 1.0 - this.clipBias;
    projectionMatrix.elements[ 14 ] = c.w;

    var worldCoordinates = new THREE.Vector3();
    worldCoordinates.setFromMatrixPosition( this.camera.matrixWorld );
    this.eye = worldCoordinates;
    this.material.uniforms.eye.value = this.eye;
};

return LBSailSim;
});