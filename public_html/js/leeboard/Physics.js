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

/* global Leeboard */

/**
 * Calculates the moment about the origin of a force applied at a position.
 * @param {type} force  The force.
 * @param {type} position   The application point of the force.
 * @returns {THREE.Vector3} Vector representing the moment about the origin from 
 * force being applied at position.
 */
Leeboard.calcMoment = function(force, position) {
    return Leeboard.crossVectors3D(position, force);
}

Leeboard.Resultant3D = function(force, moment, position) {
    this.force = Leeboard.copyCommonProperties(Leeboard.createVector3D(), force);
    this.moment = Leeboard.copyCommonProperties(Leeboard.createVector3D(), moment);
    this.applPoint = Leeboard.copyCommonProperties(Leeboard.createVector3D(), position);
};

Leeboard.Resultant3D.prototype = {
    clone: function() {
        return new Leeboard.Resultant3D(this.force, this.moment, this.applPoint);
    },
    
    addForce: function(force, position) {
        if (!this.applPoint.equals(position)) {
            var arm = Leeboard.subVectors3D(position, this.applPoint);
            var moment = Leeboard.calcMoment(force, arm);
            this.moment.add(moment);
        }
        
        this.force.add(force);
    },
    
    addResultant: function(other) {
        var deltaPos = Leeboard.subVectors3D(other.applPoint, this.applPoint);
        var moment = Leeboard.calcMoment(other.force, deltaPos);
        moment.add(other.moment);
        
        this.moment.add(moment);
        this.force.add(other.force);
    },
    
    moveApplPoint: function(position) {
        if (!this.applPoint.equals(position)) {
            var r = Leeboard.subVectors3D(this.applPoint, position);
            var moment = Leeboard.calcMoment(this.force, r);
            this.moment.add(moment);
            this.applPoint.copy(position);
        }
    },
    
    convertToWrench: function() {
        var forceMagSq = this.force.lengthSq();
        if (Leeboard.isLikeZero(forceMagSq)) {
            return;
        }
        
        // Find the parallel moment.
        var normScale = 1./Math.sqrt(forceMagSq);
        var forceDir = Leeboard.createVector3D(this.force.x * normScale, this.force.y * normScale, this.force.z * normScale);        
        var pMoment = forceDir.multiplyScalar(this.moment.dot(forceDir));

        // And then the perpendicular moment, which is moment - parallel moment.
        var moment = Leeboard.subVectors3D(this.moment, pMoment);
        if (Leeboard.isVectors3DLikeZero(moment)) {
            // Already a wrench...
            return;
        }
        
        var r = Leeboard.crossVectors3D(moment, this.force);
        r.multiplyScalar(-1./forceMagSq);
        
        this.applPoint.add(r);
        this.moment.copy(pMoment);
    }
};
