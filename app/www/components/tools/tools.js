/* This directive makes it possible for elements with a src attribute to 
 * load a default src to show when the GET returns a (404) error
 */
angular.module('LTBApp')
/* Service to store and retrieve current user for all controllers that need to know 
 * The viewers can make use of the settings as defined in the Main controller
 * @returns object
 */
.service('useraccount', function () {
    //var _this = this;
    var initial_roles = {
        admin: null,
        not_admin: true,
        eval: null,
        not_eval: null,
        moderator: null,
        not_moderator: true,
        user: null,
        role: ''
    };
    this.init = function () {
        console.log('de init van useraccount wordt aangeroepen als het goed is aan t begin');
        this.user_role = '';
        this.user_code = '';
        this.current_roles = initial_roles;
    };

    this.isAdmin = function () {
//        deblog('isAdmin is checked and returns because of my role ', this.user_role,
//            this.user_role && (this.user_role == 'admin'));
        return this.user_role && (this.user_role == 'admin');
    };

    this.isEvaluator = function () {
//         deblog('isEvaluator is checked and returns because of my role ', this.user_role,
//            this.user_role && ((this.user_role == 'evaluator') || (this.user_role == 'admin')));
        return this.user_role && ((this.user_role == 'evaluator') || (this.isModerator()));
    };

    this.isModerator = function () {
//         deblog('isModerator is checked and returns because of my role ', this.user_role,
//            this.user_role && ((this.user_role == 'moderator') || (this.user_role == 'admin')));
        return this.user_role && ((this.user_role == 'moderator') || (this.user_role == 'admin'));
    };

    this.isUser = function () {
//        deblog('isUser', (this.user_role ? true : false));
        return (this.user_role ? true : false);
    };

    this.set = function (cr, code) {
        console.log(' komt netjes in de set van useraccount', cr, code);
        this.user_code = code;
        this.user_role = cr;
        this.current_roles = this.getActualRoles();
    };

    this.get = function(what, compare, role) {
        switch (what) {
            case 'role':
                if (angular.isDefined(compare) && compare == 'is') {
                    if (!angular.isDefined(role))
                        return false;
                    return this.current_roles[role];
                } else {
                    return this.current_roles.role;
                }
            case 'roles':
                return this.current_roles;
                break;
            case 'code':
                return this.user_code;
                break;
            default:
                return false;
        }
    };

    this.getActualRoles = function(){
        var is_admin = this.isAdmin();
        var is_evaluator = is_admin || this.isEvaluator();
        var is_moderator = is_admin || this.isModerator();
        return {
            admin: is_admin,
            not_admin: !is_admin,
            eval: is_evaluator,
            not_eval: !is_evaluator,
            moderator: is_moderator,
            not_moderator: !is_moderator,
            user: this.isUser(),
            role: this.user_role
        };
    };

    this.getInitialRoles = function () {
        return initial_roles;
    };
console.log('komt ie ooit in deze functie?');
    this.init();
    return this;
})
.service('connectsettings', ['defaultsettings', '$localStorage', '$http', 
        function(defaultsettings, $localStorage, $http){
            
    var _this = this; 
    this.settings = false;
    this.key = false;
    
    this.setCurrentApiUri = function(api_uri){
        // At the moment the setting for the api is not available/settable
        // in the Tilestore (this is only possible in the app) but it can be set by
        // switching boxes. So in case of the Tilestore we stick to the 
        // setting of the api uri coming from the local settings or the 
        // settings above unless there was a switch.
        // If we move to the preview and debugging is on, we pickup the settings
        // of the Tilestore at first, but this can be changed on later on. Every time
        // we move from the tilestore via the preview button to preview modus, the 
        // $localStorage.api_uri will be reset to the api the stack is belonging to.
        if (api_uri){
            if (in_app || (this.settings.debug && is_app)){
                this.settings.api_uri = api_uri;
                $localStorage.api_uri = api_uri;
            }
        } else {
            if ((in_app  || (this.settings.debug && is_app)) && $localStorage.api_uri){
                this.settings.api_uri = $localStorage.api_uri;                
            }
        }
        return this.settings.api_uri;
    };
    
    this.deleteCurrentApiUri = function(){
        if (in_app){
            delete $localStorage.api_uri;
        }
    };
    
    this.init = function(key, callback){
        var settings_file = 'settings/local_settings.json';

        if (key !== 'app'){
            key = 'web';
        }
        
        $http.get(path_root + settings_file)
            .then(function(result) {
                var data = result.data;
                
                if (!in_app && data.env){
                    deblog('verwacht hem hier met ', data.env);
                    key = data.env;
                }
                if (data[key]){
                    _this.settings = data[key];
                } else {
                    _this.settings = defaultsettings;
                }
                if (!_this.settings.debug ){
                    //switching all console.logs off that are invoked by the console.log
//                    wrapper
                    deblog = function(){};
                }
                deblog('verwacht hem nu  met ', data.env);
                _this.setCurrentApiUri();
                if (callback){
                    callback(_this.settings);
                }
            },
            function(){
                _this.settings = defaultsettings;
                _this.setCurrentApiUri();
                
                deblog('connectsettings.init error', key, in_app, _this.settings);
                if (callback){
                    callback(_this.settings);
                }
            });
    };
    
    this.get = function(callback){
        if (callback){
            callback(this.settings);
        } else {
            return this.settings;
        }
    };

}])

