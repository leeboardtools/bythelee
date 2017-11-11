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


/* global LBGeometry */

define(['lbgeometry'], function(LBGeometry) {

    'use strict';

    
/**
 * 
 * @namespace LBThreeJS
 */
var LBThreeJS = LBThreeJS || {};

/**
 * Converts a vector from LBPhysics coordinates (z-up) to ThreeJS coordinates (y-up).
 * @param {module:LBGeometry.Vector3} vec  The vector to be converted.
 * @param {module:LBGeometry.Vector3} [store]    If defined the vector to store into.
 * @returns {module:LBGeometry.Vector3}    The ThreeJS coordinate version of vec.
 */
LBThreeJS.toPhysicsVector3 = function(vec, store) {
    store = store || new LBGeometry.Vector3();
    return store.set(vec.x, -vec.z, vec.y);
};

/**
 * Converts a vector from ThreeJS coordinates (y-up) to LBPhysics coordinates (z-up).
 * @param {module:LBGeometry.Vector3} vec  The vector to be converted.
 * @param {module:LBGeometry.Vector3} [store]    If defined the vector to store into.
 * @returns {module:LBGeometry.Vector3}    The LBPhysics coordinate version of vec.
 */
LBThreeJS.toTHREEVector3 = function(vec, store) {
    store = store || new LBGeometry.Vector3();
    return store.set(vec.x, vec.z, -vec.y);
};

return LBThreeJS;
});