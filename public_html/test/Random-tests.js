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

/* global QUnit */

define(['lbrandom'],
function(LBRandom) {

QUnit.module('Random-tests');

function testNormal(assert, generator) {
    var mean = generator.mean;
    var stdev = generator.stdev;
    
    var values = [];
    for (var i = 0; i < 10000; ++i) {
        values.push(generator.nextValue());
    };
    
    var testMean = LBRandom.mean(values);
    var meanOffset = (mean) ? 0 : 10;
    // Adding meanOffset because 0 doesn't threshold very well...
    assert.nearEqual(testMean + meanOffset, mean + meanOffset, "mean " + mean, .01);
    
    var testStdev = LBRandom.stdev(values, testMean);
    assert.nearEqual(testStdev, stdev, "stdev " + stdev, 0.1);
};

QUnit.test( "normal", function( assert ) {
    var generator = new LBRandom.NormalGenerator(0, 1);
    testNormal(assert, generator);
    
    generator.mean = 100;
    generator.stdev = 3;
    testNormal(assert, generator);
});


function testRunningAvg(assert, runningAvg, valueToAdd, refAvg, refCount, msg) {
    msg = msg || "";
    
    assert.equal(runningAvg.addValue(valueToAdd), refAvg, "addValue " + msg);
    assert.equal(runningAvg.getAverage(), refAvg, "getAverage " + msg);
    assert.equal(runningAvg.getValueCount(), refCount, "getValueCount " + msg);
};

QUnit.test("RunningAverage", function(assert) {
    var runningAvg = new LBRandom.RunningAverage(4);
    assert.equal(runningAvg.getAverage(), 0, "Average no values");
    assert.equal(runningAvg.getValueCount(), 0, "Value count no values");
    
    testRunningAvg(assert, runningAvg, 10, 10, 1, "[10]");
    testRunningAvg(assert, runningAvg, 12, 11, 2, "[10,12]");
    testRunningAvg(assert, runningAvg, 14, 12, 3, "[10,12,14]");
    testRunningAvg(assert, runningAvg, 16, 13, 4, "[10,12,14,16]");
    testRunningAvg(assert, runningAvg, 18, 15, 4, "[12,14,16,18]");
    
    runningAvg.clear();
    assert.equal(runningAvg.getAverage(), 0, "Average no values");
    assert.equal(runningAvg.getValueCount(), 0, "Value count no values");
    testRunningAvg(assert, runningAvg, -10, -10, 1, "[-10]");
    testRunningAvg(assert, runningAvg, -12, -11, 2, "[-10,-12]");
    
});

});