.service('setlanguage', ['gettextCatalog', '$localStorage', function(gettextCatalog, $localStorage){
    var deflang = 'en';
    this.languages = {
        en: 'English', 
        es_ES: 'Español',
        de_DE: 'Deutsch',
        nl: 'Nederlands'
    };
    this.switch = function (lang) {
        if (this.languages[lang]){
            deblog('In setLanguage.switch: been passed a valid language ', lang);
            $localStorage.lang = lang;
            gettextCatalog.setCurrentLanguage(lang);
            gettextCatalog.loadRemote(path_root+"languages/" + lang + ".json");
            return true;
        } else {
            return false;
        }
    };
    
    this.current = function(){
        var lang = deflang;
        if ($localStorage.lang){
            lang = $localStorage.lang;
        }
        this.switch(lang);
    }
    
    this.getCurrentLangId = function(){
        return $localStorage.lang ? $localStorage.lang : deflang;
    };
    
    this.getCurrentLang = function(){
        var lang_id = this.getCurrentLangId();
        return this.languages[lang_id];
    };
}])

.service('trust', ['$sce', function($sce){
    this.html = function(html){
        if(!html){
            html = '';
        }
        var newHtml = html.replace(/<a/g, '<a onclick="javascript:return openExternal(this)"');
        return $sce.trustAsHtml(newHtml);
    };
    
    this.url = function(url){
        return $sce.trustAsResourceUrl(url);
    };
}])

