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


/* global Phaser */
/* global LBUtil, LBSailSim, LBGeometry, LBMath, LBPhaser, LBFoils, LBDebug */


//
//--------------------------------------------------
LoadingState = {};

//
//--------------------------------------------------
LoadingState.init = function() {
    
};


//--------------------------------------------------
LoadingState.preload = function() {
    this.game.load.json('clCdCurves', 'data/clcdcurves.json');
    this.game.load.json('boats', 'data/boats.json');
    this.game.load.json('basic', 'data/basic.json');    
    
    this.game.load.image('bkgd_water', 'images/bkgd_water.png');
    this.game.load.image('dinghy', 'images/dinghy.png');
    this.game.load.image('tubby', 'images/tubby.png');
    this.game.load.image('tubby_mainsail', 'images/tubby_mainsail.png');
    this.game.load.image('tubby_rudder', 'images/tubby_rudder.png');
    this.game.load.image('can', 'images/can.png');

    var sizeSuffix = 'med';
    this.game.load.image('compass', 'images/compass_card_' + sizeSuffix + '.png');
    this.game.load.image('mainsheet_thumb', 'images/mainsheet_thumb_' + sizeSuffix + '.png');
    this.game.load.image('mainsheet_bkgd', 'images/mainsheet_bkgd_' + sizeSuffix + '.png');
    this.game.load.image('mainsheet_logo', 'images/mainsheet_logo_' + sizeSuffix + '.png');
    this.game.load.image('tiller_thumb', 'images/tiller_thumb_' + sizeSuffix + '.png');
    this.game.load.image('tiller_bkgd', 'images/tiller_bkgd_' + sizeSuffix + '.png');
};


//--------------------------------------------------
LoadingState.create = function() {
    this.game.state.start('play');
};


//--------------------------------------------------
PlayState = {};


//
//
//--------------------------------------------------
PlayState.init = function() {
    this.cursorKeys = this.game.input.keyboard.createCursorKeys();
    this.keys = this.game.input.keyboard.addKeys({
        space: Phaser.KeyCode.SPACEBAR, // Center rudder
        one: Phaser.KeyCode.ONE,    // Force 1
        two: Phaser.KeyCode.TWO,    // Force 2
        three: Phaser.KeyCode.THREE,    // Force 3
        four: Phaser.KeyCode.FOUR,    // Force 4
        five: Phaser.KeyCode.FIVE,    // Force 5
        six: Phaser.KeyCode.SIX,    // Force 6
        seven: Phaser.KeyCode.SEVEN,    // Force 7
        // a
        // b
        // c
        d : Phaser.KeyCode.D,   // Toggle Debug
        // e
        f : Phaser.KeyCode.F,   // Toggle Force Arrows
        // g
        // h
        // i
        // j
        // k
        // l
        // m
        n : Phaser.KeyCode.N,   // Throttle Neutral
        // o
        p : Phaser.KeyCode.P,   // Toggle Pause
        // q
        // r
        s : Phaser.KeyCode.S,   // Toggle Single Step
        t : Phaser.KeyCode.T,   // Do Test
        // u
        v : Phaser.KeyCode.V    // Toggle Velocity Arrows
        // w
        // x
        // y
        // z
    });
    
    // Could use number keys for wind force, -, = for back/veer
    this.keys.one.onDown.add(function() {
        this.setWindForce(1);
    }, this);
    this.keys.two.onDown.add(function() {
        this.setWindForce(2);
    }, this);
    this.keys.three.onDown.add(function() {
        this.setWindForce(3);
    }, this);
    this.keys.four.onDown.add(function() {
        this.setWindForce(4);
    }, this);
    this.keys.five.onDown.add(function() {
        this.setWindForce(5);
    }, this);
    this.keys.six.onDown.add(function() {
        this.setWindForce(6);
    }, this);
    this.keys.seven.onDown.add(function() {
        this.setWindForce(7);
    }, this);
    
    this.keys.d.onDown.add(this.toggleDebug, this);
    this.keys.f.onDown.add(this.toggleForceArrows, this);
    this.keys.p.onDown.add(this.togglePause, this);
    this.keys.s.onDown.add(this.singleStep, this);
    this.keys.t.onDown.add(this.doTest, this);
    this.keys.v.onDown.add(this.toggleVelocityArrows, this);
    
    var physicsEngine = LBSailSim.PhaserSailEnv.P2_PHYSICS;
    physicsEngine = LBSailSim.PhaserSailEnv.CANNON_PHYSICS;
    this.sailEnv = new LBSailSim.PhaserSailEnv(this.game, physicsEngine);
    
    // TEST!!!
//    this.isSingleStep = true;
    
//    LBSailSim.FoilInstance.addDebugFields('rudder');
//    LBDebug.DataLog.addSpacer();
//    LBSailSim.FoilInstance.addDebugFields('keel');    
//    LBDebug.DataLog.addSpacer();
//    LBSailSim.FoilInstance.addDebugFields('mainsail');    
//    LBDebug.DataLog.addSpacer();

//    LBSailSim.Hull.addDebugFields('TubbyA');
//    LBDebug.DataLog.addSpacer();
//    LBSailSim.Vessel.addDebugFields('TubbyA');

//    LBDebug.DataLog.outputHeading();
};

