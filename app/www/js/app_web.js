'use strict';

var LTBApp = angular.module('LTBApp', [
    'ngRoute',
    'gettext',
    'LTBApp.stack',
    'LTBApp.tileStore',
    'LTBApp.tileTypes',
    'LTBApp.mystacks',
    'ltbapi',
    'LTBApp.sfs',
    'LTBApp.sfs.unsplash',
    'mobilebar',
    'ngStorage',
    'oauth',
    'ngTagsInput',
    'ui.sortable',
    'textAngular',
    'ngCordova',
    'LTBApp.management',
    'LTBApp.managementmessgs',
    'monospaced.qrcode',
    //'LTBApp.messagesList',
    'ng.deviceDetector',
    'LTBApp.administration',
    'ngFileUpload',
    'ngAudio',
    'hmTouchEvents',
//	'ngMasonry'
    ])

.run(function (setlanguage) {
    setlanguage.current();
})

.service('modalService', ['$location', 'gettextCatalog','$uibModal',
    function ($location, gettextCatalog, $uibModal) {
        var modalRender = {
            backdrop: true,
            keyboard: true,
            modalFade: true,
            templateUrl: path_root + 'assets/modal-template.html'
        };

        var modalOptions = {
            closeButtonText: gettextCatalog.getString('Close'),
            actionButtonText: gettextCatalog.getString('OK'),
            headerText: gettextCatalog.getString('Proceed?'),
            bodyText: gettextCatalog.getString('Perform this action?')
        };
        
        var _this = this;

        /* Pass on modalOptions object containing texts like in the default modalOptions
         *  above and possibly provide other parameters to render the modal.
         *  Normal use would be either:
         *  
         * @param {type} customModalOptions
         * @param {type} customModalRender
         * @returns {unresolved}
         */
        this.showModal = function (customModalOptions, customModalRender) {
            if (!customModalRender) customModalRender = {};
            customModalRender.backdrop = 'static';
            return this.show(customModalOptions, customModalRender);
        };

        this.show = function (customModalOptions, customModalRender) {
            //Create temp objects to work with since we're in a singleton service
            var tempModalRender = {};
            var tempModalOptions = {};
            var default_cancel_reason = 'cancel';
            var default_ok_reason = 'ok';
            //Map angular-ui modal custom defaults to modal defaults defined in service
            angular.extend(tempModalRender, modalRender, customModalRender);

            //Map modal.html $scope custom properties to defaults defined in service
            angular.extend(tempModalOptions, modalOptions, customModalOptions);

            if (!tempModalRender.controller) {
                tempModalRender.controller = function ($scope, $uibModalInstance) {
                    $scope.modalOptions = tempModalOptions;
                    $scope.modalOptions.ok = function (result) {
                        var returning = result ? result : default_ok_reason;
                        $uibModalInstance.close(returning);
                    };
                    $scope.modalOptions.close = function (result) {
                        var returning = result ? result : default_cancel_reason;
                        $uibModalInstance.dismiss(returning);
                    };
                }
            }
            return $uibModal.open(tempModalRender).result;
        };
        
        this.getFullUrl = function(route) {
            var path_template = route.$$route.originalPath;
            if (!route.pathParams){
                return path_template;

            }
            var params = route.pathParams;
            var regex; 
            for (var param in params) {
              regex = new RegExp(':'+ param, "g");
              path_template = path_template.replace(regex, params[param]);
            }
            return path_template;
        };
        
        this.confirmModal = function(text_options, ok_callback, cancel_callback, render_options){
            this.showModal(text_options, render_options).then(
                function (result) {
                    if (ok_callback) {
                        ok_callback(result);
                    }
                },
                function (reason){
                    deblog('The action is canceled because of: '+ reason);
                    if (cancel_callback) {
                        cancel_callback();
                    }
                }
            );
        };
        
        /* This confirm can be called upon a routechange driven event to test whether the
         * route change should continue and whether measures should be taken just
         * before performing the actual route change. If the confirmation of an action and
         * the succesfull completion of it leads to a route change, use confirmModal instead.
         */
        this.confirmRouteChangeModal = function(options, ok_callback, cancel_callback, event,
            to_route, deregister, render_options){
            if (to_route){
                event.preventDefault();
            }
        
            this.showModal(options, render_options).then(function (result) {
                    if (ok_callback) {
                        ok_callback(result);
                    }
                    if (deregister){
                        deregister();
                    }
                    if (to_route){
                        $location.path(_this.getFullUrl(to_route));
                    }
                },
                function (reason){
                    deblog('The route change is canceled because of '+ reason);
                    if (cancel_callback) {
                        cancel_callback();
                    }
                }
            );
        };
    }
])

