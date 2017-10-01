'use strict';

var LTBApp = angular.module('LTBApp', [
    'ngRoute',
    'gettext',
    'LTBApp.stack',
    'LTBApp.tileTypes',
    'LTBApp.search',
    'ltbapi',
    'LTBApp.sfs',
    'ngStorage',
    'oauth',
    'textAngular',
    'LTBApp.settings',
    'LTBApp.messagesList',
    'ngCordova',
    'LTBApp.login',
    'LTBApp.favStack',
    'ngTouch',
    'ng.deviceDetector',
    'stack.chat',
    'routeStyles',
    'ngAudio',
    'hmTouchEvents'
    ])

.config(['$routeProvider', function($routeProvider) {  
    
    $routeProvider.when('/', {
        templateUrl:'modules/stack-app/stack-app.html',
        controller: 'RouteController',
        controllerAs: 'RCtrl'
    });
    
    $routeProvider.when('/stack/:stackcode?', {
        templateUrl:'modules/stack-app/stack-app.html',
        controller: 'RouteController',
        controllerAs: 'RCtrl'
    });
    
    $routeProvider.when('/&auth_enc=:authEnc64', {
        template: ''
    });
    
    $routeProvider.when('/about', {
        templateUrl:'modules/about/about.html'
    });
    
    $routeProvider.otherwise({
        redirectTo: '/'
    });
}])

//TODO: to prevent modalservice from doing something on mobile devices?
.service('modalService', function(){ deblog('No modal service allowed here.');})

.service('mobileService', ['$rootScope', function($rootScope){
    if (in_app){
        //handle app to background and app to foreground events
        $rootScope.onPause = false;

        var onPause = function() {
            $rootScope.$apply(function(){
                $rootScope.onPause = true;
            });
        };

        var onResume = function() {
            $rootScope.$apply(function(){
                 $rootScope.onPause = false;
            });
        };
        document.addEventListener("pause", onPause, false);
        document.addEventListener("resign", onPause, false); //for iOS
        document.addEventListener("resume", onResume, false);
        document.addEventListener("active", onResume, false); //for iOS

        //handle app online.offline status
        $rootScope.online = false;
        $rootScope.onlineStatus = 'Unknown';

        this.onlineStatus = function(){
            if(!navigator.connection || typeof Connection === 'undefined'){
                $rootScope.online = true;
                return false;
            }
            var networkState = navigator.connection.type;
            var onlineState = false;
            var onlineStatus = '';
            
            switch (networkState) {
                case Connection.UNKNOWN:
                    onlineState = true;
                    onlineStatus = 'Unknown';
                    break;

                case Connection.ETHERNET:
                    onlineState = true;
                    onlineStatus = 'Ethernet';
                    break;

                case Connection.WIFI:
                    onlineState = true;
                    onlineStatus = 'WIFI';
                    break;

                case Connection.CELL_2G:
                case Connection.CELL_3G:
                case Connection.CELL_4G:
                case Connection.CELL:
                    onlineState = true;
                    onlineStatus = 'Mobile';
                    break;

                default:            
                    onlineState = false;
                    onlineStatus = 'None';
            }
            
            $rootScope.online = onlineState;
            $rootScope.onlineStatus = onlineStatus;
            $rootScope.$broadcast('network:status', onlineState);
            
            return onlineState;
        };

        this.onlineStatus();
        document.addEventListener("online", this.onlineStatus, false);
        document.addEventListener("offline", this.onlineStatus, false);
    } else {
        this.onlineStatus = function(){
            return true;
        };
    }
}])

.filter('to_trusted', ['trust', function(trust){
    return function(text) {
        return trust.html(text);
    };
}])

.controller('MainController', ['sharedTexts', 'callApi', 'applicationFunctions', 'debug', 
    function(sharedTexts, callApi, applicationFunctions, debug){
        
    this.version = versionApp;
    this.inapp = in_app;//document.URL.indexOf( 'http://' ) === -1 && document.URL.indexOf( 'https://' ) === -1;
    var _this = this;
    
    callApi.start('app');
    
    this.getString = function(str){
        return sharedTexts.getString(str);
    };
    
    var p = navigator.platform;
    if (p === 'iPad' || p === 'iPhone' || p === 'iPod') {
        this.ltbTopbar = "ltb-topbar ltb-topbar-ios";
        this.ltbContainer = "ltb-container ltb-container-ios";
    } else {
        this.ltbTopbar = "ltb-topbar";
        this.ltbContainer = "ltb-container";
    }
    
    this.openExternal = function(url, block){
        applicationFunctions.openExternal(url, block);
    };

    debug.add('End of the MainController of the mobile app');
    
}])

.controller('RouteController', ['$routeParams', '$rootScope', 
    function($routeParams, $rootScope){
        if ($routeParams.stackcode){
            $rootScope.$broadcast('outside:intent', {stack_intent: $routeParams.stackcode});
        }
    }
]);