//
//--------------------------------------------------
PlayState.setWindForce = function(force) {
    this.sailEnv.wind.setAverageForce(force);
};

//
//--------------------------------------------------
PlayState.toggleDebug = function() {
    LBDebug.DataLog.isEnabled = !LBDebug.DataLog.isEnabled;
    if (LBDebug.DataLog.isEnabled) {
        LBDebug.DataLog.outputHeading();
    }
};


//
//--------------------------------------------------
PlayState.singleStep = function() {
    this.isSingleStep = true;
    this.game.paused = false;
};

//
//--------------------------------------------------
PlayState.togglePause = function() {
    this.game.paused = !this.game.paused;
};

//
//--------------------------------------------------
PlayState.toggleForceArrows = function() {
    this.sailSimView.setForceArrowsVisible(!this.sailSimView.areForceArrowsVisible());
};

//
//--------------------------------------------------
PlayState.toggleVelocityArrows = function() {
    this.sailSimView.setVelocityArrowsVisible(!this.sailSimView.areVelocityArrowsVisible());
};


//
//--------------------------------------------------
LBFoils.ClCdCurve.prototype.test = function(start, end, delta) {
    console.log("Test ClCdCurve:");
    var clCd;
    for (var i = start; i < end; i += delta) {
        clCd = this.calcCoefsDeg(i, clCd);
        console.log(i + "\t" + clCd.cl + "\t" + clCd.cd + "\t" + clCd.cm + "\t" + clCd.stallFraction + "\t"
                + "\t" + clCd.clLift + "\t" + clCd.cdLift + "\t" + clCd.cmLift + "\t"
                + "\t" + clCd.clStalled + "\t" + clCd.cdStalled + "\t" + clCd.cmStalled + "\t");
    }
};    

//
//--------------------------------------------------
PlayState.doTest = function() {
    //var cspline = new LBMath.CSpline();
    //cspline.test();
//    var clCdCurve = this.sailEnv.clCdCurves["FlatPlate"];
//    clCdCurve.test(-180, 180, 2);
   
    this.sailEnv.returnBoat(this.myBoat);
   
    var centerX = this.sailEnv.phaserEnv.fromPixelsX(100);
    var centerY = this.sailEnv.phaserEnv.fromPixelsY(0);
    var rotation = this.sailEnv.phaserEnv.fromPixelsRotationDeg(-90);
    //this.myBoat = new Boat(this.game, this.sailEnv, centerX, centerY, data.myBoat);
    this.myBoat = this.sailEnv.checkoutBoat("Tubby", "TubbyB", centerX, centerY, rotation);
};

//
//--------------------------------------------------
PlayState.create = function() {
    //this.camera.flash('#000000');
    this.world.setBounds(-this.game.width / 2, -this.game.height / 2, this.game.width, this.game.height);
    this.game.world.bounds.setTo(-10000, -10000, 20000, 20000);
    this.game.physics.setBoundsToWorld();
    
    this.camera.focusOnXY(0, 0);
    
    var clCdCurvesJSON = this.game.cache.getJSON('clCdCurves');
    this.sailEnv.loadClCdCurves(clCdCurvesJSON);
    
    var boatsJSON = this.game.cache.getJSON('boats');
    this.sailEnv.loadBoatDatas(boatsJSON);
    
    var basicJSON = this.game.cache.getJSON('basic');
    this._loadLevel(basicJSON);
};

