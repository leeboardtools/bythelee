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

define(['lbinterpolate'], 
function(LBInterpolate) {

QUnit.module('Interpolate-tests');

QUnit.test( "CatmullRomCalculator", function( assert ) {
    var calculator = new LBInterpolate.CatmullRomCalculator();
    var linearTs = [1, 2];
    var linearPs = [10, 20];
    calculator.setTsFromArray(1, linearTs, 0);
    var result;
    result = calculator.calcFromArray(linearPs);
    assert.nearEqual(result, linearPs[0], 'linear t=1');
    
    calculator.setTsFromArray(1.4, linearTs, 0);
    result = calculator.calcFromArray(linearPs);
    assert.nearEqual(result, 14, 'linear t=1.4');
    
    calculator.setTsFromArray(2.4, linearTs, 0);
    result = calculator.calcFromArray(linearPs);
    assert.nearEqual(result, 24, 'linear t=2.4');
    
    
    var quadTs = [1, 4, 5];
    var quadPs = [10, 20, 30];
    calculator.setTsFromArray(1, quadTs, 0);
    result = calculator.calcFromArray(quadPs);
    assert.nearEqual(result, 10, "quad t=1");
    
    calculator.setTsFromArray(4, quadTs, 0);
    result = calculator.calcFromArray(quadPs);
    assert.nearEqual(result, 20, "quad t=4");
    
    calculator.setTsFromArray(5, quadTs, 0);
    result = calculator.calcFromArray(quadPs);
    assert.nearEqual(result, 30, "quad t=5");
    
    
    var cubeTs = [1, 3, 4, 5];
    var cubePs = [10, 30, 20, 40];
    calculator.setTsFromArray(1, cubeTs, 0);
    result = calculator.calcFromArray(cubePs);
    assert.nearEqual(result, 10, "cube t=1");
    
    calculator.setTsFromArray(3, cubeTs, 1);
    result = calculator.calcFromArray(cubePs);
    assert.nearEqual(result, 30, "cube t=3");
    
    calculator.setTsFromArray(4, cubeTs, 2);
    result = calculator.calcFromArray(cubePs);
    assert.nearEqual(result, 20, "cube t=4");
    
    calculator.setTsFromArray(5, cubeTs, 3);
    result = calculator.calcFromArray(cubePs);
    assert.nearEqual(result, 40, "cube t=5");
    
    // TEST!!!
    for (var i = -3; i < 10; i += 0.5) {
        var index = 1;
        for (; index < cubeTs.length; ++index) {
            if (i < cubeTs[index]) {
                break;
            }
        }
        --index;
        
        calculator.setTsFromArray(i, cubeTs, index);
        result = calculator.calcFromArray(cubePs);
        console.log("Test:\t" + i + "\t" + result);
    }
    
    // TEST!!!
/*    var interpData = [
        -180, 3.67, 0.86,
        -150, 1.96, 0.86,
        -110, 0.30, 0.46,
        -90, 0.00, 0.00,
        -70, 0.30, -0.46,
        -30, 1.96, -0.86,
        0, 3.67, -0.86,
        10, 5.41, -0.71,
        45, 5.41, -0.71,
        //89, 5.41, -0.71,
        //90, 5.41, 0.00,
        //91, 5.41, 0.71,
        135, 5.41, 0.71,
        170, 3.67, 0.86,
        180, 3.67, 0.86
    ];
    
    var interp = new LBInterpolate.MultiDim();
    interp.setFromSingleArray(interpData, 2);
    
    var result = [];
    for (var t = -180; t <= 180; t += 5) {
        result = interp.calcValue(t, result);
        console.log("Interpolate:\t" + t + "\t" + result[0] + "\t" + result[1]);
    }
*/
});

    
});
