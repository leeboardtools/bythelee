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



define(['lbsailsim', 'lbmath', 'lbspherical', 'three', 'three-skyshader'],
function(LBSailSim, LBMath, LBSpherical, THREE) {
    

LBSailSim.Sky3D = function(scene3D, sailEnv) {
    this.scene3D = scene3D;
    this.sailEnv = sailEnv;

    this.scene3D.scene.fog = new THREE.FogExp2( 0xaabbbb, 0.001 );
    
    if (!this.loadSkyShader()) {
        this.loadSkyBox();
    }
};

var _sunPos;

LBSailSim.Sky3D.prototype = {
    loadSkyBox: function() {
        // Adapted from ThreeJS examples/canvas_geometry_panorama.html, webgl_shaders_ocean.html...
        var loader = new THREE.CubeTextureLoader();
        /*
        loader.setPath('textures/three-js/skybox/');
        this.skyTextureCube = loader.load([
            'px.jpg', 'nx.jpg',
            'py.jpg', 'ny.jpg',
            'pz.jpg', 'nz.jpg'
        ]);
        */
        loader.setPath('textures/skybox-blue/');
        this.skyTextureCube = loader.load([
            'px.png', 'nx.png',
            'py.png', 'ny.png',
            'pz.png', 'nz.png'
        ]);
        
        
        var cubeShader = THREE.ShaderLib[ 'cube' ];
        cubeShader.uniforms[ 'tCube' ].value = this.skyTextureCube;
        
        var skyBoxMaterial = new THREE.ShaderMaterial( {
                fragmentShader: cubeShader.fragmentShader,
                vertexShader: cubeShader.vertexShader,
                uniforms: cubeShader.uniforms,
                depthWrite: false,
                side: THREE.BackSide
        } );

        var skyBox = new THREE.Mesh(
                new THREE.BoxGeometry( 10000, 10000, 10000 ),
                skyBoxMaterial
        );

        this.skyMaterial = skyBoxMaterial;
        this.skyMesh = skyBox;

        this.scene3D.add( skyBox );
        
        return true;
    },
    
    loadSkyShader: function() {
        var radius = this.sailEnv.horizonDistance;
        this.sky = new THREE.Sky(radius);
        this.scene3D.add(this.sky.mesh);
        
        var uniforms = this.sky.uniforms;
        uniforms.turbidity.value = 10;
        uniforms.rayleigh.value = 2;
        uniforms.luminance.value = 1.;
        uniforms.mieCoefficient.value = 0.005;
        uniforms.mieDirectionalG.value = 0.8;
        this.sunCoords = new LBSpherical.CoordinatesRAE(radius);
        this.updateSunPos(30, 10);
        return true;
    },
    
    updateSunPos: function(azimuthDeg, elevationDeg) {
        this.sunCoords.azimuthDeg = azimuthDeg;
        this.sunCoords.elevationDeg = elevationDeg;
        
        _sunPos = this.sunCoords.toVector3(_sunPos);
        this.scene3D.coordMapping.vector3ToThreeJS(_sunPos, _sunPos);
        
        this.sky.uniforms.sunPosition.value.copy(_sunPos);
    },
    
    
    update: function(dt) {
        
    },
    
    destroy: function() {
        
    },
    
    constructor: LBSailSim.Sky3D
};

return LBSailSim;
});