//--------------------------------------------------
PlayState._loadLevel = function (data) {
    // The background...
    this.bkgdWater = this.game.add.group();
    var maxSize = Math.sqrt(this.game.width * this.game.width + this.game.height * this.game.height);
    maxSize = Math.ceil(maxSize);

    this.water = this.game.add.tileSprite(0, 0, maxSize, maxSize, 'bkgd_water');
    this.water.anchor.x = 0.5;
    this.water.anchor.y = 0.5;
    this.bkgdWater.add(this.water);
 
    // Need wind ripples...
    
    // The worldGroup effectively lets us scroll the world...
    this.worldGroup = this.game.add.group();
    
    this.buoys = this.game.add.group(this.worldGroup);    
    data.buoys.forEach(this._spawnBuoys, this);

    this.sailSimView = new LBSailSim.Phaser3DView(this.sailEnv, this.worldGroup);
    //this.sailSimView = new LBSailSim.Phaser2DView(this.sailEnv, this.worldGroup);
    
    this._spawnCharacters({myBoat: data.myBoat });
    
    this.appWindArrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, this.sailSimView.appWindVelocityArrowStyle);
    this.boatVelocityArrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, this.sailSimView.boatVelocityArrowStyle);
    
    this._setupHUD();
};

//--------------------------------------------------
PlayState._spawnBuoys = function(data) {
    var x = this.sailEnv.phaserEnv.toPixelsX(data.x);
    var y = this.sailEnv.phaserEnv.toPixelsY(data.y);
    var buoy = this.buoys.create(x, y, data.image);
    this.sailEnv.physicsLink.addFixedObject(buoy);
};

//--------------------------------------------------
PlayState._spawnCharacters = function (data) {
    var centerX = 0;
    var centerY = 0;
    var rotation = 0;
    
    centerX = this.sailEnv.phaserEnv.fromPixelsX(200);
    centerY = this.sailEnv.phaserEnv.fromPixelsY(100);
    rotation = this.sailEnv.phaserEnv.fromPixelsRotationDeg(-60);

    centerX = this.sailEnv.phaserEnv.fromPixelsX(400);
    centerY = this.sailEnv.phaserEnv.fromPixelsY(0);
    rotation = this.sailEnv.phaserEnv.fromPixelsRotationDeg(-90);
    
    var rollDeg = 0;
    var pitchDeg = 0;
    rollDeg = 0;
    pitchDeg = 0;
    //this.myBoat = new Boat(this.game, this.sailEnv, centerX, centerY, data.myBoat);
    this.myBoat = this.sailEnv.checkoutBoat("Tubby", "TubbyA", centerX, centerY, rotation, rollDeg, pitchDeg);
    
//    this.otherBoat = this.sailEnv.checkoutBoat("Tubby", "TubbyB", centerX, centerY - 10, 0);
    // TEST!!!
    var roll = 20;
    var pitch = 0;
    this.myBoat.obj3D.setRotationFromEuler(new LBGeometry.Euler(roll * LBMath.DEG_TO_RAD, pitch * LBMath.DEG_TO_RAD, 0));
    this.myBoat.obj3D.updateMatrixWorld(true);
};

