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


define(['lbsailsimbase', 'lbutil', 'lbgeometry'], function(LBSailSim, LBUtil, LBGeometry) {
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
};

LBRacing.Course.prototype = {};
LBRacing.Course.prototype.constructor = LBRacing.Course;


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
 * @returns {module:LBGeometry.Vector3} The center position of the mark, used to define
 * boundaries with other marks.
 */
LBRacing.Mark.prototype.getMarkCenterPosition = function() {
    throw "LBRacing.Mark.getMarkCenterPosition() not implemented!";
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
 * @param {module:LBRacing.Competitor} competitor   The competitor being tracked.
 * @param {module:LBRacing.Mark} mark   The mark creating this.
 * @param {module:LBRacing.Mark} nextMark   The next mark, may be undefined.
 * @returns {module:LBRacing.MarkTracker}
 */
LBRacing.MarkTracker = function(competitor, mark, nextMark) {
    this.comptetitor = competitor;
    this.mark = mark;
    this.nextMark = nextMark;
    
    this.isMarkTouched = false;
    this.isMarkPassed = false;
};

LBRacing.MarkTracker.prototype = {};
LBRacing.MarkTracker.prototype.constructor = LBRacing.MarkTracker;

/**
 * Removes the mark tracker from use.
 * @returns {undefined}
 */
LBRacing.MarkTracker.prototype.destroy = function() {
    this.competitor = null;
    this.mark = null;
    this.nextMark = null;
};


/**
 * A mark that has two objects, one that has to be left to port and one that has to be
 * left to starboard.
 * @constructor
 * @param {module:LBSailSim.SailEnv} sailEnv    The sailing environment.
 * @param {Object} options
 * @returns {module:LBRacing.LineMark}
 */
LBRacing.LineMark = function(sailEnv, options) {
    LBRacing.Mark.call(this, sailEnv, options);
    
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

LBRacing.LineMark.prototype.createMarkTracker = function(boat, nextMark) {
    return new LBRacing.LineMarkTracker(this, nextMark, boat);
};

LBRacing.LineMark.prototype.getMarkCenterPosition = function() {
    if (this.portObject && this.stbdObject) {
        this.centerPosition.copy(this.portObject.obj3D.position)
                .add(this.stbdObject.obj3D.position)
                .multiplyScalar(0.5);
    }
    return this.centerPosition;
};

LBRacing.LineMarkTracker = function(competitor, mark, nextMark) {
    LBRacing.MarkTracker.call(this, competitor, mark, nextMark);
    
    if (!mark.portObject || !mark.stbdObject) {
        // Mark is invalid...
        this.isMarkPassed = true;
    }
    else {
        if (nextMark) {
        }
        else {
            
        }
    }
};

LBRacing.LineMarkTracker.prototype = Object.create(LBRacing.MarkTracker.prototype);
LBRacing.LineMarkTracker.prototype.constructor = LBRacing.LineMarkTracker;

LBRacing.LineMarkTracker.prototype.update = function(dt) {
    if (!this.isMarkPassed) {
        if (!this.isMarkTouched) {
            
        }
    }
};


/**
 * A mark that is a object that has to be left to one side.
 * @constructor
 * @param {module:LBSailSim.SailEnv} sailEnv    The sailing environment.
 * @param {Object} options
 * @returns {module:LBRacing.RoundingMark}
 */
LBRacing.RoundingMark = function(sailEnv, options) {
    LBRacing.Mark.call(this, sailEnv, options);
};

LBRacing.RoundingMark.prototype = Object.create(LBRacing.Mark.prototype);
LBRacing.RoundingMark.prototype.constructor = LBRacing.RoundingMark;


LBRacing.RoundingMark.prototype.createMarkTracker = function(boat, nextMark) {
    return new LBRacing.RoundingMarkTracker(this, nextMark, boat);
};

LBRacing.RoundingMarkTracker = function(competitor, mark, nextMark) {
    LBRacing.MarkTracker.call(this, competitor, mark, nextMark);
};

LBRacing.RoundingMarkTracker.prototype = Object.create(LBRacing.MarkTracker.prototype);
LBRacing.RoundingMarkTracker.prototype.constructor = LBRacing.RoundingMarkTracker;

LBRacing.RoundingMarkTracker.prototype.update = function(dt) {
    
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
    
    this.preStartDuration = LBUtil.isVar(options.preStartDuration) ? options.preStartDuration : 30;
    this.secondsToStart = -1;
    this.startTime = 0;
};

/**
 * States for {@link module:LBRacing.Race#state}.
 * @readonly
 * @enum {Number}
 */
LBRacing.RaceStates = {
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
 * @returns {module:LBRacing.Race} this.
 */
LBRacing.Race.prototype.addCompetitor = function(boat) {
    if (boat._lbCompetitor) {
        boat._lbCompetitor.race.removeCompetitor(boat);
    }

    var competitor = new LBRacing.Competitor(this, boat);
    this.competitors.push(competitor);
    boat._lbCompetitor = competitor;
    
    return this;
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
 * Starts the race, or rather the pre-race portion of the race.
 * @returns {module:LBRacing.Race} this.
 */
LBRacing.Race.prototype.startPreRace = function() {
    if (this.state !== LBRacing.RaceState.NOT_STARTED) {
        this.abandonRace();
    }
    this.state = LBRacing.RaceState.PRE_START;
    
    this.allMarks.length = 0;
    this.allMarks.push(this.course.start);
    this.course.marks.forEach(function(mark) {
        this.allMarks.push(mark);
    });
    this.allMarks.push(this.course.finish);
    
    this.activeCompetitors = this.competitors.slice();
    this.finishedCompetitors.length = 0;
    this.dnfCompetitors.length = 0;
    
    this.secondsToStart = this.preStartDuration;
    this.startTime = this.sailEnv.currentTime + this.preStartDuration;
    
    this.competitors.forEach(function(competitor) {
        competitor.racePreStart();
    });
    
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
        
        this.state = LBRacing.RaceState.ABANDONED;
    }
    
    return this;
};

/**
 * Main update method for managing the race.
 * @param {Number} dt   The time step.
 */
LBRacing.Race.prototype.update = function(dt) {
    switch (this.state) {
        case LBRacing.RaceState.PRE_START :
            this.secondsToStart -= dt;
            if (this.secondsToStart <= 0) {
                this.activeCompetitors.forEach(function(competitor) {
                    competitor.raceStarted();
                });
                this.state = LBRacing.RaceState.STARTED;
            }
            break;

        case LBRacing.RaceState.STARTED :
        case LBRacing.RaceState.FINISHING :
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
                        this.state = LBRacing.RaceState.FINISHING;
                    }
                    else {
                        this.dnfCompetitors.push(competitor);
                    }
                    
                    this.activeCompetitors.splice(i, 1);
                    --count;
                    
                    if (!this.activeCompetitors.length) {
                        this.state = LBRacing.RaceState.ALL_DONE;
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
    
    // Track the current state.
    // What we track is the next mark to be passed, and
    // whether it has been passed.
    // 
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

LBRacing.Competitor.prototype.reset = function() {
    this.currentMarkIndex = 0;
    this.currentMarkTracker = this.race.allMarks[0].createMarkTracker(this, this.race.allMarks[1]);

    this.state = LBRacing.CompetitorStates.NOT_RACING;
    this.finishPosition = Number.MAX_VALUE;
};

LBRacing.Competitor.prototype.racePreStart = function() {
    this.reset();
    this.state = LBRacing.CompetitorStates.PRE_START;
};

LBRacing.Competitor.prototype.raceStarted = function() {
    this.state = LBRacing.CompetitorStates.STARTING;
};

LBRacing.Competitor.prototype.raceAbandoned = function() {
    this.state = LBRacing.CompetitorStates.NOT_RACING;
};

LBRacing.Competitor.prototype.disqualified = function() {
    this.state = LBRacing.CompetitorStates.DISQUALIFIED;
};

LBRacing.Competitor.prototype.retire = function() {
    this.state = LBRacing.CompetitorStates.RETIRED;
};

LBRacing.Competitor.prototype.markTouched = function(mark) {
    
};

LBRacing.Competitor.prototype.update = function(dt) {
    switch (this.state) {
        case LBRacing.CompetitorStates.STARTING :
        case LBRacing.CompetitorStates.RACING :
            this.currentMarkTracker.update(dt);
            if (this.currentMarkTracker.isMarkPassed) {
                if (this.state === LBRacing.CompetitorStates.STARTING) {
                    this.state = LBRacing.CompetitorStates.RACING;
                }
                
                ++this.currentMarkIndex;
                if (this.currentMarkIndex >= this.race.allMarks.length) {
                    this.currentMarkTracker = undefined;
                    this.state = LBRacing.CompetitorStates.FINISHED;
                }
                else {
                    this.currentMarkTracker = this.race.allMarks[this.currentMarkIndex].createMarkTracker(this,
                            this.race.allMarks[this.currentMarkIndex + 1]);
                }
            }
            break;
    }
};

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