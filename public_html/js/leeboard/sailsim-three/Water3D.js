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
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: waterNormals,
            alpha: 	1.0,
            sunDirection: this.scene3D.mainLight.position.clone().normalize(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
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
    
    getWakeShimmeringAttribute: function(geometry) {
        if (this.waterShader) {
            return geometry.getAttribute('shimmering');
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
 * This was originally based on ThreeJS' examples/js/WaterShader.js.
 * <p>
 * We don't render the mirror image directly anymore, primarily because it was unacceptably
 * slow on a 2017 iPad. Instead, we use a shade of gray as the reflection color (clouds!).
 * <p>
 * Another mod is being able to control the light level via a shading vertex attribute.
 * This is used by the wakes and puffs to lighten or darken their rendering of the water
 * surface.
 * <p>
 * Yet another mod is being able to incorporate the normals from the mesh into the
 * surface normal used by the fragment shader. Normally the shader obtains the normal
 * from a time shifted sampling of values from the normal sampler's texture, with the support
 * for mesh normals a scaled version of the mesh normal is added to the 'noise' normal.
 * <p>
 * Puffs are modeled with meshes that are slightly raised from the surface towards their
 * centers so they always appear on top of the water. They use the same shader as the
 * surface shader.
 * <p>
 * Puffs control their appearance via the shading attribute, they're basically shading on
 * the water surface.
 * <p>
 * Wakes are also modeled as meshes. They too use the same shader code, though they have
 * their own instance since they use the ability to add the mesh normals to the surface normals.
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

    options = options || {};

    this.alpha = optionalParameter( options.alpha, 1.0 );
    this.time = optionalParameter( options.time, 0.0 );
    this.normalSampler = optionalParameter( options.waterNormals, null );
    this.sunDirection = optionalParameter( options.sunDirection, new THREE.Vector3( 0.70707, 0.70707, 0.0 ) );
    this.sunColor = new THREE.Color( optionalParameter( options.sunColor, 0xffffff ) );
    this.waterColor = new THREE.Color( optionalParameter( options.waterColor, 0x7F7F7F ) );
    this.eye = optionalParameter( options.eye, new THREE.Vector3( 0, 0, 0 ) );
    this.side = optionalParameter( options.side, THREE.FrontSide );
    this.fog = optionalParameter( options.fog, false );

    this.scene = scene;

    if ( camera instanceof THREE.PerspectiveCamera ) {        

            this.camera = camera;

    } else {

            this.camera = new THREE.PerspectiveCamera();
            console.log( this.name + ': camera is not a Perspective Camera!' );

    }

    var surfaceShader = this.getSurfaceShader();
    var surfaceUniforms = THREE.UniformsUtils.clone( surfaceShader.uniforms );

    this.material = this.createShaderMaterial(surfaceShader, surfaceUniforms);
    this.puffsMaterial = this.material;
    
    this.wakesMaterial = this.createShaderMaterial(surfaceShader);
    // Can't use true normals unless we have more than 2 segments across the wake mesh.
    //this.wakesMaterial.uniforms.trueNormalFactor.value = 0.25;
    this.water3D.wakesMaterial = this.wakesMaterial;

    this.maxPuffsHeight = 0.05;
    
    // This is used to limit the rendering of the puff strength, speeds greater than this
    // are rendered as this.
    this.maxPuffsSpeed = 15;
    
    // Below this we won't bother with the puff.
    this.minPuffsSpeed = 0.5;

    var me = this;
    this.puffMeshPool = new LBUtil.Pool(function() {
        return me.createPuffMesh();
    });
    this.puffMeshesInUse = [];
    
    
    this.eye = this.material.uniforms.eye.value;
    this.puffsMaterial.uniforms.eye.value = this.eye;
    this.wakesMaterial.uniforms.eye.value = this.eye;
    
    this.update();
};

LBSailSim.WaterShader.prototype = Object.create(THREE.Object3D.prototype);
LBSailSim.WaterShader.prototype.constructor = LBSailSim.WaterShader;


LBSailSim.WaterShader.prototype.createShaderMaterial = function(surfaceShader, surfaceUniforms) {
    surfaceUniforms = surfaceUniforms || THREE.UniformsUtils.clone( surfaceShader.uniforms );
    
    var material = new THREE.ShaderMaterial( {
            fragmentShader: surfaceShader.fragmentShader,
            vertexShader: surfaceShader.vertexShader,
            uniforms: surfaceUniforms,
            transparent: true,
            side: this.side,
            fog: this.fog
    } );

    var uniforms = material.uniforms;
    uniforms.alpha.value = this.alpha;
    uniforms.time.value = this.time;
    uniforms.normalSampler.value = this.normalSampler;
    uniforms.sunColor.value = this.sunColor;
    uniforms.waterColor.value = this.waterColor;
    uniforms.sunDirection.value = this.sunDirection;

    uniforms.eye.value = this.eye;
    return material;
};

LBSailSim.WaterShader.prototype.setupGeometryForShader = function(geometry) {
    var shadings = new Float32Array(geometry.attributes.position.count);
    shadings.fill(1.);
    geometry.addAttribute('shading', new THREE.BufferAttribute(shadings, 1));

    var shimmerings = new Float32Array(geometry.attributes.position.count);
    shimmerings.fill(1.);
    geometry.addAttribute('shimmering', new THREE.BufferAttribute(shimmerings, 1));
};

LBSailSim.WaterShader.prototype.getShadingAttribute = function(geometry) {
    return geometry.getAttribute('shading');
};

LBSailSim.WaterShader.prototype.getShimmeringAttribute = function(geometry) {
    return geometry.getAttribute('shimmering');
};

LBSailSim.WaterShader.prototype.getSurfaceShader = function() {
    return {
            uniforms: this.getSurfaceUniforms(),
            vertexShader: this.getSurfaceVertexShader(),
            fragmentShader: this.getSurfaceFragmentShader()
        };
};

LBSailSim.WaterShader.prototype.getSurfaceUniforms = function() {
    return THREE.UniformsUtils.merge( [
            THREE.UniformsLib[ 'fog' ],
            {
                trueNormalFactor: { value: 0 },
                //reflectionColor: { value: new THREE.Color(0xaaaaaa) },
                reflectionColor: { value: new THREE.Color(0x909090) },

                normalSampler: { value: null },
                alpha: { value: 1.0 },
                time: { value: 0.0 },
                sunColor: { value: new THREE.Color( 0x7F7F7F ) },
                sunDirection: { value: new THREE.Vector3( 0.70707, 0.70707, 0 ) },
                eye: { value: new THREE.Vector3() },
                waterColor: { value: new THREE.Color( 0x555555 ) }
            }
        ] );
};

LBSailSim.WaterShader.prototype.getSurfaceVertexShader = function() {
    return [
            'varying vec2 uvCoord;',
            'varying vec3 vNormal;',
            'varying vec3 vViewNormal;',
            
            'attribute float shading;',
            'varying float vShading;',
            
            'attribute float shimmering;',
            'varying float vShimmering;',

            'varying vec3 worldPosition;',

            THREE.ShaderChunk[ 'fog_pars_vertex' ],

            'void main() {',

            '   uvCoord = uv;',
            '   vShading = shading;',
            '   vShimmering = shimmering;',

            '   worldPosition = (modelMatrix * vec4( position, 1.0 )).xyz;',

            '   vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );',
            '   gl_Position = projectionMatrix * mvPosition;',

            '   vViewNormal = normalize(normalMatrix * normal);',
            '   vNormal = normalize((modelMatrix * vec4(normal, 1.0)).xyz);',

                        THREE.ShaderChunk[ 'fog_vertex' ],

            '}'
        ].join( '\n' );
};

LBSailSim.WaterShader.prototype.getSurfaceFragmentShader = function() {
    return [
            'precision highp float;',

            'uniform float trueNormalFactor;',
            'varying vec2 uvCoord;',
            'varying vec3 vNormal;',
            'varying vec3 vViewNormal;',
            'varying float vShading;',
            'varying float vShimmering;',

            'uniform vec3 reflectionColor;',

            'uniform float alpha;',
            'uniform float time;',
            'uniform sampler2D normalSampler;',
            'uniform vec3 sunColor;',
            'uniform vec3 sunDirection;',
            'uniform vec3 eye;',
            'uniform vec3 waterColor;',

            'varying vec3 worldPosition;',

            'vec4 getNormal( vec2 uv) {',
            '   vec4 normal = texture2D( normalSampler, uv);',
            '   vec3 trueNormal = vec3(vViewNormal.x, vViewNormal.y - 1., vViewNormal.z);',
            '   normal += vec4(trueNormal * trueNormalFactor, 0.);',
            '   return normal;',
            '}',

            'vec4 getNoise( vec2 uv ) {',
            '   vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);',
            '   vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );',
            '   vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );',
            '   vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );',

            // uv2 seems to impart a wind blowing effect.
            'uv2 *= 0.01;',

            '   vec4 noise = getNormal( uv0 ) +',
            '           getNormal( uv1 ) +',
            '           getNormal( uv2 ) +',
            '           getNormal( uv3 );',
            '   return noise * 0.5 * vShimmering - 1.0;',
            '}',

            'void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {',
            // Phong
            '   vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );',
            '   float direction = max( 0.0, dot( eyeDirection, reflection ) );',
            '   specularColor += pow( direction, shiny ) * sunColor * spec;',
            // Lambert
            '   diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;',
            '}',

            THREE.ShaderChunk[ 'common' ],
            THREE.ShaderChunk[ 'fog_pars_fragment' ],

            'void main() {',
            // noise/surfaceNormal adds shimmer to the water The noise is really the surface normal
            // to be used, in view space. The multiplication by vec3(1.5, 1.0, 1.5) appears to be
            // a scaling operation.
            '   vec4 noise = getNoise( worldPosition.xz );',
            '   vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',

            '   vec3 diffuseLight = vec3(0.0);',
            '   vec3 specularLight = vec3(0.0);',

            '   vec3 worldToEye = eye-worldPosition;',
            '   vec3 eyeDirection = normalize( worldToEye );',
            '   sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );',

            //'   float distance = length(worldToEye);',

            // distortion is what makes the reflection wavy and move around.
            // NOTE: With the current setup, the mirror sampler returns the same value for everything,
            // so distortion has no effect.
            //'	vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;',

            //'   vec4 fullSample = texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.z + distortion );',
            //'	vec3 reflectionSample = fullSample.rgb;',
            '   vec3 reflectionSample = reflectionColor;',

            // This little snippet is to try to spread out the reflection a bit.
            //'   float delta = 0.2;',
            //'   vec3 avgReflectionSample = texture2D(mirrorSampler, (mirrorCoord.xy + vec2(delta,0.0)) / mirrorCoord.z + distortion).rgb',
            //'           + texture2D(mirrorSampler, (mirrorCoord.xy + vec2(0.,delta)) / mirrorCoord.z + distortion).rgb',
            //'           + texture2D(mirrorSampler, (mirrorCoord.xy + vec2(0.,-delta)) / mirrorCoord.z + distortion).rgb',
            //'           + texture2D(mirrorSampler, (mirrorCoord.xy + vec2(-delta, 0.)) / mirrorCoord.z + distortion).rgb;',
            //'   reflectionSample = (reflectionSample + avgReflectionSample / 4.) * 0.4;',

            '   float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );',
            '   float rf0 = 0.3;',
            '   float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );',
            '   vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',

            '   float a = alpha;',
            '   reflectionSample *= vShading;',
            '   diffuseLight *= vShading;',

            '   vec3 albedo = mix( sunColor * diffuseLight * 0.3 + scatter, ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance );',
            '   vec3 outgoingLight = albedo;',
            '   gl_FragColor = vec4( outgoingLight, a );',

// The easy way to test values, set the color of gl_FragColor to it...
//'vec3 testNormal = surfaceNormal;',
//'testNormal = vViewNormal;',
//'testNormal = noise.xyz;',
//'testNormal = texture2D( normalSampler, worldPosition.xz ).xyz;',
//'testNormal = normalize(testNormal);',
//'float testVal = 0.5 + testNormal.x * 0.5;',
//'testVal = 0.5 + vShading * 0.5;',
//'float testVal = vShimmering;',
//'gl_FragColor = vec4(testVal, testVal, testVal, 1.);',
                    
            THREE.ShaderChunk[ 'fog_fragment' ],

            '}'
        ].join( '\n' );
};


LBSailSim.WaterShader.prototype.createPuffMesh = function() {
    var geometry = new THREE.PlaneBufferGeometry(1, 1, 3, 3);
    this.setupGeometryForShader(geometry);

    // Force our normals to all be pointing straight up so we don't muck around
    // with any normals based adjustments in the shader.
    var normals = geometry.attributes.normal.array;
    var count = normals.length / 3;
    var index = 0;
    for (var i = 0; i < count; ++i) {
        normals[index++] = 0;
        normals[index++] = 1;
        normals[index++] = 0;
    }
    geometry.attributes.normal.needsUpdate = true;
    
    var mesh = new THREE.Mesh(geometry, this.puffsMaterial);
    this.scene.add(mesh);
    return mesh;
};


var _applyPuffVector3;
var _applyPuffPosition = [];
var _applyPuffPositionUs = [ 0, 0.25, 0.75, 1. ];
var _applyPuffPositionVs = [ 0, 0.15, 0.5, 1. ];
var _applyPuffPositionZs = [
    [ 0, 0, 0, 0 ],
    [ 0, 1, 1, 0 ],
    [ 0, 1, 1, 0 ],
    [ 0, 0, 0, 0 ]
];

LBSailSim.WaterShader.prototype._applyPuff = function(puff, puffIndex) {
    // In theory we could get the actual puff speed, but why bother?
    var puffSpeed = LBMath.clamp(puff.speedLeading * puff.speedAttenuationForTime, 0, this.maxPuffsSpeed);
    if (puffSpeed < this.minPuffsSpeed) {
        return;
    }

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

    this.updateMatrixWorld();
    this.camera.updateMatrixWorld();

    this.eye.set(0,0,0);
    this.eye.setFromMatrixPosition( this.camera.matrixWorld );
    
    this._updatePuffs();
};


return LBSailSim;
});