//--------------------------------------------------
PlayState._setupHUD = function() {
    this.hud = this.game.add.group();
    this.hud.position.x = -this.game.width / 2;
    this.hud.position.y = -this.game.height / 2;

    var style = { "font": "Arial", "fontSize": "12pt", "fill": "#FFFFFF" };
    
    var left = 0;
    var top = 0;
    var vSpacing = 0;

    this.headingText = this.game.add.text(left, top, "heading: 0", style);
    this.hud.add(this.headingText);
    top += this.headingText.height + vSpacing;
    
    this.speedText = this.game.add.text(left, top, "speed: 0", style);
    this.hud.add(this.speedText);
    top += this.speedText.height + vSpacing;
    
    this.vmgText = this.game.add.text(left, top, "vmg: 0", style);
    this.hud.add(this.vmgText);
    top += this.vmgText.height + vSpacing;
    
    this.leewayText = this.game.add.text(left, top, "leeway: 0", style);
    this.hud.add(this.leewayText);
    top += this.leewayText.height + vSpacing;
    
    this.positionText = this.game.add.text(left, top, "position: 0", style);
    this.hud.add(this.positionText);
    top += this.positionText.height + vSpacing;
    
    this.appWindSpeedText = this.game.add.text(left, top, "App Wind Speed: 0", style);
    this.hud.add(this.appWindSpeedText);
    top += this.appWindSpeedText.height + vSpacing;
    
    this.appWindBearingText = this.game.add.text(left, top, "App Wind Bearing: 0", style);
    this.hud.add(this.appWindBearingText);
    top += this.appWindBearingText.height + vSpacing;
    
    this.rudderText = this.game.add.text(left, top, "Rudder Angle: 0", style);
    this.hud.add(this.rudderText);
    top += this.rudderText.height + vSpacing;
    
    this.mainsheetText = this.game.add.text(left, top, "Mainsheet: 0", style);
    this.hud.add(this.mainsheetText);
    top += this.mainsheetText.height + vSpacing;
    
    this.throttleText = this.game.add.text(left, top, "Throttle: 0", style);
    this.hud.add(this.throttleText);
    top += this.throttleText.height + vSpacing;
    
    this.ticksText = this.game.add.text(left, top, "SimTicks: 0", style);
    this.hud.add(this.ticksText);
    top += this.ticksText.height + vSpacing;
    
    this.fpsText = this.game.add.text(left, top, "FPS: 0", style);
    this.hud.add(this.fpsText);
    top += this.fpsText.height + vSpacing;
    
    this.rollText = this.game.add.text(left, top, "Roll: 0", style);
    this.hud.add(this.rollText);
    top += this.rollText.height + vSpacing;
    
    this.pitchText = this.game.add.text(left, top, "Pitch: 0", style);
    this.hud.add(this.pitchText);
    top += this.pitchText.height + vSpacing;
    
    top += this.pitchText.height + vSpacing;
    
    //this.zText = this.game.add.text(left, top, "Z: 0", style);
    //this.hud.add(this.zText);
    //top += this.zText.height + vSpacing;
    
    this.fDriveText = this.game.add.text(left, top, "Driving Force: 0", style);
    this.hud.add(this.fDriveText);
    top += this.fDriveText.height + vSpacing;
    
    this.fHeelText = this.game.add.text(left, top, "Heeling Force: 0", style);
    this.hud.add(this.fHeelText);
    top += this.fHeelText.height + vSpacing;
    
    this.fSideText = this.game.add.text(left, top, "Side Force: 0", style);
    this.hud.add(this.fSideText);
    top += this.fSideText.height + vSpacing;
    
    this.fRudderText = this.game.add.text(left, top, "Rudder Force: 0", style);
    this.hud.add(this.fRudderText);
    top += this.fRudderText.height + vSpacing;
    
    this.fFoilDragText = this.game.add.text(left, top, "Keel/Rudder Drag: 0", style);
    this.hud.add(this.fFoilDragText);
    top += this.fFoilDragText.height + vSpacing;
    
    this.fFrictionText = this.game.add.text(left, top, "Friction Force: 0", style);
    this.hud.add(this.fFrictionText);
    top += this.fFrictionText.height + vSpacing;
    
    this.fResiduaryText = this.game.add.text(left, top, "Residuary Drag Force: 0", style);
    this.hud.add(this.fResiduaryText);
    top += this.fResiduaryText.height + vSpacing;

    this.hInset = 5;
    this.vInset = 5;
    
    this.compass = this.game.add.sprite(0, 0, 'compass', 0, this.hud);
    this.compass.anchor.x = 0.5;
    this.compass.anchor.y = 0.5;
    this.compass.position.x = this.game.width - this.compass.width - this.hInset;
    this.compass.position.y = this.compass.height / 2 + this.vInset;

    
    
    if (this.myBoat.getMainsheetController()) {
        var thumbSprite = this.game.add.sprite(0, 0, 'mainsheet_thumb');
        thumbSprite.anchor.y = 0.5;

        var bkgdSprite = this.game.add.tileSprite(0, 0, 32, 32, 'mainsheet_bkgd');
        var logoSprite = this.game.add.sprite(0, 0, 'mainsheet_logo');
        logoSprite.rotation = -LBMath.PI_2;
        logoSprite.anchor.x = 0.2;
        
        this.mainsheetSlider = new LBPhaser.Slider(this.game, 1, -100, 0, 100, true, 
                thumbSprite, bkgdSprite, undefined, logoSprite);
        this.mainsheetSlider.group.position.x = this.game.width / 2 - thumbSprite.width - this.hInset;
        this.mainsheetSlider.setCallback(function(newPos, controller) {
                if (!this.myBoat) {
                    return;
                }
                var controller = this.myBoat.getMainsheetController();
                if (!controller) {
                    return;
                }
                var controllerValue = controller.minValue + newPos * (controller.maxValue - controller.minValue);
                controller.setValue(controllerValue);
            },
            this);
    }
    
    var rudderController = this.myBoat.getRudderController();
    if (rudderController) {
        var thumbSprite = this.game.add.sprite(0, 0, 'tiller_thumb');
        thumbSprite.anchor.x = 0.5;
        thumbSprite.anchor.y = 0.8;
        
        var bkgdSprite = this.game.add.sprite(0, 0, 'tiller_bkgd');
        bkgdSprite.anchor.x = 0.5;
        bkgdSprite.anchor.y = 0.5;

        this.tillerDial = new LBPhaser.Dial(this.game, rudderController.minValue, 90, rudderController.maxValue, -90, thumbSprite, bkgdSprite);
        this.tillerDial.group.position.y = this.game.height / 2 - bkgdSprite.height / 2 - this.vInset;
        this.tillerDial.setCallback(function(newPos, controller) {
                if (!this.myBoat) {
                    return;
                }
                var controller = this.myBoat.getRudderController();
                if (!controller) {
                    return;
                }
                controller.setValue(newPos);
            },
            this);
    }
};

