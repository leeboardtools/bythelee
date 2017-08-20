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

/* global LBPhaser, LBCamera, LBGeometry, Phaser, LBUtil, LBMath */

/**
 * This is a hack projection of 3D objects onto the Phaser 2D surface using
 * a {@link Phaser.Graphics} object.
 * <p>
 * This maintains a z-buffer of sorts, with panels defined in 3D space added for
 * display. The panels can be filled and/or framed.
 * @constructor
 * @param {LBPhaser.PhaserEnv} env  The Phaser environment
 * @param {Phaser.Group} [group]    Optional group to which the projection display object
 * will be attached.
 * @param {LBCamera.Camer} [camera] If defined the camera to use, otherwise a camera pointing
 * down along the z-axis will be configured.
 * @returns {LBPhaser.Project3D}
 */
LBPhaser.Project3D = function(env, group, camera) {
    this.env = env;

    this.graphics = env.game.add.graphics(0, 0, group);
    
    if (camera) {
        this.camera = camera;
    }
    else {
        this.camera = new LBCamera.PerspectiveCamera();
        
        var width = Math.abs(env.fromPixelsX(env.game.width));
        var height = Math.abs(env.fromPixelsY(env.game.height));
        var distance = height / 2 / Math.tan(this.camera.fov * LBMath.DEG_TO_RAD / 2);
        this.camera.position.z = distance;
        this.camera.far = distance;
        this.camera.aspect = width / height;
        this.camera.lookAt(LBGeometry.ORIGIN);
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * This matrix transforms from the world coordinate space to the projected camera space.
     */
    this.matrixWorldToProjection = new LBGeometry.Matrix4();
    
    /**
     * Array containing the z values for each panel in {@link LBPhaser.Project3D.zPanels}.
     * We do a simple binary search of this array to find the index where a panel should
     * be inserted.
     */
    this.zValues = [];
    
    /**
     * Array containing the information for each panel, there is a 1-to-1 correspondence
     * with the z values in {@link LBPhaser.Project3D.zValues}.
     */
    this.zPanels = [];
};

LBPhaser.Project3D._workingVector3 = new LBGeometry.Vector3();
LBPhaser.Project3D.prototype = {
    /**
     * Call to start adding panels for projection. This clears any previous panels.
     * @returns {undefined}
     */
    start: function() {
        this.camera.updateMatrixWorld(true);
        this.matrixWorldToProjection.copy(this.camera.projectionMatrix);
        this.matrixWorldToProjection.multiply(this.camera.matrixWorldInverse);
        
        this.graphics.clear();
        this.graphics.currentPath = null;
        
        this.graphics.position.set(
                this.env.toPixelsX(this.camera.position.x),
                this.env.toPixelsY(this.camera.position.y));
        this.graphics.updateTransform();
        
        this.zValues.length = 0;
        this.zPanels.length = 0;
        
        this.toPixelsX = this.env.game.width / 2;
        this.toPixelsY = this.env.game.height * this.env.ySign / 2;
    },
    
    /**
     * Adds a panel for projection. Note that panels are presumed to be flat.
     * <p>
     * Panel vertices should be ordered counter-clockwise when looking at the panel
     * from the outside.
     * @param {Number} [frameColor]   If defined the color for the frame, otherwise the frame is not drawn.
     * @param {Number} [lineWidth]  The width of the line for the frame, if undefined then the
     * default for {@link Phaser.Graphics#lineStyle} will be used.
     * @param {Boolean} [closeFrame=false]  If true and the frame is being drawn, this ensures that a final
     * line from the last vertex to the first vertex is drawn, closing the frame.
     * @param {Number} [fillColor]  If defined the color to fill with, otherwise the panel is not filled.
     * @param {Number} [alpha=1]    If defined the alpha value for the frame and fill, otherwise
     * the defaults for {@link Phaser.Graphics} will be used.
     * @param {LBGeometry.Vector3[]} vertices   The array of vertices.
     * @param {Number[]} [indices]  Optional array of the indices of the points in vertices to use for drawing,
     * otherwise vertices is presumed to be in the desired order of the vertices.
     * @param {LBGeometry.Matrix4} [toWorldXfrm]    If defined the transform used to convert
     * the vertices to world coordinates.
     * @param {Boolean} [doubleSided=false] If true the panel is treated as having two
     * sides.
     * @returns {LBPhaser.Project3D}    this.
     */
    addPanel: function(frameColor, lineWidth, closeFrame, fillColor, alpha, vertices, indices, toWorldXfrm, doubleSided) {
        if (Number.isNaN(frameColor)) {
            frameColor = undefined;
        }
        if (Number.isNaN(fillColor)) {
            fillColor = undefined;
        }
        if ((frameColor === undefined) && (fillColor === undefined)) {
            return this;
        }
        if (!vertices.length || (indices && !indices.length)) {
            return this;
        }
        
        var panel = {};
        panel.frameColor = frameColor;
        panel.lineWidth = (frameColor !== undefined) ? lineWidth : 0;
        panel.fillColor = fillColor;
        panel.alpha = alpha;
        panel.doubleSided = doubleSided;
        panel.pathVertices = [];
        panel.zSum = 0;
        
        var vertexCount;        
        if (indices) {
            vertexCount = indices.length;
            for (var i = 0; i < vertexCount; ++i) {
                if (!this._addVertexToPanel(panel, vertices[indices[i]], toWorldXfrm)) {
                    return this;
                }
            }
        }
        else {
            vertexCount = vertices.length;
            for (var i = 0; i < vertexCount; ++i) {
                if (!this._addVertexToPanel(panel, vertices[i], toWorldXfrm)) {
                    return this;
                }
            }
        }
        
        if (!vertexCount) {
            return this;
        }
        
        if (frameColor !== undefined) {
            panel.frameVertices = panel.pathVertices;
            panel.closeFrame = closeFrame;
        }
        
        var z = panel.zSum / vertexCount;
        this._addPanelToZBuffer(z, panel);
        
        return this;
    },
    
    _addVertexToPanel: function(panel, vertex, toWorldXfrm) {
        var pos = LBPhaser.Project3D._workingVector3.copy(vertex);
        if (toWorldXfrm) {
            pos.applyMatrix4(toWorldXfrm);
        }
        pos.applyMatrix4(this.matrixWorldToProjection);
        pos.set(pos.x * this.toPixelsX, pos.y * this.toPixelsY, pos.z);
        
        // If we're the third vertex, check if panel is facing the correct direction.
        if (!panel.doubleSided && (panel.pathVertices.length === 2)) {
            var x0_1 = panel.pathVertices[0].x - panel.pathVertices[1].x;
            var y0_1 = panel.pathVertices[0].y - panel.pathVertices[1].y;
            var x2_1 = pos.x - panel.pathVertices[1].x;
            var y2_1 = pos.y - panel.pathVertices[1].y;
            var zDir = x2_1 * y0_1 - y2_1 * x0_1;
            if (zDir > 0) {
                // The camera is in the negative Z direction...
                return false;
            }
        }
        
        panel.pathVertices.push(new Phaser.Point(pos.x, pos.y));
        panel.zSum += pos.z;
        return true;
    },
    
    _addPanelToZBuffer: function(z, panel) {
        z = -z; // Use negative z because we want to process the panels from largest z to smallest z (smaller is closer to camera)
        var index = LBUtil.bsearch(this.zValues, z) + 1;
        this.zValues.splice(index, 0, z);
        this.zPanels.splice(index, 0, panel);
    },
    
    /**
     * Call once all the panels have been added to set up the {@link Phaser.Graphics} object.
     * @returns {undefined}
     */
    end: function() {
        // Generate the graphics...
        var graphics = this.graphics;
        this.zPanels.forEach(function(panel) {
            if (panel.fillColor !== undefined) {
                graphics.beginFill(panel.fillColor, panel.alpha);
                graphics.drawPolygon(panel.pathVertices);
                graphics.endFill();
            }

            if (panel.frameColor !== undefined) {
                graphics.lineStyle(panel.lineWidth, panel.frameColor, panel.alpha);
                graphics.moveTo(panel.frameVertices[0].x, panel.frameVertices[0].y);
                for (var i = 1; i < panel.frameVertices.length; ++i) {
                    graphics.lineTo(panel.frameVertices[i].x, panel.frameVertices[i].y);
                }
                if (panel.closeFrame) {
                    graphics.lineTo(panel.frameVertices[0].x, panel.frameVertices[0].y);
                }
                
                // This effectively stops the line drawing...
                graphics.lineStyle(0);
            }            
        });
    },
    
    /**
     * Call when done with the object, this releases references to all other objects.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
            this.env = null;
            this.camera = null;
            this.matrixWorldToProjection = null;
            this.zValues = null;
            this.zPanels = null;
        }
    },
    
    constructor: LBPhaser.Project3D
};


/**
 * Helper class that holds a group of panels that share the same drawing properties 
 * such as colors.
 * @constructor
 * @param {LBGeometry.Vector3[]} [vertices] If defined an array of vertices for the
 * first panel.
 * @param {Number[]} [indices]  If defined the indices of the points in vertices forming
 * the panel.
 * @returns {LBPhaser.Project3DPanels}
 */
LBPhaser.Project3DPanels = function(vertices, indices) {
    this.panelsVertices = [];
    if (vertices) {
        this.addPanelVertices(vertices, indices);
    }
};

LBPhaser.Project3DPanels.prototype = {
    /**
     * Loads the basic settings (no panel vertices) from properties in a data object.
     * @param {Object} data The data object to load from.
     * @returns {LBPhaser.Project3DPanels}  this.
     */
    loadBasic: function(data) {
        this.frameColor = LBGeometry.Color.colorValueFromData(data.frameColor, this.frameColor);
        this.lineWidth = data.lineWidth || 1;
        this.closeFrame = data.closeFrame;
        this.alpha = data.alpha !== undefined ? data.alpha : 1;
        this.fillColor = LBGeometry.Color.colorValueFromData(data.fillColor, this.fillColor);
        this.doubleSided = data.doubleSided;
        
        return this;
    },
    
    /**
     * Adds a set of vertices defining a pnael.
     * @param {LBGeometry.Vector3[]} vertices   The array of vertices for the panel.
     * @param {Number[]} [indices]  If defined the indices of the points in vertices
     * defining the panel's vertices, otherwise vertices directly defines the panel's
     * vertices.
     * @returns {LBPhaser.Project3DPanels}  this.
     */
    addPanelVertices: function(vertices, indices) {
        var panelVertices;
        if (indices) {
            panelVertices = [];
            for (var i = 0; i < indices.length; ++i) {
                panelVertices.push(vertices[indices[i]]);
            }
        }
        else {
            panelVertices = vertices.slice();
        }
        this.panelsVertices.push(panelVertices);
        
        return this;
    },
    
    /**
     * Projects the panels using a {@link LBPhaser.Project3D}. {@link LBPhaser.Project3D#start}
     * should already have been called.
     * @param {LBPhaser.Project3D} project3D    The projection object.
     * @param {LBGeometry.Matrix4} [toWorldXfrm]    Optional transform matrix to transform the
     * panel vertex coordinates to world coordinates.
     * @returns {LBPhaser.Project3DPanels}  this.
     */
    project: function(project3D, toWorldXfrm) {
        toWorldXfrm = toWorldXfrm || this.toWorldXfrm;
        for (var i = 0; i < this.panelsVertices.length; ++i) {
            project3D.addPanel(this.frameColor, this.lineWidth, this.closeFrame, this.fillColor, this.alpha, 
                    this.panelsVertices[i], undefined, toWorldXfrm, this.doubleSided);
        }
        
        return this;
    },

    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.panelVertices) {
            this.panelVertices.length = 0;
            this.panelVertices = null;
        }
    },
    
    constructor: LBPhaser.Project3DPanels
};


