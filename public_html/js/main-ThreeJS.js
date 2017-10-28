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


require( ['three', 'lbsailsim', 'lbui3d', 'lbutil', 'lbmath', 'lbgeometry', 'lbassets', 'lbsailsimthree'],
    function(THREE, LBSailSim, LBUI3d, LBUtil, LBMath, LBGeometry, LBAssets) {
        
        
    'use strict';
    
/**
 * 
 * @param {type} slider
 * @returns {unresolved}
 */    
function setupSlider(slider) {
    if (slider) {
        // This prevents the slider from handling arrow keys, which we do ourselves.
        slider.addEventListener('keydown', function(event) {
            event.preventDefault();
        });
    }
    return slider;
}    


/**
 * The main application.
 * @constructor
 * @returns {LBMyApp}
 */
function LBMyApp() {
    LBUI3d.App3D.call(this);
    this.mainScene.coordMapping = LBUI3d.ZIsUpCoordMapping;
    
    var mainViewContainer = document.getElementById('main_view');
    this.mainView = new LBUI3d.View3D(this.mainScene, mainViewContainer);
    this.addNormalView(this.mainView);
    
    this.activeView = this.mainView;
    
    this.pipLowerLeftView = undefined;
    this.pipLowerRightView = undefined;
    
    this.pipMapView = undefined;
    
    this.fpsElement = document.getElementById('hud_fps');
    this.appWindDirElement = document.getElementById('app_wind_dial');
    
    this.isHUDBoatOn = false;
    this.isHUDWindOn = false;
    this.isHUDForceOn = false;
    
    this.hudHeadingElement = document.getElementById('hud_heading');
    this.hudSpeedElement = document.getElementById('hud_speed');
    this.hudVMGElement = document.getElementById('hud_vmg');
    this.hudLeewayDegElement = document.getElementById('hud_leeway_deg');
    this.hudLeewayDirElement = document.getElementById('hud_leeway_dir');
    
    this.hudWindDirElement = document.getElementById('hud_wind_dir');
    this.hudWindSpeedElement = document.getElementById('hud_wind_speed');
    

    this.rudderSliderElement = document.getElementById('rudder_slider');
    this.rudderControl = document.getElementById('rudder');
    setupSlider(this.rudderControl);
    
    this.throttleSliderElement = document.getElementById('throttle_slider');
    this.throttleControl = document.getElementById('throttle');
    
    this.mainsheetSliderElement = document.getElementById('main_slider');
    this.mainsheetControl = document.getElementById('mainsheet');
    setupSlider(this.mainsheetControl);

    this.jibsheetSliderElement = document.getElementById('jib_slider');
    this.jibsheetControl = document.getElementById('jibsheet');
    setupSlider(this.jibsheetControl);
    
    this.assetLoader = new LBAssets.Loader();
    
    this.toggleHUDBoat();
    this.toggleHUDWind();
    
    // TODO Get rid of windDeg, windForce...
    this.windDeg = 0;
    this.windForce = 2;
    
    this.physicsEngineType = LBSailSim.SailEnvTHREE.CANNON_PHYSICS;
    
    this.updateMouseModeButton();
    this.updateCameraViewButton();
};

LBMyApp.prototype = Object.create(LBUI3d.App3D.prototype);
LBMyApp.prototype.constructor = LBMyApp;


/**
 * 
 * @param {type} view
 * @param {type} standardView
 * @returns {undefined}
 */
LBMyApp.prototype.addNormalView = function(view, standardView) {
    view.localPOVCameraController = new LBUI3d.LocalPOVCameraController();
    view.addCameraController(view.localPOVCameraController);
    
    // The x-axis of the boat faces aft, and the origin is near the bow. We want to look forward from the cockpit.
    view.localPOVCameraController.forwardAzimuthDeg = 180;

    // TODO: Need to set the cockpit location from the boat's data...
    view.localPOVCameraController.localPosition.set(3, 0, 1.0);
    view.localPOVCameraController.localOrientation.azimuthDeg = 180;
    
    var chaseMode = LBUI3d.ChaseCameraController.CHASE_MODE_WORLD;
    //chaseMode = LBUI3d.ChaseCameraController.CHASE_MODE_LOCAL;
    view.chaseCameraController = new LBUI3d.ChaseCameraController(20, chaseMode);
    view.chaseCameraController.worldLimits.minPos.z = 1;
    view.chaseCameraController.desiredCoordinates.elevationDeg = 20;
    view.chaseCameraController.forwardAzimuthDeg = 0;
    view.addCameraController(view.chaseCameraController);
    
    this.addView(view);
    this.updateViewForMyBoat(view);
    
    view.setActiveCameraController(view.chaseCameraController);

    if (standardView !== undefined) {
        view.setActiveCameraController(view.localPOVCameraController);
        view.localPOVCameraController.setStandardView(standardView);
    }
};


/**
 * The main initialization function.
 * @override
 * @param {type} mainContainer
 * @returns {undefined}
 */
LBMyApp.prototype.init = function(mainContainer) {
    LBUI3d.App3D.prototype.init.call(this, mainContainer);

    var me = this;
    document.addEventListener('keypress', function(event) {
        me.onKeyPressEvent(event);
    }, false);
    document.addEventListener('keydown', function(event) {
        me.onKeyDownEvent(event);
    }, false);
    
    this.initSceneEnv();
    this.initSailEnv();

    this.setWindForce(2);
    
    this.onWindowResize();
};


/**
 * Initialize the main scene, adding the water and the sky to it.
 * @returns {undefined}
 */
LBMyApp.prototype.initSceneEnv = function() {
    //var light = new THREE.HemisphereLight(0xe5ffff, 0x0086b3, 1);
    //this.mainScene.add(light);

//    this.mainScene.add(new THREE.AxisHelper(3));
};


/**
 * Initializes the sailing environment.
 * @returns {undefined}
 */
LBMyApp.prototype.initSailEnv = function() {
    this.sailEnv = new LBSailSim.SailEnvTHREE(this, this.mainView, this.physicsEngineType, this.assetLoader);
    
    this.loadEnvironment('basin');
};


/**
 * Loads a perticular environment for the sailing environment.
 * @param {type} name
 * @returns {undefined}
 */
LBMyApp.prototype.loadEnvironment = function(name) {
    var me = this;
    this.sailEnv.loadEnv(name, function() {
        me.loadEnvCompleted();
    });
};

/**
 * Completion function called when the sailing environment has been loaded.
 * @returns {undefined}
 */
LBMyApp.prototype.loadEnvCompleted = function() {
    // Load a boat...
    var boatType = Object.keys(this.sailEnv.boatsByType)[0];
    var boatName = Object.keys(this.sailEnv.boatsByType[boatType])[0];
    var centerX = 0;
    var centerY = 0;
    var yawDeg = 0;
    var rollDeg = 0;
    var pitchDeg = 0;
    yawDeg = 180;
    centerX = 5;
    //rotDeg += 30;
    //yawDeg = 0;
    //yawDeg = 90;
    //rollDeg = 60;
    //pitchDeg = 30;
    this.myBoat = this.sailEnv.checkoutBoat(boatType, boatName, centerX, centerY, yawDeg, rollDeg, pitchDeg);
    this.sailEnv.setFocusVessel(this.myBoat);
    
    if (this.rudderSliderElement) {
        this.rudderSliderElement.hidden = !this.myBoat.getRudderController();
    }
    if (this.throttleSliderElement) {
        this.throttleSliderElement.hidden = !this.myBoat.getThrottleController();
    }
    if (this.jibsheetSliderElement) {
        this.jibsheetSliderElement.hidden = !this.myBoat.getJibsheetController();
    }
    if (this.mainsheetSliderElement) {
        this.mainsheetSliderElement.hidden = !this.myBoat.getMainsheetController();
    }
    
    var me = this;
    this.views.forEach(function(view) {
        me.updateViewForMyBoat(view);
    });
};

LBMyApp.prototype.updateViewForMyBoat = function(view) {
    var target = (this.myBoat) ? this.myBoat.obj3D : null;
    view.cameraControllers.forEach(function(controller) {
        controller.setTarget(target);
    });

    if (view.localPOVCameraController) {
        // The x-axis of the boat faces aft, and the origin is near the bow. We want to look forward from the cockpit.
        // TODO: Need to set the cockpit location from the boat's data...index
        view.localPOVCameraController.localPosition.set(3, 0, 1.0);
    }
};

/**
 * Updates a slider control's value from the current value of a controller.
 * @param {type} controller
 * @param {type} control
 * @returns {undefined}
 */
LBMyApp.updateControlFromController = function(controller, control) {
    if (!controller || !control) {
        return;
    }
    
    var value = controller.getValue();
    var controlMin = parseFloat(control.min);
    var controlMax = parseFloat(control.max);
    if (control.dataset.flip_min_max === 'true') {
        var tmp = controlMin;
        controlMin = controlMax;
        controlMax = tmp;
    }
    value = LBMath.mapInRange(value, controller.minValue, controller.maxValue, controlMin, controlMax);
    control.value = value;
};

/**
 * Updates a controller's value from a slider's value.
 * @param {type} control
 * @param {type} value
 * @param {type} min
 * @param {type} max
 * @param {type} controller
 * @returns {undefined}
 */
LBMyApp.updateControllerFromControl = function(control, value, min, max, controller) {
    if (!control || !controller) {
        return;
    }
    
    if (control.dataset.flip_min_max === 'true') {
        controller.setMappedValue(value, max, min);
    }
    else {
        controller.setMappedValue(value, min, max);
    }
};


/**
 * Handles moving the control value of a controller based upon a key.
 * @param {type} controller
 * @param {type} key
 * @param {type} isDecrease
 * @param {type} control
 * @returns {undefined}
 */
LBMyApp.moveControllerWithKey = function(controller, key, isDecrease, control) {
    if (!controller) {
        return;
    }

    var range = controller.maxValue - controller.minValue;
    var delta = range / 50;
    if (key.shiftKey) {
        delta *= 0.25;
    }
    else if (key.altKey) {
        delta *= 4.0;
    }
    if (isDecrease) {
        delta = -delta;
    }
    controller.setValue(delta, true);
    
    LBMyApp.updateControlFromController(controller, control);
};

/**
 * 
 * @param {type} event
 * @returns {undefined}
 */
LBMyApp.prototype.onKeyDownEvent = function(event) {
    switch (event.key) {
        case ' ' :
            if (this.myBoat) {
                var controller = this.myBoat.getRudderController();
                if (controller) {
                    controller.setValue(0);
                    LBMyApp.updateControlFromController(controller, this.rudderControl);
                }
                return;
            }
            break;
        case 'ArrowLeft' :
            if (event.ctrlKey && this.activeView && this.activeView.activeCameraController) {
                this.activeView.activeCameraController.rotatePOVDeg(10, 0);
                return;
            }
            else if (this.myBoat) {
                LBMyApp.moveControllerWithKey(this.myBoat.getRudderController(), event, true, this.rudderControl);
                return;
            }
            break;
            
        case 'ArrowRight' :
            if (event.ctrlKey && this.activeView && this.activeView.activeCameraController) {
                this.activeView.activeCameraController.rotatePOVDeg(-10, 0);
                return;
            }
            else if (this.myBoat) {
                LBMyApp.moveControllerWithKey(this.myBoat.getRudderController(), event, false, this.rudderControl);
                return;
            }
            break;
            
        case 'ArrowUp' :
            if (event.ctrlKey && this.activeView && this.activeView.activeCameraController) {
                this.activeView.activeCameraController.rotatePOVDeg(0, 10);
                return;
            }
            else if (this.myBoat) {
                LBMyApp.moveControllerWithKey(this.myBoat.getMainsheetController(), event, false, this.mainsheetControl);
                return;
            }
            break;
            
        case 'ArrowDown' :
            if (event.ctrlKey && this.activeView && this.activeView.activeCameraController) {
                this.activeView.activeCameraController.rotatePOVDeg(0, -10);
                return;
            }
            else if (this.myBoat) {
                LBMyApp.moveControllerWithKey(this.myBoat.getMainsheetController(), event, true, this.mainsheetControl);
                return;
            }
            break;
            
        case 'Escape' :
            this.activeView.activeCameraController.endTracking(true);
            break;
            
        case 'q' :
            this.activeView.activeCameraController.setStandardView(LBUI3d.CameraController.VIEW_FWD_PORT);
            break;
        case 'w' :
            this.activeView.activeCameraController.setStandardView(LBUI3d.CameraController.VIEW_FWD);
            break;
        case 'e' :
            this.activeView.activeCameraController.setStandardView(LBUI3d.CameraController.VIEW_FWD_STBD);
            break;
        case 'a' :
            this.activeView.activeCameraController.setStandardView(LBUI3d.CameraController.VIEW_PORT);
            break;
        case 'd' :
            this.activeView.activeCameraController.setStandardView(LBUI3d.CameraController.VIEW_STBD);
            break;
        case 'z' :
            this.activeView.activeCameraController.setStandardView(LBUI3d.CameraController.VIEW_AFT_PORT);
            break;
        case 'x' :
            this.activeView.activeCameraController.setStandardView(LBUI3d.CameraController.VIEW_AFT);
            break;
        case 'c' :
            this.activeView.activeCameraController.setStandardView(LBUI3d.CameraController.VIEW_AFT_STBD);
            break;
        case 's' :
            this.activeView.activeCameraController.setStandardView(LBUI3d.CameraController.VIEW_UP);
            break;
    }
};

/**
 * 
 * @param {type} event
 * @returns {undefined}
 */
LBMyApp.prototype.onKeyPressEvent = function(event) {
    switch (event.code) {
        case 'KeyP' :
            this.togglePaused();
            break;
            
        case 'KeyT' :
            this.runSingleStep();
            break;
    }
};


/**
 * The main update function.
 * @override
 * @param {type} dt
 * @returns {undefined}
 */
LBMyApp.prototype.update = function(dt) {
    LBUI3d.App3D.prototype.update.call(this);
    
    this.sailEnv.update(dt);
    
    this.updateHUDBoat();
    this.updateHUDWind();
};

/**
 * Handles updating the boat HUD DOM elements.
 * @returns {undefined}
 */
LBMyApp.prototype.updateHUDBoat = function() {
    if (this.isHUDBoatOn) {
        if (this.hudHeadingElement) {
            var heading = (this.myBoat) ? this.myBoat.getHeadingDeg(true) : 0;
            this.hudHeadingElement.innerText = heading.toFixed(0);
        }
        
        if (this.hudSpeedElement) {
            var speed = (this.myBoat) ? this.myBoat.getKnots() : 0;
            this.hudSpeedElement.innerText = speed.toFixed(2);
        }
        
        if (this.hudVMGElement) {
            var vmg = 0;
            if (this.myBoat) {
                var trueWind = this.myBoat.getTrueWindVelocityMPS();
                var trueWindSpeed = trueWind.length();
                if (!LBMath.isLikeZero(trueWindSpeed)) {
                    vmg = -this.myBoat.getVelocityMPS().dot(trueWind) / trueWindSpeed;
                    vmg = LBUtil.mps2kt(vmg);
                }
            }
            this.hudVMGElement.innerText = vmg.toFixed(2);
        }
        
        if (this.hudLeewayDegElement || this.hudLeewayDirElement) {
            var leewayAngle = 0;
            var leewayDir = "";
            if (this.myBoat) {
                if (!LBMath.isLikeZero(this.myBoat.getKnots())) {
                    leewayAngle = this.myBoat.getLeewayDeg(true);
                    if (leewayAngle < 0) {
                        leewayDir = "S";
                    }
                    else if (leewayAngle > 0) {
                        leewayDir = "P";
                    }
                }
            }
            
            this.hudLeewayDegElement.innerText = leewayAngle.toFixed();
            this.hudLeewayDirElement.innerHTML = "&deg;" + leewayDir;
        }
    }
};

/**
 * Handles updating the wind HUD DOM elements.
 * @returns {undefined}
 */
LBMyApp.prototype.updateHUDWind = function() {
    var windSpeed = 0;
    var windDir = 0;
    if (this.myBoat) {
        windSpeed = this.myBoat.getApparentWindKnots();
        windDir = (LBMath.isLikeZero(this.myBoat.getApparentWindKnots())) ? 0 : this.myBoat.getApparentWindBearingDeg(true);
    }
    else {
        // TODO: Grab the true wind information...
    }
    
    if (this.isHUDWindOn) {
        if (this.hudWindSpeedElement) {
            this.hudWindSpeedElement.innerText = windSpeed.toFixed(2);
        }
        if (this.hudWindDirElement) {
            this.hudWindDirElement.innerText = windDir;
        }
    }
    
    if (this.appWindDirElement) {
        var windFrom = -LBMath.wrapDegrees(windDir);
        this.appWindDirElement.style.transform = "rotate(" + windFrom + "deg)";
    }
    
    var force = LBSailSim.Wind.getForceForKnots(windSpeed);
    var element = document.getElementsByClassName("wind_speed_indicator")[0];
    for (var i = 0; i <= force; ++i) {
        var led = element.getElementsByClassName('wind_speed_led_f' + i)[0];
        var style = window.getComputedStyle(led, null);
        led.style.backgroundColor = setColorFunctionAlpha(style.backgroundColor, ' 1.0');
    }
    
    for (var i = force + 1; i <= 8; ++i) {
        var led = element.getElementsByClassName('wind_speed_led_f' + i)[0];
        var style = window.getComputedStyle(led, null);
        led.style.backgroundColor = setColorFunctionAlpha(style.backgroundColor, ' 0.1');
    }
};


/**
 * Handles updating the frames per second DOM element.
 * @override
 * @returns {undefined}
 */
LBMyApp.prototype.fpsUpdated = function() {
    if (this.fpsElement) {
        this.fpsElement.textContent = LBMath.round(this.fps);
    }
};


/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.onWindowResize = function() {
    LBUI3d.App3D.prototype.onWindowResize.call(this);
    
    // Shrink the controls if necessary.
    var container = document.getElementById('container');
    var maxWidth = container.clientWidth - 100;
    var maxHeight = container.clientHeight - 100;
    
    document.getElementById('right_controls').style.maxWidth = maxHeight + 'px';
    document.getElementById('bottom_controls').style.maxWidth = maxWidth + 'px';
};

/**
 * 
 * @param {type} color
 * @param {type} alpha
 * @returns {String}
 */
function setColorFunctionAlpha(color, alpha) {
    if (color.startsWith('hsla') || color.startsWith('rgba')) {
        var pos = color.lastIndexOf(',');
        color = color.slice(0, pos+1) + alpha + ')';
    }
    else if (color.startsWith('hsl') || color.startsWith('rgb')) {
        var pos = color.lastIndexOf(')');
        color = color.slice(0, 3) + 'a' + color.slice(3, pos) + ',' + alpha + ')';
    }
    return color;
}

/**
 * 
 * @param {type} force
 * @returns {undefined}
 */
LBMyApp.prototype.setWindForce = function(force) {
    if ((force < 0) || (force > 8)) {
        return;
    }
    
    this.sailEnv.wind.setAverageForce(force);
    
    this.windForce = force;
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.windIncrease = function() {
    this.setWindForce(this.windForce + 1);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.windDecrease = function() {
    this.setWindForce(this.windForce - 1);
};

/**
 * 
 * @param {type} dirDeg
 * @returns {undefined}
 */
LBMyApp.prototype.setWindDirDeg = function(dirDeg) {
    this.sailEnv.wind.setAverageFromDeg(dirDeg);
    
    this.windDeg = LBMath.wrapDegrees(dirDeg);    
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.windBack = function() {
    this.setWindDirDeg(this.windDeg - 10);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.windVeer = function() {
    this.setWindDirDeg(this.windDeg + 10);
};


/**
 * @param {type} dir One of the LBUI3d.CameraController.VIEW_ constants.
 * @returns {undefined}
 */
LBMyApp.prototype.setCameraView = function(dir) {
    if (!this.activeView) {
        return;
    }
    if (!this.activeView.activeCameraController) {
        return;
    }
    
    this.activeView.activeCameraController.setStandardView(dir);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.viewFwd = function() {
    this.setCameraView(LBUI3d.CameraController.VIEW_FWD);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.viewAft = function() {
    this.setCameraView(LBUI3d.CameraController.VIEW_AFT);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.viewFwdPort = function() {
    this.setCameraView(LBUI3d.CameraController.VIEW_FWD_PORT);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.viewFwdStbd = function() {
    this.setCameraView(LBUI3d.CameraController.VIEW_FWD_STBD);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.viewPort = function() {
    this.setCameraView(LBUI3d.CameraController.VIEW_PORT);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.viewStbd = function() {
    this.setCameraView(LBUI3d.CameraController.VIEW_STBD);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.viewAftPort = function() {
    this.setCameraView(LBUI3d.CameraController.VIEW_AFT_PORT);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.viewAftStbd = function() {
    this.setCameraView(LBUI3d.CameraController.VIEW_AFT_STBD);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.viewUp = function() {
    this.setCameraView(LBUI3d.CameraController.VIEW_UP);
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.nextCameraView = function() {
    if (!this.activeView) {
        return;
    }
    var activeController = this.activeView.activeCameraController;
    if (!activeController || (activeController === this.activeView.localPOVCameraController)) {
        this.activeView.setActiveCameraController(this.activeView.chaseCameraController);
    }
    else {
        this.activeView.setActiveCameraController(this.activeView.localPOVCameraController);
    }
    
    this.updateCameraViewButton();
};


/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.updateCameraViewButton = function() {
    var cursor;
    var innerHTML;
    switch (this.activeView.activeCameraController) {
        case this.activeView.localPOVCameraController :
            innerHTML = "directions_boat";
            break;
            
        case this.activeView.chaseCameraController :
            innerHTML = "wallpaper";
            break;
            
        default :
            return;
    }
    
    var element = document.getElementById('camera_view');
    var elements = element.getElementsByTagName('i');
    elements[0].innerHTML = innerHTML;
};


/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.toggleForceArrows = function() {
    
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.toggleVelocityArrows = function() {
    
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.toggleWindArrows = function() {
    
};


/**
 * 
 * @param {type} element
 * @param {type} property
 * @param {type} onOffset
 * @returns {Boolean}
 */
function toggleByWidth(element, property, onOffset) {
    onOffset = onOffset || "0px";
    if (element.style[property] === onOffset) {
        element.style[property] = "-" + element.clientWidth + "px";
        return false;
    }

    element.style[property] = onOffset;
    return true;
}

/**
 * 
 * @param {type} element
 * @param {type} property
 * @param {type} onOffset
 * @returns {Boolean}
 */
function toggleByHeight(element, property, onOffset) {
    onOffset = onOffset || "0px";
    if (element.style[property] === onOffset) {
        element.style[property] = "-" + element.clientHeight + "px";
        return false;
    }

    element.style[property] = onOffset;
    return true;
}

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.toggleHUDBoat = function() {
    var element = document.getElementById("hud_popup_boat");
    var isOn = toggleByWidth(element, "left");
    this.isHUDBoatOn = isOn;
    
    var label = document.getElementById("hud_label_boat");
    label.style.visibility = (isOn) ? "visible" : "";
};


/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.toggleHUDWind = function() {
    var element = document.getElementById("hud_popup_wind");
    var isOn = toggleByWidth(element, "left");
    this.isHUDWindOn = isOn;
    
    var label = document.getElementById("hud_label_wind");
    label.style.visibility = (isOn) ? "visible" : "";
};


/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.toggleHUDForce = function() {
    var element = document.getElementById("hud_popup_force");
    var isOn = toggleByWidth(element, "left");
    this.isHUDForceOn = isOn;
    
    var label = document.getElementById("hud_label_force");
    label.style.visibility = (isOn) ? "visible" : "";
};


/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.toggleMap = function() {
    var element = document.getElementById("pip_map");
    
    // Want to keep the map square...
    if (element.clientWidth > element.clientHeight) {
        element.style.width = element.clientHeight + 'px';;
    }
    else if (element.clientWidth < element.clientHeight) {
        element.style.height = element.clientWidth + 'px';
    }
    
    var isOn = toggleByWidth(element, "right");
    if (isOn) {
        
    }
    else {
        
    }
};


/**
 * 
 * @param {type} pipElement
 * @param {type} standardView
 * @returns {LBUI3d.View3D}
 */
LBMyApp.prototype.createPIPView = function(pipElement, standardView) {
    var view = new LBUI3d.View3D(this.mainScene, pipElement);
    this.addNormalView(view, standardView);
    return view;
};


/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.togglePIPLowerLeft = function() {
    var element = document.getElementById("pip_lower_left");
    var isOn = toggleByWidth(element, "left");
    
    if (isOn) {
        if (!this.pipLowerLeftView) {
            this.pipLowerLeftView = this.createPIPView(element, LBUI3d.CameraController.VIEW_AFT_STBD);
        }
        this.pipLowerLeftView.isEnabled = true;
    }
    else {
        if (this.pipLowerLeftView) {
            this.pipLowerLeftView.isEnabled = false;
        }
    }
    
    // Flip the arrow direction...
    element = document.getElementById("pip_lower_left_btn");
    var elements = element.getElementsByTagName("i");
    elements[0].innerHTML = (isOn) ? "&#xE5CB;" : "&#xE5CC;";
};


/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.togglePIPLowerRight = function() {
    var element = document.getElementById("pip_lower_right");
    var isOn = toggleByWidth(element, "right");
    
    if (isOn) {
        if (!this.pipLowerRightView) {
            this.pipLowerRightView = this.createPIPView(element, LBUI3d.CameraController.VIEW_AFT_PORT);
        }
        this.pipLowerRightView.isEnabled = true;
    }
    else {
        if (this.pipLowerRightView) {
            this.pipLowerRightView.isEnabled = false;
        }
    }
    
    // Flip the arrow direction...
    element = document.getElementById("pip_lower_right_btn");
    var elements = element.getElementsByTagName("i");
    elements[0].innerHTML = (isOn) ? "&#xE5CC;" : "&#xE5CB;";
};

/**
 * 
 * @param {type} container
 * @returns {undefined}
 */
LBMyApp.prototype.toggleFullScreen = function(container) {
    var isFullScreen = LBUI3d.App3D.prototype.toggleFullScreen.call(this, container);
    var element = document.getElementById('menu_full_screen');
    var elements = element.getElementsByTagName('i');
    elements[0].innerHTML = (isFullScreen) ? "&#xE5D1;" : "&#xE5D0;";
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.toggleRunPause = function() {
    this.togglePaused();
    var element = document.getElementById('menu_run_pause');
    var elements = element.getElementsByTagName('i');
    elements[0].innerHTML = (this.isPaused()) ? "&#xE037;" : "&#xE034;";
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.nextMouseMode = function() {
    LBUI3d.App3D.prototype.nextMouseMode.call(this);
    this.updateMouseModeButton();
};

/**
 * 
 * @returns {undefined}
 */
LBMyApp.prototype.updateMouseModeButton = function() {
    var cursor;
    var innerHTML;
    switch (this.mouseMode) {
        case LBUI3d.View3D.MOUSE_PAN_MODE :
            innerHTML = "&#xE89F;";
            cursor = "default";
            break;
            
        case LBUI3d.View3D.MOUSE_ROTATE_MODE :
            innerHTML = "&#xE84D;";
            cursor = "move";
            break;
            
        default :
            return;
    }
    
    var element = document.getElementById('menu_mouse_mode');
    var elements = element.getElementsByTagName('i');
    elements[0].innerHTML = innerHTML;
    
    this.views.forEach(function(view) {
        view.container.style.cursor = cursor;
    });
};


/**
 * 
 * @param {Number} value
 * @param {Number} min
 * @param {Number} max
 * @returns {undefined}
 */
LBMyApp.prototype.onRudderChange = function(value, min, max) {
    if (this.myBoat) {
        LBMyApp.updateControllerFromControl(this.rudderControl, value, min, max, this.myBoat.getRudderController());
    }
};


/**
 * 
 * @param {Number} value
 * @param {Number} min
 * @param {Number} max
 * @returns {undefined}
 */
LBMyApp.prototype.onThrottleChange = function(value, min, max) {
    if (this.myBoat) {
        LBMyApp.updateControllerFromControl(this.throttleControl, value, min, max, this.myBoat.getThrottleController());
    }
};


/**
 * 
 * @param {Number} value
 * @param {Number} min
 * @param {Number} max
 * @returns {undefined}
 */
LBMyApp.prototype.onJibsheetChange = function(value, min, max) {
    if (this.myBoat) {
        LBMyApp.updateControllerFromControl(this.jibsheetControl, value, min, max, this.myBoat.getJibsheetController());
    }
};


/**
 * 
 * @param {Number} value
 * @param {Number} min
 * @param {Number} max
 * @returns {undefined}
 */
LBMyApp.prototype.onMainsheetChange = function(value, min, max) {
    if (this.myBoat) {
        LBMyApp.updateControllerFromControl(this.mainsheetControl, value, min, max, this.myBoat.getMainsheetController());
    }
};


//
// Check for WebGL...
//
if ( ! Detector.webgl ) {
    var mainErrorElement = document.getElementById('fatal_error');
    var titleElement = document.getElementById('fatal_error_title');
    var msgElement = document.getElementById('fatal_error_msg');
    var msg2Element = document.getElementById('fatal_error_msg2');
    Detector.addGetWebGLMessage({ parent: msgElement, id: 'webGL_error_msg'});

    var webGLErrorElement = document.getElementById('webGL_error_msg');
    webGLErrorElement.style.fontSize = msgElement.style.fontSize;
    webGLErrorElement.style.width = msgElement.style.width;
    
    titleElement.innerHTML = "Sorry, ByTheLee could not be started. )-:";    
    msg2Element.innerHTML = "If you are running a modern browser, make sure WebGL is enabled.";
    mainErrorElement.style.visibility = "visible";
}
else {
    // Putting myApp in window so it can be called from HTML event handlers.
    window.myApp = new LBMyApp();
    
    var startPaused = false;
    //startPaused = true;
    window.myApp.start(document.getElementById('main_view'), startPaused);
}

}
);