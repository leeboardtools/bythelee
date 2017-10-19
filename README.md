# README #

This is the home of **By The Lee**, LeeboardTools' little Javascript sailing simulator. The goal is to eventually have a sailing simulation engine that can be used for various purposes, such as illustrating the various forces that occur in a sailboat, or even just showing how a sailboat behaves in various scenarios.

And of course, maybe one day it will also be used to create a game or two for those off-season months.

At the moment the **By The Lee** app can be run from http://leeboardtools.github.io.

## The Executive Summary ##
**By The Lee** is written entirely in Javascript. The app is separated into a core library, a sailing simulator engine and a UI.

The sailing simulator is 3D simulator. It maintains the state of the boats in 3D space, and calculates the various sailing forces in 3D. However, it does not implement an actual physics engine. Instead, it relies upon a host to take the forces and generate the appropriate accelerations and perform the integration of accelerations and velocities as well as resolve any collisions.

The following open source Javascript libraries are currently used:

* [three.js](https://threejs.org/) is now the primary 3D framework. Because of the way **By The Lee** started (it was based on [Phaser CE](https://github.com/photonstorm/phaser-ce/blob/master/README.md), the files in the core and sailing simulator components provide an encapsulation of three.js. For example, there's core/Geometry-THREE.js, which defines LBGeometry.Vector3 amongst other objects, as an enhanced alias for THREE.Vector3.

* [cannon.js](https://github.com/schteppe/cannon.js/blob/master/README.markdown) is the 3D physics engine.

* [RequireJS](http://requirejs.org/) is used to manage dependencies.

* [tween.js](https://github.com/tweenjs/tween.js/) is used to provide tweening, such as the automatic motion tracking of the wake particles.

The HUD display and controls are all implemented using HTML elements.


## Development ##
I'm currently using NetBeans IDE 8.1 as my IDE. There's nothing special about it, other than offering a Google Chrome plug-in to aid in debugging, though I normally use Firefox simply because I like its debugger better (well, except for that it won't display getter/setter based properties).


### Code Organization ###
The Javascript code is all within the public\_html/js folder. With the exception of main.js, all the library code is within the public\_html/js/leeboard folder. main.js is the main entry point to **By The Lee**.

Along with main.js are phaser.min.js, phaser.js, three.min.js, and three.js. These are the files for Phaser and three.js, respectively. The .min versions are the minimized versions, which are what should be used in the live version of the apps, while the other versions are the 'normal' versions which can easily be stepped into in the debugger.

The core portion of the library is in public\_html/js/leeboard/core.

The sailing simulator is in public\_html/js/leeboard/sailsim.

The third party libraries are in public\_html/js/lib.

Image files copied from ThreeJS are in public\_html/images/three-js.


### Unit Tests ###
There are a bunch of unit tests, all found within the public\_html/test folder. These are based upon [QUnit](https://qunitjs.com/). The tests themselves are run from the unit-tests.html file in public\_html.


### Building The  Docs ###
If you want to generate the code docs, you'll need [JSDoc3](http://usejsdoc.org/), which is part of [Node.js](https://nodejs.org). You can install JSDoc3 globally using the following under Linux/OsX:

`sudo npm install -g jsdoc`

To generate the docs, do the following from the root folder of the project:

* Delete the docs folder.
* Run: `jsdoc public\_html/js/leeboard -r -d docs`

The docs folder will then be populated with the appropriate HTML files for the docs.


### The Release ###
At the moment I don't use a minimizer, some day I will.
Other than that, the release process consists of copying the files from public\_html to the root folder of the leeboardtools.github.io repository.

Some day, such as when I get around to using a minimizer, I'll automate this...