/**
 * Creates a {@link LBPhaser.Project3DPanels} and loads the panels from an object containing
 * indices of faces in volumes.
 * @param {LBVolume.Volume[]} volumes   The array of volumes.
 * @param {Object} data The object containing the load information. The following properties
 * are supported:
 *  <li>frameColor: Number | Hex String
 *  <li>lineWidth: Number
 *  <li>closeFrame: Boolean
 *  <li>alpha: Number
 *  <li>fillColor: Number | Hex String
 *  <li>volFaces: Array of number pairs, with the first value of each pair the index of the volume
 *  in volumes and the second value the index of the face of the volume as returned
 *  by {@link LBVolume.Volume#faces}.
 * @returns {LBPhaser.Project3D.createPanelsFromVolumesData.projectPanels|LBPhaser.Project3DPanels}
 */
LBPhaser.Project3D.createPanelsFromVolumesData = function(volumes, data) {
    var projectPanels = new LBPhaser.Project3DPanels();
    projectPanels.loadBasic(data);
    
    var volFaces = data.volFaces;
    for (var i = 0; i < volFaces.length; i += 2) {
        var volIndex = volFaces[i];
        var faceIndex = volFaces[i + 1];
        
        var volume = volumes[volIndex];
        if (faceIndex === -1) {
            // Use all the faces of the volume.
            volume.getFaces().forEach(function(face) {
                projectPanels.addPanelVertices(volume.vertices, face);
            });
        }
        else {
            var face = volume.getFaces()[faceIndex];
            projectPanels.addPanelVertices(volume.vertices, face);
        }
    }
    
    return projectPanels;
};

