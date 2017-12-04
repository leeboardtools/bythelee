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


define(['lbsailsimbase', 'lbutil', 'lbgeometry', 'lbmath'], function(LBSailSim, LBUtil, LBGeometry, LBMath) {
    'use strict';

/**
 * This module contains classes for racing.
 * @exports LBRacing
 */
var LBRacing = LBRacing || {};


/**
 * A race course defines the components of a race course, which includes a starting line,
 * 0 or more marks, and a finish line. Both the starting and finish lines are in fact marks.
 * @constructor
 * @param {Object} options
 * @returns {module:LBRacing.Course}
 */
LBRacing.Course = function(options) {
    options = options || {};
    
    /**
     * The name of the course.
     * @member {String}
     */
    this.name = options.name;
    
    /**
     * The course's type.
     * @member {String}
     */
    this.type = options.type;
    
    /**
     * The starting line.
     * @member {module:LBRacing.LineMark}
     */
    this.start = options.start;
    this.start.isStart = true;
    
    /**
     * The array of marks between the starting line and the finish line.
     * @member {module:LBRacing.Mark[]}
     */
    this.marks = options.marks || [];
    
    /**
     * The finish line.
     * @member {module:LBRacing.LineMark}
     */
    this.finish = options.finish;
    this.finish.isFinish = true;
    
    
    var length = this.marks.length;
    if (length > 0) {
        this.start.nextMark = this.marks[0];
        this.marks[0].prevMark = this.start;
        for (var i = 1; i < length; ++i) {
            this.marks[i - 1].nextMark = this.marks[i];
            this.marks[i].prevMark = this.marks[i - 1];
        }
        this.marks[length - 1].nextMark = this.finish;
        this.finish.prevMark = this.marks[length - 1];
    }
    else {
        this.start.nextMark = this.finish;
        this.finish.prevMark = this.start;
    }
};

LBRacing.Course.prototype = {};
LBRacing.Course.prototype.constructor = LBRacing.Course;


/**
 * Updates the current state of the course.
 * @param {Number} dt   The time step.
 * @returns {undefined}
 */
LBRacing.Course.prototype.update = function(dt) {
    this.marks.forEach(function(mark) {
        mark.update(dt);
    });
};

/**
 * Creates a course based on properties in a data object.
 * @param {module:LBSailSim.SailEnv} sailEnv    The sailing environment.
 * @param {Object} data The data object.
 * @returns {module:LBRacing.Course}
 */
LBRacing.Course.createFromData = function(sailEnv, data) {
    var options = {};
    options.name = data.name;
    options.type = data.type;
    options.start = LBRacing.Mark.createFromData(sailEnv, data.start);
    options.finish = LBRacing.Mark.createFromData(sailEnv, data.finish);
    
    if (data.marks) {
        options.marks = [];
        data.marks.forEach(function(markData) {
            var mark = LBRacing.Mark.createFromData(sailEnv, markData);
            if (mark) {
                options.marks.push(mark);
            }
        });
    }
    
    return new LBRacing.Course(options);
};

/**
 * Loads an array of courses from an array of data objects compatible with
 * {@link module:LBRacing.Course.createFromData}.
 * @param {module:LBSailSim.SailEnv} sailEnv    The sailing environment.
 * @param {Object[]} data   The array of data objects.
 * @returns {module:LBRacing.Course[]}  The array of courses.
 */
LBRacing.Course.loadCoursesFromData = function(sailEnv, data) {
    var courses = [];
    data.forEach(function(courseData) {
        var course = LBRacing.Course.createFromData(sailEnv, courseData);
        if (course) {
            courses.push(course);
        }
    });
    
    return courses;
};

/**
 * Removes the course from use.
 * @returns {undefined}
 */
LBRacing.Course.destroy = function() {
    if (this.allMarks) {
        this.allMarks.forEach(function(mark) {
            mark.destroy();
        });
        this.start = null;
        this.finish = null;
        this.allMarks = null;
    }
};


/**
 * Base class for marks in a race course. A mark defines something that must be
 * passed or achieved before proceeding along the course.
 * @constructor
 * @param {module:LBSailSim.SailEnv} sailEnv    The sailing environment.
 * @param {Object} options
 * @returns {module:LBRacing.Mark}
 */
LBRacing.Mark = function(sailEnv, options) {
    options = options || {};
    this.sailEnv = sailEnv;
    this.name = options.name;
    this.type = options.type;
};

LBRacing.Mark.prototype = {};
LBRacing.Mark.prototype.constructor = LBRacing.Mark;

/**
 * Creates a tracker for the mark.
 * @param {module:LBRacing.Competitor} competitor   The competitor to track.
 * @param {module:LBRacing.Mark} nextMark   The next mark, may be undefined.
 * @returns {module:LBRacing.MarkTracker}   The mark tracker.
 */
LBRacing.Mark.prototype.createMarkTracker = function(competitor, nextMark) {
    throw "LBRacing.Mark.createMarkTracker() not implemented!";
};

/**
 * @returns {module:LBGeometry.Vector2} The center position of the mark, used to define
 * boundaries with other marks.
 */
LBRacing.Mark.prototype.getMarkCenterPosition = function() {
    throw "LBRacing.Mark.getMarkCenterPosition() not implemented!";
};

/**
 * Retrieves the base position of the mark. This defines one end of the mark's
 * crossing line, the line used to determine if a mark has been tentatively passed.
 * @returns {module:LBGeometry.Vector2} The base position of the mark.
 */
LBRacing.Mark.prototype.getMarkBasePosition = function() {
    throw "LBRacing.Mark.getMarkBasePosition() not implemented!";
};

/**
 * Retrieves the end position of the mark. This defines the end of the mark's
 * crossing line, opposite the base position of the mark.
 * @returns {module:LBGeometry.Vector2} The end position of the mark.
 */
LBRacing.Mark.prototype.getMarkEndPosition = function() {
    throw "LBRacing.Mark.getMarkEndPosition() not implemented!";
};

/**
 * @returns {Boolean}   true if the crossing line is a line segment and the competitor
 * has to pass between the base and end positions, otherwise it is a ray starting
 * from base.
 */
LBRacing.Mark.prototype.isCrossingLineSegment = function() {
    throw "LBRacingMark.isCrossingLineSegment not implemented!";
};

/**
 * Returns the result from {@link module:LBGeometry.whichSideOfLine} when {@link module:LBRacing.Mark#getMarkBasePosition}
 * is the from argument and {@link module:LBRacing.Mark#getMarkEndPosition} is the to argument that
 * determines the side where the competitor's position is when the crossing line
 * has been crossed.
 * @returns {module:LBGeometry.LINE_SIDE_LEFT|module:LBGeometry.LINE_SIDE_RIGHT}
 */
LBRacing.Mark.prototype.getCrossingLinePassedSide = function() {
    throw "LBRacing.Mark.getMarkEndPosition() not implemented!";
};



/**
 * Removes the mark from use.
 * @returns {undefined}
 */
LBRacing.Mark.prototype.destroy = function() {
    if (this.sailEnv) {
        this.sailEnv = null;
    }
};

/**
 * Updates the current state of the mark.
 * @param {Number} dt   The time step.
 */
LBRacing.Mark.prototype.update = function(dt) {
    
};


/**
 * Creates a mark based upon the properties in a data object.
 * @param {module:LBSailSim.SailEnv} sailEnv    The sailing environment.
 * @param {Object} data The data object.
 * @returns {module:LBRacing.Mark}
 */
LBRacing.Mark.createFromData = function(sailEnv, data) {
    switch (data.type) {
        case 'start' :
        case 'finish' :
        case 'gate' :
            return new LBRacing.LineMark(sailEnv, data);
            
        case 'port' :
        case 'stbd' :
            return new LBRacing.RoundingMark(sailEnv, data);
    }
};



/**
 * Base class for the object used to track a competitor's progress around a mark.
 * @constructor
 * @param {module:LBRacing.Competitor} competitor   The competitor being tracked.
 * @param {module:LBRacing.Mark} mark   The mark creating this.
 * @param {module:LBRacing.Mark} nextMark   The next mark, may be undefined.
 * @returns {module:LBRacing.MarkTracker}
 */
LBRacing.MarkTracker = function(competitor, mark, nextMark) {
    this.competitor = competitor;
    this.mark = mark;
    this.nextMark = nextMark;
    
    /**
     * The last position of the competitor.
     * @readonly
     * @member {module:LBGeometry.Vector3}
     */
    this.competitorLastPosition = competitor.boat.obj3D.position.clone();
    
    /**
     * Flag set to true if the mark was touched.
     * @member {Boolean}
     */
    this.isMarkTouched = false;
    
    /**
     * The number of times the competitor has cross the 'mark crossing' line, the mark
     * should only be considered successfully passed if this is 1 (if it is more than 1
     * then the competitor has made at least one loop and needs to unwind).
     * @member {Number}
     */
    this.markPassedCount = 0;
    
    /**
     * Flag set to true once the competitor has crossed the mid-point between the tracked
     * mark and the next mark AND {@link module:LBRacing.MarkTracker#markPassedCount} is 1.
     * Once this flag is true tracking ends.
     */
    this.isMarkPassed = false;
};

LBRacing.MarkTracker.prototype = {};
LBRacing.MarkTracker.prototype.constructor = LBRacing.MarkTracker;

var _markTrackerIntersection =  [];


/**
 * The main detection method, this determines when the competitor crosses the line in
 * the appropriate direction as well as taking into account crossing in the inappropriate direction,
 * updating the {@link module:LBRacing.MarkTracker#markPassedCount} and {@link module:LBRacing.MarkTracker#isMarkPassed}
 * properties as needed.
 * @param {Number} dt   The time step.
 * @returns {undefined}
 */
LBRacing.MarkTracker.prototype.update = function(dt) {
    if (this.isMarkPassed) {
        return;
    }
    
    var basePos = this.mark.getMarkBasePosition();
    var farPos = this.mark.getMarkEndPosition();
    var passedSide = this.mark.getCrossingLinePassedSide();
    var farParametizedLimit = (this.mark.isCrossingLineSegment()) ? 1 : Number.POSITIVE_INFINITY;
    
    // TODO:
    // Update this to use the point on the boat farthest forward in terms of direction of travel.
    var competitorCurrentPosition = this.competitor.boat.obj3D.position;
    
    var boatSideOfLine = LBGeometry.whichSideOfLine(basePos, farPos, competitorCurrentPosition);
    if (!this.competitorLastSideOfLine) {
        // We want to wait until the boat has entered the non-passed side of the line before we begin
        // to start checking.
        if (boatSideOfLine === -passedSide) {
            this.competitorLastSideOfLine = boatSideOfLine;
        }
    }
    else {
        // Note we're ignoring being on the line...
        if (boatSideOfLine && (boatSideOfLine !== this.competitorLastSideOfLine)) {
            var intersection = LBGeometry.calcParametricLineIntersection(basePos, farPos, this.competitorLastPosition, competitorCurrentPosition, _markTrackerIntersection);
            if ((intersection.length === 2) 
                    && (intersection[0] >= 0) && (intersection[0] <= 1) 
                    && (intersection[1] >= 0) && (intersection[1] <= farParametizedLimit)) {
                if (boatSideOfLine === passedSide) {
                    ++this.markPassedCount;
                    if ((this.markPassedCount === 1) && !this.mark.nextMark) {
                        // We're done!
                        this.isMarkPassed = true;
                    }
                }
                else {
                    --this.markPassedCount;
                    if (!this.mark.prevMark) {
                        // This lets you dip start....
                        this.markPassedCount = Math.max(0, this.markPassedCount);
                    }
                }
            }

            this.competitorLastSideOfLine = boatSideOfLine;
        }
    }
    
    if ((this.markPassedCount === 1) && !this.isMarkPassed) {
        if (this.mark.nextMark) {
            var distanceFromMark = this.competitor.boat.obj3D.position.distanceTo(this.mark.getMarkCenterPosition());
            var distanceToNextMark = this.competitor.boat.obj3D.position.distanceTo(this.mark.nextMark.getMarkCenterPosition());
            if (distanceToNextMark < distanceFromMark) {
                this.isMarkPassed = true;
            }
        }
        else {
            this.isMarkPassed = true;
        }
    }

    this.competitorLastPosition.copy(competitorCurrentPosition);
};

/**
 * Removes the mark tracker from use.
 * @returns {undefined}
 */
LBRacing.MarkTracker.prototype.destroy = function() {
    this.competitor = null;
    this.mark = null;
    this.nextMark = null;
    this.competitorLastPosition = null;
};


/**
 * A mark that has two objects, one that has to be left to port and one that has to be
 * left to starboard.
 * @implements {module:LBRacing.Mark}
 * @constructor
 * @param {module:LBSailSim.SailEnv} sailEnv    The sailing environment.
 * @param {Object} options
 * @returns {module:LBRacing.LineMark}
 */
LBRacing.LineMark = function(sailEnv, options) {
    LBRacing.Mark.call(this, sailEnv, options);
    
    this.isStart = false;
    this.isFinish = false;
    
    this.centerPosition = new LBGeometry.Vector3();
    this.portObject = sailEnv.getFloatingObject(options.port);
    if (!this.portObject) {
        console.log("Port floating object named '" + options.port + "' was not found in the sailing environment.");
    }
    
    this.stbdObject = sailEnv.getFloatingObject(options.stbd);
    if (!this.stbdObject) {
        console.log("Starboard floating object named '" + options.stbd + "' was not found in the sailing environment.");
    }
};

LBRacing.LineMark.prototype = Object.create(LBRacing.Mark.prototype);
LBRacing.LineMark.prototype.constructor = LBRacing.LineMark;

/**
 * @override
 * @inheritdoc
 * @param {type} competitor
 * @returns {Racing_L18.LBRacing.MarkTracker}
 */
LBRacing.LineMark.prototype.createMarkTracker = function(competitor) {
    return new LBRacing.MarkTracker(competitor, this);
};

/**
 * @override
 * @inheritdoc
 * @returns {Racing_L18.LBGeometry.Vector3}
 */
LBRacing.LineMark.prototype.getMarkCenterPosition = function() {
    if (this.portObject && this.stbdObject) {
        this.centerPosition.copy(this.portObject.obj3D.position)
                .add(this.stbdObject.obj3D.position)
                .multiplyScalar(0.5);
    }
    return this.centerPosition;
};

/**
 * @override
 * @inheritdoc
 * @returns {module:LBGeometry.Vector2} The base position of the mark.
 */
LBRacing.LineMark.prototype.getMarkBasePosition = function() {
    return this.portObject.obj3D.position;
};

/**
 * @override
 * @inheritdoc
 * @returns {module:LBGeometry.Vector2} The end position of the mark.
 */
LBRacing.LineMark.prototype.getMarkEndPosition = function() {
    return this.stbdObject.obj3D.position;
};

/**
 * @override
 * @inheritdoc
 * @returns {Boolean}   true if the crossing line is a line segment and the competitor
 * has to pass between the base and end positions, otherwise it is a ray starting
 * from base.
 */
LBRacing.LineMark.prototype.isCrossingLineSegment = function() {
    return true;
};

/**
 * @override
 * @inheritdoc
 * @returns {module:LBGeometry.LINE_SIDE_LEFT|module:LBGeometry.LINE_SIDE_RIGHT}
 */
LBRacing.LineMark.prototype.getCrossingLinePassedSide = function() {
    return LBGeometry.LINE_SIDE_LEFT;
};



/**
 * A mark that is a object that has to be left to one side.
 * @constructor
 * @implements {module:LBRacing.Mark}
 * @param {module:LBSailSim.SailEnv} sailEnv    The sailing environment.
 * @param {Object} options
 * @returns {module:LBRacing.RoundingMark}
 */
LBRacing.RoundingMark = function(sailEnv, options) {
    options = options || {};
    LBRacing.Mark.call(this, sailEnv, options);
    
    this.mark = sailEnv.getFloatingObject(options.mark);
    if (!this.mark) {
        console.log("Mark floating object named '" + options.mark + "' was not found in the sailing environment.");
    }
    
    if (options.type === 'port') {
        this.sideToLeave = 1;
        this.linePassedSide = LBGeometry.LINE_SIDE_LEFT;
    }
    else {
        this.sideToLeave = -1;
        this.linePassedSide = LBGeometry.LINE_SIDE_RIGHT;
    }
    
    this.farCrossingPos = new LBGeometry.Vector2();
    this.needsRefresh = true;
};

LBRacing.RoundingMark.prototype = Object.create(LBRacing.Mark.prototype);
LBRacing.RoundingMark.prototype.constructor = LBRacing.RoundingMark;

/**
 * @override
 * @inheritdoc
 * @param {type} competitor
 * @returns {Racing_L18.LBRacing.MarkTracker}
 */
LBRacing.RoundingMark.prototype.createMarkTracker = function(competitor) {
    return new LBRacing.MarkTracker(competitor, this);
};

/**
 * @override
 * @inheritdoc
 * @returns {Racing_L18.LBRacing.RoundingMark.mark.obj3D.position}
 */
LBRacing.RoundingMark.prototype.getMarkCenterPosition = function() {
    return this.mark.obj3D.position;
};

/**
 * @override
 * @inheritdoc
 * @returns {module:LBGeometry.Vector2} The base position of the mark.
 */
LBRacing.RoundingMark.prototype.getMarkBasePosition = function() {
    return this.mark.obj3D.position;
};

var _roundingMarkPrevDelta = new LBGeometry.Vector2();
var _roundingMarkNextDelta = new LBGeometry.Vector2();

/**
 * @override
 * @inheritdoc
 * @returns {module:LBGeometry.Vector2} The end position of the mark.
 */
LBRacing.RoundingMark.prototype.getMarkEndPosition = function() {
    if (this.needsRefresh) {
        var thisMarkPos = this.getMarkCenterPosition();
        // We need to update the line to cross. It's based on the 1/2 the angle between the
        // previous and next mark.
        var prevMarkPos = this.prevMark.getMarkCenterPosition();
        var nextMarkPos = this.nextMark.getMarkCenterPosition();

        var crossingRad;
        
        var result = LBGeometry.whichSideOfLine(thisMarkPos, prevMarkPos, nextMarkPos);
        if (result === LBGeometry.LINE_SIDE_ON_LINE) {
            // 90 degrees (to port) or -90 degrees (to stbd)...
            crossingRad = Math.atan2(prevDelta.y, prevDelta.x) + LBMath.PI_2 * this.sideToLeave;
        }
        else {
            // The mid-point angle is simply obtained from the angle the opposite corner
            // of the rhombus formed by the segments to the previous and next marks with the
            // mark.
            var prevDelta = _roundingMarkPrevDelta.copy(prevMarkPos)
                    .sub(thisMarkPos)
                    .normalize();
            var nextDelta = _roundingMarkNextDelta.copy(nextMarkPos)
                    .sub(thisMarkPos)
                    .normalize();
            
            var cornerX = nextDelta.x + prevDelta.x;
            var cornerY = nextDelta.y + prevDelta.y;
            crossingRad = Math.atan2(cornerY, cornerX);
            if (this.sideToLeave * result < 0) {
                crossingRad += Math.PI;
            }
        }
        
        var length = 1000;
        this.farCrossingPos.set(length * Math.cos(crossingRad), length * Math.sin(crossingRad))
                .add(thisMarkPos);
        
        this.needsRefresh = false;
    }
    
    return this.farCrossingPos;
};

/**
 * @override
 * @inheritdoc
 * @returns {Boolean}   true if the crossing line is a line segment and the competitor
 * has to pass between the base and end positions, otherwise it is a ray starting
 * from base.
 */
LBRacing.RoundingMark.prototype.isCrossingLineSegment = function() {
    return false;
};

/**
 * @override
 * @inheritdoc
 * @returns {module:LBGeometry.LINE_SIDE_LEFT|module:LBGeometry.LINE_SIDE_RIGHT}
 */
LBRacing.RoundingMark.prototype.getCrossingLinePassedSide = function() {
    return this.linePassedSide;
};


/**
 * @override
 * @inheritdoc
 * @param {type} dt
 * @returns {undefined}
 */
LBRacing.RoundingMark.prototype.update = function(dt) {
    this.needsRefresh = true;
};




/**
 * Manages a race, with a course and competitors.
 * @constructor
 * @param {module:LBSailSim.SailEnv} sailEnv    The sailing environment.
 * @param {module:LBRacing.Course} course  The course for the race.
 * @param {Object} options
 * @returns {module:LBRacing.Race}
 */
LBRacing.Race = function(sailEnv, course, options) {
    options = options || {};
    
    this.sailEnv = sailEnv;
    this.course = course;
    
    this.competitors = [];
    
    this.activeCompetitors = [];
    this.finishedCompetitors = [];
    this.dnfCompetitors = [];
    
    this.allMarks = [];
    
    /**
     * The current race state.
     * @member {Number}
     */
    this.state = LBRacing.RaceState.NOT_STARTED;
    
    this.preStartDuration = LBUtil.isVar(options.preStartDuration) ? options.preStartDuration : 10;
    this.secondsToStart = -1;
    this.startTime = 0;
    
    this.stateChangeCallbacks = [];
};

/**
 * States for {@link module:LBRacing.Race#state}.
 * @readonly
 * @enum {Number}
 */
LBRacing.RaceState = {
    /** The race has not started */
    NOT_STARTED:        0,
    
    /** 
     * The race is in the pre-start phase, new competitors added via {@link module:LBRacing.Race#addCompetitor}
     * are not included in the race.
     */
    PRE_START:          1,
    
    /**
     * The race has started
     */
    STARTED:            2,
    
    /**
     * At least one competitor has crossed the finish line, but there are still boats racing.
     */
    FINISHING:          3,
    
    /**
     * The race is done, all competitors have either finished, retired, or been disqualified.
     */
    ALL_DONE:           4,
    
    /**
     * The race was abandoned.
     */
    ABANDONED:          5
};


LBRacing.Race.prototype = {};
LBRacing.Race.prototype.constructor = LBRacing.Race;

/**
 * Adds a competitor to the race. Newly added competitors will not participate in the
 * active race if there is one. If the boat is a competitor in another race, it will
 * be removed from that race.
 * @param {module:LBSailSim.Vessel} boat    The boat.
 * @returns {module:LBRacing.Competitor} The competitor object for the boat.
 */
LBRacing.Race.prototype.addCompetitor = function(boat) {
    if (boat._lbCompetitor) {
        boat._lbCompetitor.race.removeCompetitor(boat);
    }

    var competitor = new LBRacing.Competitor(this, boat);
    this.competitors.push(competitor);
    boat._lbCompetitor = competitor;
    
    return competitor;
};

/**
 * Removes a competitor from the race.
 * @param {module:LBSailSim.Vessel} boat    The boat to remove.
 * @returns {module:LBRacing.Race} this.
 */
LBRacing.Race.prototype.removeCompetitor = function(boat) {
    var competitor = boat._lbCompetitor;
    if (competitor && (competitor.race === this)) {
        var index = this.competitors.indexOf(competitor);
        if (index >= 0) {
            this.competitors.splice(index, 1);
        }
        competitor.destroy();
        boat._lbCompetitor = undefined;
    }
    
    return this;
};


/**
 * Retrieves the {@link module:LBRacing.Competitor} associated with a boat, if any.
 * @param {module:LBSailSim.Vessel} boat    The boat of interest..
 * @returns {module:LBRacing.Comptetitor|undefined} The competitor object if the boat
 * is a competitor in this race, undefined if not.
 */
LBRacing.Race.prototype.getCompetitor = function(boat) {
    return boat._lbCompetitor;
};


/**
 * Adds a function that gets called whenever the racing state changes.
 * @param {Function} callback   The callback function, it is passed one argument, this.
 * @returns {module:LBRacing.Race}  this.
 */
LBRacing.Race.prototype.addStateChangeCallback = function(callback) {
    this.stateChangeCallbacks.push(callback);
    return this;
};

/**
 * Removes a state change callback function.
 * @param {Function} callback   The function to remove.
 * @returns {Boolean}   true if the function was found and removed.
 */
LBRacing.Race.prototype.removeStateChangeCallback = function(callback) {
    var index = this.stateChangeCallbacks.indexOf(callback);
    if (index >= 0) {
        this.stateChangeCallbacks.splice(index, 1);
        return true;
    }
    return false;
};

/**
 * Starts the race, or rather the pre-race portion of the race.
 * @returns {module:LBRacing.Race} this.
 */
LBRacing.Race.prototype.startPreRace = function() {
    if (this.state !== LBRacing.RaceState.NOT_STARTED) {
        this.abandonRace();
    }
    
    this.allMarks.length = 0;
    this.allMarks.push(this.course.start);
    this.course.marks.forEach(function(mark) {
        this.allMarks.push(mark);
    }, this);
    this.allMarks.push(this.course.finish);
    
    this.activeCompetitors = this.competitors.slice();
    this.finishedCompetitors.length = 0;
    this.dnfCompetitors.length = 0;
    
    this.startTime = this.sailEnv.currentTime + this.preStartDuration;
    this.elapsedTime = -this.preStartDuration;
    
    this._setState(LBRacing.RaceState.PRE_START);
    
    this.competitors.forEach(function(competitor) {
        competitor.racePreStart();
    });
    
    return this;
};

LBRacing.Race.prototype._setState = function(state) {
    if (this.state !== state) {
        this.state = state;
        
        this.stateChangeCallbacks.forEach(function(callback) {
            callback(this);
        }, this);
    }
    return this;
};

/**
 * Abandons the race if a race has been started.
 * @returns {module:LBRacing.Race} this.
 */
LBRacing.Race.prototype.abandonRace = function() {
    if ((this.state !== LBRacing.RaceState.NOT_STARTED) && (this.state !== LBRacing.RaceState.ABANDONED)) {
        this.competitors.forEach(function(competitor) {
            competitor.raceAbandoned();
        });
        
        this._setState(LBRacing.RaceState.ABANDONED);
    }
    
    return this;
};

/**
 * Main update method for managing the race.
 * @param {Number} dt   The time step.
 */
LBRacing.Race.prototype.update = function(dt) {
    this.course.update(dt);
    
    switch (this.state) {
        case LBRacing.RaceState.PRE_START :
            this.elapsedTime += dt;
            if (this.elapsedTime >= 0) {
                this.activeCompetitors.forEach(function(competitor) {
                    competitor.raceStarted();
                });
                this._setState(LBRacing.RaceState.STARTED);
            }
            break;

        case LBRacing.RaceState.STARTED :
        case LBRacing.RaceState.FINISHING :
            this.elapsedTime += dt;
            var count = this.activeCompetitors.length;
            for (var i = 0; i < count; ) {
                var competitor = this.activeCompetitors[i];
                competitor.update(i);
                if ((competitor.state !== LBRacing.CompetitorStates.STARTING)
                 && (competitor.state !== LBRacing.CompetitorStates.RACING)) {
                    if (competitor.state === LBRacing.CompetitorStates.FINISHED) {
                        this.finishedCompetitors.push(competitor);
                        competitor.finishPosition = this.finishedCompetitors.length;
                        competitor.timeOfFinish = this.currentTime;
                        this._setState(LBRacing.RaceState.FINISHING);
                    }
                    else {
                        this.dnfCompetitors.push(competitor);
                    }
                    
                    this.activeCompetitors.splice(i, 1);
                    --count;
                    
                    if (!this.activeCompetitors.length) {
                        this._setState(LBRacing.RaceState.ALL_DONE);
                    }
                }
                else {
                    ++i;
                }
            }
            break;
    }
};

/**
 * Removes the race from use.
 */
LBRacing.Race.prototype.destroy = function() {
    if (this.competitors) {
        var length = this.competitors.length;
        for (var i = length - 1; i >= 0; --i) {
            this.removeCompetitor(this.competitors[i].boat);
        }
        
        this.sailEnv = null;
        this.course = null;

        this.competitors = null;

        this.activeCompetitors = null;
        this.finishedCompetitors = null;
        this.dnfCompetitors = null;

        this.allMarks = null;
    }
};


/**
 * Object used to track individual competitors in a {@link module:LBRacing.Race}.
 * @constructor
 * @param {module:LBRacing.Race} race  The race creating this.
 * @param {module:LBSailSim.Vessel} boat    The boat competing.
 * @returns {module:LBRacing.Competitor}
 */
LBRacing.Competitor = function(race, boat) {
    this.race = race;
    this.boat = boat;
    
    /**
     * The finish position of the competitor, Number.MAX_VALUE if the competitor has
     * not finished.
     * @member {Number}
     */
    this.finishPosition = Number.MAX_VALUE;
    
    /**
     * The time of finish of the competitor, Number.MAX_VALUE if the competitor has
     * not finished.
     * @member {Number}
     */
    this.timeOfFinish = Number.MAX_VALUE;
    
    /**
     * The competitor's current state.
     * @member {Number}
     */
    this.state = LBRacing.CompetitorStates.NOT_RACING;
    
    /**
     * The index in {@link module:LBRacing.Race#allMarks} of the next mark to pass.
     */
    this.currentMarkIndex = 0;
    
    this.stateChangeCallbacks = [];
    this.markPassedCallbacks = [];
    
    this.reset();
};

/**
 * States for {@link module:LBRacing.Competitor#state}.
 * @readonly
 * @enum {Number}
 */
LBRacing.CompetitorStates = {
    /**
     * The competitor is not participating in a race that's running.
     */
    NOT_RACING :        0,
    
    /**
     * The competitor is in the pre-start phase of the race.
     */
    PRE_START :         1,
    
    /**
     * The race has started, but the competitor has not yet crossed the starting line.
     */
    STARTING :          2,
    
    /**
     * The race has started, the competitor is actively racing, has crossed the starting line,
     * but has not yet crossed the finish line.
     */
    RACING :            3,
    
    /**
     * The competitor has crossed the finish line.
     */
    FINISHED :          4,
    
    /**
     * The competitor has been disqualified.
     */
    DISQUALIFIED :      5,
    
    /**
     * The competitor has retired.
     */
    RETIRED :           6
};

LBRacing.Competitor.prototype = {};
LBRacing.Competitor.prototype.constructor = LBRacing.Competitor;


/**
 * Adds a function that gets called back whenever the competitor's state changes.
 * @param {Function} callback   The callback function, it takes one argument, this.
 * @returns {module:LBRacing.Competitor}    this.
 */
LBRacing.Competitor.prototype.addStateChangeCallback = function(callback) {
    this.stateChangeCallbacks.push(callback);
    return this;
};

/**
 * Removes a state change callback function.
 * @param {Function} callback   The callback function.
 * @returns {Boolean}   true if the function was installed and was removed.
 */
LBRacing.Competitor.prototype.removeStateChangeCallback = function(callback) {
    var index = this.stateChangeCallbacks.indexOf(callback);
    if (index >= 0) {
        this.stateChangeCallbacks.splice(index, 1);
        return true;
    }
    return false;
};

/**
 * Adds a function that gets called back whenever the current mark's passed state
 * changes.
 * @param {Function} callback   The callback function, it takes one argument, this.
 * @returns {module:LBRacing.Competitor}    this.
 */
LBRacing.Competitor.prototype.addMarkPassedCallback = function(callback) {
    this.markPassedCallbacks.push(callback);
    return this;
};

/**
 * Removes a mark passed change callback function.
 * @param {Function} callback   The callback function.
 * @returns {Boolean}   true if the function was installed and was removed.
 */
LBRacing.Competitor.prototype.removeMarkPassedCallback = function(callback) {
    var index = this.markPassedCallbacks.indexOf(callback);
    if (index >= 0) {
        this.markPassedCallbacks.splice(index, 1);
        return true;
    }
    return false;
};

LBRacing.Competitor.prototype._setState = function(state) {
    if (this.state !== state) {
        this.state = state;
        
        this.stateChangeCallbacks.forEach(function(callback) {
            callback(this);
        }, this);
    }
};

/**
 * Resets the competitor's state to {@link module:LBRacing.CompetitorStates.NOT_RACING}.
 * @returns {undefined}
 */
LBRacing.Competitor.prototype.reset = function() {
    this.finishPosition = Number.MAX_VALUE;
    this._setState(LBRacing.CompetitorStates.NOT_RACING);
};

/**
 * Called by a race when the pre-start begins.
 * @returns {undefined}
 */
LBRacing.Competitor.prototype.racePreStart = function() {
    this.reset();

    this.currentMarkIndex = 0;
    this.currentMarkTracker = null;

    this.markPassedCallbacks.forEach(function(callback) {
        callback(this);
    }, this);

    this._setState(LBRacing.CompetitorStates.PRE_START);
};

/**
 * Called by a race when the race actually starts.
 * @returns {undefined}
 */
LBRacing.Competitor.prototype.raceStarted = function() {
    this.currentMarkTracker = this.race.allMarks[0].createMarkTracker(this, this.race.allMarks[1]);
    this._setState(LBRacing.CompetitorStates.STARTING);
};

/**
 * Called by a race when the race is abandoned.
 * @returns {undefined}
 */
LBRacing.Competitor.prototype.raceAbandoned = function() {
    this._setState(LBRacing.CompetitorStates.NOT_RACING);
};

/**
 * Called to disqualify a competitor.
 * @returns {undefined}
 */
LBRacing.Competitor.prototype.disqualified = function() {
    this._setState(LBRacing.CompetitorStates.DISQUALIFIED);
};

/**
 * Called to retire a competitor.
 * @returns {undefined}
 */
LBRacing.Competitor.prototype.retire = function() {
    this._setState(LBRacing.CompetitorStates.RETIRED);
};

/**
 * Called when a competitor touches a mark.
 * @param {module:LBRacing.Mark} mark   The mark that was touched.
 * @returns {undefined}
 */
LBRacing.Competitor.prototype.markTouched = function(mark) {
    
};

/**
 * The main update method, called from {@link module:LBRacing.Race#update}.
 * @param {Number} dt   The time step.
 * @returns {undefined}
 */
LBRacing.Competitor.prototype.update = function(dt) {
    switch (this.state) {
        case LBRacing.CompetitorStates.STARTING :
        case LBRacing.CompetitorStates.RACING :
            var wasProvisionallyPassed = (this.currentMarkTracker.markPassedCount === 1);
            this.currentMarkTracker.update(dt);
            var isProvisionallyPassed = (this.currentMarkTracker.markPassedCount === 1);
            if (isProvisionallyPassed !== wasProvisionallyPassed) {
                this.markPassedCallbacks.forEach(function(callback) {
                    callback(this);
                }, this);
            }
            if (this.currentMarkTracker.isMarkPassed) {
                if (this.state === LBRacing.CompetitorStates.STARTING) {
                    this._setState(LBRacing.CompetitorStates.RACING);
                }
                
                ++this.currentMarkIndex;
                
                if (this.currentMarkTracker) {
                    this.currentMarkTracker.destroy();
                    this.currentMarkTracker = undefined;
                }
                
                if (this.currentMarkIndex >= this.race.allMarks.length) {
                    this._setState(LBRacing.CompetitorStates.FINISHED);
                }
                else {
                    this.currentMarkTracker = this.race.allMarks[this.currentMarkIndex].createMarkTracker(this,
                            this.race.allMarks[this.currentMarkIndex + 1]);
                }
                
                this.markPassedCallbacks.forEach(function(callback) {
                    callback(this);
                }, this);
            }
            break;
    }
};

/**
 * Removes this from use.
 * @returns {undefined}
 */
LBRacing.Competitor.prototype.destroy = function() {
    this.race = undefined;
    this.boat = undefined;
    if (this.currentMarkTracker) {
        this.currentMarkTracker.destroy();
        this.currentMarkTracker = undefined;
    }
};

return LBRacing;
    
});