//
//--------------------------------------------------
PlayState.preRender = function() {
    if (!this.game.paused) {
        this.sailEnv.preRender();
    }
    
    if (this.isSingleStep) {
        this.game.paused = true;
        this.isSingleStep = false;
    }
};

//
//--------------------------------------------------
PlayState.update = function() {
    this.sailEnv.update();
    LBDebug.DataLog.output();
    
    this._updateCamera();
    this._handleInput();
    
    this._updateHUD();
    this._updateArrows();
};

//------------------------------ --------------------
PlayState._updateHUD = function() {
    if (this.headingText) {
        var heading = this.myBoat.getHeadingDeg(true);
        this.headingText.text = "Heading: " + heading.toFixed();
    }
    
    if (this.speedText) {
        var speed = this.myBoat.getKnots();
        this.speedText.text = "Speed: " + speed.toFixed(2);
    }
    
    if (this.vmgText) {
        var trueWind = this.myBoat.getTrueWindVelocityMPS();
        var trueWindSpeed = trueWind.length();
        var vmg = 0;
        if (!LBMath.isLikeZero(trueWindSpeed)) {
            vmg = -this.myBoat.getVelocityMPS().dot(trueWind) / trueWindSpeed;
            vmg = LBUtil.mps2kt(vmg);
        }
        this.vmgText.text = "VMG: " + vmg.toFixed(2);
    }
    
    if (this.leewayText) {
        if (LBMath.isLikeZero(this.myBoat.getKnots())) {
            this.leewayText.text = "Leeway: 0";
        }
        else {
            var leewayAngle = this.myBoat.getLeewayDeg(true);
            if (leewayAngle < 0) {
                this.leewayText.text = "Leeway: " + -leewayAngle.toFixed() + " to Stbd";
            }
            else if (leewayAngle > 0) {
                this.leewayText.text = "Leeway: " + leewayAngle.toFixed() + " to Port";
            }
            else {
                this.leewayText.text = "Leeway: 0";
            }
        }
    }
    
    if (this.positionText) {
        var position = this.myBoat.getPosition();
        this.positionText.text = "Position: " + LBMath.round(position.x, 1) + " " + LBMath.round(position.y, 1);
    }
   
    if (this.appWindSpeedText) {
        speed = this.myBoat.getApparentWindKnots();
        this.appWindSpeedText.text = "App Wind Speed: " + speed.toFixed(2);
    }
    
    if (this.appWindBearingText) {        
        var bearing = (LBMath.isLikeZero(this.myBoat.getApparentWindKnots())) ? 0 : this.myBoat.getApparentWindBearingDeg(true);
        this.appWindBearingText.text = "App Wind Bearing: " + bearing.toFixed();
    }
    
    if (this.rudderText) {
        var rudder = this.myBoat.getRudderDeg();
        this.rudderText.text = "Rudder Angle: " + LBMath.round(rudder);
    }
    
    if (this.mainsheetText) {
        var mainsheet = this.myBoat.getMainsheetPos();
        this.mainsheetText.text = "Mainsheet: " + LBMath.round(mainsheet, 2);
    }
    
    if (this.throttleText) {
        var throttle = this.myBoat.getThrottlePos();
        if (throttle !== undefined) {
            this.throttleText.text = "Throttle: " + LBMath.round(throttle, 1);
        }
    }
    
    if (this.ticksText) {
        this.ticksText.text = "SimTicks: " + this.sailEnv.physicsLink.updateCount;
    }
    
    if (this.fpsText) {
        this.game.time.advancedTiming = true;
        this.fpsText.text = "FPS: " + this.game.time.fps;
    }
    
    if (this.rollText) {
        var euler = new LBGeometry.Euler();
        euler.setFromRotationMatrix(this.myBoat.obj3D.matrixWorld, "ZXY");
        this.rollText.text = "Roll: " + LBMath.round(euler.x * LBMath.RAD_TO_DEG);
        this.pitchText.text = "Pitch: " + LBMath.round(euler.y * LBMath.RAD_TO_DEG);
    }
    
    if (this.zText) {
        this.zText.text = "Z: " + LBMath.round(this.myBoat.obj3D.matrixWorld.elements[14], 2);
    }
    
    var force = 0;
    if (this.fDriveText) {
        force = this.myBoat.getDrivingForceMag();
        this.fDriveText.text = "Driving Force: " + LBMath.round(force);
    }
    
    if (this.fHeelText) {
        force = this.myBoat.getHeelingForceMag();
        this.fHeelText.text = "Heeling Force: " + LBMath.round(force);
    }
    
    if (this.fSideText) {
        force = this.myBoat.getSideForceMag();
        this.fSideText.text = "Side Force: " + LBMath.round(force);
    }
    
    if (this.fRudderText) {
        force = this.myBoat.getRudderForceMag();
        this.fRudderText.text = "Rudder Force: " + LBMath.round(force);
    }
    
    if (this.fFoilDragText) {
        force = this.myBoat.getHydrofoilDrag();
        this.fFoilDragText.text = "Keel/Rudder Drag: " + LBMath.round(force);
    }
    
    if (this.fFrictionText) {
        force = this.myBoat.getFrictionalDrag();
        this.fFrictionText.text = "Friction Force: " + LBMath.round(force);
    }
    
    if (this.fResiduaryText) {
        force = this.myBoat.getResiduaryDrag();
        this.fResiduaryText.text = "Residuary Drag Force: " + LBMath.round(force);
    }
    
};