/**
 * Creates an array of {@link LBPhaser.Project3DPanels} based upon properties in a data
 * object and an array of volumes.
 * <p>
 * The main purpose for supporting an array of {@link LBPhaser.Project3DPanels} is to support
 * having different drawing properties for different faces of a group of volumes.
 * @param {LBVolume.Volume[]} volumes   The array of volumes.
 * @param {Array} data  An array of objects that can be passed to {@link LBPhaser.Project3D.createPanelsFromVolumesData}.
 * @returns {LBPhaser.Project3DPanels[]}    The array of panels.
 */
LBPhaser.Project3D.loadVolumePanels = function(volumes, data) {
    var panels = [];
    for (var i = 0; i < data.length; ++i) {
        var panel = LBPhaser.Project3D.createPanelsFromVolumesData(volumes, data[i]);
        if (panel) {
            panels.push(panel);
        }
    }
    
    /*
    // TEST!!!
    panels.length = 0;
    var x = 2;
    var y = 1;
    var vertices = [
        new LBGeometry.Vector3(-x, -y, 0),
        new LBGeometry.Vector3(x, -y, 0),
        new LBGeometry.Vector3(x, y, 0),
        new LBGeometry.Vector3(-x, y, 0),
        new LBGeometry.Vector3(-x, -y, 1),
        new LBGeometry.Vector3(x, -y, 1),
        new LBGeometry.Vector3(x, y, 1),
        new LBGeometry.Vector3(-x, y, 1)
    ];
    
    var panel = new LBPhaser.Project3DPanels();
    panels.push(panel);
    panel.frameColor = 0;
    panel.fillColor = 0;
    panel.lineWidth = 1;
    panel.closeFrame = true;
//    panel.addPanelVertices(vertices, [4, 5, 6, 7]);
    panel.addPanelVertices(vertices, [0, 3, 2, 1]);
//    panel.addPanelVertices(vertices, [0, 1, 4, 5]);
//    panel.addPanelVertices(vertices, [1, 2, 6, 5]);
//    panel.addPanelVertices(vertices, [2, 3, 7, 6]);
//    panel.addPanelVertices(vertices, [3, 0, 4, 7]);
    */

    return panels;
};