.service('sharedTexts', ['gettext', 'gettextCatalog', function(gettext, gettextCatalog){
    var strings = {
        'remove_favourite': gettext('Remove from favourites'),
        'add_favourite': gettext('Add to favourites'),
        'private_stack': gettext('Private Stack'),
        'public_stack': gettext('Public Stack'),
        'mark_as_read': gettext('Mark as read'),
        'mark_as_unread': gettext('Mark as unread'),
        'untitled': gettext('[untitled]'),
        '[Untitled] on': gettext('[Untitled] on'),
        'unknown_type': gettext('Unknown type'),
        'invalid_tiletype_edit': gettext('You cannot edit this tile. You can only remove it'),
        'view_in_edit_modus': gettext('You can view the tiles in the Preview or Edit screens')
    };    
    
    this.getString = function(key){
        return gettextCatalog.getString(strings[key]);
    };
    
    this.getStringWithArgs = function(key, args){
        return this.sprintf(gettextCatalog.getString(strings[key]), args);
    };
    
    this.replaceArgs = function(translated, args){
        return this.sprintf(translated, args);
    };
    
    this.sprintf = function sprintf(text, args) {
        if (text && args){
            for (var i = 0; i < args.length; i++) {
              text = text.replace(/%d|%s/, args[i]);
            }
        }   
        return text;
    };
    
}])
.service('applicationFunctions', ['callApi', 'AccessToken', 'deviceDetector', 
                        function(callApi, AccessToken, deviceDetector){
    this.addTokenToUrl = function(url) {
        if (url) {
            if (url.indexOf(callApi.apisettings.api_uri) >= 0 
                    && url.indexOf('?token=') < 0) {
                var tokens = AccessToken.get();
                var token_qs = '';
                if (tokens) {
                    var connector = url.indexOf('?') < 0 ? '?': '&';
                    token_qs = connector+'token=' + tokens.access_token;
                }
                return url + token_qs;
            }
            return url;
        } else {
            return '';
        }
    };
    
    this.addSizeToUrl = function(url, w, h) {
        if (url) {
            if (url.indexOf(callApi.apisettings.api_uri) >= 0 
                    && url.indexOf('?size=') < 0) {
                var size_qs = '';
                if (w && h) {
                    var connector = url.indexOf('?') < 0 ? '?': '&';
                    size_qs = connector+'size=' + w + 'x' + h;
                }
                return url + size_qs;
            }
            return url;
        } else {
            return '';
        }
    };
    
    this.launchGoogleApp = function (app, url)
    {
        var urlscheme = '';
        var app_id = '';
        
        switch(app) {
            case 1:
                urlscheme = 'googlesheets://';
                app_id = 'id842849113';
                break;
            case 2:
                urlscheme = 'googledocs://';
                app_id = 'id842842640';
                break;
            case 3:
                urlscheme = 'googledrive://';
                app_id = 'id507874739';
                break;
        }
        
        var sApp = startApp.set(urlscheme + url);
            sApp.go(
                function (message) { 
                    /* success */
                }, function (error) {
                    /* error */
                    window.open('itms://itunes.apple.com/app/'+app_id, '_system');
                    //alerts.add(error, 'warning');
                }
        );
    }    
    //TODO: better naming would be openInternalUrl in contrast with openExternal as it is called
    //now. This openExternal function does almost the same: it does not add the token though
    this.openExternal = function(url, block, callback){
        if (url && !block){
            var os = deviceDetector.os;
            var google_app = -1;
            
            if(os === 'ios') {
                if (url.includes("docs.google.com/spreadsheets")) {
                    google_app = 1;
                }
                else if (url.includes("docs.google.com")) {
                    google_app = 2;
                }
                else if (url.includes("drive.google.com")) {
                    google_app = 3;
                }
                
            }
            
            if(google_app !== -1) {
                this.launchGoogleApp(google_app, url);
            }
            else {
                url = this.addTokenToUrl(url);
                var opened = window.open(url, '_system');
                if (callback){
                    callback();
                }
            }
        }
    };    
}])
.service('debug', ['callApi', '$localStorage', function(callApi, $localStorage){
    var _this = this;
    
    this.add = function(m, v1, v2, v3){
        callApi.debug(m, v1, v2, v3);
    };
}])
.directive('errSrc', function() {
    return {
        link: function(scope, element, attrs) {
                deblog('errSrc');
            element.bind('error', function() {
                deblog('errSrc error');
                if (attrs.src !== attrs.errSrc) {
                  attrs.$set('src', attrs.errSrc);
                }
            });
        }
    };
})