//------------------------------ --------------------
PlayState._updateArrows = function() {
    if (!this.myBoat) {
        this.boatVelocityArrow.isVisible = false;
        this.appWindArrow.isVisible = false;
    }
    else {
        var base = this.myBoat.getPosition();
        
        this.boatVelocityArrow.isVisible = true;
        this.appWindArrow.isVisible = true;
        
        this.boatVelocityArrow.setFromBaseAndVector(base, this.myBoat.getVelocityMPS());
        
        // We want to position the apparent wind vector's tip upwind from the boat's center.
        var appWindVelocity = this.myBoat.getApparentWindVelocityMPS();
        var appWindDir = appWindVelocity.clone().normalize();
        var offset = this.myBoat.hull.lwl * 0.5;
        appWindDir.multiplyScalar(-offset).add(base);
        this.appWindArrow.setFromTipAndVector(appWindDir, appWindVelocity);
    }
};

//------------------------------ --------------------
PlayState.getControlIncrement = function(controller) {
    var range = controller.maxValue - controller.minValue;
    return range / 50;
};

//------------------------------ --------------------
PlayState.moveRudder = function(key, isDecrease) {
    var delta = PlayState.getControlIncrement(this.myBoat.getRudderController());
    if (key.shiftKey) {
        delta *= 0.25;
    }
    else if (key.altKey) {
        delta *= 4.0;
    }
    if (isDecrease) {
        delta = -delta;
    }
    delta *= this.sailEnv.phaserEnv.ySign;
    this.myBoat.moveRudder(delta, true);
    
    if (this.tillerDial) {
        this.tillerDial.setValue(this.myBoat.getRudderDeg());
    }
};

