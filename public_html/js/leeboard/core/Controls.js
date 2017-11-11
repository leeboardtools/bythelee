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


define(['lbutil', 'lbmath'],
function(LBUtil, LBMath) {
    
    'use strict';

/**
 * This module contains classes that can be used to control something. The controller
 * classes have a setValue() and a getValue() method, the setValue() method is used to
 * control the controller.
 * @exports LBControls
 */
var LBControls = LBControls || {};
LBUtil.registerNamespace('LBControls', LBControls);

/**
 * A controller whose value is any value between a minimum and a maximum value.
 * @constructor
 * @param {String} [name=""]    The name for the controller, used to identify the controller.
 * @param {Number} [minValue=0] The minimum value allowed.
 * @param {Number} [maxValue=100]   The maximum value allowed.
 * @param {Number} [initialValue=minValue]  The initial value.
 * @param {Function} controllee The function called whenever the controller's value is changed.
 * @returns {module:LBControls.SmoothController}
 */
LBControls.SmoothController = function(name, minValue, maxValue, initialValue, controllee) {
    this.name = name || "";
    
    /**
     * The minimum value allowed by the controller.
     * @member {Number}
     */
    this.minValue = minValue || 0;
    
    /**
     * The maximum value allowed by the controller.
     * @member {Number}
     */
    this.maxValue = maxValue || 100;
    if (this.minValue > this.maxValue) {
        var tmp = this.minValue;
        this.minValue = this.maxValue;
        this.maxValue=  tmp;
    }
    
    /**
     * The current value of the controller.
     * @member {Number}
     */
    this.currentValue = initialValue || this.minValue;
    
    /**
     * The function that is called whenever the value of the controller changes.
     * It should have the signature:<p>
     * controllee = function(currentValue, controller) {}
     */
    this.controllee = controllee;
    
};

LBControls.SmoothController.prototype = {
    /**
     * Retrieves the current value of the controller.
     * @returns {Number}
     */
    getValue: function() {
        return this.currentValue;
    },
    
    /**
     * Sets the value for the controller.
     * @param {Number} value    The new value.
     * @param {Boolean} isOffset    If true value is an offset to be added to the
     * current value of the controller.
     * @returns {module:LBControls.SmoothController} this.
     */
    setValue: function(value, isOffset) {
        if (isOffset) {
            if (this.offsetValueMapper) {
                value = this.offsetValueMapper.mapOffset(this.currentValue, value);
            }
            value += this.currentValue;
        }
        value = LBMath.clamp(value, this.minValue, this.maxValue);
        if (value !== this.currentValue) {
            this.currentValue = value;
            if (this.controllee) {
                this.controllee(this.currentValue, this);
            }
        }
        
        return this;
    },
    
    /**
     * Sets the value for the controller based upon a value between a lower
     * and an upper value that are mapped to the range limits of the controller.
     * @param {Number} value    The value.
     * @param {Number} minValue   The value of value mapped to the controller's {@link module:LBControls.SmoothController#minValue}..
     * @param {Number} maxValue   The value of value mapped to the controller's {@link module:LBControls.SmoothController#maxValue}..
     * @returns {module:LBControls.SmoothController} this.
     */
    setMappedValue: function(value, minValue, maxValue) {
        if ((minValue !== undefined) && (maxValue !== undefined) && (minValue !== maxValue)) {
            value = LBMath.mapInRange(value, minValue, maxValue, this.minValue, this.maxValue);
        }
        return this.setValue(value);
    },
    
    /**
     * Loads the controller from properties in a data object.
     * @param {object} data The data object.
     * @param {object} owner    An object for use by derived implementations.
     * @returns {module:LBControls.SmoothController} this.
     */
    load: function(data, owner) {
        if (!data) {
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
        
        if (data.offsetValueMapper) {
            this.offsetValueMapper = LBUtil.newClassInstanceFromData(data.offsetValueMapper);
        }
        
        return this;
    },

    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        this.name = null;
        this.controllee = null;
    },
    
    constructor: LBControls.SmoothController    
};

/**
 * A mapper object for use as the {@link module:LBControls.SmoothController#offsetValueMapper} that uses
 * a simple cubic spline via {@link module:LBMath.CSpline}.
 * @constructor
 * @param {object} splineData   The spline data, this should be an object containing two properties,
 * 'xs' and 'ys', each an array of values defining the spline values.
 * @returns {module:LBControls.CSplineValueMapper}
 */
LBControls.CSplineValueMapper = function(splineData) {
    this.cSpline = new LBMath.CSpline(splineData);
};

LBControls.CSplineValueMapper.prototype = {
    /**
     * Maps an offset value by multiplying it by the interpolated value from the spline for
     * the current controller value.
     * @param {Number} currentValue The current controller value.
     * @param {Number} offset   The offset value to be mapped.
     * @returns {Number}    The mapped offset value.
     */
    mapOffset: function(currentValue, offset) {
        return this.cSpline.interpolate(currentValue) * offset;
    },
    
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.cSpline) {
            this.cSpline = this.cSpline.destroy();
        }
    },
    
    constructor: LBControls.CSplineValueMapper
};