.service('alerts', ['$rootScope', '$timeout', 'sharedTexts',// 'callApi', 
    function($rootScope, $timeout, sharedTexts){
    //types: default, primary, warning, success, danger, info
    var _this = this;
    this.debug = true;//callApi.settings.debug;
    this.alerts = [];
    this.alerts_context = [];
    this.message_expire = true;//By setting this to true, the message will be removed from the interface
    this.message_fade = true; //if a message expiring is possible or it is a success message, let it fade away
    this.time_expire_period = 2000;
    this.time_remove_period = 1000;
    this.showLogin = false;
    this.showFav = false;
    
    this.addGlobal = function(msg, dev_modus){
        if (msg.key){
            //Only add messages that are not already in the alert messages list
            for(var i = 0, len = this.alerts.length; i < len; i++){
                if ((this.alerts[i].show_times > 0) && this.alerts[i].key && 
                     this.alerts[i].key === msg.key) {
                    return false;
                }
            }
        }
        this.alerts.push(msg);
        var index = this.alerts.length -1;
        //We can by default fade messages, but leave them in development modus
        //i.e. when debugging is switched on and the alert is marked for developers
        //only.
        if ((this.message_expire &&  !dev_modus) || (msg.type === 'success')){
            $timeout(function() { 
                if (_this.alerts[0]){
                    _this.alerts[0].expired = _this.message_fade;
                }
                $timeout(function() {
                    //Sometimes after coming back to the page, the alert does not longer
                    //exist, but the timeout function is executed after a so called 
                    //angular 'completeOutstandingRequest', so we just remove the first one
                    _this.removeGlobal(0);//used to be index
                }, _this.time_remove_period);
            }, _this.time_expire_period);
        }
    };
    
    this.addContext = function(msg, dev_modus){
        if (msg.key){
            //Only add messages that are not already in the alert messages list
            for (var i = 0, len = this.alerts_context.length; i < len; i++){
                if (this.alerts_context[i].key && this.alerts_context[i].key === msg.key) return false;
            }
        }
        this.alerts_context.push(msg);
        var index = 0;//this.alerts_context.length -1;
       
        if (((this.message_expire &&  !dev_modus) || (msg.type === 'success')) && (index >= 0)){
            $timeout(function() {
                if (_this.alerts_context[0]){
                    _this.alerts_context[0].expired = _this.message_fade;
                }   
                $timeout(function() {
                    _this.removeContext(0);//used to be index
                }, _this.time_remove_period);
            }, _this.time_expire_period);
        }
    };

    /*
     * Adds and alert on global or local (context sensitive) level. Local messages
     * are cleared upon every route switch, but global ones are marked as been read
     * one more time (show_times is one less). That means in practice (if no show_times
     * is passed on, that global messages are shown on the current screen and on the
     * next only. After they have a show_times == 0 and the filter as used in the alerts
     * directive omits these messages. Upon global refresh all message lists are initialised
     * to an empty list of course.
     * If a key is passed on, we can prevent that upon repeated actions giving a 
     * warning, only the first one is shown.
     */
    this.add = function(msg, type, global, key, show_times, dev_only, args){
        var dev_modus = false;
        if ((typeof dev_only !== 'undefined')){
            //So this is an alert that is normally not meant for users, only 
            //if debugging is put on if user modus debugging is on, we can log
            //the information to the server the conditions are checked inside
            //the debug function.
            
            //TODO this gives a circular dependency: callApi needs alerts and vv
            //callApi.debug(msg, type, global, key);
            if (dev_only && !this.debug){
                return true;
            } else {
                dev_modus = true;
            }
        }
        deblog('the dev modus is ', dev_modus, dev_only);
        if (!type) {
            //can be default, warning, danger etc.
            type = 'default';
        }
        var msg = {
            msg: typeof args !== "undefined" && args ? sharedTexts.sprintf(msg, args) : msg,
            type: type
        };
        if (key){
            msg.key = key;
        }
        if (global){
            msg.show_times = (show_times ? show_times : 1);
            this.addGlobal(msg, dev_modus);
        } else {
            this.addContext(msg, dev_modus);
        }
    };
   
    this.removeGlobal = function(index){
        this.alerts.splice(index, 1);
    };
   
    this.removeContext = function(index){
        this.alerts_context.splice(index, 1);
    };
   
    this.remove = function(index, global){
        if (global){
            this.removeGlobal(index);
        } else {
            this.removeContext(index);
        }
    };
    
    this.clear = function(all){
        if (all){
            this.alerts = [];
            this.alerts_context = [];
        } else {
            this.alerts_context = [];
            for (var i=0, len = this.alerts.length; i < len; i++) {
                this.alerts[i].show_times = Math.max(0, this.alerts[i].show_times -1);
            }
        }
        this.login(false);
        this.favourite(false);
    };
 
    this.login = function(force){
        if(force === false){
            this.showLogin = false;
        }else if(force === true){
            this.showLogin = true;
        }else{
            this.showLogin = !this.showLogin;
        }
    };
 
    this.favourite = function(force){
        if(!is_app){
            //only show this in mobile mode
            this.showFav = false;
        }else if(force === false){
            this.showFav = false;
        }else if(force === true){
            this.showFav = true;
        }else{
            this.showFav = !this.showFav;
        }
    };
    
    $rootScope.$on('$routeChangeSuccess', function(event, from, to){
        _this.clear(false);
    });
    
}])
.service('sharedFunctions',[function(){
    //Some shared functions to use
    
    //There is also the angular.isDefined function
    this.isDefined = function(key, obj){
        if (typeof obj === 'undefined'){
            return (key in window);//it is a global var
        }
        if (! obj){
            return false;
        }
        return (key in obj) && (obj[key] !== null);
    };
    
    this.findObjectIndex = function (obj_arr, prop, key) {
        var len = obj_arr.length;
        for (var i=0; i < len; i++) {
            if (obj_arr[i][prop] === key)
                return i;
        }
        return -1;
    };
    
    this.findKeysInObjectList = function (obj_arr, prop) {
        var len = obj_arr.length;
        var return_list = [];
        for (var i=0; i < len; i++) {
            return_list[i] = obj_arr[i][prop];
        }
        return return_list;
    };
    
    this.flattenList = function (arr) {
        var len = arr.length;
        
        if (len == 0) return '';
        var return_list = arr[0];
        for (var i=1; i <= len -1; i++) {
            return_list += ','+arr[i];
        }
        return return_list;
    };
}])
.directive('alerts', ['alerts', function(alerts) {
    return {
      restrict: "E",
      link: function(scope, element, attrs){
          scope.alerts = alerts;
      },
      //Filter globals on globals that were not shown on more than two screens (or whatever you set it to)
      template: '<uib-alert ng-repeat="msg in alerts.alerts | relevantAlerts" type="{{msg.type}}" class="{{msg.expired?\'fade-out\': \'\'}}" close="alerts.remove($index, true)" ng-click="alerts.remove($index, true)">{{msg.msg}}</uib-alert>\n\
                 <uib-alert ng-repeat="msg in alerts.alerts_context" type="{{msg.type}}" class="{{msg.expired?\'fade-out\': \'\'}}" close="alerts.remove($index)" ng-click="alerts.remove($index)">{{msg.msg}}</uib-alert>\n\
                 <uib-alert type="default" ng-if="alerts.showLogin" ><app-login></app-login></uib-alert>\n\
                 <uib-alert type="default" ng-if="alerts.showFav" ><app-favourite></app-favourite></uib-alert>'
    };
}])
.directive("waitingIcon", ['callApi', function(callApi){
    return {
        restrict: "E",
        scope: {},
        link: function(scope, element, attrs){
          scope.loading = callApi.loading_queue;
          scope.request_label = attrs.label;
          scope.waiting_class = attrs.waitingclass ? attrs.waitingclass : "fa fa-spinner fa-pulse fa-5x";
        },
        template: '<div ng-show="loading[request_label]"><span class="{{waiting_class}}"></span></div>'
    };
}])
.directive("waitingConditionIcon", [function(){
    return {
        restrict: "E",
        scope: {condition: '='},
        link: function(scope, element, attrs){
            scope.waiting_class = attrs.waitingclass ? attrs.waitingclass : "fa fa-spinner fa-pulse fa-5x";
        },
        template: '<div ng-show="condition"><span class="{{waiting_class}}"></span></div>'
    };
}])
//To be able to not only show divs, we also offer it in a text element <i> for example
//Note that parameterizing the element does not work for some reason
.directive("waitingIconInline", ['callApi', function(callApi){
    return {
        restrict: "E",
        scope: {},
        link: function(scope, element, attrs){
          scope.loading = callApi.loading_queue;
          scope.request_label = attrs.label;
          scope.waiting_class = attrs.waitingclass ? attrs.waitingclass : 'fa fa-spinner fa-pulse';
        },
        template: '<i ng-show="loading[request_label]" class="{{waiting_class}}"></i>'
    };
}])
//waiting-condition-icon-inline
.directive("waitingConditionIconInline", ['callApi', function(callApi){
    return {
        restrict: "E",
        scope: {
            waitingcondition: "=",
            waitingcontent: "="
        },
        link: function(scope, element, attrs){
            scope.loading = callApi.loading_queue;
            scope.waiting_class = attrs.waitingclass ? attrs.waitingclass : 'fa fa-spinner fa-pulse';
        },
        template: '<i ng-show="waitingcondition" class="{{waiting_class}}"></i><span ng-hide="waitingcondition">{{waitingcontent}}</span>'
    };
}])

