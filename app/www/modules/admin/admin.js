'use strict';

angular.module('LTBApp.administration', ['ngRoute'])
        
.config(['$routeProvider', function($routeProvider) {  
    $routeProvider.when('/admin', {
        templateUrl:path_root + 'modules/admin/admin.html',
        controller:'AdminController',
        controllerAs: 'AdminCtrl'
    });
}])
.config(['$routeProvider', function($routeProvider) {  
    $routeProvider.when('/eval', {
        templateUrl:path_root + 'modules/admin/eval.html',
        controller:'AdminController',
        controllerAs: 'AdminCtrl'
    });
}])
.controller('AdminController', ['callApi','gettextCatalog','$localStorage',
    'alerts', 'applicationFunctions','$scope',
    function(callApi, gettextCatalog, $localStorage, alerts, applicationFunctions,
        $scope) {
    
    var _this = this;    
    function syntaxHighlight(jsonString) {
        if (typeof jsonString != 'string') {
             jsonString = JSON.stringify(jsonString, undefined, 2);
        }
        var jsonPretty = JSON.stringify(JSON.parse(jsonString),null,2);  
        var json = jsonPretty.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        json = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
        return "<pre>"+json+"</pre>";
    }

    function convertTime(t){
        // Create a new JavaScript Date object based on the timestamp
        // multiplied by 1000 so that the argument is in milliseconds, not seconds.
        var date = new Date(t*1000);
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var year = date.getFullYear();
        var month = months[date.getMonth()];
        var day = date.getDate();
        // Hours part from the timestamp
        var hours = date.getHours();
        // Minutes part from the timestamp
        var minutes = "0" + date.getMinutes();
        // Seconds part from the timestamp
        var seconds = "0" + date.getSeconds();

        // Will display time in 10:30:23 format
        return day+ ' '+ month + ' ' + year + ' ' + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    }
    
    this.toggleVal = function(item, nr, prefix){
        var span_prefix = 'val';
        if (prefix){
            span_prefix = 'device';
            nr = '';
        }
        
        var value = item[span_prefix+nr];
        var record = item['record_id'];
        var span_id = span_prefix + '_' + record + '_' + nr;
        if (value && ! this.expanded[span_id]){
            this.expanded[span_id] = true;
            var elem = document.getElementById(span_id);
            var div = document.createElement('div');
            div.innerHTML = syntaxHighlight(value);
            elem.appendChild(div);
        } else {
            this.hideVal(span_id);
        }
    };
    
    this.toggleDetails = function(item){
        var value = {verify_code: item['verify_code'], debug_code: item['debug_code']};
        var record = item['record_id'];
        var span_id = 'session_' + record;
        if (value && ! this.expanded[span_id]){
            this.expanded[span_id] = true;
            var elem = document.getElementById(span_id);
            var div = document.createElement('div');
            div.innerHTML = syntaxHighlight(value);
            elem.appendChild(div);
        } else {
            this.hideVal(span_id);
        }
    };
    
    this.showTime = function(item){
        var value = item['time'];
        var record = item['record_id'];
        var span_id = 'time_' + record;
        if (value && ! this.expanded[span_id]){
            this.expanded[span_id] = true;
            var elem = document.getElementById(span_id);
            var div = document.createElement('div');
            div.innerHTML = convertTime(value);
            elem.appendChild(div);
        } else {
            this.hideVal(span_id);
        }
    };
    
    this.hideVal = function(span_id, element){
        if (element){
            element.removeChild( element.lastChild );
        } else {
            var div = angular.element(document.querySelector( '#'+span_id + ' div' ));
            div.remove();
        }
        _this.expanded[span_id] = false;
    };
    
    this.getMessages = function(){
        if (this.verify_code || this.user_id || this.debug_code){
            this.messages = [];
            callApi.debugRetrieve(this.storeMessages, this.verify_code, this.debug_code, this.user_id);
        } else {
            alerts.add(gettextCatalog.getString('You must fill at least one of the input fields'), 'warning');
        }
    };
    
    this.purgeMessages = function(){
        if (this.verify_code || this.user_id || this.debug_code){
            this.messages = [];
            callApi.debugPurge(this.storeMessages, this.verify_code, this.debug_code, this.user_id);
        } else {
            alerts.add(gettextCatalog.getString('You must fill at least one of the input fields'), 'warning');
        }
    };
    
    this.storeMessages = function(messages_result){
        _this.messages = messages_result.messages;
        _this.messages_count = messages_result.count;
    };
    
    this.showVerificationCode = function(code){
        _this.verify_code = code;
        _this.setVerificationCode(code);
    };
    
    this.createDebugVerification = function(){
        callApi.debugInitialise(this.showVerificationCode, this.verification_end_date);
    };
    
    this.storeCodes = function(codes){
        _this.setVerificationCode(codes.verify_code);
        _this.verify_code = codes.verify_code;
        callApi.setDebugCode(codes.debug_code);
        _this.debug_code = codes.debug_code;
    };
    
    this.deleteCodes = function(){
        _this.deleteVerificationCode();
        callApi.deleteDebugCode();
    };
    
    this.deleteVerificationCode = function(){
        delete $localStorage.verify_code;
    };
    
    this.setVerificationCode = function(code){
        _this.verify_code = code;
        $localStorage.verify_code = code;
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
        callApi.debugStart(_this.storeCodes, _this.verify_code, 0, version);
    };
    
    this.setOpenCondition = function($event, field) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope[field] = true;
    };
    
    this.getLog = function(){
        return this.getLogFile(this.start_date, this.end_date);
    };
    
    var convertToTimeStamp = function(d){
        return d.getTime()/1000;
    };
    
    var convertToYMD = function(d){
        var s ='';
        s += d.getFullYear() + '-';
        s += (d.getMonth() +1) + '-';
        s += d.getDate();
        return s;
    };
    
    this.getLogFile = function(start, end){
        var args = '';
        if (start || end) {
            args = '?';
            if (start){
                args += 'start='+convertToYMD(start);//convertToTimeStamp(start);
            }
            if (end){
                args += '&end='+convertToYMD(end);//convertToTimeStamp(end)
            }
        }
        //Since log file is opened in external we will never see the waiting icon
        //callApi.startLoadingEvent('get', 'getLogFile');
        return applicationFunctions.openExternal(callApi.apisettings.api_uri + 
            callApi.apisettings.api_log +args, false, function(){
                //callApi.stopLoadingEvent('get', 'getLogFile');
        });
    };
    this.refactor = function(){
        callApi.refactorFiles();
    }
    
    this.init = function(){
        this.loading = callApi.loading_queue;
        this.verify_code = this.getVerificationCode();
        this.debug_code = callApi.getDebugCode();
        this.debugging_on = (this.debug_code ? 1 : 0);
        this.user_id = null;
        this.end = null;
        this.verification_end_date = '2016-09-12';
        this.expanded = {};
        this.start_date = '';
        this.end_date = '';
        this.log_start_opened = false;
        this.log_end_opened = false;
        this.no_value = gettextCatalog.getString('No value');
     };
     this.init();
}]);
