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


define(['lbsailsim', 'lbmath', 'three'],
function(LBSailSim, LBMath, THREE) {

LBSailSim.Water3D = function(scene3D, sailEnv) {
    this.scene3D = scene3D;
    this.sailEnv = sailEnv;
    
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
};

LBSailSim.Water3D.prototype = {
    createWaterTexture: function(gridDim) {
        gridDim = gridDim || 64;

        var data = new Float32Array(gridDim * gridDim * 4);
        var texture = new THREE.DataTexture(data, gridDim, gridDim, THREE.RGBAFormat, THREE.FloatType);
        
        var pixels = texture.image.data;
        var p = 0;
        for (var i = 0; i < gridDim; ++i) {
            for (var i = 0; i < gridDim; ++i) {
                pixels[p++] = 0;
                pixels[p++] = 0;
                pixels[p++] = 0;
                pixels[p++] = 1;
            }
        }
        
        texture.needsUpdate = true;
        return texture;
    },
    
    createWaterMaterial: function(totalDim, gridDim, materialColor) {
        totalDim = 1024;
        gridDim = gridDim || 64;
       
        materialColor = ((materialColor !== undefined) && (materialColor !== null)) ? materialColor : 0x004663;
        var material = new THREE.ShaderMaterial( {
                uniforms: THREE.UniformsUtils.merge( [
                        THREE.ShaderLib[ 'phong' ].uniforms,
                        {
                                heightmap: { value: null }
                        }
                ] ),
                vertexShader: waterVertexShader,
                fragmentShader: THREE.ShaderChunk[ 'meshphong_frag' ]

        } );

        material.lights = true;
        //material.wireframe = true;

        // Material attributes from MeshPhongMaterial
        material.color = new THREE.Color( materialColor );
        material.specular = new THREE.Color( 0x111111 );
        material.shininess = 5;
        material.opacity = 1;

        // Sets the uniforms with the material values
        material.uniforms.diffuse.value = material.color;
        material.uniforms.specular.value = material.specular;
        material.uniforms.shininess.value = Math.max( material.shininess, 1e-4 );
        material.uniforms.opacity.value = material.opacity;

        // Defines
        material.defines.WIDTH = gridDim.toFixed( 1 );
        material.defines.BOUNDS = totalDim.toFixed( 1 );
        
        return material;
    },
    
    update: function(dt) {
        
    },
    
    destroy: function() {
        
    },
    
    constructor: LBSailSim.Water3D
};


var waterVertexShader = [
    // Copied from ThreeJS examples/webgl_gpgpu_water.html
    'uniform sampler2D heightmap;',

    '#define PHONG',

    'varying vec3 vViewPosition;',

    '#ifndef FLAT_SHADED',

    '        varying vec3 vNormal;',

    '#endif',

    '#include <common>',
    '#include <uv_pars_vertex>',
    '#include <uv2_pars_vertex>',
    '#include <displacementmap_pars_vertex>',
    '#include <envmap_pars_vertex>',
    '#include <color_pars_vertex>',
    '#include <morphtarget_pars_vertex>',
    '#include <skinning_pars_vertex>',
    '#include <shadowmap_pars_vertex>',
    '#include <logdepthbuf_pars_vertex>',
    '#include <clipping_planes_pars_vertex>',

    'void main() {',

    '        vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );',

    '        #include <uv_vertex>',
    '        #include <uv2_vertex>',
    '        #include <color_vertex>',

            // # include <beginnormal_vertex>
            // Compute normal from heightmap
    '        vec3 objectNormal = vec3(',
    '                ( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,',
    '                ( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,',
    '                1.0 );',
            //<beginnormal_vertex>

    '        #include <morphnormal_vertex>',
    '        #include <skinbase_vertex>',
    '        #include <skinnormal_vertex>',
    '        #include <defaultnormal_vertex>',

    '#ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED',

    '        vNormal = normalize( transformedNormal );',

    '#endif',

            //# include <begin_vertex>
    '        float heightValue = texture2D( heightmap, uv ).x;',
    '        vec3 transformed = vec3( position.x, heightValue, position.z );',
            //<begin_vertex>

    '        #include <morphtarget_vertex>',
    '        #include <skinning_vertex>',
    '        #include <displacementmap_vertex>',
    '        #include <project_vertex>',
    '        #include <logdepthbuf_vertex>',
    '        #include <clipping_planes_vertex>',

    '        vViewPosition = - mvPosition.xyz;',

    '        #include <worldpos_vertex>',
    '        #include <envmap_vertex>',
    '        #include <shadowmap_vertex>',

    '}'
    
].join('\n');


return LBSailSim;
});