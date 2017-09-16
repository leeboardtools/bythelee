# README #

This is the home of **By The Lee**, LeeboardTools' little Javascript sailing simulator. The goal is to eventually have a sailing simulation engine that can be used for various purposes, such as illustrating the various forces that occur in a sailboat, or even just showing how a sailboat behaves in various scenarios.

And of course, maybe one day it will also be used to create a game or two for those off-season months.

At the moment the **By The Lee** app can be run from http://leeboardtools.github.io.

## The Executive Summary ##
**By The Lee** is written entirely in Javascript. The app is separated into a core library, a sailing simulator engine and a UI.

The sailing simulator is 3D simulator. It maintains the state of the boats in 3D space, and calculates the various sailing forces in 3D. However, it does not implement an actual physics engine. Instead, it relies upon a host to take the forces and generate the appropriate accelerations and perform the integration of accelerations and velocities as well as resolve any collisions.

Three open source Javascript libraries are currently used:

* [three.js](https://threejs.org/) is used primarily for its 3D geometry classes and the Object3D class. The files in **By The Lee** that refer directly to three.js are very limited (Geometry-THREE.js for one), so if the need should arise, it should not be too painful to remove the dependence on three.js.

* [cannon.js](https://github.com/schteppe/cannon.js/blob/master/README.markdown) is the 3D physics engine.

* [Phaser CE](https://github.com/photonstorm/phaser-ce/blob/master/README.md) is the current UI framework. It is an HTML5 2D game engine.

The plan is to eventually migrate away from Phaser CE, probably into using three.js for 3D rendering. At the moment I have a pseudo 3D renderer under Phaser, but speed tests on my Motorola Moto G phone showed that the pseudo 3D renderer was really slowing things down. Some quick time tests with the Version 0.02 on http://leeboardtools.github.io showed the following fps':

* Cannon + pseudo 3D rendering: 30 fps
* Phaser P2 + pseudo 3D rendering: 32 fps
* Cannon + straight 2D rendering: 40 fps

I'm going to presume that using three.js for rendering will not have anywhere near as bad a fps drop as the pseudo 3D rendering, since WebGL will be much faster than creating 2D polygons.

What I need to figure out first is how to best to handle the 2D UI, such as the HUD and controls.


## Development ##
I'm currently using NetBeans IDE 8.1 as my IDE. There's nothing special about it, other than offering a Google Chrome plug-in to aid in debugging, though I normally use Firefox simply because I like its debugger better (well, except for that it won't display getter/setter based properties).


### Code Organization ###
The Javascript code is all within the public\_html/js folder. With the exception of main.js, all the library code is within the public\_html/js/leeboard folder. main.js is the main entry point to **By The Lee**.

Along with main.js are phaser.min.js, phaser.js, three.min.js, and three.js. These are the files for Phaser and three.js, respectively. The .min versions are the minimized versions, which are what should be used in the live version of the apps, while the other versions are the 'normal' versions which can easily be stepped into in the debugger.

The core portion of the library is in public\_html/js/leeboard/core.

The sailing simulator is in public\_html/js/leeboard/sailsim.

The third party libraries are in public\_html/js/lib.


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
Other than that, the release process consists of copying the files from public\_html to the root folder of the leeboardtools.github.io repository, skipping the following files:

* phaser.min.js
* phaser.js
* three.min.js
* three.js
* cannon.min.js
* cannon.js

(phaser.min.js, three.min.js and cannon.js are already in the repository, and won't change unless the Phaser or three.js version changes)

Additionally, the index.html file needs to be updated with a commenting out of the following two lines:

* `<script src="js/phaser.js"></script>`
* `<script src="js/three.js"></script>`

These lines are used to include the non-minimized versions of Phaser and three.js for debugging.

Some day, such as when I get around to using a minimizer, I'll automate this...