.config(['$routeProvider', function($routeProvider) {  
    $routeProvider.when('/access_token=:accessToken', {
        template: '',
        controller: function ($location, AccessToken) {
            var hash = $location.path().substr(1);
            AccessToken.setTokenFromString(hash);
            console.log("Redirecting to root in routeProvider of LTBapp module. ");
            $location.path('/');
            $location.replace();
        }
    });
    
    $routeProvider.when('/&auth_enc=:authEnc64', {
        template: '',
        controller: function ($location, $sessionStorage, AccessToken, callApi) {
            var authEnc64 = $location.path().substr(11);
            AccessToken.setTokenFromStruct(authEnc64, true);
            console.log("Redirecting to root in routeProvider of LTBapp module. ");
            $location.path('/');
            $location.replace();
        }
    });
    
    $routeProvider.when('/&auth_error=:error64', {
        template: '',
        controller: function ($location, AccessToken, alerts, gettextCatalog) {
            var err_64 = $location.path().substr(13);
            console.log('Authentication has returned an error ', err_64);
            
            var err_str = gettextCatalog.getString('Logging in failed');
            if (err_64){
                try {
                var err = AccessToken.b64_decode(err_64);
                err_str += ': '+err;
                } catch (e){
                   alerts.add(gettextCatalog.getString('No error message sent.'), 'warning', true);
                }
            }
            alerts.add(err_str, 'warning', true);
            AccessToken.destroy();
        }
    });
    
    $routeProvider.when('/', {
        templateUrl:'www/modules/home/home.html'
    });
    $routeProvider.when('/about', {
        templateUrl:'www/modules/about/about.html'
    });
    $routeProvider.when('/help', {
        templateUrl:'www/modules/help/help.html',
        controller:'HelpController',
        controllerAs: 'HelpCtrl'
    });
    $routeProvider.when('/contact', {
        templateUrl:'www/modules/contact/contact.html'
    });
    $routeProvider.otherwise({
        redirectTo: "/"
    });
}])
//TODO. This service does not seem to be used. We use the global path_root variable
.service('path_root_service', function(){
   this.path_r = "www/";
})

.directive('languageMenu', ['setlanguage', function(setlanguage){
    return {
      restrict: "E",
      link: function(scope, element, attrs){
          scope.languages = setlanguage.languages;
          scope.switchLanguage = function(lang){
//              deblog('switchLanguage', lang);
              setlanguage.switch(lang);
          };
          scope.getCurrentLang = function(){
              return setlanguage.getCurrentLang();
          };
      },
      replace: true,
      template: '<ul class="nav navbar-nav pull-right">\n\
            <li uib-dropdown>\n\
                <a uib-dropdown-toggle>{{getCurrentLang()}} &nbsp;<span class="fa fa-caret-up"></span></a>\n\
                <ul uib-dropdown-menu>\n\
                   <li ng-repeat="(key, lan) in languages" ng-click="switchLanguage(key)" >{{lan}}</li>\n\
                </ul>\n\
            </li>\n\
        </ul>'
    };    
}])

.filter('to_trusted', ['trust', function(trust){
    return function(text) {
        return trust.html(text);
    };
}])
//TODO: I think that setlanguage can go 
.controller('MainController', ['sharedTexts', 'setlanguage', 'applicationFunctions', 'gettextCatalog',  '$scope', 'callApi', '$rootScope',
    '$location', 'alerts', 'trust', 'deviceDetector', 'useraccount',
    function(sharedTexts, setlanguage, applicationFunctions, gettextCatalog, $scope, callApi, $rootScope, 
    $location, alerts, trust, deviceDetector, useraccount){
    var _this = this;
    this.version = versionApp;
    
    callApi.start('web');
    
    
    this.getString = function(str){
        return sharedTexts.getString(str);
    }
    
    this.dismissMessage = function(index) {
        this.user_messages.splice(index, 1);
    };
    
    this.openExternal = function(url, block){
        applicationFunctions.openExternal(url, block);
    };
        
    this.init = function (){
        $rootScope.$on('oauth:logout', function(){
            if (oidc_true_logout) {
                _this.logoutURL = trust.url(_this.apisettings.auth_logout);
            }
            var greenlist = callApi.settings.page_green_list;
            var redirectlist = callApi.settings.page_mobile_redirect_list;
            var full_path = $location.$$path;
            var path = '/'+full_path.split('/')[1];
            if (path.indexOf('?') >=0) path = path.substr(0, path.indexOf('?'));
            if (path.indexOf('&') >=0) path = path.substr(0, path.indexOf('&'));
            if (path.indexOf('=') >=0) path = path.substr(0, path.indexOf('='));
            
            if (greenlist.indexOf(path) < 0){
                if ((deviceDetector.os === 'android' ||
                   deviceDetector.os === 'ios' ||
                   deviceDetector.os === 'windows-phone') && 
                   redirectlist.indexOf(path) >= 0){
                        $location.path(full_path.replace(path, '/redirect'));
                } else {   
                    alerts.add(gettextCatalog.getString('Please login to go to the page') + ' ' + $location.$$path, 'warning', true, 'forbidden');
                    $location.path("/");
                }
            }
                
            _this.current_role = useraccount.getInitialRoles();
            _this.user_role = '';
            _this.user_code = '';
            useraccount.init();
        });
        
        $rootScope.$on('oauth:profile', function(event, profile){
            if (profile && profile.role && 
               ((profile.role !== _this.user_role) || 
                    (profile.user_code !== _this.user_code))){
                deblog('Catch fresh event oauth:profile ', profile);
                _this.user_role = profile.role;
                _this.user_code = profile.user_code;
                useraccount.set(_this.user_role, _this.user_code);
                //Let the user account object calculate the roles
                _this.current_role = useraccount.getActualRoles();
                deblog(' na afloop van de oauth profile hebben we ', _this.current_role);
            } else {
                console.log('Profile has not been changed. Nothing to do.');
            }
        });
        
        $rootScope.$on('settings:update', function(){
            _this.apisettings = callApi.apisettings;
        });
        
        //this.version = "Version " + versionApp;
        this.apisettings = callApi.apisettings;
        this.pathRoot = "www/";
        this.user_messages = [];
        //if the web MainController is loaded, you are never in real app modus
        this.inapp = false;
        //Data about current user
        this.user_role = null;
        this.user_code = '';
        this.current_role = useraccount.getInitialRoles();//this.initial_role;
        
        this.logoutURL = '';
    };
    
    this.init();
}]);