.directive('uploadprogress', function(){
    return {
        scope: {
            perc: "="
        },
        template: '<div style="text-align: center"><div class="progress"><div class="progress-bar" style="width: {{perc}}%;"></div></div>{{perc}}%</div>'
    };
})

.directive('togglebutton', [function(){
    return {
        restrict: "AE",
        scope: {
            model: "=ngModel",
            sub: "=",
            default: "="
        },
        link: function(scope, element, attrs){
            deblog(typeof scope.model, scope.default);
            if(typeof scope.model === 'undefined' && scope.default){
                scope.model = true;
            }
            scope.setstyle = function(){
                if (scope.model){
                    scope.class = (scope.sub)?'fa text-info':'fa fa-2x text-success';
                    scope.class = scope.class + ' fa-toggle-on active';
                    scope.style = '{font-size:40px;cursor:pointer;}';
                } else {
                    scope.class = (scope.sub)?'fa':'fa fa-2x';
                    scope.class = scope.class + ' fa-toggle-on fa-rotate-180 inactive text-muted';//used to be danger
                    scope.style = '{font-size:40px;cursor:pointer;}';
                }
            };
            
            scope.$watch('model', function (v) {
                scope.setstyle();
            });
            scope.setstyle();
            
            scope.toggle = function(){
                deblog('click');
                scope.model = !scope.model;
                scope.setstyle();                
            };
        },
        template: '<i ng-class="class" ng-style="style" ng-click="toggle()"></i>'
    };
}])

.filter('secondsToDateTime', [function() {
    return function(seconds) {
        return new Date(1970, 0, 1).setSeconds(seconds);
    };
}])

.filter('initials', function() {
    return function(name) {
        if(!name){
            return "";
        }
        var n = name.split(" ");
        var ns = false;
        var ini = "";
        for(var i = 0; i < n.length; i++){
            ns = n[i].split("-");
            for(var j = 0; j < ns.length; j++){
                ini += ns[j].charAt(0);
                if(ini.length === 3){
                    break;
                }
            }
            if(ini.length === 3){
                break;
            }
        }

        if(ini.length === 1 && n[0].length > 1){
            ini == n[0].charAt(1);
        }

        return ini;
    };
})
;
