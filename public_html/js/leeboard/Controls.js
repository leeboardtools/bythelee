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


/* global LBMath, Leeboard, LBGeometry */


var LBControls = LBControls || {};

LBControls.SmoothController = function(name, minValue, maxValue, initialValue, controllee) {
    this.name = name || "";
    this.minValue = minValue || 0;
    this.maxValue = maxValue || Number.MAX_VALUE;
    if (this.minValue > this.maxValue) {
        var tmp = this.minValue;
        this.minValue = this.maxValue;
        this.maxValue=  tmp;
    }
    
    this.currentValue = initialValue || this.minValue;
    this.controllee = controllee;
};

LBControls.SmoothController.prototype = {
    constructor: LBControls.SmoothController,
    
    getValue: function() {
        return this.currentValue;
    },
    
    setValue: function(value) {
        value = LBMath.clamp(value, this.minValue, this.maxValue);
        if (value !== this.currentValue) {
            this.currentValue = value;
            if (Leeboard.isVar(this.controllee)) {
                this.controllee(this.currentValue, this);
            }
        }
        
        return this;
    },
    
    load: function(data, owner) {
        if (!Leeboard.isVar(data)) {
            return this;
        }
        
        this.name = data.name || "";
        this.minValue = data.minValue || 0;
        this.maxValue = data.maxValue || Number.MAX_VALUE;
        if (this.minValue > this.maxValue) {
            var tmp = this.minValue;
            this.minValue = this.maxValue;
            this.maxValue=  tmp;
        }
        
        if (data.currentValue) {
            this.currentValue = data.currentValue;
        }
        else if ((this.minValue >= 0) || (this.maxValue < 0)) {
            this.currentValue = this.minValue;
        }
        else {
            this.currentValue = 0;
        }
        this.currentValue = LBMath.clamp(this.currentValue, this.minValue, this.maxValue);
        
        return this;
    }
};


LBControls.SteppedController = function(name, steps, initialValue, controllee) {
    this.name = name || "";
    this.steps = steps;
    this.currentValue = initialValue || 0;
    this.controllee = controllee;
};

LBControls.SteppedController.prototype = {
    constructor: LBControls.SteppedController,
    
    setValue: function(value) {
        value = LBMath.clamp(Math.round(value), 0, this.steps.length - 1);
        if (value !== this.currentValue) {
            this.currentValue = value;
            if (Leeboard.isVar(this.controllee)) {
                this.controllee(this.steps[this.currentValue], this);
            }
        }
        
        return this;
    },
    
    load: function(data, owner) {
        if (!Leeboard.isVar(data)) {
            return this;
        }

        this.name = data.name || "";
        
        if (Leeboard.isVar(data.steps)) {
            this.steps = data.steps.slice(0, data.steps.length);
        }
        
        this.currentValue = data.currentValue || 0;
        this.currentValue = LBMath.clamp(Math.round(this.currentValue), 0, this.steps.length - 1);
        
        return this;
    }
};

LBControls.createControllerFromData = function(data, owner) {
    if (!Leeboard.isVar(data)) {
        return undefined;
    }
    
    var controller;
    if (Leeboard.isVar(data.construct)) {
        controller = eval(data.construct);
    }
    else {
        controller = new LBControls.SmoothController();
    }
    
    return controller.load(data, owner);
};


LBControls.Object3DRotator = function(obj3D, axis) {
    this.obj3D = obj3D;
    this.axis = axis || LBGeometry.createVector3(1, 0, 0);
    this.degOffset = 0;
    this.minDeg = 0;
    this.maxDeg = 360;
};

LBControls.Object3DRotator.prototype = {
    constructor: LBControls.Object3DRotator,
    getMinValue: function() {
        return this.minDeg;
    },
    
    getMaxValue: function() {
        return this.maxDeg;
    },
    
    setValue: function(value) {
        if (Leeboard.isVar(this.obj3D)) {
            value = LBMath.clamp(value, this.minDeg, this.maxDeg);
            this.obj3D.rotateOnAxis(this.axis, (value + this.degOffset) * LBMath.DEG_TO_RAD);
        }
        return this;
    },
    
    load: function(data) {
        if (!Leeboard.isVar(data)) {
            return;
        }
        
        if (Leeboard.isVar(data.obj3D)) {
            this.obj3D = LBGeometry.createObject3DFromData(data.obj3D);
        }
        LBGeometry.loadVector3(data.axis, this.axis);
        this.degOffset = data.degOffset || this.degOffset;
        this.minDeg = data.minDeg || this.minDeg;
        this.maxDeg = data.maxDeg || this.maxDeg;
    }
};


LBControls.Object3DTranslater = function(obj3D, curve) {
    this.obj3D = obj3D;
    this.curve = curve;
};

LBControls.Object3DTranslater.prototype = {
    constructor: LBControls.Object3DTranslater,
    
    setValue: function(value) {
        if (Leeboard.isVar(this.obj3D) && Leeboard.isVar(curve)) {
            
        }
        return this;
    }
}