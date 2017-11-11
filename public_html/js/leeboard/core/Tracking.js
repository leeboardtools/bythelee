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


define(['lbutil', 'lbmath'],
function(LBUtil, LBMath) {
    "use strict";


/**
 * This module contains stuff for tracking something that's changing.
 * @exports LBTracking
 */
var LBTracking = LBTracking || {};


/**
 * A value that follows another value with some slack in the following of the
 * other value.
 * <p>
 * This works by maintaining a target value, to which the value is slowly moved
 * towards. The target value is updated when the value being followed is outside
 * the slack range surrounding the target value.
 * <p>
 * @constructor
 * @param {Object} options
 * @returns {module:LBTracking.ValueFollower}
 */
LBTracking.ValueFollower = function(options) {
    options = options || {};
    
    /**
     * The amount of slack above or below the target before which the target will 
     * updated to the followed value.
     * @member {Number}
     */
    this.slack = options.slack || 1;
    
    /**
     * The amount of slack above or below the current value within which the target
     * may lie without updating the value.
     * @member {Number}
     */
    this.targetSlack = options.targetSlack || (this.slack * 0.1);
    
    /**
     * The tracking gain, the amount the error between the target and the current
     * value is multiplied to obtain the immediate correction.
     * @member {Number}
     */
    this.trackingGain = options.trackingGain || 0.1;
    
    /**
     * The current value.
     * @member {Number}
     */
    this.value = options.value || 0;
    
    /**
     * The target value.
     * @member {Number}
     */
    this.target = options.target || this.value;
};


LBTracking.ValueFollower.prototype = {
    /**
     * Sets the value and the target value.
     * @param {Number} value    The value to set to.
     * @returns {module:LBTracking.ValueFollower}  this.
     */
    setValue: function(value) {
        this.target = this.value = value;
        return this;
    },
    
    /**
     * The following function, this must be called in order to actually follow a value.
     * @param {Number} toFollow The value to follow.
     * @returns {Number}    Our current value.
     */
    follow: function(toFollow) {
        if ((toFollow < (this.target - this.slack)) || (toFollow > (this.target + this.slack))) {
            this.target = toFollow;
        }
        
        if ((this.target < (this.value - this.targetSlack)) || (this.target > (this.value + this.targetSlack))) {
            this.value += this.trackingGain * (this.target - this.value);
        }
        
        return this.value;
    },
    
    constructor: LBTracking.ValueFollower
};
    
return LBTracking;
});