/**
 * A controller that takes on a discrete set of values. The actual value of the controller
 * is an index into the discrete set of values.
 * @constructor
 * @param {String} [name=""]    The name of the controller, used to identify it.
 * @param {Array} [steps]   An array containing the 'steps' of the controller.
 * @param {Number} [initialValue=0] The initial value of the controller.
 * @param {Function} [controllee]   The function called whenever the current value of the controller
 * is changed.
 * @returns {module:LBControls.SteppedController}
 */
LBControls.SteppedController = function(name, steps, initialValue, controllee) {
    /**
     * The name of the controller.
     * @member {String}
     */
    this.name = name || "";
    
    /**
     * The array of the allowed steps of the controller.
     * @member {Array}
     */
    this.steps = steps || [];
    
    /**
     * The current value of the controller, this is an index int the steps array.
     * @member {Number}
     */
    this.currentValue = initialValue || 0;
    
    /**
     * The function that is called whenever the current value of the controller is
     * changed. The function should have the signature:<p>
     * controllee = function(value, controllee) {}<p>
     * where value is the object of the steps array (you can obtain the index from controllee.getValue()).
     */
    this.controllee = controllee;
};

LBControls.SteppedController.prototype = {
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        this.controllee = null;        
    },
    
    constructor: LBControls.SteppedController,
    
    /**
     * Retrieves the current value of the controller, which is an index.
     * @returns {Number}    The current value.
     */
    getValue: function() {
        return this.currentValue;
    },
    
    /**
     * Retrieves the object referred to by the current value index.
     * @returns {object}    The object.
     */
    getCurrentObject: function() {
        return this.steps[this.currentValue];
    },
    
    /**
     * Changes the current value.
     * @param {Number} value    The current value, which is an index.
     * @returns {module:LBControls.SteppedController}  this.
     */
    setValue: function(value) {
        value = LBMath.clamp(Math.round(value), 0, this.steps.length - 1);
        if (value !== this.currentValue) {
            this.currentValue = value;
            if (this.controllee) {
                this.controllee(this.steps[this.currentValue], this);
            }
        }
        
        return this;
    },
    
        
    /**
     * Loads the controller from properties in a data object.
     * @param {object} data The data object.
     * @param {object} owner    An object for use by derived implementations.
     * @returns {module:LBControls.SmoothController} this.
     */
    load: function(data, owner) {
        if (!data) {
            return this;
        }

        this.name = data.name || "";
        
        if (data.steps) {
            this.steps = data.steps.slice();
        }
        
        this.currentValue = data.currentValue || 0;
        this.currentValue = LBMath.clamp(Math.round(this.currentValue), 0, this.steps.length - 1);
        
        return this;
    }
};

/**
 * Creates and loads a controller based upon properties in a data object.
 * @param {object} data The data object.
 * @param {object} owner    An object passed as the owner argument to the load functions
 * of the individual controllers.
 * @returns {object}    The controller.
 */
LBControls.createControllerFromData = function(data, owner) {
    if (!data) {
        return undefined;
    }
    
    var controller;
    if (data.className) {
        controller = LBUtil.newClassInstanceFromData(data);
    }
    else {
        controller = new LBControls.SmoothController();
    }
    
    return controller.load(data, owner);
};

return LBControls;
});
