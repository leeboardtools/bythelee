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


define(['lbsailsim', 'lbphaser'], 
function(LBSailSim, LBPhaser) {

    'use strict';


/**
 * Base class for the sailsim Phaser views.
 * @constructor
 * @extends LBPhaser.PhysicsView
 * @param {LBSailSim.Env} sailEnv   The sailing environment.
 * @param {Phaser.Group} worldGroup The parent group for all display objects.
 * @returns {LBSailSim.PhaserView}
 */
LBSailSim.PhaserView = function(sailEnv, worldGroup) {
    LBPhaser.PhysicsView.call(this, sailEnv.physicsLink, worldGroup);
    
    this.sailEnv = sailEnv;    
    
    var forceArrowScaler = function(length) {
        return 0.025 * length;
    };
    this.sailArrowStyle = new LBPhaser.ArrowStyle(0x00FF00, forceArrowScaler);
    this.foilArrowStyle = new LBPhaser.ArrowStyle(0x0088FF, forceArrowScaler);
    this.hullArrowStyle = new LBPhaser.ArrowStyle(0xFF0000, forceArrowScaler);
    
    var velocityArrowScaler = function(length) {
        return length * 1.2;
    };
    this.boatVelocityArrowStyle = new LBPhaser.ArrowStyle(0x008888, velocityArrowScaler, 0.5, 6);
    this.appWindVelocityArrowStyle = new LBPhaser.ArrowStyle(0x008800, velocityArrowScaler, 0.5, 12);
    
    this.sailEnv.addBoatCallback(this);
    
    this.sailEnv.physicsLink.addView(this);

};

LBSailSim.PhaserView.prototype = Object.create(LBPhaser.PhysicsView.prototype);
LBSailSim.PhaserView.prototype.constructor = LBSailSim.PhaserView;


/**
 * Changes whether or not the force arrows are displayed.
 * @param {Boolean} isVisible   If true the force arrows are displayed, otherwise they are hidden.
 * @returns {Boolean}   True if the force arrows were visible prior to this call.
 */
LBSailSim.PhaserView.prototype.setForceArrowsVisible = function(isVisible) {
    var wasVisible = this.areForceArrowsVisible();
    this.sailArrowStyle.isVisible = isVisible;
    this.foilArrowStyle.isVisible = isVisible;
    this.hullArrowStyle.isVisible = isVisible;
    return wasVisible;
};

/**
 * @returns {Boolean}   True if the force arrows are currently displayed.
 */
LBSailSim.PhaserView.prototype.areForceArrowsVisible = function() {
    return this.sailArrowStyle.isVisible;
};

/**
 * Changes whether or not the velocity arrows are displayed.
 * @param {Boolean} isVisible   If true the velocity arrows are displayed, otherwise they are hidden.
 * @returns {Boolean}   True if the velocity arrows were visible prior to this call.
 */
LBSailSim.PhaserView.prototype.setVelocityArrowsVisible = function(isVisible) {
    var wasVisible = this.areVelocityArrowsVisible();
    this.boatVelocityArrowStyle.isVisible = isVisible;
    this.appWindVelocityArrowStyle.isVisible = isVisible;
    return wasVisible;
};

/**
 * @returns {Boolean}   True if the velocity arrows are currently displayed.
 */
LBSailSim.PhaserView.prototype.areVelocityArrowsVisible = function() {
    return this.boatVelocityArrowStyle.isVisible;
};

/**
 * Called from {@link LBSailSim.SailEnv#checkoutBoat} after the boat has been loaded
 * and just before it is returned to the caller, this is where we add display objects
 * for this view.
 * @param {LBSailSim.Vessel} boat   The boat that's been checked out.
 * @param {Object} data The data object from which the boat was loaded.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype.onBoatCheckedOut = function(boat, data) {    
    // The hull is at the bottom...
    this._loadDisplayObjectForHull(boat);
    
    // Add the hydrofoils...
    boat.hydrofoils.forEach(this._loadDisplayObjectForHydrofoil, this);
    
    // Add the spars...
    boat.spars.forEach(this._loadDisplayObjectForSpar, this);
    
    // Add the airfoils...
    boat.airfoils.forEach(this._loadDisplayObjectForAirfoil, this);

    // Add the arrows...
    this._loadForceArrowHull(boat);
    boat.hydrofoils.forEach(this._loadForceArrowHydrofoil, this);
    boat.airfoils.forEach(this._loadForceArrowAirfoil, this);
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to handle loading the display
 * objects for the hull.
 * @param {LBSailSim.Vessel} boat   The boat to load for.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadDisplayObjectForHull = function(boat) {
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to handle loading the display
 * objects for a spar.
 * @param {LBPhysics.RigidBody} rigidBody    The spar to load for.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadDisplayObjectForSpar = function(rigidBody) {
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to handle loading the display
 * objects for a hydrofoil.
 * @param {LBSailSim.FoilInstance} rigidBody    The hydrofoil to load for.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadDisplayObjectForHydrofoil = function(rigidBody) {
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to handle loading the display
 * objects for an airfoil.
 * @param {LBSailSim.FoilInstance} rigidBody    The airfoil to load for.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadDisplayObjectForAirfoil = function(rigidBody) {
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to add the force arrow
 * for the hull.
 * @param {LBSailSim.Vessel} boat   The boat.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadForceArrowHull = function(boat) {
    var hullArrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, this.hullArrowStyle);
    this.setRigidBodyForceArrow(boat, hullArrow);

    boat.getForceArrowResultant = function(plane, bounds, secondaryPlane) {
        if (!boat.hullResultant) {
            return undefined;
        }
        var resultant = boat.hullResultant.clone();
        resultant.applPoint.z = 0;
        resultant.force.z = 0;
        resultant.moment.x = 0;
        resultant.moment.y = 0;
        return resultant.convertToWrench(plane, bounds, secondaryPlane);
        //return boat.hullResultant ? boat.hullResultant.convertToWrench(plane, bounds, secondaryPlane) : undefined;
    };

};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to add the force arrow
 * for a hydrofoil.
 * @param {LBSailSim.FoilInstance} rigidBody    The hydrofoil.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadForceArrowHydrofoil = function(rigidBody) {
    var arrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, this.foilArrowStyle);    
    this.setRigidBodyForceArrow(rigidBody, arrow);
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to add the force arrow
 * for an airfoil.
 * @param {LBSailSim.FoilInstance} rigidBody    The airfoil.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadForceArrowAirfoil = function(rigidBody) {
    var arrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, this.sailArrowStyle);    
    this.setRigidBodyForceArrow(rigidBody, arrow);    
};

/**
 * Called from {@link LBSailSim.SailEnv#boatReturned}, this disposes of any display
 * objects that were created for the boat.
 * @param {LBSailSim.Vessel} boat   The boat that was returned..
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype.onBoatReturned = function(boat) {
    this.destroyRigidBodyDisplayObject(boat);
    this.destroyRigidBodyForceArrow(boat);
    
    boat.hydrofoils.forEach(this._destroyDisplayObjectForHydrofoil, this);
    boat.airfoils.forEach(this._destroyDisplayObjectForAirfoil, this);

    boat.hydrofoils.forEach(this._destroyForceArrowHydrofoil, this);
    boat.airfoils.forEach(this._destroyForceArrowAirfoil, this);
};

LBSailSim.PhaserView.prototype._destroyDisplayObjectForHydrofoil = LBPhaser.PhysicsView.prototype.destroyRigidBodyDisplayObject;

LBSailSim.PhaserView.prototype._destroyDisplayObjectForAirfoil = LBPhaser.PhysicsView.prototype.destroyRigidBodyDisplayObject;

LBSailSim.PhaserView.prototype._destroyForceArrowHydrofoil  = LBPhaser.PhysicsView.prototype.destroyRigidBodyForceArrow;

LBSailSim.PhaserView.prototype._destroyForceArrowAirfoil  = LBPhaser.PhysicsView.prototype.destroyRigidBodyForceArrow;

LBSailSim.PhaserView.prototype._loadObj3DSprite = function(object, data) {
    if (!object || !object.obj3D || !data) {
        return undefined;
    }

    var sprite;
    var spriteData;
    var game = this.physicsLink.phaserEnv.game;
    if (data.phaser_sprite) {
        sprite = LBPhaser.PhysicsView.createSpriteFromData(game, data.phaser_sprite);
        spriteData = data.phaser_sprite;
    }
    else if (data.phaser_image) {
        sprite = LBPhaser.PhysicsView.createImageFromData(game, data.phaser_image);
        spriteData = data.phaser_image;
    }
    if (!sprite) {
        return undefined;
    }

    this.setRigidBodyDisplayObject(object, sprite);
    if (this.worldGroup) {
        this.worldGroup.add(sprite);
    }
    return sprite;
};

/**
 * Rigid body callback function assigned using {@link LBPhaser.PhysicsView#setBodyCallback}
 * and called after the rigid body display objects have been updated, this is where we handle
 * flipping the sail.
 * @param {LBPhysics.RigidBody} topRigidBody    The top-level rigid body.
 * @param {LBPhysics.RigidBody} rigidBody   The rigid body with the callback assigned to it.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype.onDisplayObjectsUpdated = function(topRigidBody, rigidBody) {
    var sprite = this.getRigidBodyDisplayObject(rigidBody);
    if (sprite) {
        if (rigidBody.foilDetails) {
            sprite.scale.y = (rigidBody.foilDetails.angleDeg * this.sailEnv.phaserEnv.ySign < 0) ? 1 : -1;
        }
    }
};

/**
 * Call when done with the object to have it release any internal references
 * to other objects to help with garbage collection.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype.destroy = function() {
    if (this.sailEnv) {
        this.worldGroup = null;

        this.sailEnv.removeBoatCallback(this);
        this.sailEnv.physicsLink.removeView(this);
        this.sailEnv = null;
    }
    
    LBPhaser.PhysicsView.protoype.destroy.call(this);
};


/**
 * Sailing simulator 2D Phaser view, uses sprites.
 * @constructor
 * @extends LBSailSim.PhaserView
 * @param {LBSailSim.Env} sailEnv   The sailing environment.
 * @param {Phaser.Group} worldGroup The parent group for all display objects.
 * @returns {LBSailSim.Phaser2DView}
 */
LBSailSim.Phaser2DView = function(sailEnv, worldGroup) {
    LBSailSim.PhaserView.call(this, sailEnv, worldGroup);
};

LBSailSim.Phaser2DView.prototype = Object.create(LBSailSim.PhaserView.prototype);
LBSailSim.Phaser2DView.prototype.constructor = LBSailSim.Phaser2DView;


LBSailSim.Phaser2DView.prototype._loadDisplayObjectForHull = function(boat) {    
    var data = boat.loadData;
    if (data && data.phaser) {
        var game = this.sailEnv.phaserEnv.game;
        var sprite = LBPhaser.PhysicsView.createSpriteFromData(game, data.phaser.sprite);
        this.setRigidBodyDisplayObject(boat, sprite);
        this.worldGroup.add(sprite);
    }
};

LBSailSim.Phaser2DView.prototype._loadDisplayObjectForHydrofoil = function(rigidBody) {
    this._loadObj3DSprite(rigidBody, rigidBody.loadData);
};

LBSailSim.Phaser2DView.prototype._loadDisplayObjectForAirfoil = function(rigidBody) {
    var sprite = this._loadObj3DSprite(rigidBody, rigidBody.loadData);
    
    if (sprite) {
        // Need a sail flipper...
        this.setBodyCallback(rigidBody, this);
    }
};


/**
 * Sailing simulator 3D Phaser view, uses a {@link LBPhaser.Project3D} to handle the
 * projection into 2D.
 * @constructor
 * @extends LBSailSim.PhaserView
 * @param {LBSailSim.Env} sailEnv   The sailing environment.
 * @param {Phaser.Group} worldGroup The parent group for all display objects.
 * @param {LBCamera.Camera} [camera]    If defined the camera for the 3D projection.
 * @returns {LBSailSim.Phaser2DView}
 */
LBSailSim.Phaser3DView = function(sailEnv, worldGroup, camera) {
    LBSailSim.PhaserView.call(this, sailEnv, worldGroup);
    
    this.project3D = new LBPhaser.Project3D(sailEnv.phaserEnv, worldGroup, camera);
};

LBSailSim.Phaser3DView.prototype = Object.create(LBSailSim.PhaserView.prototype);
LBSailSim.Phaser3DView.prototype.constructor = LBSailSim.Phaser3DView;

LBSailSim.Phaser3DView.prototype.destroy = function() {
    if (this.project3D) {
        this.project3D = this.project3D.destroy();
        LBSailSim.PhaserView.prototype.destroy.call(this);
    }
};

LBSailSim.Phaser3DView.prototype._loadDisplayObjectForHull = function(boat) {
    var data = boat.loadData;
    if (data) {
        var rigidBodyEntry = this._getRigidBodyEntry(boat);

        if (data.volumes && data.volumes.panels) {
            rigidBodyEntry.panelsArray = LBPhaser.Project3D.loadVolumePanels(boat.volumes, data.volumes.panels);
        }

        if (!rigidBodyEntry.panelsArray && data.phaser) {
            var game = this.sailEnv.phaserEnv.game;
            var sprite = LBPhaser.PhysicsView.createSpriteFromData(game, data.phaser.sprite);
            this.setRigidBodyDisplayObject(boat, sprite);
            this.worldGroup.add(sprite);
        }
    }
};

LBSailSim.Phaser3DView.prototype._loadDisplayObjectForSpar = function(rigidBody) {
    var data = rigidBody.loadData;
    if (data && (rigidBody.volumes.length > 0)) {
        var rigidBodyEntry = this._getRigidBodyEntry(rigidBody);
        
        if (data.volumes && data.volumes.panels) {
            rigidBodyEntry.panelsArray = LBPhaser.Project3D.loadVolumePanels(rigidBody.volumes, data.volumes.panels);
        }
        else if (data.volume && data.volume.panels) {
            rigidBodyEntry.panelsArray = LBPhaser.Project3D.loadVolumePanels(rigidBody.volumes, data.volume.panels);
        }
    }
};

LBSailSim.Phaser3DView.prototype._loadDisplayObjectForHydrofoil = function(rigidBody) {
    var data = rigidBody.loadData;
    if (data) {
        var rigidBodyEntry = this._getRigidBodyEntry(rigidBody);

        if (data.volumes && data.volumes.panels) {
            rigidBodyEntry.panelsArray = LBPhaser.Project3D.loadVolumePanels(rigidBody.volumes, data.volumes.panels);
        }

        if (!rigidBodyEntry.panelsArray && data.phaser) {
            this._loadObj3DSprite(rigidBody, rigidBody.loadData);
        }
    }
};

LBSailSim.Phaser3DView.prototype._loadDisplayObjectForAirfoil = function(sail) {
    var data = sail.loadData;
    if (data) {
        if (data.sailShaper && data.sailShaper.panels) {
            var rigidBodyEntry = this._getRigidBodyEntry(sail);
            rigidBodyEntry.panelsArray = LBSailSim.Phaser3DView.loadSailPanels(sail, data.sailShaper);
        }
        else {
            var sprite = this._loadObj3DSprite(sail, sail.loadData);
            if (sprite) {
                // Need a sail flipper...
                this.setBodyCallback(sail, this);
            }
        }
    }
};

LBSailSim.Phaser3DView.prototype.destroyRigidBodyDisplayObject = function(rigidBody) {
    var rigidBodyEntry = this._getRigidBodyEntry(rigidBody);
    if (rigidBodyEntry) {
        rigidBodyEntry.panelsArray = LBPhaser.Project3D.destroyPanelsArray(rigidBodyEntry.panelsArray);
    }
    
    LBSailSim.PhaserView.prototype.destroyRigidBodyDisplayObject.call(this, rigidBody);
};


// @inheritdoc...
LBSailSim.Phaser3DView.prototype.beginDisplayObjectsUpdate = function() {
    this.project3D.start();
};

// @inheritdoc...
LBSailSim.Phaser3DView.prototype._updateDisplayObjects = function(rigidBody) {    
    var rigidBodyEntry = this._getRigidBodyEntry(rigidBody);
    LBPhaser.Project3D.projectPanelsArray(this.project3D, rigidBodyEntry.panelsArray, 
            rigidBody.obj3D.matrixWorld);
    
    LBSailSim.PhaserView.prototype._updateDisplayObjects.call(this, rigidBody);
    
    if (rigidBodyEntry.sailDrawer) {
        rigidBodyEntry.sailDrawer.projectSailSurface(this.project3D, rigidBody.obj3D.matrixWorld);
    }
};

// @inheritdoc...
LBSailSim.Phaser3DView.prototype.endDisplayObjectsUpdate = function() {
    this.project3D.end();
};


LBSailSim.Phaser3DView.loadSailPanels = function(sail, data) {
    if (!data.panels) {
        return undefined;
    }
    
    var panelsArray = [];
    var vertices = [];
    
    data.panels.forEach(function(panelData) {
        var projectPanels = new LBPhaser.Project3DPanels();
        projectPanels.loadBasic(panelData);
        
        if (panelData.startSlice !== undefined) {
            var slices = sail.sailSurface.slices;
            var endSlice = panelData.endSlice;
            if (endSlice < 0) {
                endSlice = slices.length;
            }
            
            // Each panel consists of the vertices on one slice and the vertices on the
            // next slice.
            --endSlice;
            vertices.length = 0;
            for (var i = panelData.startSlice; i < endSlice; ++i) {
                var slice = slices[i];
                slice.points.forEach(function(pt) {
                    vertices.push(pt);
                });
                slice = slices[i + 1];
                for (var p = slice.points.length - 1; p >= 0; --p) {
                    vertices.push(slice.points[p]);
                }
                projectPanels.addPanelVertices(vertices);
            }
            
            if (projectPanels.panelsVertices.length > 0) {
                panelsArray.push(projectPanels);
            }
        }
        
    });
    
    return panelsArray;
};

return LBSailSim;
});
