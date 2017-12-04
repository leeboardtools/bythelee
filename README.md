# README #

This is the home of **By The Lee**, LeeboardTools' Javascript sailing simulator. The goal is to eventually have a sailing simulation engine that can be used for various purposes, such as illustrating the various forces that occur in a sailboat, or even just showing how a sailboat behaves in various scenarios.

And of course, maybe one day it will also be used to create a game or two for those off-season months.

At the moment the **By The Lee** app can be run from http://leeboardtools.github.io or http://leeboardtools.com (which simply points to http://leeboardtools.github.io).

## The Executive Summary ##
**By The Lee** is written entirely in Javascript. The app is separated into a core library, a sailing simulator engine and a UI.

The sailing simulator is a 3D simulator. It maintains the state of the boats in 3D space, and calculates the various sailing forces in 3D. However, it does not implement an actual physics engine. Instead, it relies upon an open source physics engine to take the forces and generate the appropriate accelerations and perform the integration of accelerations and velocities as well as resolve any collisions. It also relies upon an open source 3D library to provide the much of the 3D mathematics (which also ends up providing the 3D UI support as well).

The following open source Javascript libraries are currently used:

* [three.js](https://threejs.org/) is now the primary 3D framework. Because of the way **By The Lee** started (it was originally based on [Phaser CE](https://github.com/photonstorm/phaser-ce/blob/master/README.md), the files in the core and sailing simulator components provide an encapsulation of three.js. For example, there's core/Geometry-THREE.js, which defines LBGeometry.Vector3 amongst other objects, as an enhanced alias for THREE.Vector3.

* [cannon.js](https://github.com/schteppe/cannon.js/blob/master/README.markdown) is the 3D physics engine.

* [RequireJS](http://requirejs.org/) is used to manage Javascript module dependencies.

* [tween.js](https://github.com/tweenjs/tween.js/) is used to provide tweening, such as the automatic motion tracking of the wake particles.

* [QUnit](http://qunitjs.com/) is used as the unit test framework.

* [Node.js](https://nodejs.org/) provides the server framework, which isn't currently used in the http://leeboardtools.github.io, but will be used for any future multi-player support.

* [Express](https://expressjs.com/) is also part of the server framework.

* [Socket.IO](https://socket.io/) is also part of the server framework, and will be used to handle the multi-player transactions.

The HUD display and controls are all implemented using HTML elements.


## Development ##
I'm currently using NetBeans IDE 8.1 as my IDE. There's nothing special about it, other than offering a Google Chrome plug-in to aid in debugging, though I generally just use the developer tools in the browser anyway.


### Code Organization ###
The Javascript code is all within the public\_html/js folder. With the exception of the main entry point to **By The Lee**, main-ThreeJS.js, and the configuration file for RequireJS, require-js-config.js, all of our code is in the leeboard folder.

The core portion of the library is in public\_html/js/leeboard/core. These files do not depend on any leeboardtools files outside of core. In fact, the files that depend on any outside code are suffixed with the library, for example Camera-THREE.js and Geometry-THREE.js both depend upon three.js.

Here's a summary of the source folders in public\_html/js/leeboard/sailsim:
* cannon: Stuff for interfacing with the cannon.js physics engine.
* core: The core leeboardtools library, these files do not depend upon any other leeboardtools files.
* phaser: Stuff for interfacing with the Phaser library, no longer used.
* sailsim: The main sailing simulator files, these provide the physics modeling of the sailing simulation.
* sailsim-phaser: Old stuff for the Phaser based sailing simulation, no longer used.
* sailsim-three: The 3D UI modeling for the sailing simulator, these may directly use three.js.
* three-js-extras: Files from three.js that we use that aren't actually part of three.js / three.min.js. These typically come from the three.js examples at https://github.com/mrdoob/three.js/tree/dev/examples.
* ui3d: These provide more general purpose 3D UI modeling capabilities, and directly use three.js.

###Other Folders Of Interest###
Within public\_html we have:
* css: Obvious
* data: This pretty much contains JSON files for describing stuff like boats, lift/drag curves, and the sailing environment. This does not include Blender models.
* images: Most of the images here are leftovers from the old Phaser version.
* images/three-js: This contains images taken from the three.js examples.
* models: This holds the Blender models (which have to be exported to JSON format via the Blender plug-in at https://github.com/mrdoob/three.js/tree/dev/utils/exporters/blender. The models for a particular boat should be placed into a sub-folder, such as Tubby.
* test: These are the unit test files, they're based on QUnit (http://qunitjs.com/).
* textures: Various textures.
* textures/three-js: This contains textures taken from the three.js examples.

At the top-level folder, there is a Node.js file, app.js, which is used to run the server, should you so desire. With the server you can set up the server on your local network by running app.js from within NetBeans, or typing:

`node app.js`

from the command line at the top-level folder. The IP address and port the server is listening on is displayed in the console. With the server running, you can then connect to ByTheLee by simply typing the IP address followed by the port in a browser on a computer connected to the local network. For example, on my home network the server reports:

`10.0.0.7:3000`

Type that in your browser window to connect locally.

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
At the moment I don't use a minimizer, maybe some day I will.
Other than that, the release process consists of copying the files from public\_html to the root folder of the leeboardtools.github.io repository.

Some day, such as when I get around to using a minimizer, I'll automate this...
