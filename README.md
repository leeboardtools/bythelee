# README #

This is the home of **By The Lee**, LeeboardTools' little Javascript sailing simulator. The goal is to eventually have a sailing simulation engine that can be used for various purposes, such as illustrating the various forces that occur in a sailboat, or even just showing how a sailboat behaves in various scenarios.

And of course, maybe one day it will also be used to create a game or two for those off-season months.

At the moment the **By The Lee** app can be run from http://leeboardtools.github.io.

## The Executive Summary ##
**By The Lee** is written entirely in Javascript. The app is separated into a core library, a sailing simulator engine and a UI.

Two open source Javascript libraries are used:

* [three.js](https://threejs.org/) is used primarily for its 3D geometry classes and the Object3D class. The files in **By The Lee** that refer directly to three.js are very limited (Geometry-THREE.js for one), so if the need should arise, it should not be too painful to remove the dependence on three.js.

* [Phaser CE](https://github.com/photonstorm/phaser-ce/blob/master/README.md) is the current UI framework. It is an HTML5 2D game engine.

The sailing simulator is basically a 2 1/2 D simulator. It maintains the state of the boats in 3D space, and calculates the various sailing forces in 3D. However, it does not implement an actual physics engine. Instead, it relies upon a host to take the forces and generate the appropriate accelerations and perform the integration of accelerations and velocities as well as resolve any collisions.

Phaser CE does include the P2 physics engine, which is sufficient for our purposes.


## Development ##
I'm currently using NetBeans IDE 8.1 as my IDE. There's nothing special about it, other than offering a Google Chrome plug-in to aid in debugging, though I normally use Firefox simply because I like it's debugger better (well, except for that it won't display getter/setter based properties).


### Code Organization ###
The Javascript code is all within the public _ html/js folder. With the exception of main.js, all the library code is within the public _ html/js/leeboard folder. main.js is the main entry point to **By The Lee**.

Along with main.js are phaser.min.js, phaser.js, three.min.js, and three.js. These are the files for Phaser and three.js, respectively. The .min versions are the minimized versions, which are what should be used in the live version of the apps, while the other versions are the 'normal' versions which can easily be stepped into in the debugger.

The core portion of the library is in public _ html/js/leeboard/core.

The sailing simulator is in public _ html/js/leeboard/sailsim.

The files for interfacing with Phaser are in public _ html/js/leeboard/phaser.

### Building The  Docs ###
If you want to generate the code docs, you'll need [JSDoc3](http://usejsdoc.org/), which is part of [Node.js](https://nodejs.org). You can install JSDoc3 globally using the following under Linux/OsX:

`sudo npm install -g jsdoc`

To generate the docs, do the following from the root folder of the project:
* Delete the docs folder.
* Run: `jsdoc public _ html/js/leeboard -r -d docs`

The docs folder will then be populated with the appropriate HTML files for the docs.


### The Release ###
At the moment I don't use a minimizer, some day I will.
Other than that, the release process consists of copying the files from public _ html to the root folder of the leeboardtools.github.io repository, skipping the following files:

* phaser.min.js
* phaser.js
* three.min.js
* three.js

(phaser.min.js and three.min.js are already in the repository, and won't change unless the Phaser or three.js version changes)

Additionally, the index.html file needs to be updated with a commenting out of the following two lines:
* `<script src="js/phaser.js"></script>`

* `<script src="js/three.js"></script>`

These lines are used to include the non-minimized versions of Phaser and three.js for debugging.

Some day, such as when I get around to using a minimizer, I'll automate this...