//------------------------------ --------------------
PlayState.moveMainsheet = function(key, isDecrease) {
    var delta = PlayState.getControlIncrement(this.myBoat.getMainsheetController());
    if (key.shiftKey) {
        delta *= 0.25;
    }
    else if (key.altKey) {
        delta *= 4.0;
    }
    if (isDecrease) {
        delta = -delta;
    }
    this.myBoat.moveMainsheet(delta, true);
    
    if (this.mainsheetSlider) {
        this.mainsheetSlider.setValue(this.myBoat.getMainsheetPos());
    }
};

//------------------------------ --------------------
PlayState.moveThrottle = function(key, isDecrease) {
    var delta = PlayState.getControlIncrement(this.myBoat.getThrottleController());
    
    if (key.shiftKey) {
        delta *= 0.25;
    }
    else if (key.altKey) {
        delta *= 4.0;
    }
    if (isDecrease) {
        delta = -delta;
    }
    this.myBoat.moveThrottle(delta, true);
    
    if (this.throttleSlider) {
        this.throttleSlider.setValue(this.myBoat.getThrottlePos());
    }
};

//------------------------------ --------------------
PlayState._handleInput = function() {
    if (this.cursorKeys.left.isDown) {
        this.moveRudder(this.cursorKeys.left, false);
    }
    else if (this.cursorKeys.right.isDown) {
        this.moveRudder(this.cursorKeys.right, true);
    }
    else if (this.cursorKeys.up.isDown) {
        if (this.myBoat.getMainsheetController()) {
            this.moveMainsheet(this.cursorKeys.up, false);
        }
        else if (this.myBoat.getThrottleController()) {
            this.moveThrottle(this.cursorKeys.up, false);
        }
    }
    else if (this.cursorKeys.down.isDown) {
        if (this.myBoat.getMainsheetController()) {
            this.moveMainsheet(this.cursorKeys.up, true);
        }
        else if (this.myBoat.getThrottleController()) {
            this.moveThrottle(this.cursorKeys.down, true);
        }
    }
    else if (this.keys.space.isDown) {
        this.myBoat.moveRudder(0, false);
        if (this.tillerDial) {
            this.tillerDial.setValue(0);
        }
    }
    else if (this.keys.n.isDown) {
        this.myBoat.moveThrottle(0, false);
    }
};

//--------------------------------------------------
PlayState._updateCamera = function() {
    var phaserEnv = this.sailEnv.phaserEnv;
    var x = phaserEnv.toPixelsX(this.myBoat.obj3D.position.x);
    var y = phaserEnv.toPixelsY(this.myBoat.obj3D.position.y);
    var rotation = phaserEnv.toPixelsRotationRad(this.myBoat.obj3D.rotation.z) - LBMath.PI_2;

    this.water.tilePosition.x = -x;
    this.water.tilePosition.y = -y;

    this.worldGroup.position.x = -x;
    this.worldGroup.position.y = -y;
    
    if (this.sailSimView.project3D && this.sailSimView.project3D.camera) {
        this.sailSimView.project3D.camera.position.x = this.myBoat.obj3D.position.x;
        this.sailSimView.project3D.camera.position.y = this.myBoat.obj3D.position.y;
    }

    var cosBoat = Math.cos(rotation);
    var sinBoat = Math.sin(rotation);
    var posX = -x * cosBoat - y * sinBoat;
    var posY = x * sinBoat - y * cosBoat;
    
    this.worldGroup.rotation = -rotation;
    this.worldGroup.position.x = posX;
    this.worldGroup.position.y = posY;
    
    this.water.rotation = -rotation;
    
    this.compass.rotation = -rotation;
    
    this.buoys.forEach(PlayState._updateBuoys, this, true, rotation);
};

//--------------------------------------------------
PlayState._updateBuoys = function(buoy, rotation) {
    buoy.rotation = rotation;
};

// PlayState.shutdown

PlayState.mpx = function (v) {
    return v *= 20;
};

PlayState.pxm = function (v) {
    return v * 0.05;
};

PlayState.mpxi = function (v) {
    return v *= -20;
};

PlayState.pxmi = function (v) {
    return v * -0.05;
};

//--------------------------------------------------
window.onload = function() {
    var config = {
        width: "100",
        height: "100",
        // There is a bug in the WebGL renderer
        renderer: Phaser.CANVAS,
        parent: "game",
        physicsConfig: PlayState
    };
    //config.width = 800;
    //config.height = 800;
    
    game = new Phaser.Game(config);

    game.state.add('play', PlayState);
    game.state.add('loading', LoadingState);
    game.state.start('loading');
};
