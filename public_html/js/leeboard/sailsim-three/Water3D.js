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


define(['lbsailsim', 'lbmath', 'lbutil', 'three'],
function(LBSailSim, LBMath, LBUtil, THREE) {
    
    
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
    
    this.wakesScene = scene3D.scene;
    
    this._loadWaterShader();
};

        // 4000 seems to be small enough to get decent resolution at close zoom.
LBSailSim.Water3D.MESH_SIZE = 4000;

LBSailSim.Water3D.prototype = {
    _loadWaterShader: function() {
        //return false;
        
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

        var geometry = new THREE.PlaneBufferGeometry( meshSize, meshSize );
        this.waterShader.setupGeometryForShader(geometry);
        this.surfaceMesh = new THREE.Mesh(
                geometry,
                waterShader.material
        );

        this.surfaceMesh.add( waterShader );
        this.surfaceMesh.rotation.x = - Math.PI * 0.5;
        this.scene3D.add( this.surfaceMesh );
    },
    
    
    setupWakeGeometry: function(geometry) {
        if (this.waterShader) {
            this.waterShader.setupGeometryForShader(geometry);
        }
    },
    
    getWakeShadingAttribute: function(geometry) {
        if (this.waterShader) {
            return geometry.getAttribute('shading');
        }
        return undefined;
    },
    
    
    /**
     * The main update function.
     * @param {Number} dt   The time step.
     */
    update: function(dt) {
        if (this.waterShader) {
            this.waterShader.update();
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

    if ( camera instanceof THREE.PerspectiveCamera ) {        

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

    if ( ! THREE.Math.isPowerOfTwo( width ) || ! THREE.Math.isPowerOfTwo( height ) ) {

        this.mirrorRenderTarget.texture.generateMipmaps = false;
        this.mirrorRenderTarget.texture.minFilter = THREE.LinearFilter;
    }
    
    var mirrorShader = this.getMirrorShader();
    var mirrorUniforms = THREE.UniformsUtils.clone( mirrorShader.uniforms );

    this.material = this.createShaderMaterial(mirrorShader, mirrorUniforms);
    this.puffsMaterial = this.createShaderMaterial(mirrorShader);
    
    this.wakesMaterial = this.createShaderMaterial(mirrorShader);
    this.water3D.wakesMaterial = this.wakesMaterial;

    this.maxPuffsHeight = 0.05;
    this.maxPuffsSpeed = 15;

    var me = this;
    this.puffMeshPool = new LBUtil.Pool(function() {
        return me.createPuffMesh();
    });
    this.puffMeshesInUse = [];
    
    
    // We need to initialize the mirror render target with a color that will be reflected.
    var geometry = new THREE.PlaneGeometry(width, height);
    var material = new THREE.MeshBasicMaterial( { color: 0xaaaaaa } );
    var mesh = new THREE.Mesh(geometry, material);
    var tmpScene = new THREE.Scene();
    tmpScene.add(mesh);
    var tmpCamera = new THREE.OrthographicCamera(-width/3, width/3, height/3, -height/3, 1, 1000);
    tmpCamera.position.set(0, 0, 100);
    tmpCamera.lookAt(mesh.position);
    this.renderer.render(tmpScene, tmpCamera, this.mirrorRenderTarget, true);


    this.eye = this.material.uniforms.eye.value;
    this.puffsMaterial.uniforms.eye.value = this.eye;
    this.wakesMaterial.uniforms.eye.value = this.eye;
    
    this.update();
};

LBSailSim.WaterShader.prototype = Object.create(THREE.Object3D.prototype);
LBSailSim.WaterShader.prototype.constructor = LBSailSim.WaterShader;


LBSailSim.WaterShader.prototype.createShaderMaterial = function(mirrorShader, mirrorUniforms) {
    mirrorUniforms = mirrorUniforms || THREE.UniformsUtils.clone( mirrorShader.uniforms );
    
    var material = new THREE.ShaderMaterial( {
            fragmentShader: mirrorShader.fragmentShader,
            vertexShader: mirrorShader.vertexShader,
            uniforms: mirrorUniforms,
            transparent: true,
            side: this.side,
            fog: this.fog
    } );

    var uniforms = material.uniforms;
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
    return material;
};

LBSailSim.WaterShader.prototype.setupGeometryForShader = function(geometry) {
    var shadings = new Float32Array(geometry.attributes.position.count);
    shadings.fill(1.);
    geometry.addAttribute('shading', new THREE.BufferAttribute(shadings, 1));
};

LBSailSim.WaterShader.prototype.getShadingAttribute = function(geometry) {
    return geometry.getAttribute('shading');
};

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
        'varying vec2 uvCoord;',
        'varying vec3 vNormal;',
        'varying vec3 vViewNormal;',
        'attribute float shading;',
        'varying float vShading;',

                    'uniform mat4 textureMatrix;',

                    'varying vec4 mirrorCoord;',
                    'varying vec3 worldPosition;',
                    
                    THREE.ShaderChunk[ 'fog_pars_vertex' ],

                    'void main() {',
                    
        '   uvCoord = uv;',
        '   vShading = shading;',
                    
                    // mirrorCoord, worldPosition are projected into the view.
                    '	mirrorCoord = modelMatrix * vec4( position, 1.0 );',
                    '	worldPosition = mirrorCoord.xyz;',
                    '	mirrorCoord = textureMatrix * mirrorCoord;',
                    '	vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );',
                    '	gl_Position = projectionMatrix * mvPosition;',
                    
        'vViewNormal = normalize(normalMatrix * normal);',
        'vNormal = normalize((modelMatrix * vec4(normal, 1.0)).xyz);',

                    THREE.ShaderChunk[ 'fog_vertex' ],

                    '}'
            ].join( '\n' );
};

LBSailSim.WaterShader.prototype.getMirrorFragmentShader = function() {
    return [
                    'precision highp float;',

        'varying vec2 uvCoord;',
        'varying vec3 vNormal;',
        'varying vec3 vViewNormal;',
        'varying float vShading;',
        
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
                    // Phong
                    '	vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );',
                    '	float direction = max( 0.0, dot( eyeDirection, reflection ) );',
                    '	specularColor += pow( direction, shiny ) * sunColor * spec;',
                    // Lambert
                    '	diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;',
                    '}',

                    THREE.ShaderChunk[ 'common' ],
                    THREE.ShaderChunk[ 'fog_pars_fragment' ],

                    'void main() {',
                    // noise/surfaceNormal adds shimmer to the water The noise is really the surface normal
                    // to be used, in view space. The multiplication by vec3(1.5, 1.0, 1.5) appears to be
                    // a scaling operation.
                    '	vec4 noise = getNoise( worldPosition.xz );',
                    '	vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',

                    '	vec3 diffuseLight = vec3(0.0);',
                    '	vec3 specularLight = vec3(0.0);',

                    '	vec3 worldToEye = eye-worldPosition;',
                    '	vec3 eyeDirection = normalize( worldToEye );',
                    '	sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );',

                    '	float distance = length(worldToEye);',

                    // distortion is what makes the reflection wavy and move around.
                    // NOTE: With the current setup, the mirror sampler returns the same value for everything,
                    // so distortion has no effect.
                    '	vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;',

                    '   vec4 fullSample = texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.z + distortion );',
                    '	vec3 reflectionSample = fullSample.rgb;',

        // This little snippet is to try to spread out the reflection a bit.
        //'   float delta = 0.2;',
        //'   vec3 avgReflectionSample = texture2D(mirrorSampler, (mirrorCoord.xy + vec2(delta,0.0)) / mirrorCoord.z + distortion).rgb',
        //'           + texture2D(mirrorSampler, (mirrorCoord.xy + vec2(0.,delta)) / mirrorCoord.z + distortion).rgb',
        //'           + texture2D(mirrorSampler, (mirrorCoord.xy + vec2(0.,-delta)) / mirrorCoord.z + distortion).rgb',
        //'           + texture2D(mirrorSampler, (mirrorCoord.xy + vec2(-delta, 0.)) / mirrorCoord.z + distortion).rgb;',
        //'   reflectionSample = (reflectionSample + avgReflectionSample / 4.) * 0.4;',

                    '	float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );',
                    '	float rf0 = 0.3;',
                    '	float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );',
                    '	vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',

        '   float a = alpha;',
        '   reflectionSample *= vShading;',
        '   diffuseLight *= vShading;',
        
                    '	vec3 albedo = mix( sunColor * diffuseLight * 0.3 + scatter, ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance );',
                    '	vec3 outgoingLight = albedo;',
                    '	gl_FragColor = vec4( outgoingLight, a );',

// The easy way to test values, set the color of gl_FragColor to it...
//'vec3 testNormal = surfaceNormal;',
//'testNormal = vViewNormal;',
//'testNormal = noise.xyz;',
//'testNormal = texture2D( normalSampler, worldPosition.xz ).xyz;',
//'testNormal = normalize(testNormal);',
//'float testVal = 0.5 + testNormal.x * 0.5;',
//'testVal = 0.5 + vShading * 0.5;',
//'gl_FragColor = vec4(testVal, testVal, testVal, 1.);',
                    
                    THREE.ShaderChunk[ 'fog_fragment' ],

                    '}'
            ].join( '\n' );
};


LBSailSim.WaterShader.prototype.createPuffMesh = function() {
    var geometry = new THREE.PlaneBufferGeometry(1, 1, 3, 3);
    this.setupGeometryForShader(geometry);
    var mesh = new THREE.Mesh(geometry, this.puffsMaterial);
    this.scene.add(mesh);
    return mesh;
};


var _applyPuffVector3;
var _applyPuffPosition = [];
var _applyPuffPositionUs = [ 0, 0.25, 0.75, 1. ];
var _applyPuffPositionVs = [ 0, 0.05, 0.5, 1. ];
var _applyPuffPositionZs = [
    [ 0, 0, 0, 0 ],
    [ 0, 1, 1, 0 ],
    [ 0, 1, 1, 0 ],
    [ 0, 0, 0, 0 ]
];

LBSailSim.WaterShader.prototype._applyPuff = function(puff, puffIndex) {
    var puffMesh = this.puffMeshesInUse[puffIndex];
    if (!puffMesh) {
        puffMesh = this.puffMeshPool.get();
        this.puffMeshesInUse.push(puffMesh);
        puffMesh.visible = true;
    }
    var geometry = puffMesh.geometry;
    
    // Now we need to adjust the mesh's vertices to match the puff.
    // There are 16 vertices. All but the four inner ones have y = 0.
    var positionAttribute = geometry.getAttribute('position');
    var positions = positionAttribute.array;
    
    var shadingAttribute = this.getShadingAttribute(geometry);
    var shadings = shadingAttribute.array;
    
    var coordMapping = this.water3D.scene3D.coordMapping;
    var positionIndex = 0;
    
    // In theory we could get the actual puff speed, but why bother?
    var puffSpeed = LBMath.clamp(puff.speedLeading * puff.speedAttenuationForTime, 0, this.maxPuffsSpeed);
    var zScale = this.maxPuffsHeight;
    
    for (var i = 0; i < 4; ++i) {
        var u = _applyPuffPositionUs[i];
        var zs = _applyPuffPositionZs[i];
        for (var j = 0; j < 4; ++j) {
            var zFactor = zs[j];
            var v = _applyPuffPositionVs[j];
            var z = zFactor * zScale;
            positionIndex = LBSailSim.WaterShader._applyPuffPosition(coordMapping, puff, u, v, z, positions, positionIndex);
            
            shadings[i * 4 + j] = 1. - 0.75 * zFactor * puffSpeed / this.maxPuffsSpeed;
        }
    }

    positionAttribute.needsUpdate = true;
    shadingAttribute.needsUpdate = true;
    
    geometry.computeVertexNormals();
    if (geometry.boundingBox) {
        geometry.computeBoundingBox();
    }
    if (geometry.boundingSphere) {
        geometry.computeBoundingSphere();
    }
};

LBSailSim.WaterShader._applyPuffPosition = function(coordMapping, puff, u, v, z, positions, positionIndex) {
    _applyPuffVector3 = puff.getPointInPuff(u, v, _applyPuffVector3);
    _applyPuffVector3.z = z;
    _applyPuffPosition = _applyPuffVector3.toArray(_applyPuffPosition, 0);
    coordMapping.xyzToThreeJS(_applyPuffPosition, 0, positions, positionIndex);
    return positionIndex + 3;
};

LBSailSim.WaterShader.prototype._updatePuffs = function() {
    var me = this;
    var puffIndex = 0;
    this.water3D.sailEnv.wind.forEachPuff(function(puff) {
        me._applyPuff(puff, puffIndex++);
    });
    
    while (this.puffMeshesInUse.length > puffIndex) {
        var index = this.puffMeshesInUse.length - 1;
        var puffMesh = this.puffMeshesInUse[index];
        puffMesh.visible = false;
        this.puffMeshPool.release(puffMesh);
        
        --this.puffMeshesInUse.length;
    }
};
    
LBSailSim.WaterShader.prototype.update = function() {
    // Slow down the water a bit.
    this.material.uniforms.time.value += 1.0 / 120.0;
    this.wakesMaterial.uniforms.time.value = this.material.uniforms.time.value;
    this.puffsMaterial.uniforms.time.value = this.material.uniforms.time.value;

    this.updateTextureMatrix();

    this._updatePuffs();
};

var _workingView = new THREE.Vector3();
var _workingTarget = new THREE.Vector3();

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

    var view = _workingView.copy(this.mirrorWorldPosition).sub( this.cameraWorldPosition );
    view.reflect( this.normal ).negate();
    view.add( this.mirrorWorldPosition );

    this.rotationMatrix.extractRotation( this.camera.matrixWorld );

    this.lookAtPosition.set( 0, 0, - 1 );
    this.lookAtPosition.applyMatrix4( this.rotationMatrix );
    this.lookAtPosition.add( this.cameraWorldPosition );

    var target = _workingTarget.copy(this.mirrorWorldPosition).sub( this.lookAtPosition );
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

    this.eye.set(0,0,0);
    this.eye.setFromMatrixPosition( this.camera.matrixWorld );
};

return LBSailSim;
});