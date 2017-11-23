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


define(['lbsailsim', 'lbmath', 'three'],
function(LBSailSim, LBMath, THREE) {
    
    
/**
 * This is what handles rendering the 3D water.
 * <p>
 * The normal operation is to use shaders to render the water surface, which is
 * rendered into a horizontal plane at z=0 (LB coords) with dimension {@link LBSailSim.Water3D.MESH_SIZE}.
 * <p>
 * In addition, if there's a wind manager {@link LBSailSim.Wind} in the sailing environment, this also renders
 * puffs {@link LBSailSim.WindPuff} from the wind manager onto the water surface.
 * It does this again using shaders.
 * <p>
 * All the shader based stuff is handled by {@link LBSailSim.WaterShader}. See it for more details.
 * @param {module:LBUI3d.Scene3D} scene3D  The 3D scene.
 * @param {LBSailSim.SailEnv} sailEnv   The sailing environment.
 * @returns {LBSailSim.Water3D}
 */
LBSailSim.Water3D = function(scene3D, sailEnv) {
    this.scene3D = scene3D;
    this.sailEnv = sailEnv;
    
    this.puffsEnabled = true;
    
    if (!this._loadWater()) {
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

        // 4000 seems to be small enough to get decent resolution at close zoom.
LBSailSim.Water3D.MESH_SIZE = 4000;

LBSailSim.Water3D.prototype = {
    _loadWater: function() {
        var waterNormals = new THREE.TextureLoader().load( 'textures/three-js/waternormals.jpg' );
        waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

        var meshSize = LBSailSim.Water3D.MESH_SIZE;
        
        // TEST!!!
        //meshSize = 220;

        var waterShader = new LBSailSim.WaterShader( this, {
            meshWidth: meshSize,
            meshHeight: meshSize,
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: waterNormals,
                alpha: 	1.0,
                sunDirection: this.scene3D.mainLight.position.clone().normalize(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.0,
                fog: this.scene3D.scene.fog !== undefined
        } );
        this.waterShader = waterShader;

        this.surfaceMesh = new THREE.Mesh(
                new THREE.PlaneBufferGeometry( meshSize, meshSize ),
                waterShader.material
        );

        this.surfaceMesh.add( waterShader );
        this.surfaceMesh.rotation.x = - Math.PI * 0.5;
        this.scene3D.add( this.surfaceMesh );
        
        // TEST!!!
        //this.surfaceMesh.visible = false;
        
        // TEST!!!
        //this.testPuff = new LBSailSim.WindPuff();
        if (this.testPuff) {
            this.testPuff.startX = 20;
            this.testPuff.startY = 0;
            
            this.testPuff.nextPuff = new LBSailSim.WindPuff();
            if (this.testPuff.nextPuff) {
                this.testPuff.nextPuff.startX = 60;
                this.testPuff.nextPuff.startY = 10;
            }
        }
        
        return true;
    },
    
    
    /**
     * The main update function.
     * @param {Number} dt   The time step.
     */
    update: function(dt) {
        if (this.testPuff) {
            var puff = this.testPuff;
            while (puff) {
                puff.update(dt);
                if (puff.speedLeading <= 0) {
                    var puffOptions = {};
                    puffOptions.depth = 20;
                    puffOptions.leadingWidth = 30;
                    puffOptions.expansionDeg = 10;
                    puffOptions.timeToLive = 15;
                    puff.setupPuff(new THREE.Vector3(puff.startX, puff.startY, 0), new THREE.Vector2(-2, 0), puffOptions);
                }
                puff = puff.nextPuff;
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
 * This is based on ThreeJS' examples/js/WaterShader.js.
 * <p>
 * The big addition is support for puff rendering. Puff rendering is done via the
 * puffInRenderTarget and puffOutRenderTargets and the {@link LBSailSim.WaterShader#getPuffVertexShader}
 * and {@link LBSailSim.WaterShader#getPuffFragmentShader} shaders.
 * <p>
 * {@link LBSailSim.WaterShader#_updatePuffs} and {@link LBSailSim.WaterShader#_applyPuff} are
 * the main functions, with _updatePuffs clearing out one of the render targets so it can
 * serve as input for the first puff. _applyPuff then handles the rendering to the output render target
 * (after previously swapping them so the output of the last puff becomes the input to the current
 * puff).
 * The puff fragment shader simply calculates an alpha that is &gt; 0 when the pixel
 * is in the puff, adding it to the previously calculated alpha value.
 * <p>
 * {@link LBSailSim.WaterShader#getMirrorFragmentShader} is mostly from ThreeJS' examples/js/WaterShader.js,
 * with some tweaks to the noise function so it doesn't make the water look like wind's blowing on it,
 * and also an adjustment to the reflection coefficient to account for the presence of
 * a puff. The effect is to reduce the reflection when a puff is present.
 * <p>
 * The puff shader uses the same matrix transform as the mirror shader. This way the
 * mirror fragment shader can read the puff texture just like it does the mirror texture.
 * Also note that the puff shader is slightly offset vertically from the water surface
 * so it doesn't lie right on the water surface, otherwise there are rendering issues.
 * <p>
 * Note that right now there are three different render targets, one for the mirror image and
 * two for the puff rendering. I had tried to combine the puff rendering into the
 * mirror image since it only uses the alpha channel and the mirror image doesn't,
 * but ran into problems with the puff plane the same as the water plane. Offseting
 * the puff took care of those issues, but then the mirror image would no longer
 * be on the correct plane. Maybe some day I'll relook into this...
 * @constructor
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

    var targetParameters = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: ( /(iPad|iPhone|iPod)/g.test( navigator.userAgent ) ) ? THREE.HalfFloatType : THREE.FloatType,
        stencilBuffer: false
    };
    this.mirrorRenderTarget = new THREE.WebGLRenderTarget( width, height, targetParameters );
    this.puffInRenderTarget = this.mirrorRenderTarget.clone();
    this.puffOutRenderTarget = this.mirrorRenderTarget.clone();

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

    var uniforms = this.material.uniforms;
    uniforms.mirrorSampler.value = this.mirrorRenderTarget.texture;
    uniforms.textureMatrix.value = this.textureMatrix;
    uniforms.alpha.value = this.alpha;
    uniforms.time.value = this.time;
    uniforms.normalSampler.value = this.normalSampler;
    uniforms.sunColor.value = this.sunColor;
    uniforms.waterColor.value = this.waterColor;
    uniforms.sunDirection.value = this.sunDirection;
    uniforms.distortionScale.value = this.distortionScale;

    uniforms.eye.value = this.eye;

    if ( ! THREE.Math.isPowerOfTwo( width ) || ! THREE.Math.isPowerOfTwo( height ) ) {

        this.mirrorRenderTarget.texture.generateMipmaps = false;
        this.mirrorRenderTarget.texture.minFilter = THREE.LinearFilter;
        this.puffInRenderTarget.texture.generateMipmaps = false;
        this.puffInRenderTarget.texture.minFilter = THREE.LinearFilter;
        this.puffOutRenderTarget.texture.generateMipmaps = false;
        this.puffOutRenderTarget.texture.minFilter = THREE.LinearFilter;

    }
    
    
    this.puffScene = new THREE.Scene();
    this.puffShaderMaterial = new THREE.ShaderMaterial( {
        side: THREE.BackSide,
        fragmentShader: this.getPuffFragmentShader(),
        vertexShader: this.getPuffVertexShader(),
        uniforms: this.getPuffUniforms()
    });
    
    uniforms = this.puffShaderMaterial.uniforms;
    uniforms.textureMatrix.value = this.textureMatrix;
    
    this.puffShaderMesh = new THREE.Mesh(
        new THREE.PlaneBufferGeometry( this.meshWidth, this.meshHeight ),
        this.puffShaderMaterial
    );
    this.puffScene.add(this.puffShaderMesh);
    
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
        'varying vec3 nonProjPosition;',

                    'uniform mat4 textureMatrix;',
                    //'uniform float time;',

                    'varying vec4 mirrorCoord;',
                    'varying vec3 worldPosition;',
                    
                    THREE.ShaderChunk[ 'fog_pars_vertex' ],

                    'void main() {',
                    
                    // position is in world coords and ranges over the mesh' world dimensions.
                    '   uvCoord = position.xy / meshSize + 0.5;',
                    '   nonProjPosition = position;',
                    
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
                    // noise/surfaceNormal adds shimmer to the water, the noise is from the noise sampler.
                    '	vec4 noise = getNoise( worldPosition.xz );',
                    '	vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',

                    '	vec3 diffuseLight = vec3(0.0);',
                    '	vec3 specularLight = vec3(0.0);',

                    '	vec3 worldToEye = eye-worldPosition;',
                    '	vec3 eyeDirection = normalize( worldToEye );',
                    '	sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );',

                    '	float distance = length(worldToEye);',

                    // distortion is what makes the reflection wavy and move around.
                    '	vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;',

                    '   vec4 fullSample = texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.z + distortion );',
                    '	vec3 reflectionSample = fullSample.rgb;',

        '   float delta = 0.2;',
        '   vec3 avgReflectionSample = texture2D(mirrorSampler, (mirrorCoord.xy + vec2(delta,0.0)) / mirrorCoord.z + distortion).rgb',
        '           + texture2D(mirrorSampler, (mirrorCoord.xy + vec2(0.,delta)) / mirrorCoord.z + distortion).rgb',
        '           + texture2D(mirrorSampler, (mirrorCoord.xy + vec2(0.,-delta)) / mirrorCoord.z + distortion).rgb',
        '           + texture2D(mirrorSampler, (mirrorCoord.xy + vec2(-delta, 0.)) / mirrorCoord.z + distortion).rgb;',
        '   reflectionSample = (reflectionSample + avgReflectionSample / 4.) * 0.4;',

                    '	float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );',
                    '	float rf0 = 0.3;',
                    '	float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );',
                    '	vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',

        // We make our puffs appear by changing the reflection coefficient.
        // Where there's no puff puffCoef is 1.
        '   float puffCoef = texture2D( puffSampler, mirrorCoord.xy / mirrorCoord.z ).a;',
        '   reflectance *= puffCoef * 0.25 + 0.75;',
                    
                    '	vec3 albedo = mix( sunColor * diffuseLight * 0.3 + scatter, ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance );',
                    '	vec3 outgoingLight = albedo;',
                    '	gl_FragColor = vec4( outgoingLight, alpha );',

                    THREE.ShaderChunk[ 'fog_fragment' ],

                    '}'
            ].join( '\n' );
};


LBSailSim.WaterShader.prototype.getPuffUniforms = function() {
    var uniforms = {
        meshSize : { value: new THREE.Vector2(this.meshWidth, this.meshHeight) },
        textureMatrix : { value: new THREE.Matrix4() },
        puffSampler : { value: null },
        puffCenter : { value: new THREE.Vector2() },
        puffDir : { value: new THREE.Vector2() },
        rLeading : { value: 0 },
        rTrailing : { value: 0 },
        rDelta : { value: 0 },
        edge0Rad : { value: 0 },
        edge1Rad : { value: 0 },
        cosEdge0 : { value: 0 },
        sinEdge0 : { value: 0 },
        maxTanTheta: { value: 0 },
        
        // refAlpha is used to smooth the puff's appearance and disappearance.
        refAlpha: { value: 1 }
    };
    
    return uniforms;
};


LBSailSim.WaterShader.prototype.getPuffVertexShader = function() {
    return [
        'uniform vec2 meshSize;',
        'uniform mat4 textureMatrix;',

        'varying vec2 uvCoord;',
        'varying vec3 nonProjPosition;',
        'varying vec4 mirrorCoord;',
        'varying vec3 worldPosition;',

        'void main() {',

        // position is in world coords and ranges over the mesh' world dimensions.
        '   uvCoord = position.xy / meshSize + 0.5;',
        '   nonProjPosition = position;',

        // mirrorCoord, worldPosition are projected into the view.
        '   mirrorCoord = modelMatrix * vec4( position, 1.0 );',
        '   worldPosition = mirrorCoord.xyz;',
        '   mirrorCoord = textureMatrix * mirrorCoord;',
        '   vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );',
        '   gl_Position = projectionMatrix * mvPosition;',

        '}'
].join( '\n' );
};


LBSailSim.WaterShader.prototype.getPuffFragmentShader = function() {
    return [
        'precision highp float;',

        'uniform sampler2D puffSampler;',
        'uniform vec2 puffCenter;',
        'uniform vec2 puffDir;',
        'uniform float rLeading;',
        'uniform float rTrailing;',
        'uniform float rDelta;',
        'uniform float edge0Rad;',
        'uniform float edge1Rad;',
        'uniform float cosEdge0;',
        'uniform float sinEdge0;',
        'uniform float maxTanTheta;',
        'uniform float refAlpha;',
        
        'varying vec2 uvCoord;',
        'varying vec3 nonProjPosition;',
        'varying vec4 mirrorCoord;',
        
        'void main() {',
        '   vec2 delta = nonProjPosition.xy - puffCenter;',
        '   float radius = length(delta);',
        '   float a = refAlpha;',
        
        '   float taper = 0.2;',
        '   a *= smoothstep(rTrailing, rTrailing + 0.5 * rDelta, radius);',
        '   a *= 1. - smoothstep(rLeading - taper * rDelta, rLeading, radius);',
        '   a *= step(0., dot(delta, puffDir));',
        
        '   if (a > 0.) {',
        '       float localX = delta.x * cosEdge0 + delta.y * sinEdge0;',
        '       float localY = -delta.x * sinEdge0 + delta.y * cosEdge0;',
        '       float tanTheta = localY / localX;',
        '       float tanThetaTrans = taper * maxTanTheta;',
        '       a *= smoothstep(0., tanThetaTrans, tanTheta);',
        '       a *= 1. - smoothstep(maxTanTheta - tanThetaTrans, maxTanTheta, tanTheta);',
        '   }',
        // At this point a value of a = 0 is no puff, a = 1 is full puff. The mirror shader
        // wants it the reverse so we just do 1 - a.

        '   vec4 fullSample = texture2D( puffSampler, mirrorCoord.xy / mirrorCoord.z );',
        '   gl_FragColor.a = fullSample.a * (1. - a);',
        '}'
    ].join('\n');
};

LBSailSim.WaterShader.prototype._updatePuffs = function() {
    if (!this.water3D.puffsEnabled) {
        return;
    }
    
    var surfaceMesh = this.water3D.surfaceMesh;
    if (!surfaceMesh) {
        return;
    }
    
    // Note that the mesh is a little bit above the water surface of y=0 (THREE coords), otherwise
    // rendering gets weird since we're transforming by the mirror matrix so the water shader
    // can easily process this.
    this.puffShaderMesh.position.set(surfaceMesh.position.x, surfaceMesh.position.y + 0.1, surfaceMesh.position.z);
    this.puffShaderMesh.quaternion.copy(surfaceMesh.quaternion);
    this.puffShaderMesh.matrixNeedsUpdated = true;
    this.puffShaderMesh.updateMatrixWorld();

    // We clear puffOutRenderTarget because _applyPuff() swaps the buffers before
    // rendering, so puffOutRenderTarget will become puffInRenderTarget.
    this.renderer.clearTarget(this.puffOutRenderTarget, true, true, true);
    this.isPuff = false;

    // TEST!!!
    if (this.water3D.testPuff) {
        var puff = this.water3D.testPuff;
        while (puff) {
            this._applyPuff(puff);
            puff = puff.nextPuff;
        }
    }
    else if (this.water3D.sailEnv.wind) {
        var me = this;
        this.water3D.sailEnv.wind.forEachPuff(function(puff) {
            me._applyPuff(puff);
        });
    }
    
    if (!this.isPuff) {
        this._swapPuffRenderTargets();
    }
};

LBSailSim.WaterShader.prototype._applyPuff = function(puff) {
    var uniforms = this.puffShaderMaterial.uniforms;
    
    uniforms.refAlpha.value = puff.speedAttenuationForTime;
   
    uniforms.puffCenter.value.copy(puff.centerPos);
    uniforms.puffDir.value.copy(puff.velDir);
    
    uniforms.rLeading.value = puff.rLeading;
    uniforms.rTrailing.value = puff.rTrailing;
    uniforms.rDelta.value = puff.rLeading - puff.rTrailing;
    
    uniforms.edge0Rad.value = puff.edge0Rad;
    uniforms.edge1Rad.value = puff.edge1Rad;
    
    uniforms.cosEdge0.value = puff.cosEdge0;
    uniforms.sinEdge0.value = puff.sinEdge0;
    uniforms.maxTanTheta.value = puff.maxTanTheta;
    
    this._swapPuffRenderTargets();

    uniforms.puffSampler.value = this.puffInRenderTarget.texture;
    this.renderer.render(this.puffScene, this.mirrorCamera, this.puffOutRenderTarget, true);
    
    this.isPuff = true;
};

LBSailSim.WaterShader.prototype._swapPuffRenderTargets = function() {
    var tmp = this.puffOutRenderTarget;
    this.puffOutRenderTarget = this.puffInRenderTarget;
    this.puffInRenderTarget = tmp;
};

LBSailSim.WaterShader.prototype.render = function() {
    if ( this.matrixNeedsUpdate ) this.updateTextureMatrix();

    this.matrixNeedsUpdate = true;

    var scene = this.scene;
    if ( scene !== undefined && scene instanceof THREE.Scene ) {
        var clearAlpha = this.renderer.getClearAlpha();
        if (clearAlpha !== 1) {
            this.renderer.setClearAlpha(1);
        }
        
        // This is where we render the mirror image.
        // We turn off the material because we don't want to render the material, which
        // is what we're rendering to...
        this.material.visible = false;
        this.renderer.render( scene, this.mirrorCamera, this.mirrorRenderTarget, true );
        this.material.visible = true;

        // this.mirrorRenderTarget now contains the mirrored image.

        this._updatePuffs();

        if (clearAlpha !== 1) {
            this.renderer.setClearAlpha(clearAlpha);
        }
        
        this.material.uniforms.puffSampler.value = this.puffOutRenderTarget.texture;
        this.material.uniforms.mirrorSampler.value = this.mirrorRenderTarget.texture;
    }
};

/**
 * Updates the texture matrix, pretty much straight from ThreeJS' examples/WaterShader.js
 */
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