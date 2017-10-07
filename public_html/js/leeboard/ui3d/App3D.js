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


/* global LBUI3d, LBUtil */
define(['lbscene3d', 'lbview3d'], 
function(LBUI3d) {

/**
 * Our 3D application framework.
 * @constructor
 * @return {LBUI3d.App3D}
 */
LBUI3d.App3D = function() {
    
    /**
     * The current running state.
     */
    this._runState = LBUI3d.App3D.RUN_STATE_NOT_STARTED;
    
    /**
     * The main scene.
     * @member {Number}
     */
    this.mainScene = new LBUI3d.Scene3D();

    /**
     * Array of views managed by the app.
     * @member {LBUI3d.View3D[]}
     */
    this.views = [];

    /**
     * The current number of frames per second.
     * @member {Number}
     */
    this.fps = 0;

    /**
     * The number of times a frame has been rendered.
     * @member {Number}
     */
    this.frameCount = 0;
    
    /**
     * The number of milliseconds elapsed between the last frame and the current frame.
     */
    this.lastFrameMillisecs = 0;
    
    /**
     * The mouse mode currently active in all the views.
     * @member {LBUI3d.View3D.MOUSE_ROTATE_MODE|LBUI3d.View3D.MOUSE_PAN_MODE}
     */
    this.mouseMode = LBUI3d.View3D.MOUSE_ROTATE_MODE;
    
    
    this._nextSecondTimeStamp = (performance || Date).now() + 1000;
    this._prevSecondFrameCount = 0;
    this._lastFrameTimeStamp = 0;
};

LBUI3d.App3D.RUN_STATE_NOT_STARTED = 0;
LBUI3d.App3D.RUN_STATE_RUNNING = 1;
LBUI3d.App3D.RUN_STATE_PAUSED = 2;

LBUI3d.App3D.activeApp = undefined;
LBUI3d.App3D.prototype = {
    constructor: LBUI3d.App3D
};

LBUI3d.App3D.prototype.init = function(mainContainer) {
    this.mainContainer = mainContainer;
    var me = this;
    window.addEventListener('resize', function() { me.onWindowResize(); }, false);
};

LBUI3d.App3D.prototype.getRunState = function() {
    return this._runState;
};

LBUI3d.App3D.prototype.isRunning = function() {
    return this._runState === LBUI3d.App3D.RUN_STATE_RUNNING;
};

LBUI3d.App3D.prototype.isPaused = function() {
    return this._runState === LBUI3d.App3D.RUN_STATE_PAUSED;
};

LBUI3d.App3D.prototype.togglePaused = function() {
    if (this._runState === LBUI3d.App3D.RUN_STATE_RUNNING) {
        this.pause();
    }
    else {
        this.runContinuous();
    }
};

LBUI3d.App3D.prototype.pause = function() {
    if (this._runState === LBUI3d.App3D.RUN_STATE_RUNNING) {
        this._runState = LBUI3d.App3D.RUN_STATE_PAUSED;
    }
};

LBUI3d.App3D.prototype.runContinuous = function() {
    if (this._runState !== LBUI3d.App3D.RUN_STATE_RUNNING) {
        this._runState = LBUI3d.App3D.RUN_STATE_RUNNING;
        LBUI3dApp3DAnimate((performance || Date).now());
    }
};

LBUI3d.App3D.prototype.runSingleStep = function() {
    if (this._runState === LBUI3d.App3D.RUN_STATE_RUNNING) {
        this.enterPaused();
    }
    else {
        LBUI3dApp3DAnimate((performance || Date).now());
        this._runState = LBUI3d.App3D.RUN_STATE_PAUSED;
    }
};

LBUI3d.App3D.prototype.addView = function(view) {
    this.views.push(view);
    view.setMouseMode(this.mouseMode);
};

LBUI3d.App3D.prototype.removeView = function(view) {
    var index = this.views.indexOf(view);
    if (index >= 0) {
        this.views.splice(index, 1);
    }
};

LBUI3d.App3D.prototype.setMouseMode = function(mode) {
    if (this.mouseMode !== mode) {
        this.views.forEach(function(view) {
            view.setMouseMode(mode);
        });
        this.mouseMode = mode;
    }
};

LBUI3d.App3D.prototype.setRotateMode = function() {
    this.setMouseMode(LBUI3d.View3D.MOUSE_ROTATE_MODE);
};

LBUI3d.App3D.prototype.setPanMode = function() {
    this.setMouseMode(LBUI3d.View3D.MOUSE_PAN_MODE);
};

LBUI3d.App3D.prototype.nextMouseMode = function() {
    switch (this.mouseMode) {
    case LBUI3d.View3D.MOUSE_PAN_MODE :
        this.setRotateMode();
        return LBUI3d.View3D.MOUSE_PAN_MODE;
        
    case LBUI3d.View3D.MOUSE_ROTATE_MODE :
        this.setPanMode();
        return LBUI3d.View3D.MOUSE_ROTATE_MODE;
    }
    return this.mouseMode;
};

LBUI3d.App3D.prototype.onWindowResize = function() {
    this.views.forEach(function(view) {
        view.onWindowResize();
    });
};

LBUI3d.App3D.prototype.toggleFullScreen = function(container) {
    container = container || this.mainContainer;
    return LBUtil.toggleFullScreen(container);
};

LBUI3d.App3D.prototype.isPaused = function() {
    
};

LBUI3d.App3D.prototype.update = function() {
    
};

LBUI3d.App3D.prototype.render = function() {
    this.views.forEach(function(view) {
        view.render();
    });
};

LBUI3d.App3D.prototype.fpsUpdated = function() {
    
};

LBUI3d.App3D.prototype._cycle = function(timeStamp) {
    if (this._runState === LBUI3d.App3D.RUN_STATE_RUNNING) {
        requestAnimationFrame(LBUI3dApp3DAnimate);
    }
    
    if (timeStamp >= this._nextSecondTimeStamp) {
        this.fps = (this.frameCount - this._lastSecondFrameCount) * 1000 / (timeStamp - this._nextSecondTimeStamp + 1000);
        this._lastSecondFrameCount = this.frameCount;
        this._nextSecondTimeStamp = timeStamp + 1000;
        this.fpsUpdated();
    }
    
    if (this._lastFrameTimeStamp) {
        this.lastFrameMillisecs = timeStamp - this._lastFrameTimeStamp;
    }
    else {
        this.lastFrameMillisecs = 1/60;
    }
    
    this.update();
    this.render();
    ++this.frameCount;

    this._lastFrameTimeStamp = timeStamp;
};

function LBUI3dApp3DAnimate(timeStamp) {
    LBUI3d.App3D.activeApp._cycle(timeStamp);
}

LBUI3d.App3D.prototype.start = function(mainContainer, startPaused) {
    LBUI3d.App3D.activeApp = this;
    
    this.init(mainContainer);
    
    if (startPaused) {
        this._runState = LBUI3d.App3D.RUN_STATE_PAUSED;
    }
    else {
        this._runState = LBUI3d.App3D.RUN_STATE_RUNNING;
        LBUI3dApp3DAnimate((performance || Date).now());
    }
};

return LBUI3d;
});