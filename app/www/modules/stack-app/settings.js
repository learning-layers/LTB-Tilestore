'use strict';

angular.module('LTBApp.settings', ['ngRoute'])
        
.config(['$routeProvider', function($routeProvider) {  
    $routeProvider.when('/settings', {
        templateUrl:path_root + 'modules/stack-app/settings.html',
        controller:'SettingsCtrl',
        controllerAs: 'settCtrl'
    });
}])

.controller('SettingsCtrl', ['alerts', 'callApi', '$localStorage','$location',
    '$rootScope', 'setlanguage', '$q', 'gettextCatalog', 'deviceDetector',
    function(alerts, callApi, $localStorage, $location, $rootScope, setlanguage,
        $q, gettextCatalog, deviceDetector) {
    var _this = this;

    this.initOpenStackSetting = function(){
        this.getOpenStackSetting();
        this.old_values.open_stack = this.open_stack;
    };
    
    this.initPreferredStack = function() {
        var preferred_stack_code = $localStorage.preferred_stack_code;
        if (preferred_stack_code){
            for (var i=0; i< this.stacks.length; i++) {
                if (this.stacks[i].stack_code === preferred_stack_code) {
                    this.preferred_stack = this.stacks[i];
                }
            }
        } else {
            this.preferred_stack = false;
        }
        this.old_values.preferred_stack_code = (this.preferred_stack ? this.preferred_stack.stack_code : false);
    };
    
    this.initLanguageUser = function() {
        this.languages = setlanguage.languages;
        this.language = setlanguage.getCurrentLangId();
        this.old_values.language = this.language;
    };
    
    this.initApiUri = function() {
        _this.api_uri = callApi.setCurrentApiUri();
        _this.old_values.api_uri = _this.api_uri;
    };
    
    this.initDebugSetting = function(){
        this.debug_code = callApi.getDebugCode();
        this.debugging_on = (this.debug_code ? 1 : 0);
        this.old_values.debugging_on = this.debugging_on;
        this.verify_code = this.getVerificationCode();
    };

    this.init = function(){
        this.app_debug = callApi.settings.debug;
        this.old_values = {};
        this.api_uri_edit = false;
        this.stacks = ((callApi.state.allstacks.length === 0) ? [] : callApi.state.allstacks);
        this.initApiUri();
        this.initLanguageUser();
        this.initOpenStackSetting();
        this.initDebugSetting();
      
        $rootScope.$on('ltbapi:allstacks-loaded', function (){
            _this.stacks = callApi.state.allstacks;
            _this.initPreferredStack();
        });
        if (this.stacks == false){
            // Stacks are not retrieved yet or there are no stacks at all in which
            // (unlikely) case another superfluous call is going to be made
            callApi.getStacks();
        } else {
            this.initPreferredStack();
        }
        
        var os = deviceDetector.os;
        if (os === 'ios') {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
        }
    };
    
    this.getOpenStackSetting = function(){
        if ($localStorage.open_stack){
            this.open_stack = $localStorage.open_stack;
        } else {
            this.open_stack = 'last';
        }
    };
    
    this.storeCodes = function(codes){
        _this.setVerificationCode(codes.verify_code);
        callApi.setDebugCode(codes.debug_code);
    };
    
    this.deleteCodes = function(){
        _this.deleteVerificationCode();
        callApi.deleteDebugCode();
    };
    
    this.setVerificationCode = function(code){
        $localStorage.verify_code = code;
    };
    
    this.deleteVerificationCode = function(){
        delete $localStorage.verify_code;
    };
    
    this.getVerificationCode = function(){
        if ($localStorage.verify_code){
            return $localStorage.verify_code;
        } else {
            return "";
        }
    };
    
    this.startDebugSession = function(){
        //render function, the verify code, is-app, current version
        callApi.debugStart(_this.storeCodes, _this.verify_code, 1, version);
    };
    
    this.stopDebugSession = function(){//version
        callApi.debugStop(_this.deleteCodes, null, _this.debug_code);
    };
    
    //TODO: check this again. We only want to reload the stack and leave the settings
    //if the changing of the debug modus is succesfully registered at the server
    this.changeDebugMode = function(next) {
        if (this.verify_code) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            if (_this.debugging_on == "1") {
                promise = promise.then(
                   function(){
                       if (!_this.startDebugSession()){
                           deferred.reject('Stop here. Starting debug session failed.');
                       }
                   }, function(){deblog('1 failing in changeDebugMode');}).then(next, function(data){deblog('1a het is mislukt', data);});
            } else {
                //_this.stopDebugSession();
                promise = promise.then(
                   _this.stopDebugSession, function(){deblog('2 failing in changeDebugMode');}).then(next, function(data){deblog('2a het is mislukt', data);});
            }
            deferred.resolve('started');
            return promise;
        } else {
            alerts.add(gettextCatalog.getString('No verification code was supplied'), 'warning');//TODO translate
        }
    };
    
    this.showMystacks = function(stack){
        return stack.favourite === "1" || stack.is_owner === "1";
    };

    this.changeLanguage = function () {       
        setlanguage.switch(this.language);
    };
    
    this.getCurrentLang = function(){
        return setlanguage.getCurrentLang();
    };
    
    this.changeApiUriSetting = function(callback) {
        if (!this.api_uri) {
            callApi.deleteCurrentApiUri();
        } else {
            callApi.setCurrentApiUri(this.api_uri, callback);
        }        
    };
    
    this.changeOpenStackSetting = function () {
        if (this.open_stack) {
            $localStorage.open_stack = this.open_stack;
        } else {
            delete $localStorage.open_stack;
        }
    };
    
    this.changePreferredStack = function () {
        if (this.preferred_stack) {
            $localStorage.preferred_stack_code = this.preferred_stack.stack_code;
        } else {
            delete $localStorage.preferred_stack_code;
        }
    };
    
    this.rtrimslash = function(s){
        return s.replace(/\/+$/,'');
    };
    
    this.updateApiLocation = function(){
       if (this.api_uri){
            this.api_uri = _this.rtrimslash(this.api_uri) + '/';
            if (this.api_uri.indexOf('http') == -1){
                this.api_uri = 'http://'+ this.api_uri;
            }
            this.changeApiUriSetting(function(){
                //It would be neater if we got stacks only after getting complete information 
                //about the new server, but we have enough information to get the stacks.
                callApi.getStacks();
            });
            
            this.preferred_stack = null;
            this.open_stack = 'preferred';
            
            alerts.add(gettextCatalog.getString('Choose a new preferred Stack'), 'success');
            return true;
        } else {
            alerts.add(gettextCatalog.getString('Api location can never be empty'), 'danger');
            return false;
        } 
    };
    
    this.restoreApiLocation = function(){
        this.api_uri = this.old_values.api_uri;
        return true;
    };
    
    this.restoreSettings = function(){
        this.open_stack = this.old_values.open_stack;
        this.preferred_stack_code = this.old_values.preferred_stack_code;
        this.language = this.old_values.language;
        this.debugging_on = this.old_values.debugging_on;
        if (this.api_uri !== this.old_values.api_uri) {
            this.restoreApiLocation();
            this.changeApiUriSetting();
        }
        return true;
    };
    
    this.saveSettings = function(){
        if (_this.old_values.open_stack !== _this.open_stack){
            _this.changeOpenStackSetting();
        }
        if (this.preferred_stack && (_this.old_values.preferred_stackCode !== _this.preferred_stack.stack_code)){
            _this.changePreferredStack();
        }
        if (_this.old_values.language !== _this.language){
            _this.changeLanguage();
        }
        
        var opening_stack = (_this.open_stack === 'preferred' )&& 
                (_this.preferred_stack && _this.preferred_stack.stack_code) ?
            _this.preferred_stack.stack_code : $localStorage.last_stack_code;
            
        if (_this.old_values.debugging_on !== _this.debugging_on){
            var next_fun = function (){
                deblog('Debug done and now Settings saved. Opening now the new standard stack with id ', opening_stack);
                callApi.getStack(opening_stack);
                $location.path("/");
            };
            _this.changeDebugMode(next_fun);
        } else {
            callApi.getStack(opening_stack);
            $location.path("/");
        }        
    };
    
    this.cancel = function () {
        this.restoreSettings();
        $location.path("/");
    };
    
    this.init();
}]);
