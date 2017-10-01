'use strict';

angular.module('LTBApp')      
.controller('HelpController', ['callApi',
    function(callApi) {
    
    var _this = this;
    
    this.storeCodes = function(codes){
        callApi.setDebugCode(codes.debug_code);
        _this.debug_code = codes.debug_code;
        _this.debugging_on = 1;
    };
    
    this.deleteCodes = function(){
        callApi.deleteDebugCode();
        _this.debugging_on = 0;
        _this.debug_code = '';
    };
    
    this.startDebugSession = function(){
        //render function, the verify code, is-app, current version
        callApi.debugStart(_this.storeCodes, _this.verify_code, 0, version);
    };
    
    this.stopDebugSession = function(){
        //render function, the verify code, is-app, current version
        callApi.debugStop(_this.deleteCodes, null, this.debug_code);
    };
    
    this.init = function(){
        this.debug_code = callApi.getDebugCode();
        this.debugging_on = (this.debug_code ? 1 : 0);
        this.verify_code = '';
     };
     this.init();
}]);