/**
 * Helper that calls {@link LBPhaser.Project3DPanels#project} for each object in an
 * array of objects.
 * @param {LBPhaser.Project3D} [project3D]    The projection object, if undefined nothing is done.
 * @param {LBPhaser.Project3DPanels[]} [panelsArray]   The array panels objects to be
 * project, may be undefined.
 * @param {LBGeometry.Matrix4} [toWorldXfrm]    Optional transform matrix to transform the
 * panel vertex coordinates to world coordinates.
 * @returns {undefined}
 */
LBPhaser.Project3D.projectPanelsArray = function(project3D, panelsArray, toWorldXfrm) {
    if (!project3D || !panelsArray) {
        return;
    }
    
    panelsArray.forEach(function(panels) {
        panels.project(project3D, toWorldXfrm);
    });
};

/**
 * Helper that calls {@link LBPhaser.Project3DPanels#destroy} for each object in an
 * array of objects.
 * @param {LBPhaser.Project3DPanels[]} [panelsArray]   The array panels objects to be destroyed,
 * may be undefined.
 * @returns {undefined}
 */
LBPhaser.Project3D.destroyPanelsArray = function(panelsArray) {
    if (panelsArray) {
        panelsArray.forEach(function(panels) {
            panels.destroy();
        });
    }
};