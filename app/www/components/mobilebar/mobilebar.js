
angular.module('mobilebar', [])

.config(['$routeProvider', function($routeProvider) { 
    $routeProvider.when('/redirect/:stackid', {
        templateUrl: path_root + 'components/mobilebar/mobilepage.html',
        controller:'mobilePageController',
        controllerAs: 'mobPCtrl'
    });
}])

.service('mobilebarService', ['deviceDetector', '$location', 'gettextCatalog', function(deviceDetector, $location, gettextCatalog){
    var _this = this;
    this.device = {
        raw: deviceDetector.raw,
        os: deviceDetector.os,
        browser: deviceDetector.browser,
        device: deviceDetector.device,
        scheme: window.location.protocol || 'http'
    };
    this.alerticon = 'fa-android';
    this.alertmsg = '';
    this.showappalert = false;
    
    if(this.device.os === 'android'){
        this.alerticon = 'fa-android';
        this.alertmsg = gettextCatalog.getString('Click to open this Stack in the Learning Toolbox app for Android.');
        this.showappalert = true;
    }else if(this.device.os === 'ios'){
        this.alerticon = 'fa-apple';
        this.alertmsg = gettextCatalog.getString('Click to open this Stack in the Learning Toolbox app for iOS.');
        this.showappalert = true;
    }else if(this.device.os === 'windows-phone'){
        this.alerticon = 'fa-windows';
        this.alertmsg = gettextCatalog.getString('Click to open this Stack in the Learning Toolbox app for Windows Phone (beta only).');
        this.showappalert = true;
    };
            
    deblog('mobilebar', deviceDetector);
    
    this.custom_base = "ltb://stack/";
    this.custom = "";
    this.alt = $location.absUrl();
    this.intent = "";
    this.intent_base = [
        "intent://stack/",
        "STACK_ID",
        "#Intent;scheme=ltb;package=com.raycom.ltb;S.browser_fallback_url=market%3A%2F%2Fdetails%3Fid=com.raycom.ltb;end"
    ];
    this.playstore = "market://details?id=com.raycom.ltb";
    this.appstore = "https://itunes.apple.com/us/app/learning-toolbox/id1047627682";
    
    this.timer;
    this.heartbeat;
    this.iframe_timer;

    this.clearTimers = function() {
        clearTimeout(this.timer);
        clearTimeout(this.heartbeat);
        clearTimeout(this.iframe_timer);
    };

    this.intervalHeartbeat = function() {
        if (document.webkitHidden || document.hidden) {
            this.clearTimers();
        }
    };

    this.tryIframeApproach = function(alt) {
        var iframe = document.createElement("iframe");
        iframe.style.border = "none";
        iframe.style.width = "1px";
        iframe.style.height = "1px";
        iframe.onload = function () {
            document.location = alt;
        };
        iframe.src = this.custom;
        document.body.appendChild(iframe);
    };

    this.tryWebkitApproach = function(alt, delay) {
        document.location = this.custom;
        this.timer = setTimeout(function () {
            document.location = alt;
        }, delay);
    };

    this.useIntent = function() {
        document.location = this.intent;
    };

    this.launch_app_or_alt_url = function(os, browser) {
        this.heartbeat = setInterval(_this.intervalHeartbeat, 200);
        if(os === 'android'){
            if (browser === 'chrome') {
                this.useIntent();
            } else if (browser === 'firefox') {
                this.tryWebkitApproach(this.playstore, 2500);
                this.iframe_timer = setTimeout(
                    function () {
                        _this.tryIframeApproach(_this.playstore);
                    }, 
                    1500
                );
            } else {
                this.tryIframeApproach(this.playstore);
            }
        }else if(os === 'ios'){
            this.tryWebkitApproach(this.appstore, 250);
        }else if(os === 'windows-phone'){
            //do something to windows store
            this.tryWebkitApproach(this.alt, 250);
        }else{
            //do nothing
        }
    };
    
    this.goApp = function(stackid){
        this.custom = this.custom_base + stackid;
        this.intent = this.intent_base[0]+stackid+this.intent_base[2];
        this.launch_app_or_alt_url(this.device.os, this.device.browser);
    };
}])

.controller('mobilebarController', ['mobilebarService', function(mobilebarService){
    this.showappalert = mobilebarService.showappalert;
    this.alerticon = mobilebarService.alerticon;
    this.alertmsg = mobilebarService.alertmsg;
    
    this.goApp = function(stackid){
        mobilebarService.goApp(stackid);
    }; 
}])

.controller('mobilePageController', ['mobilebarService', '$scope', '$routeParams', '$location', '$timeout', 
    function(mobilebarService, $scope, $routeParams, $location, $timeout){
    
    $scope.stackid_route = $routeParams.stackid || '';
    
    if(mobilebarService.showappalert){
        $timeout(function(){
            mobilebarService.goApp($scope.stackid_route); 
        }, 0);        
    }else{
        $location.path("/");
    }
    
}])

.directive('mobileBar', [function(){
    return {
      restrict: "E",
      controller: 'mobilebarController',
      controllerAs: 'mobCtrl',
      replace: false,
      templateUrl: path_root + 'components/mobilebar/mobilebar.html'
    };    
}])

;