# Learning Toolbox Tilestore


## Getting Started

To get you started you can simply clone the repository and install the dependencies:

### Prerequisites

You need git to clone the angular-seed repository. You can get git from
[http://git-scm.com/](http://git-scm.com/).

We also use a number of node.js tools to initialize and test angular-seed. You must have node.js and
its package manager (npm) installed.  You can get them from [http://nodejs.org/](http://nodejs.org/).

### Install Dependencies

We have two kinds of dependencies in this project: tools and angular framework code.  The tools help
us manage and test the application.

* We get the tools we depend upon via `npm`, the [node package manager][npm].
* We get the angular code via `bower`, a [client-side code package manager][bower].

We have preconfigured `npm` to automatically run `bower` so we can simply do:

```
npm install
```

Behind the scenes this will also call `bower install`.  You should find that you have two new
folders in your project.

* `node_modules` - contains the npm packages for the tools we need
* `app/bower_components` - contains the angular framework files

*Note that the `bower_components` folder would normally be installed in the root folder but
angular-seed changes this location through the `.bowerrc` file.  Putting it in the app folder makes
it easier to serve the files by a webserver.*

*If you have bower update issues the following may be the case:
The problem was that bower tried to retrieve packages through git:// protocol, which seems to be blocked at my machine.
git config --global url."https://".insteadOf git:// solved the problem.

## translations

For i18n we useangular-gettext. Follow these steps to update language files.
See: https://angular-gettext.rocketeer.be/dev-guide 

### extract translation string to .pot file

* Run 'grunt nggettext-extract' to update po/language.pot

### translate strings

* use poedit
* new languages: use "new catalog from POT file"
* existing languages: open <lang>.po in poedit, use "update from POT file"
* save <lang>.po

### compile translations

* run 'grunt nggettext-compile' to generate app/languages/<lang>.json files
* 

LTB - Mobile App
===============
Installation
-------------
You need to install phonegap and android SDK (for run in Android OS) or Xcode (for run in IOS).

Usage
---------
- Create a new phonegap project:

  ``` phonegap create LearningToolbox ```
  
- Replace folder ```www``` in your phonegap project for folder ```www``` from this project.
- Replace the file ```config.xml``` in your phonegap project for the file ```config.xml``` from this project.

- Add plugins:

  ``` phonegap plugin add cordova-plugin-whitelist ```

  ``` phonegap plugin add phonegap-plugin-barcodescanner ```

  ``` phonegap plugin add com.lampa.startapp ```
  
  ``` phonegap plugin add cordova-plugin-inappbrowser ```
  
  ``` cordoba plugin add cordova-plugin-media-capture```
  
  ``` cordova plugin add cordova-plugin-camera ```
  
  ``` cordova plugin add cordova-plugin-file-transfer ```
  
  ``` cordova plugin add ionic-plugin-keyboard ```

- For execute in Android OS:

  ``` phonegap run android ``` 
  - or if you want execute in your iphone (Only in MAC-OS) execute:
    
  ``` phonegap build ios ```
