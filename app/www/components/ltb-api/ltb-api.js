'use strict';
var oidc_true_logout = ((typeof oidc_true_logout) === 'undefined') || oidc_true_logout;

//Start of module ltbapi
angular.module('ltbapi', [])
    .value('defaultsettings', { //From live tilestore to live api
            api_uri: 'https://api.ltb.io/',
            client_url: 'https://my.ltb.io/',
            default_stack: 'CJZHU',
            get_settings_always: true,
            debug: false
        }
    )

    .service('callApi', ["AccessToken", "connectsettings", "alerts", "gettextCatalog", "$http", "$location",
        "$filter", "$routeParams", "$sessionStorage", "$localStorage", "$rootScope", "deviceDetector",
        "sharedFunctions",
        function (AccessToken, connectsettings, alerts, gettextCatalog, $http, $location,
            $filter, $routeParams, $sessionStorage, $localStorage, $rootScope, deviceDetector,
            sharedFunctions
            ) {
            //TODO Move all globals variables in another service independent the API!

            var _this = this;
            this.use_interceptor = true;//normally set to true
            this.initialised = false;
            this.stack_history = [];
            this.inapp = in_app;
            //Via callApi, most modules can reach the alerts 
            //facility without explicitly including it
            this.alerts = alerts;
            this.isreloading = false;
            
            this.loading_queue = {
                nr_loading : 0
            };
            this.state = {};
            
            this.apisettings = false;
            
            this.start = function(key){
                connectsettings.init(key, _this.init_cb);//api_settings;
            };
                      
            this.device = {
                raw: deviceDetector.raw,
                os: deviceDetector.os,
                browser: deviceDetector.browser,
                device: deviceDetector.device,
                scheme: window.location.protocol || 'http'
            };
            
            this.settings = {
                page_green_list: [
                    '/',
                    '/store',
                    '/help',
                    '/about',
                    '/contact',
                    '/redirect',
                    '/viewStack'
                ],
                page_mobile_redirect_list: [
                    '/viewStack'
                ]
            };
            
            this.isDefined = function(val){
                return ( val in window);
            };
            
            this.setCurrentApiUri = function(api_uri, callback){
                if (api_uri){
                    connectsettings.setCurrentApiUri(api_uri);
                    this.apisettings.api_uri = api_uri;
                    
                    //If we change from api, the last stack opened, makes no sense, so we
                    //obligate to change to preferred stack. If no stack is chosen, the 
                    //default stack from that api will be used 
                    delete $localStorage.preferred_stack_code;
                    delete $localStorage.last_stack_code;
                    delete $localStorage.open_stack;
                    
                    this.clearHistory();
                    if(!callback){
                        callback = function(result){
                            console.log('The settings are up to date again', _this.apisettings, result);
                        };
                    }
                    this.getSettings(true, true, callback);
                }
                return this.apisettings.api_uri;
            };
            
            this.deleteCurrentApiUri = function(){
                connectsettings.deleteCurrentApiUri();
            };
            
            this.clear_state = {                                
                stackid: 0,
                stackfields: {},
                stack: {},
                messages: [],
                user_messages: [],
                screen: {},
                tiles: []
            };
            
            this.clearState = function(clearall, calling){
                this.state = angular.extend({}, this.state, this.clear_state);
                if (clearall){
                    this.state.allstacks = [];
                    this.state.mystacks = [];
                    this.state.favourites = [];
                }
            };
            
            this.isInitialised = function(){
                return this.initialised;
            };
            
            this.init_cb = function(settings){
                _this.init(settings);
            };
            
            this.init = function(settings){
                if (settings){
                    this.apisettings = settings;
                }
                this.settings.debug = this.apisettings.debug;
                this.alerts.debug = this.apisettings.debug;
                this.settings.client_url = this.apisettings.client_url;
                
                this.apisettings.api_embed = 'embed';
                this.apisettings.api_link_information = 'embedly';
                this.apisettings.api_environment = 'environment';
                this.apisettings.api_profile = 'profile';
                this.apisettings.api_favourite = 'favourite';
                this.apisettings.api_myfavourites = 'stack?favourites=1';
                this.apisettings.api_stack = 'stack';
                this.apisettings.api_mystacks = 'stack?public=0';
                //Not used directly this.apisettings.api_tag = 'tag';
                this.apisettings.api_sss = 'sss';
                this.apisettings.api_message = 'message';
                this.apisettings.api_notify = 'notify';
                this.apisettings.api_debug = 'debug';
                this.apisettings.api_reference = 'reference';
                this.apisettings.api_log = 'application/log/get';  
                
                //If the api uri has changed, some authorisation/authentication
                //settings that depend on that, should be changed too, so we set
                // them here.
                this.apisettings.redirect_uri = this.apisettings.api_uri + 'auth';
                this.apisettings.profile_uri  = this.apisettings.api_uri + 'auth/profile';
                this.apisettings.refresh_uri  = this.apisettings.api_uri + 'auth/refresh';
                
                this.clearState(true);
                this.failed_stack_attempt = false;
                console.log('In Init of callApi: get the settings', this.apisettings.get_settings_always);
                this.getSettings(true, this.apisettings.get_settings_always, function(){
                    $rootScope.$broadcast('settings:update');
                });
//                if(!AccessToken.get()){
//                    this.getFavourites();
//                }
                
            };
            
            this.clearHistory = function(stackid){
                if (!stackid){
                    this.stack_history = [];
                } else {
                    var his_len = this.stack_history.length;
                    while (his_len && this.stack_history[this.stack_history.length-1].stackid == stackid){
                        this.stack_history.pop();
                        his_len--;
                    }
                }
            };
            
            this.hasHistory = function(){
                return this.stack_history.length > 1;
            };
            
            this.getPrevScreen = function() {
                return (this.hasHistory() ? 
                    this.stack_history[this.stack_history.length-2] :
                    null);
            };
            
            this.getNumPrevScreens = function() {
                return max(this.stack_history.length - 1, 0);
            };
            
            this.addStackHistory = function(stackid, screen){
                //TODO console.log('addStackHistory', this.stack_history, screen);
                var prev = this.stack_history[this.stack_history.length-1];
                if (prev && prev.stackid === stackid && prev.screen === screen){
                    // do nothing: this.fromStackHistory();
                } else {
                    this.stack_history.push({
                        stackid : stackid,
                        screen: screen
                    });
                }
            };
            
            this.fromStackHistory = function(){
                if (!this.hasHistory()){
                    return false;
                }
                this.stack_history.pop();
                var target = this.stack_history[this.stack_history.length-1];
                if (target.stackid === this.state.stackid){
                    this.getTiles(target.screen, true);
                } else {
                    this.getStack(target.stackid, target.screen, true);
                }
                return target;
            };

            this.startLoadingEvent = function(type, request_label){
                if (request_label !== 'label_not_defined') {
                    this.loading_queue[request_label] = true;
                    this.loading_queue.nr_loading += 1;
                    console.log('Setting the loading on... label and queue', request_label, this.loading_queue);
                }
            };

            this.stopLoadingEvent = function(type, request_label, result){
                if (request_label !== 'label_not_defined') {
                    delete _this.loading_queue[request_label];
                    this.loading_queue.nr_loading -= 1;
                    console.log('Setting the loading off for .. queue.. result.. ', request_label, 
                    this.loading_queue,result);
                 }
            };

            this.registerLoading = function(label, init_value){
                init_value = init_value ? true : false;
                _this.loading_queue[label] = init_value;
            };

            this.registerLoadingMultiple = function(labels, init_value){
                init_value = !init_value ? false : true;
                for (var i=0;i< labels.length;i++){
                    _this.loading_queue[labels[i]] = init_value;
                }
            };
            
            //  API SETTINGS:  
            //  livesettings = live server settings for https://api.ltb.io
            //  localsetttings = local settings
            //  To connect to local API:
            //      Change the variable connect_settings to localsettings
            //  In the rest of the application the variable apisettings is used and so
            //  that is the one exported here
            this.setSettings = function(settings, renew_box){
                this.apisettings.authprovider_name = settings.auth_provider_name;
                this.apisettings.authclientid = settings.auth_clientid,
                this.apisettings.authprovider = settings.auth_provider;
                this.apisettings.authprovider_path = settings.auth_provider_path;
                this.apisettings.auth_scope = settings.auth_scope;
                this.apisettings.auth_access_type = settings.auth_access_type;
                this.apisettings.auth_logout = settings.auth_logout;
                
                this.apisettings.response_type = 'code';
                if (settings.default_stack){
                    this.apisettings.default_stack = settings.default_stack;
                }
                
                this.apisettings.current_box_label = (settings.box_label ? settings.box_label : 'No label');
                this.apisettings.current_box_id = (settings.box_id ? settings.box_id : 'default');
                this.setCurrentBox(
                    this.apisettings.api_uri,
                    this.apisettings.current_box_id,
                    this.apisettings.current_box_label,
                    renew_box
                );
        
                //If the api uri has changed, some authorisation/authentication
                //settings that depend on that, should be changed too, so we set
                // them here.
                this.apisettings.redirect_uri = this.apisettings.api_uri + 'auth';
                this.apisettings.profile_uri  = this.apisettings.api_uri + 'auth/profile';
                this.apisettings.refresh_uri  = this.apisettings.api_uri + 'auth/refresh';
                
                this.apisettings.unsplash_api_key = settings.unsplash_api_key;
                
                this.initialised = true;
                
                //TODO make the translation between the same entity naming more smooth. We could
                //just choose one or another
                var params = {
                    scope: this.apisettings.auth_scope,
                    accessType: null,
                    approvalPrompt: false,
                    fullsite: false,
                    site: this.apisettings.authprovider,
                    authorizePath: this.apisettings.authprovider_path,
                    responseType: this.apisettings.response_type,
                    clientId: this.apisettings.authclientid,
                    redirectUri: this.apisettings.redirect_uri,
                    refreshUri: this.apisettings.refresh_uri,
                    encrypt: true,
                    state: this.getMyLocation(),//$location.absUrl() || "http://localhost:8383/LTB-Tilestore-App/app/index.html#/"
                    box_id: this.apisettings.current_box_id,
                    box_label: this.apisettings.current_box_label
                };
                AccessToken.set(params);
                
            };
            
            this.getMyLocation = function(){
                var loc = $location.absUrl();
                if (!loc || (loc.indexOf('file://') === 0)){
                    loc = "http://localhost:8383/LTB-Tilestore-App/app/index.html#/";
                }
                return loc;
            };
            
            this.getPreviewLocation = function(code){
                var re = new RegExp(/(^.*\/)(index.html|\#)/);
                var re_result = re.exec(window.location.href);
                var url = re_result[1];
                return url + 'www/#/stack/'+code;
            };
            
            this.getSettings = function(set, force, callback){
                if (force || this.apisettings.get_settings_always || !$sessionStorage.environment) {
                    //We ask for my environment. The id 'my' is irrelevant, we just
                    //want one entity back.
                    this.get('environment/server', {json:true}, function(json_response){
                        if (typeof set == 'undefined'){
                            set = true;
                        }
                        if (set) {
                            $sessionStorage.environment = json_response.result;
                            //In case we ask for a collection (now forbidden) use:
                            //  $sessionStorage.environment = json_response._embedded.environment[0];
                            _this.setSettings($sessionStorage.environment);
                        }
                        
                        if (callback){
                            callback(json_response.result);
                        }
                    });
                } else {
                    this.setSettings($sessionStorage.environment);
                    if (callback){
                        //The callback might be a simple trigger to say that the settings 
                        //are updated. We want to broadcast that too, so that we
                        //know when to check the authorisation and start loading 
                        //the stack(s).
                        callback(null);
                    }
                }
            };
            
            this.getAppsAvailable = function(callback){
                this.get('environment/apps', {json:true}, function(json_response){
                    callback(json_response.result);
                }, null, 'getAppsAvailable');
            };
                        
            this.getLinkInformation = function(urls, information_type, params, callback){
                if (urls.length > 20){
                    alerts.add(gettextCatalog.getString('Please supply max 20 urls at a time.'), 'warning');
                    return false;
                }
                var label = 'getLinkInformation';
                params.json = true;
                params.urls = urls;
                this.get(this.apisettings.api_link_information + '/'+information_type, params, 
                    function(json_response){
                        if (json_response && json_response.result){
                            if (json_response.message){
                                alerts.add(json_response.message, 'success', false, label);
                            }
                            if (callback){
                                callback(json_response.result);
                            }
                        } else {
                            if (json_response && json_response.message){
                                alerts.add(json_response.message, 'warning', false, label);
                            } else {
                               alerts.add(gettextCatalog.getString('No valid information returned for all urls entered'), 'warning', false, 'getLinkInformation');
                            }
                        }
                    }, function(json_response){
                        alerts.add(gettextCatalog.getString('Received bad result') + ' ' + label, 'warning');
                    },
                    label
                );
            };
            
            this.emptyScreen = function(name, id){
                if (!id) return;
                if (!name) name = gettextCatalog.getString('screen') + ' ' +id;
                return {tiles:[], name: name, id :id, img:''};
            };
            
            this.addScreen = function(name, startscreen, tiles){
                if (! this.state.stack.screens){
                    this.state.stack.screens = [];
                }
                var nr_screens = this.state.stack.screens.length;
                
                var id = nr_screens ? this.state.stack.screens[nr_screens -1].id + 1 : 1;
                if (!name) {
                    name = gettextCatalog.getString('screen') + ' ' + id;
                }
                
                var new_screen = this.emptyScreen(name, id);
                this.state.stack.screens.push(new_screen);
                if (startscreen) {
                    this.state.stack.startscreen = id;
                }
                
                this.saveCurrentScreen();
                this.state.screen = new_screen;
                
                if (tiles)
                    this.state.tiles = tiles;
                else
                    this.state.tiles = [];
            };
            
            this.saveCurrentScreen = function(){ 
                if(!_this.state.stack['labels']){
                    _this.state.stack['labels'] = {};
                }
                angular.forEach(_this.state.stack.screens, function (s, k) {
                    if (s.id === _this.state.screen.id) {
                        //Save the scratch tiles from this screen to the global stack state
                        var thetile;
                        for(var i = 0; i < _this.state.tiles.length; i++){
                            thetile = _this.state.tiles[i];
                            if(thetile.type === 'collection' && thetile.settings.collection_name){
                                
                                if(!_this.state.stack['labels'][thetile.settings.collection_name]){
                                    _this.state.stack['labels'][thetile.settings.collection_name] = {
                                        type: 'sfs'
                                    };
                                }
                                _this.state.stack['labels'][thetile.settings.collection_name]['private'] = thetile.settings.private_content;
                            }
                        }
                        
                        _this.state.screen.tiles = _this.state.tiles;
                        _this.state.stack.screens[k] = _this.state.screen;
                    }
                });
            };
            
            this.deleteCurrentScreen = function(){
                if (_this.state.stack.startscreen === _this.state.screen.id) return false;
                angular.forEach(_this.state.stack.screens, function (s, k) {
                    if (s.id === _this.state.screen.id) {
                        _this.state.stack.screens.splice(k, 1);
                    }
                });
                return true;
            };
            
            this.initialiseStack = function(makecopy, stackid, stackfields){
                if (!makecopy){
                    this.state.stack = {
                        startscreen : 0, 
                        tags: [], 
                        screens: [],
                        settings: {}
                    };
                    this.addScreen(gettextCatalog.getString('start'), true)
                    this.state.stackid = stackid || 0;
                    this.state.stackfields = stackfields || {};
                    this.state.stackfields.public = 0;
                    this.state.stackfields.access_level = 1;
                    this.state.tiles = [];
                } else {
                    var original_stack = this.state.stackid;
                    this.state.stackid = 0;
                    this.state.stackfields.public = 0;
                    this.state.stackfields.access_level = 1;
                    this.state.stackfields.name = (this.state.stackfields.name ? 
                        gettextCatalog.getString('Copy from') + ' ' + this.state.stackfields.name : gettextCatalog.getString('Copy'));                 
                    this.state.stack.copyfrom = 
                        (this.state.stack.copyfrom ? 
                            angular.copy(this.state.stack.copyfrom) + ','+
                              original_stack :
                            original_stack);
                }
            };
            
            this.headers2 = function () {
                var headers = {Authorization: 'LocalBearer AndyTar' };
                return headers;
            };
            
            //headers will now be handled in oauth-ng
            this.headers = function () {
               var headers = {};
                //The AccessToken set() will initialise from the session in case
                //there was a refresh of the page
                if (! this.use_interceptor) {
                    AccessToken.set();
                    if (AccessToken.get()) {
                        headers = {Authorization: 'Bearer ' + AccessToken.get().access_token};
                    }
                }
                return headers;
            };
            //this.headers = this.headers2;
            
            
            this.testJson = function(text){
                 try {
                    var res = angular.fromJson(text);
                } catch (e) {
                    return false;
                }
                return (res ? true : false);
            };
            
            this.serialize = function(obj) {
                //from: http://stackoverflow.com/a/1714899
                var str = [];
                for(var p in obj){
                    if (obj.hasOwnProperty(p)) {
                        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                    }
                }
                return str.join("&");
            };
            
            this.jsonTestReturn = function(data, request, extra){
//                console.log('jsonTestReturn', data, request, extra);
//                if(!data){
//                    return true;
//                }
                var r = request ? '['+request + ']' : '';
                if (_this.testJson(data)){
                    console.log('Json tests ok '+ r+ ' with :', data);
                    return true;
                } else {
                    //Typically a fatal error at server side, is followed by an error mesage
                    //and an exit. In effect this is sending back plain text with status 200
                    //At the client side we do not know this status, but see malformed json
                    //for sure. Then these following lines are executed.
                    if (_this.settings.debug){
                        console.log('In jsonTestreturn '+ r +': Got really back:', data);
                    }
                    alerts.add(gettextCatalog.getString('Some unexpected error occurred.')+request, 'warning', null, null, null, false);
                    alerts.add('Got invalid Json from server for '+r + data, 'warning', null, null, null, true);
                    return false;
                }
            };
            
            this.noTestReturn =  function(data, request){
                var r = request ? '['+request + ']' : '';
                console.log('No Json test. Got back in request '+r, data);
                return true;
            };
            
            //From here on our entry points for doing http calls, all based on the $http
            //angular module
            
            /* rawget
             * 
             * @param {type} request: a full url to the api server
             * @param {type} params: an object of parameters that will be added as
             * GET params -although the console won't show them in the logs
             * @param {type} headers: will typically be an object {Authorization: 'Bearer XXXXX' }
             *  this is now fully handled in the oauth-ng module, making use of 
             *  the AccessToken object that keeps the tokens for the current user
             * @param {type} success: a success function
             * @param {type} fail: a callback on error
             * @returns {undefined} dependent on the success and fail functions passed
             */
            this.rawget = function (request, params, headers, success, fail, label) {
                var options = {};
                var return_test = null;
                if (params && params.json){
                    delete params.json;
                    return_test = this.jsonTestReturn;
                } else {
                    return_test = this.noTestReturn;
                }
                if (params){
                    options.params = params;
                };
                if (headers){
                    options.headers = headers;
                };
                label = label ? label : 'label_not_defined';
                _this.startLoadingEvent('get', label);
                
                //When the call is ended, there is a js object with the fields
                //config (original request), data (response), status, statusText
                var success_fun = 
                    function (response) {
                        _this.stopLoadingEvent('get', label, 1);
                        if (return_test(response.data, request, {resp: response, succ: success}) && success) {
                            success(response.data);
                        }
                };
                
                var fail_fun = 
                    function (result) {
                      _this.stopLoadingEvent('get', label, 0);
                      if (!return_test(result, request)){
                          if (fail){
                              alerts.add('Got invalid Json back', 'danger', null, null, null, true);
                              fail('');
                          }
                          return false;
                      }
                      
                      if (fail) {
                          fail(result.data, result.status);//possibly also result.config, result.statusText
                          console.log('Get failed', request, (params ? params : ' With no params '), result);
                      } else {
                          alerts.add(gettextCatalog.getString('An error occurred.'), 'danger');
                          console.log('Get failed', request, (params ? params : ' With no params '), result);
                      }
                }
                try {
                     $http.get(request, options).then(success_fun, fail_fun);
                } catch (e) {
                    console.log('Get call returned fatal error', e);
                    return false;
                }
               
            };

            //label introduced to fire general events bound to a certain label indicating
            //the originating function that called this.get
            this.get = function (request, data, success, fail, label) {
                console.log('callApi.get: calling rawget with :'+ this.apisettings.api_uri + request, data);
                return this.rawget(this.apisettings.api_uri + request, data, this.headers(),
                    success, fail, label);
            };
           
           //TODO replace success and error by then as those functions are deprecated!!
            this.jsonp = function (request, success, fail) {
                var promise = $http.jsonp(request);
                if (success) {
                    promise.success(success);
                }
                if (fail) {
                    promise.error(fail);
                }
            };
            
            this.patch = function (request, data, success, fail, label) {
                console.log('Patch:../'+ this.apisettings.api_uri + request, data, {headers: this.headers()});
                console.log('Common headers', $http.defaults.headers.common);
                if (label){
                    _this.startLoadingEvent('patch', label);
                }
                $http.patch(this.apisettings.api_uri + request, data, 
                    {headers: this.headers()}).
                then(
                  function(response){
                        if (label){
                            _this.stopLoadingEvent('patch', label, 1);
                        }
                        console.log('Patch was succesfull', response);
                        if (success && _this.jsonTestReturn(response.data, request)){
                            success(response.data);
                        }
                    },
                  function(response){
                        if (label){
                            _this.stopLoadingEvent('patch', label, 0);
                        }
                        console.log('Patch failed', response);
                        if (fail && _this.jsonTestReturn(response.data, request)){
                            fail(response.data);
                        } else {
                            alerts.add(gettextCatalog.getString('Updating failed'), 'danger');
                            if (response.data && response.data.detail){
                                alerts.add(response.data.detail, 'danger', null, null, true);
                            }
                        }
                    }  
                );
            };
            
            /* This is a temporal solution to disguise a patch statement as a put statement since
             *  since patch does not give any response for some reason at the development server
             * @param {type} request
             * @param {type} data
             * @param {type} success
             * @param {type} fail
             * @param {type} label for starting and stopping a waiting icon
             * @returns Json object in Halformat with property result: bool}
             */
            this.putpatch = function (request, data, success, fail, label) {
                console.log('putpatch:../'+ this.apisettings.api_uri + request, data, {headers: this.headers()});
                if (data){
                    data.is_patch = true;
                } else {
                    alerts.add(gettextCatalog.getString('Argument list is empty for the update'));
                }
                return this.put(request, data, success, fail, label);
            };
            
            this.put = function (request, data, success, fail, label) {
                console.log('Putting:../'+ this.apisettings.api_uri + request, data, {headers: this.headers()});
                console.log('Common headers', $http.defaults.headers.common);
                if (label){
                    _this.startLoadingEvent('put', label);
                }
                $http.put(this.apisettings.api_uri + request, data, 
                    {headers: this.headers()}).
                then(
                  function(response){
                        if (label){
                            _this.stopLoadingEvent('put', label, 1);
                        }
                        console.log('Put was succesfull', response);
                        if (success && _this.jsonTestReturn(response.data, request)){
                            success(response.data);
                        }
                    },
                  function(response){
                        if (label){
                            _this.stopLoadingEvent('put', label, 0);
                        }
                        console.log('Put failed', response);
                        if (fail && _this.jsonTestReturn(response.data, request)){
                            fail(response.data);
                        } else {
                            alerts.add(gettextCatalog.getString('Updating failed'), 'danger');
                            alerts.add(response.data.detail, 'danger', null, null, true);
                        }
                    }  
                );
            };
            
            this.post = function (request, data, success, fail, label) {
                if (label){
                    _this.startLoadingEvent('post', label);
                }
                var success_fun = 
                    function(response){
                        console.log('Post was succesfull', response);
                        if (label){
                            _this.stopLoadingEvent('post', label, response.data);
                        }
                        if (success && _this.jsonTestReturn(response.data, request)){
                            success(response.data);
                        }
                    };
                var fail_fun = 
                    function(response){
                        console.log('Post failed', response);
                        if (label){
                            _this.stopLoadingEvent('post', label, response.data);
                        }
                        if (fail && _this.jsonTestReturn(response.data, request)){
                            fail(response.data);
                        } else {
                            alerts.add(gettextCatalog.getString('Saving failed'), 'danger');
                            alerts.add(response.data.detail, 'danger', null, null, true);
                        }
                    };
                
                $http.post(this.apisettings.api_uri + request, data, 
                    {headers: this.headers()})
                .then(success_fun, fail_fun);
            };
            
            this.delete = function (request, success, fail, label, params) {
                var success_fun = 
                    function(response){
                        if (label){
                            _this.stopLoadingEvent('delete', label);
                        }
                        console.log('Delete was succesfull', response);
                        if (success){
                            success(response.data);
                        } else {
                            alerts.add(gettextCatalog.getString('Succesfully removed the item'), 'success');
                        }
                    };
                var fail_fun = 
                    function(response){
                        if (label){
                            _this.stopLoadingEvent('delete', label);
                        }
                        console.log('Delete failed', response);
                        if (fail){
                            fail(response.data);
                        }
                    };
                if (label){
                    _this.startLoadingEvent('delete', label);
                }
                var parameters = params ? {params: params} : {};
                parameters.headers = this.headers();
                $http.delete(this.apisettings.api_uri + request, parameters)
                .then(success_fun, fail_fun);
            };
            
//            this.retryRefresh = function(callback){
//                if (AccessToken.get() && AccessToken.expired()){
//                
//                    if(AccessToken.getSemaphore()){
//                        AccessToken.refresh();
//                    }
//                    callback();
//                    return true;
//                }
//                return false;
//            };
            
            //Section on debugging
            this.setDebugCode = function (code){
                $localStorage.debug_code = code;
            };

            this.getDebugCode = function(){
                if ($localStorage.debug_code){
                    return $localStorage.debug_code;
                } else {
                    return "";
                }
            };
            
            this.deleteDebugCode = function(){
                delete $localStorage.debug_code;
            };
            
            //Some debug related functions that call the debug service from the ltb api
            this.debug = function(m, v1, v2, v3){
                var dc = this.getDebugCode();
                if (dc){
                    this.debugStore(dc, m, v1, v2, v3);
                }
            };
            
            this.debugInitialise = function (show, end){
                this.get(this.apisettings.api_debug + "/initialise", {
                    end: end,
                    json: true},
                    function(data){
                       if (data && data.result){
                            if (data.message){
                                alerts.add(data.message, 'success', false, 'debugInitialise');
                            }
                            show(data.result);
                        } else {
                            if (data && data.message){
                                alerts.add(data.message, 'warning', false, 'debugInitialise',
                                    null,null, true);
                            } else {
                                console.log('debugInitialise: ', data);
                            }
                        }
                    }, function(data){
                        console.log('In ltbapi.debugInitialise', data);
                    }
                );
            };
            
            this.debugPurge = function (render, verify_code, debug_code, user_id){//this.storeMessages, this.verify_code, this.debug_code, this.user_id
                this.get(this.apisettings.api_debug + "/purge", {
                    verify_code: verify_code,
                    user_id: user_id,
                    debug_code : debug_code,
                    json: true},
                    function(data){
                       if (data && data.result){
                            if (data.message){
                                alerts.add(data.message, 'success', false, 'debugPurge');
                            }
                            render([]);
                        } else {
                            if (data && data.message){
                                alerts.add(data.message, 'warning', false, 'debugPurge');
                            } else {
                                console.log('debugPurge: ', data);
                            }
                        }
                    }, function(data){
                        console.log('In ltbapi.debugPurge', data);
                    }
                );
            };
            
            this.debugRetrieve = function (render, verify_code, debug_code, user_id, start, end){
                this.get(this.apisettings.api_debug + "/retrieve", {
                    start: start,
                    end: end,
                    verify_code: verify_code,
                    debug_code: debug_code,
                    user_id: user_id,
                    json: true},
                    function(data){
                       if (data && data.result){
                            if (data.message){
                                alerts.add(data.message, 'success', false, 'debugRetrieve');
                            }
                            console.log('debugRetrieve Success : ', data);
                            render(data.result);
                        } else {
                            if (data && data.message){
                                alerts.add(data.message, 'warning', false, 'debugRetrieve');
                            } else {
                                console.log('debugRetrieve: ', data);
                            }
                            //render([]);
                        }
                    }, function(data){
                        console.log('In ltbapi.debugretrieve', data);
                    },
                    'debugRetrieve'
                );
            };
            
            this.debugStart = function (render, verify, app, version){
                if (verify){
                    return this.get(this.apisettings.api_debug + "/start", {
                        verify_code: verify,
                        app : app, 
                        version: version,
                        device: this.device,
                        json: true},
                        function(data){
                           if (data && data.result){
                                if (data.message){
                                    alerts.add(data.message, 'success', false, 'debugStart');
                                }
                                render(data.result);
                                return true;
                            } else {
                                if (data && data.message){
                                    alerts.add(data.message, 'warning', false, 'debugStart');
                                } else {
                                    console.log('debugStart: ', data);
                                }
                                return false;
                            }
                        }, function(data){
                            console.log('In ltbapi.debugStart', data);
                            return false;
                        }
                    );
                } else {
                    alerts.add(gettextCatalog.getString('Please enter your verification code'), 'warning');
                    return false;
                }
            };
            
            this.debugStop = function (render, verify, debug_code){
                if (! verify && ! debug_code){
                    alerts.add(gettextCatalog.getString('Unknow debug session'));
                    return false;
                }
                this.get(this.apisettings.api_debug + "/stop", {
                    verify_code: verify,
                    debug_code: debug_code,
                    json: true},
                    function(data){
                       if (data && data.result){
                            if (data.message){
                                alerts.add(data.message, 'success', false, 'debugStop');
                            }
                            render(data.result);
                        } else {
                            if (data && data.message){
                                alerts.add(data.message, 'warning', false, 'debugStop');
                            } else {
                                console.log('debugStop: ', data);
                            }
                        }
                    }, function(data){
                        console.log('In ltbapi.debugStop', data);
                    }
                );
            };
            
            this.debugStore = function (debug_code, message, val1, val2, val3){
                this.post(this.apisettings.api_debug + "/store", {
                    debug_code: debug_code,
                    message : message, 
                    val1: (val1 ? JSON.stringify(val1): null),
                    val2: (val2 ? JSON.stringify(val2): null),
                    val3: (val3 ? JSON.stringify(val3): null),
                    json: true},
                    function(data){
                       if (data && data.result){
                            if (data.message){
                                //alerts.add(data.message, 'success', false, 'debugStore');
                            }
                            //render(data.result);
                        } else {
                            if (data && data.message){
                                //alerts.add(data.message, 'warning', false, 'debugStore');
                            } else {
                                console.log('debugStore: ', data);
                            }
                        }
                    }, function(data){
                        console.log('In ltbapi.debugStore', data);
                    }
                );
            };
            
            this.refactorFiles = function(){
                this.get(this.apisettings.api_debug + '/refactor', null, function(){
                    alerts.add('Refactoren is gelukt', 'success');
                }, function(){
                     alerts.add('Refactoren is NIET gelukt', 'danger');
                });
            };
            
            //NOtify user of something. This is initiated from an action of the 
            //current user resulting in a notify message to the current user
            this.notifyByMail = function(sub, body, content_type){
                this.post(this.apisettings.api_notify, {
                    type: 'sendmail',
                    subject: sub,
                    message: body,
                    c_type: (content_type ? content_type : 'plain')
                }, function(data){
                        if (data && data.result){
                            if (data.message){
                                alerts.add(data.message, 'success', false, 'notifyByMail');
                            }
                        } else {
                            var m = data.message ? data.message : data;
                             alerts.add(m, 'warning', false, 'notifyByMail');
                        }
                }, function(data){
                    console.log('In ltbapi.notifyByMail', data);
                });
            };
            
            //Stack collection
            this.getStacks = function(){
                this.get(this.apisettings.api_stack, null, function(data) {
                    if (data && data._embedded){
                        _this.state.allstacks = angular.fromJson(data._embedded.stacks);
                        $rootScope.$broadcast('ltbapi:allstacks-loaded');
                        console.log('ltbapi.getStacks', angular.fromJson(data._embedded.stacks));
                    } else {
                        alerts.add(gettextCatalog.getString('Could not retrieve the stacks; an error occurred in retrieving them'), 
                        'warning', false, 'getStacks');
                        $rootScope.$broadcast('ltbapi:allstacks-failed');
                    }
                }, null, 'getStacks');
            };
            
            this.getMyStacks = function (emptyfirst) {
                if (emptyfirst) {
                    _this.state.mystacks = [];
                }
                this.get(this.apisettings.api_mystacks, {'json':true}, function(data) {
                    if (data && data._embedded){
                            _this.state.mystacks = angular.fromJson(data._embedded.stacks);
                            $rootScope.$broadcast('ltbapi:mystacks-loaded');
                    } else {
                        alerts.add(gettextCatalog.getString('Could not retrieve your stacks; an error occurred in retrieving them'), 
                        'warning', false, 'getMyStacks');
                        $rootScope.$broadcast('ltbapi:mystacks-failed');
                    }
                    }, null, 'getMyStacks');
            };
            
            this.searchStacks = function(search_fields, callback) {
                this.searchEntities(search_fields, 'stacks', callback, 'searchStacks');
            };
            
            this.searchEntities = function(search_fields, type, callback, label) {
                var type = type ? type : 'stacks';
                var label = label ? label : 'searchEntities';
                var api_call = this.apisettings.api_stack;
               
                var terms = this.serialize(search_fields);
                var query = '?'+terms+'&and=or';
                if (type !== 'stacks'){
                    api_call = this.apisettings.api_sss;
                    query += "&type=" + type;
                }
                this.get(api_call+query, {json: true}, callback, null, label);
            };
            
            this.convertToInputTagFormat = function(tag_list){
                if (! tag_list) return [];
                var result = [];
                for(var i=0;i < tag_list.length;i++){
                    result.push({
                        text: tag_list[i]
                    });
                };
                return result;
            };
            
            this.convertFromInputTagFormat = function(tag_list){
                if (! tag_list) return [];
                var result = [];
                var tag_len = tag_list.length;
                for(var i=0;i < tag_len;i++){
                    result.push(tag_list[i].text);
                }
                return result;
            };
            
            this.getStartupStackId = function (stackcode){
                var open_stack = $localStorage.open_stack;
                var temporal_stack = ($localStorage.temporal_stack_id ? $localStorage.temporal_stack_id : false);
                if (temporal_stack){
                    //Use a temporal stack only once
                    $localStorage.temporal_stack_id = false;
                }
                var opening_stack = (open_stack === 'preferred') ?
                    $localStorage.preferred_stack_code : 
                    $localStorage.last_stack_code;
                return stackcode || temporal_stack|| opening_stack || this.apisettings.default_stack;
            };
            
            //Stack Entity
            //TODO: add extra argument box_id
            //If this.api_settings.current_box_id != box_id : 
            //  $localStorage.temporal_stack_id = stackcode
            //  switch to box_id ==>
            //     x = getApiUri(box_id); 
            //     setBoxId();
            //     this.setCurrentApiUri(x)
            
            this.getStack = function(stackcode, screen, no_history, context, check_fav) {
                //We can still pass an int as stack id/stack code. Automatically 
                //conversion is applied at the server side
                if (!stackcode){
                    this.clearHistory();
                }
                
                stackcode = this.getStartupStackId(stackcode);
                if (stackcode == "0"){
                    //js considers the string with 0 as true
                    //The stack is still new, so do not retrieve it.
                    return false;
                }
                
                $rootScope.$broadcast('ltbapi:stack loading');
                var params = null;
                context = context || 'getStack';
                this.state.stack = null;
                this.state.stackfields = null;
                this.state.stackid = stackcode;
                this.state.messages = {};
                this.get(this.apisettings.api_stack + "/" + stackcode, params, function (data) {
                    if (_this.testJson(data)){
                        _this.state.stackfields = angular.fromJson(data);
                        if (!_this.state.stackfields.public){
                            _this.state.stackfields.public = 0;
                        } else {
                           _this.state.stackfields.public = parseInt(_this.state.stackfields.public); 
                        }
                        if (!_this.state.stackfields.access_level){
                            _this.state.stackfields.access_level = 1;
                        } else {
                           _this.state.stackfields.access_level = parseInt(_this.state.stackfields.access_level); 
                        }
                        if (_this.testJson(_this.state.stackfields.details)){
                            _this.state.stack = angular.fromJson(data.details);
                            
                            //To cope with the way the tag library saves lists of tags we convert it here 
                            //into that format [{text: ''}, ...]
                            _this.state.stackfields.current_tags =  _this.convertToInputTagFormat(
                                (_this.state.stackfields.my_tags ? angular.copy(_this.state.stackfields.my_tags):
                                [])
                            );
                            deblog('The stack is retrieved firing either "ltbapi:stack open" or "ltbapi:stack reload" for '+ stackcode, _this.state.stack);
                            $localStorage.last_stack_code = stackcode;
                            
                            if (_this.isreloading) {
                                deblog('The stack is retrieved after reload');
                                _this.getTiles(1, true, true);
                                
                                $rootScope.$broadcast('ltbapi:stack reload', stackcode);
                                _this.isreloading = false;
                            } else {
                                deblog('The stack is retrieved after a plain open action', screen, no_history);
                                _this.getTiles(screen, no_history);
                                $rootScope.$broadcast('ltbapi:stack open', stackcode);
                            }
                            
                            //show favourite popup for default stack and for intents
                            if ((check_fav || stackcode === _this.apisettings.default_stack) && 
                                    !_this.stackIsfavourite(_this.state.stackfields)){
                                alerts.favourite(true);
                                
                            }
                        } else {
                            alerts.add(gettextCatalog.getString('Stack details were not wellformed'), 'warning', false, context);
                            console.log('Stack details were not wellformed', _this.state.stackfields.details);
                             _this.initialiseStack(false, stackcode, _this.state.stackfields);
                            $rootScope.$broadcast('ltbapi:stack failed');
                        }
                    } else {
                        alerts.add(gettextCatalog.getString('Stack cannot be rendered correctly'), 
                            'danger', false, context);
                        console.log('Not all parts of the json are correct', data);
                        if (!_this.state.stackfields){
                            _this.state.stackfields = {};
                        }
                        _this.state.stackfields.name = gettextCatalog.getString('Invalid Stack');
                        $rootScope.$broadcast('ltbapi:stack failed');
                    }
                    
                }, function(data, status){
                    console.log('The stack could not be retrieved', data);
                    if (status !== 401){
                        //var alert = true;
//                        if (status === 403){
//                            alert = !_this.retryRefresh(function(){
//                                _this.getStack(stackcode, screen, no_history, context, check_fav);
//                            });
//                        }
                        //if (alert){
                            if (!AccessToken.get()) {
                                alerts.login(true);
                            } else {
                                alerts.add(gettextCatalog.getString('The Stack could not be retrieved.') +
                                    (status === 403 ? ' '+  gettextCatalog.getString('You do not have sufficient access rights to this stack.') :''), 
                                    'danger', false, 'getStack', 1, false);

                                alerts.add('We got:' + data.detail,'danger', false, 'getStack', 1, true);
                            }
                        //}
                    }
                    $rootScope.$broadcast('ltbapi:stack failed');
                },
                'getStack');
            };
            
            this.deleteStack = function (callback, callback_error, real_delete){
                var _this = this;
                real_delete = 0;
//                if (real_delete) {
//                    if (! MainCtrl.current_role.moderator){
//
//                        alerts.add('You have no right to delete a stack permanently.');
//                        return false;
//                    }
//                } else {
//                    real_delete = 0;
//                }
                if (!callback){ 
                    callback = function(data){
                        console.log('deleteStack success', data);
                    };
                }
                if (!callback_error){ 
                    callback_error = function (result){
                        console.log('deleteStack error', result);
                      };
                }
                
                var new_stack = ((_this.state.stackid === 0)) ;
                if (new_stack){
                    callback();
                } else {
                    _this.delete(_this.apisettings.api_stack + "/" + _this.state.stackid,
                        function (data){
                            callback(data);
                            if (data.warnings){
                                alerts.add(data.warnings, 'warning');
                            }
                        },
                        callback_error, 'deleteStack', {real : real_delete}
                    );
                }
            };
//TODO: perhaps rename the var state and wrap it in a function instead of using
//the callapi.state everywhere
//            this.getCurrentStackState = function () {
//                return this.state;
//            };
            
            //Retrieves the favourites
            this.getFavourites = function() {
                if(is_app){
                    var api_url = this.apisettings.api_favourite;
                }else{
                    var api_url = this.apisettings.api_myfavourites;
                }
                
                var broadcast = 'ltbapi:getFavourites-loaded';
                var action_label = 'getFavourites';
                
                if (AccessToken.get()){
                    
                    this.get(api_url, null, function (data) {
                        if (data && data._embedded){
                            if(is_app){
                                _this.state.favourites = data._embedded.favourites;
                                _this.offlineFavouritesSync();
                            }else{
                                _this.state.favourites = angular.fromJson(data._embedded.stacks);
                            }
                            $rootScope.$broadcast(broadcast);
                        }
                    }, null, action_label);
                }else if(is_app){
                    this.state.favourites = this.offlineGetFavourites();
                    $rootScope.$broadcast(broadcast);
                }
            };
            

            this.setFavouriteStack = function(stack) {
                if (!AccessToken.get()){
                    //offline modus
                    if(!stack.favourite || stack.favourite === "0"){
                        stack.favourite = 1;
                        this.state.favourites.push(stack);

                        this.offlineSetFavourites();
                        
                    }
                    deblog('favs b', this.state.favourites, this.offlineGetFavourites(), $localStorage.favourites_del, stack);
                }else{
                
                    var req = {
                        method: 'POST',
                        url: this.apisettings.api_uri + this.apisettings.api_favourite,
                        headers: this.headers(),
                        data: { entity_code: stack.stack_code }
                    };
                    this.startLoadingEvent('POST', 'setFavouriteStack');
                    $http(req)
                        .success(function(){
                            //TODO: not sure whether next line is necessary
                            _this.stopLoadingEvent('POST', 'setFavouriteStack');
                            stack.favourite = 1;
                            if(stack.anonymous_favourite){
                                delete stack.anonymous_favourite;
                            }else{
                                _this.state.favourites.push(stack);
                            }
                            if (stack.stack_code == _this.state.stackid){
                                _this.state.stackfields.favourite = 1;
                            }
                            $rootScope.$broadcast('ltbapi:getFavourites-loaded');
                        })
                        .error(function(response){
                            _this.stopLoadingEvent('POST', 'setFavouriteStack');
                            if (response.status == 406){
                                alerts.add(gettextCatalog.getString('Adding favourite did not succeed.') + ' ' +
                                    response.detail, 'warning');
                            } else {
                                console.log(gettextCatalog.getString('Adding favourite did not succeed.') + ' ('+ 
                                  response.status + '). ', response.detail, 'warning');
//                                alerts.add(gettextCatalog.getString('Adding favourite did not succeed.')+' ('+ response.status + '). ', response.detail, 'warning');
                        }
                        });
                }
            };
            
            this.deleteFavouriteStack = function(stack) {
                if (!AccessToken.get()){
                    //offline modus
                    if (stack.stack_code === this.state.stackid){
                        this.state.stackfields.favourite = 0;
                    }
                    var len = _this.state.favourites.length;
                    for (var i=0; i< len; i++) {
                        if (_this.state.favourites[i].stack_code === stack.stack_code) {
                            _this.state.favourites.splice(i, 1);
                            break;
                        }
                    }
                    
                    deblog('favdel', this.state.favourites, this.offlineGetFavourites(), $localStorage.favourites_del, stack);
                    this.offlineSetFavourites();

                } else {
                    var req = {
                        method: 'DELETE',
                        url: this.apisettings.api_uri + this.apisettings.api_favourite + "/" + stack.stack_code,
                        headers: this.headers()
                    };
                    this.startLoadingEvent('DELETE', 'deleteFavouriteStack');
                    $http(req)
                        .success(function(){
                            _this.stopLoadingEvent('DELETE', 'deleteFavouriteStack');
//                            alerts.add(gettextCatalog.getString('You have deleted this stack from your favourites.'), 'success');
                            var not_found = true;
                            var len = _this.state.favourites.length;
                            for (var i=0; not_found && i< len; i++) {
                                if (_this.state.favourites[i].stack_code === stack.stack_code) {
                                    _this.state.favourites.splice(i, 1);
                                    not_found = false;
                                }
                            }
                            if (stack.stack_code === _this.state.stackid){
                                _this.state.stackfields.favourite = 0;
                            }
                        })
                        .error(function(response){
                            _this.stopLoadingEvent('DELETE', 'deleteFavouriteStack');
                            if (response.status === 406){
                                alerts.add(gettextCatalog.getString('Delete of favourite failed')+' '+ response.detail, 'danger');
                            } else {
    //                            alerts.add(gettextCatalog.getString('Delete of favourite did not seem necessary')+' ( '
    //                              + response.status+ '). '+ response.detail, 'warning');
                            }
                        });
                }
            };
            
            this.stackIsfavourite = function(stack) {
                
                if (stack && (typeof stack.stack_code !== 'undefined')){
                    if(AccessToken.get()){
                        //logged in, favourite is in stack
                        
                        if(stack.favourite === 1 || stack.favourite === "1"){
                            //count as fav
                            return 1;
                        }
                        
                    } 
                    var local_favourites = this.offlineGetFavourites();
                    var len = local_favourites.length;
                    for (var i=0; i< len; i++) {
                        if (local_favourites[i].stack_code === stack.stack_code) {
                            if(AccessToken.get()){
                                //count as local fav
                                return 2;
                            }else{
                                //count as fav
                                return 1;
                            }
                        }
                    }
                    return 0;
                } else {
                    console.log('In stackIsfavourite: stack not yet retrieved, returning false');
                    return 0;
                }
            };
            
            this.offlineFavouritesSync = function(){
                //
                var favs_new = [];
                var favs = this.state.favourites;
                var favs_ol = ($localStorage.favourites)?$localStorage.favourites:[];
                var len = favs.length;
                var len_ol = favs_ol.length;
                
                //add new favourites
                var found = false;
                for (var i=0; i< len_ol; i++) {
                    found = false;
                    for (var j=0; j< len; j++) {
                        if (favs_ol[i].stack_code === favs[j].stack_code) {
                           found = true;
                           break;
                        }
                    }
                    if(!found){
                        //if(!AccessToken.get()){
                            favs_ol[i].favourite = 0;
                            favs_ol[i].anonymous_favourite = 1;
                        //}
                        favs.push(favs_ol[i]);
                    }
                }
                
                this.state.favourites = favs;
                
            };
            
            this.offlineSetFavourites = function(){
                $localStorage.favourites = this.state.favourites;
            };
            
            this.offlineGetFavourites = function(){
                return ($localStorage.favourites)?$localStorage.favourites:[];
            };
            
            this.getTiles = function (screen, no_history, isStackReload) {
                var thescreen = screen || (this.state.stack && this.state.stack.startscreen ?
                    this.state.stack.startscreen : 1);
                var screen_list = this.state.stack ? 
                    $filter('filter')(this.state.stack.screens, function (s) {
                        return s.id === thescreen;
                    }) :
                    [];
                this.state.screen =  screen_list ? screen_list[0] : null;
                this.state.tiles = this.state.screen ? this.state.screen.tiles : null;
                if ((!screen_list || screen_list.length === 0) && isStackReload){
                    //If the screen are not in the stack when we reload it, means that
                    //screen was deleted then we redirect to the fisrt screen.
                    var firstScreen = this.state.stack && this.state.stack.startscreen ?
                    this.state.stack.startscreen : 1;
                    this.clearHistory(this.state.stackid);
                    this.getTiles(firstScreen, true);
                } else if ((!screen_list || screen_list.length === 0)){
                    
                    alerts.add(gettextCatalog.getString('The Stack is empty.'), 'warning', true);
                }
                if (!no_history){
                    this.addStackHistory(this.state.stackid, thescreen);
                }
            };
            
            this.saveStack = function (succes_fun, error_fun, label) {
                var new_stack = (this.state.stackid == 0);
                //During editing, switching the screen triggered saving that 
                //screen this.state.tiles to the more permanent fields. But the last screen
                //we were on. might be not saved yet
                this.saveCurrentScreen();
                
                var stackdata = {
                    name: this.state.stackfields.name,
                    description: this.state.stackfields.description,
                    public: this.state.stackfields.public,
                    access_level: this.state.stackfields.access_level,
                    my_tags: this.state.stackfields.my_tags,
                    current_tags: this.convertFromInputTagFormat(this.state.stackfields.current_tags),
                    details: this.state.stack    
                };
                if (new_stack){
                    //(request, arg, success, fail) {
                    if (!succes_fun) {
                        succes_fun = function (data) {
                            console.log('While saving new stack got a result back', data);
                            if (!data.result){
                                alerts.add(gettextCatalog.getString('An error occurred.'), 'danger');
                            } else {
                                _this.state.stackid = data.result.stack_code;
                                _this.state.stackfields.my_tags = stackdata.current_tags;
                                alerts.add(gettextCatalog.getString('You succesfully saved your Stack'), 'success');
                                $rootScope.$broadcast('ltbapi:stack save succeed');
                            }
                            
                            if (data.warnings){
                                alerts.add(data.warnings, 'warning');
                            }
                        };
                    }
                    if (!error_fun) {
                        error_fun = function (result){
                            console.log('While saving got error back', result);
                            if (!result){
                                msg = gettextCatalog.getString('There was no response');
                            } else if (result.status == 422){
                                var msg = result.detail;
                                for (var n in result.validation_messages){
                                    msg += '. ' + result.validation_messages[n];
                                }
                            } else {
                                var msg = result.detail;
                            }
                            alerts.add(gettextCatalog.getString('Saving failed') + ': ' + msg, 'danger');
                        };
                    }
                    this.post(_this.apisettings.api_stack, stackdata, succes_fun, error_fun, label);
                } else {
                    if (!succes_fun) {
                        succes_fun = function(data){
                            _this.state.stackfields.my_tags = stackdata.current_tags;
                            alerts.add(gettextCatalog.getString('You succesfully saved your Stack'), 'success');
                            console.log('While saving got a result back', data);
                            if (data.warnings){
                                alerts.add(data.warnings, 'warning');
                            }
                            $rootScope.$broadcast('ltbapi:stack save succeed');
                        };
                    }
                        
                    if (!error_fun) {
                        error_fun = function (result){
                            if (!result){
                                msg = gettextCatalog.getString('There was no response');
                            } else if (result.status == 422){
                                var msg = result.detail;
                                for (var n in result.validation_messages){
                                    msg += '. ' + result.validation_messages[n];
                                }
                            } else {
                                var msg = result.detail;
                            }
                            console.log('Saving failed, got back: ', result);
                            alerts.add(gettextCatalog.getString('Saving failed') + ': ' +msg, 'danger');
                        };
                    }
                    deblog('Patch doing a put? line 1407', stackdata);
                    this.putpatch(this.apisettings.api_stack + "/" + this.state.stackid,
                        stackdata, succes_fun, error_fun, label);
                }
            };

            this.deleteTile = function (tileindex) {
                this.state.tiles.splice(tileindex, 1);
                return true;
            };

            /* APP-functions */
            this.reloadStack = function () {
                //this.clearHistory(this.state.stackid);
                if (!this.isreloading) {
                    this.isreloading = true;
                    this.getStack(this.state.stackid, this.state.screen.id);
                }
            };

            this.isStartScreen = function (scr) {
                var s_id = scr ? scr.id : (this.state.screen ? this.state.screen.id : 0);
                if (! this.state.stack){
                    return true;
                }
                return s_id === this.state.stack.startscreen;
            };


            /*MESSAGES*/
            /*
             * @param type: {all, stack, user}, default stack
             * @param status: {new, read, all}, default: new
             * @param valid: boolean whether dates set for the message are relevant, default true
             * @param entity_code: the 5-char lettercode for the stack, optional
             * @param aggregate: boolean, whether the caller is owner of the messages
             * this means that when joining for the status, some aggregation is necessary
             * defaults to false
             */
            this.getMessages = function (type, valid, status, entity_code, aggregate) {
                var data = {};
                if (type) data.mess_type = type;
                if (status) data.status = status;
                if (!valid) data.period = 'all';
                if (entity_code) data.entity_code = entity_code;
                if (typeof aggregate !== 'undefined' && aggregate) data.aggregate = aggregate;
                this.get(this.apisettings.api_message, data, function (data) {
                    _this.state.messages[type] = angular.fromJson(data._embedded.messages);
                    $rootScope.$broadcast('ltbapi:messages-loaded', _this.state.messages);
                }, null, 'getMessages');
            };
            
            // get all messages
            this.getAllMessages = function () {
                this.getStackMessages();
                this.getUserMessages();
            };

            // get all messages by stack
            this.getStackMessages = function (entity_code, valid, status, aggregate) {
                if (!entity_code) {
                    entity_code = this.state.stackfields.stack_code;
                }
                if (!entity_code){
                    _this.state.messages = [];
                    return false;
                } else {
                    return this.getMessages('stack', valid, status, entity_code, aggregate); 
                }
            };
            
            // get all messages by stack
            this.getUserMessages = function(status){
                return this.getMessages('user', false, status); 
            };

            //Message: Mark Read
            this.setMessageStatus = function(mess_code, status, callback) {
                var patch_data = {
                    status: (status ? "read" : "new")
                };
                _this.putpatch(this.apisettings.api_message + '/' + mess_code, patch_data,
                    // Success
                    function(data) {
                        if (callback){
                            callback(data);
                        }
                    },
                    // Error
                    function(result) {
                        console.log('While setting message status got error back', result);
                        if (result.status !== 200){
                            alerts.add(gettextCatalog.getString('Could not set status of message:') + ' ' + result.detail);//TODO
                        }
                    }
                );
            };
            
            this.saveMessage = function (message, success_fun, fail_fun) {
                var post_data = {
                    mess_type: message.mess_type,
                    subject: message.subject,
                    content: message.content,
                    start: message.start,
                    end: message.end,
                    entity_code: message.entity_code
                };
                var follow_up = success_fun ? success_fun : function(){};
                if (message.mess_code) {
                    _this.putpatch(this.apisettings.api_message + '/' + message.mess_code, post_data, 
                        function(data) {
                            console.log(' In saveMessage' , data);
                            alerts.add(gettextCatalog.getString('Your message was successfully saved'), 'success');
                            if (data.result.mess_type == 'stack'){
                                _this.getStackMessages(message.entity_code, 0, 'all', 1);
                            } else {
                                _this.getUserMessages();
                            }
                            follow_up();
                        },
                        function (result){
                            console.log('While saving got error back', result);
                        }
                    );
                } else {
                    var succ = 
                            function(data){
                                deblog('save a Message', data);
                                alerts.add(gettextCatalog.getString('Your message was successfully created'), 'success');
                                if (data.result.mess_type == 'stack'){
                                    _this.getStackMessages(message.entity_code, false, 'all', true);
                                } else {
                                    _this.getUserMessages();
                                }
                                follow_up();
                            } 
                    ;
                    _this.post(_this.apisettings.api_message, post_data, 
                        succ,
                        function (result){
                            alerts.add(gettextCatalog.getString('Your message could not be saved'), 'danger');
                            console.log('While saving got error back', result);
                        }
                    );
                }
            };
            
            this.deleteMessage = function(message, success_fun, fail_fun){
                _this.delete(_this.apisettings.api_message + "/" + message.mess_code,
                    function(data){
                        _this.getStackMessages(_this.state.stackid, false, 'all', true);
                        success_fun();
                    },
                    function(result){
						fail_fun();
                    }
                );
               
            };
            
            this.getReference = function(reference_code, callback, label){
                var label = label ? label : 'getReference';
                var api_call = this.apisettings.api_reference;
                this.get(api_call+'/'+reference_code, {json: true}, callback, null, label);
            };
            
            this.searchReferences = function(search_fields, callback, label) {
                var label = label ? label : 'searchReferences';
                var api_call = this.apisettings.api_reference;
                var terms = search_fields ? '?'+ this.serialize(search_fields): '';
                
                this.get(api_call+terms, {json: true}, callback, null, label);
            };
            
            this.saveReference =  function(ref_fields, callback, label) {
                var label = label ? label : 'saveReference';
                var new_reference = (ref_fields.reference_code === 0);
                var api_call = this.apisettings.api_reference;
                ref_fields.json = true;
                if (ref_fields.reference_code){
                   this.putpatch(api_call + '/'+ref_fields.reference_code, ref_fields, callback, null, label);
                } else {
                   this.post(api_call, ref_fields, callback, null, label);
                }
            };
            
            this.addReferenceToFolder = function(){
                // alert('nog niet klaar');
            };
            
            this.deleteReference = function(reference_code, callback, label){
                var label = label ? label : 'deleteReference';
                var api_call = this.apisettings.api_reference;
                this.delete(api_call+'/'+reference_code, callback, null, label);
            };
            
            this.deleteReferenceList = function(ref_codes, stack_code, labels, callback, label){
                var label = label ? label : 'deleteReference';
                var api_call = this.apisettings.api_reference;
                var data = {
                    ref_list: sharedFunctions.flattenList(ref_codes), 
                    entity_code: stack_code, 
                    labels: sharedFunctions.flattenList(labels) //at the server the single label will be treated as singleton
                };

                //var terms = '?'+this.serialize(data);
                console.log('wat zijn de params', data);
//                this.delete(api_call + terms, callback, null, label);
                this.delete(api_call, callback, null, label, data);
            };
            
            
            //Section on boxes: which api to talk to etc.
            this.getCurrentBoxId = function(){
                return (typeof $localStorage.current_box !== 'undefined') ?
                    $localStorage.current_box :
                    0;
            };
            
            this.getCurrentBoxString = function(renew){
                if ((typeof $localStorage.current_box_str === 'undefined') || renew || 1) {
                    $localStorage.current_box_str = this.getBoxDescription();
                }
                this.apisettings.current_box_str = $localStorage.current_box_str;
                return $localStorage.current_box_str;
            };
            
            this.addBox = function(url, box_id, box_label){
                var box = {
                    api_url: url,
                    box_id: box_id, 
                    box_label: box_label
                };
                if (! $localStorage.boxes){
                    $localStorage.boxes = {};
                }
                $localStorage.boxes[box_id] = box;
            };
            
            this.getCurrentBox = function(){
                var bid = this.getCurrentBoxId();
                return bid ? $localStorage.boxes[bid] : {};
            };
            
            this.setCurrentBox = function(url, box_id, box_label, renew){
                this.addBox(url, box_id, box_label);
                $localStorage.current_box = box_id;
                this.getCurrentBoxString(renew);
            };
            
            this.getBoxDescription = function(coded){
                if (coded){
                    return JSON.parse(atob(coded));
                } else {
                    var box = this.getCurrentBox();
                    return btoa(JSON.stringify(box));
                }
            };
            
            this.switchBox = function(box, callback){
                //Point to the new api
                this.setCurrentApiUri(box.api_url);
                //retrieve settings for this uri (force a renewal)
                this.clearHistory();
                this.getSettings(true, true, callback);
                //this.setCurrentBox(box.api_uri, box.box_id, box.box_label); happens in getSettings
            };
            
            this.getBoxUrl = function(coded){
                if (coded){
                    return JSON.parse(atob(coded));
                } else {
                    var box = this.getCurrentBox();
                    return btoa(JSON.stringify(box.api_url));
                }
            };
            
            this.switchToBox = function(api_url, callback){
                //Point to the new api
                this.setCurrentApiUri(api_url, callback);                
                
            };
            
			 this.qrUrl = function(stack){
				 var stackid = (stack)?stack.stack_code:this.state.stackid;
				 
				//this is the OLD situation. Keep in place until apps are updated to at least 2.39
				return this.apisettings.api_uri + 'show/' + stackid;
				//this is the NEW situation. For publication after apps are updated to 2.39
				//return this.apisettings.api_uri + 'show/' + this.state.stackid + ':' + this.boxUrl;
			};
            //this.init();
        }]);
