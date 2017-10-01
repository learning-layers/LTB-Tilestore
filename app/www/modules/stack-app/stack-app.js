'use strict';

angular.module('LTBApp.stack', ['ngRoute','ui.bootstrap', 'ngCordova'])

.controller('StackAppController', ["AccessToken", "Profile", "callApi", "tileState", "chatService", "stackSocket", 
    "sfsService", "mobileService", "alerts", "gettextCatalog", "$rootScope", 
    "$scope", "$cordovaBarcodeScanner", "$location", '$localStorage', '$interval', '$filter', 'useraccount',
    function(AccessToken, Profile, callApi, tileState, chatService, stackSocket, sfsService, mobileService, alerts, gettextCatalog, $rootScope, 
        $scope, $cordovaBarcodeScanner, $location, $localStorage, $interval, $filter, useraccount) {

    var _this = this;
    
    
    $rootScope.$on('oauth:profile', function(event, profile){
        _this.profile = profile;
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
    
    
    this.checkConnection = function() {
        if (!in_app){
            return false;
        }
        mobileService.onlineStatus();
        var message = '';
        if ($rootScope.online){
            switch($rootScope.onlineStatus){
                case 'Ethernet':
                    message = gettextCatalog.getString('You are connected to a wired network');
                    break;
                case 'WIFI':
                    message = gettextCatalog.getString('You are connected to a WIFI network');
                    break;
                case 'Mobile':
                    message = gettextCatalog.getString('You are connected to a mobile network');
                    break;
                default:
                    break;
            }
            if (message){
                callApi.alerts.add(message, 'info');
            }
        } else {
            message = gettextCatalog.getString('You are NOT connected to a network');
            callApi.alerts.add(message, 'warning');
        }
    };
    
    this.getNetworkClass = function(){
        
        if(!in_app) return '';
        
        var mobileStatusIndicatorClass = 'fa-exclamation-triangle';
        
        if($rootScope.online){
            switch($rootScope.onlineStatus){
                case 'Ethernet':
                case 'WIFI':
                    mobileStatusIndicatorClass = 'fa-wifi';
                    break;
                case 'Mobile':
                    mobileStatusIndicatorClass = 'fa-mobile';
                    break;
                default:
                    mobileStatusIndicatorClass = '';
                    break;
                
            }
        }
        
        return mobileStatusIndicatorClass;
    };
        
    $scope.customAppLaunched = function(url) {
        console.log("App Launched Via Custom URL: "+url);
        
        var code = url.substr(url.lastIndexOf('/') + 1);        
        deblog('the custom app is launched broadcasting an intent to load a stack');
        $rootScope.$broadcast('outside:intent', {stack_intent: code});
    };
    
    this.toggleComm = function(close){
        if (close || this.commOpen){
            stackSocket.disconnect();
           // $rootScope.$broadcast('FLIP_COMM_CLOSE');
           this.commOpen = false;
        } else {
            if(this.userIsLogged){
                $location.path("/");
                stackSocket.connect('V1fUDfShl');
                // $rootScope.$broadcast('FLIP_COMM_OPEN');
                this.commOpen = true;
            }else{
                alerts.login(true);
            }
        }
        
    };
    
    this.toggleMenu = function(close){
        if (close){
            this.menuOpen = false;
        } else {
            this.menuOpen = !this.menuOpen;
        }
    }
    
    this.inNav = function(){
        if ($location.$$path === '/') {
            this.currentNav = false;
        } else {
            //var path = rtrim
        }
        return this.currentNav || tileState.fullscreen || callApi.hasHistory();
    };
            
    this.navigateBackApp = function(){
       if (in_app){
           this.navigate();
       }
    };
    
    this.navigate = function(to, params, global, doexit){
        if (!params) params = {};
        //TODO: before this var was called currentNav. It is to be seen if the local
        //var cannot be just this.currentNav
        //For now to avoid confusion, we rename this var as it is local to this navigate
        //function
        var local_currentNav = false;
        deblog('navigate function with: to currentNav fullscreen exit:', to, this.currentNav, tileState.fullscreen, doexit);
        if (!to){
            if (this.menuOpen){
                //menu is open
                this.toggleMenu(true);
            } else if (this.commOpen){
                //comm is open
                this.toggleComm(true);
            } else if (alerts.showFav){
                //fav popup is open
                alerts.favourite(false);
            } else if (alerts.showLogin){
                //login popup is open
                alerts.login(false);
            } else if (!this.currentNav && !tileState.fullscreen){
                //close app
                var result = callApi.fromStackHistory();
                deblog('navigate stack', result);
                if (doexit && !result) {
                    navigator.app.exitApp();
                }
            } else if (!this.currentNav && tileState.fullscreen){
                //close fullscreen tile
                deblog('nav');
                //broadcast signal to cleanup
                $rootScope.$broadcast('navigate:cleanup');
                tileState.goBack();
            } else {
                //go home
                //Superfluous: already false unless this.currentNav is meant: 
                //local_currentNav = false;
                deblog("Redirecting to root in StackAppController.navigate. ");
                //broadcast signal to cleanup
                $rootScope.$broadcast('navigate:cleanup');
                $location.path("/");
            }
        } else {
            //close comm before navigate
            this.toggleComm(true);
            //close menu before navigate
            this.toggleMenu(true);
            //broadcast signal to cleanup
            $rootScope.$broadcast('navigate:cleanup');
            
            switch (to){
                case 'stack':
                    //local_currentNav = false;
                    $location.path("/");
                    if (tileState.fullscreen){
                        tileState.setTile();
                    }
                    break;
                case 'homescreen':
                    deblog('navigate to homescreen', this.currentNav);
                    this.goScreenHome();
                    //local_currentNav = false;
                    break;
                case 'messages':
                    if(this.userIsLogged){
                        var path = '/messagesList/'+this.state.stackid;
                        if (params.filter){
                            path += '/'+params.filter;
                        }

                        $location.path(path);
                        local_currentNav = true;
                    } else {
                        alerts.login(true);
                    }
                    break;
                case 'favourites':
                    $location.path("/favourites");
                    local_currentNav = true;
                    break;
                case 'search':
                    $location.path("/search");
                    local_currentNav = true;
                    break;
                case 'settings':
                    $location.path("/settings");
                    local_currentNav = true;
                    break;
                case 'about':
                    $location.path("/about");
                    local_currentNav = true;
                    break;
            }
        }
        
        this.currentNav = local_currentNav;
        if (global && !$scope.$$phase) $scope.$apply();
    };
    
    this.loadStack = function(stackid) {
        callApi.getStack(stackid);
    };    
    
    this.loadPreferredStack = function(){
        this.toggleComm(true);
        _this.navigate('stack');
        this.loadStack($localStorage.preferred_stack_code);
    };
    
    this.startLoadingStack = function(event, args){
        deblog('A new event causing startLoadingStack with event, arguments and stack event queue', event, args, callApi.loading_queue,
            callApi.loading_queue.getStack);
        if (args && (args.type === 'get') && (args.request === 'getStack')){
            //for some reason the bidirectional assignment in the init does not work here
            //We have to assign it again
            _this.loading = callApi.loading_queue;
            _this.unread_messages_count = 0;
            _this.state.tiles = [];
        }
    };
    
    this.stopLoadingStack = function(event, args){
        deblog('A new event causing stopLoadingStack ', event, args, callApi.loading_queue);
        _this.loading = callApi.loading_queue;
    };
    
    //Catching events on stacks and login status
    this.logout = function () {
        this.toggleComm(true);
        AccessToken.destroy();
        this.userIsLogged = false;
        if (this.menuOpen){
            //menu is open
            this.toggleMenu(true);
        }
        if (this.commOpen){
            //comm is open
            this.toggleComm(true);
        }
        tileState.setTile();
        deblog("Redirecting to root in StackController.logout. ");
        useraccount.init();
        $location.path("/");
    };
    
    this.login = function (){
        if(!this.userIsLogged){
            if (this.menuOpen){
                //menu is open
                this.toggleMenu(true);
            }
            if (this.commOpen){
                //comm is open
                this.toggleComm(true);
            }
            alerts.login(true);
        }
    };
    
    this.followIntent = function(intent, check_fav){
        var codes = intent.split(':');
        var code = codes[0];
        var box_code = (codes.length > 1 && codes[1]) ? codes[1] : ''; 
        var box_url  = (box_code) ? callApi.getBoxUrl(box_code) : '';
        
        if (box_url && box_url !== callApi.getBoxUrl()){
            callApi.switchToBox(box_url, function(){
                callApi.getStack(code, null, null, null, check_fav);
                if (tileState.fullscreen){
                    tileState.setTile();
                }
            });
        } else {
            callApi.getStack(code, null, null, null, check_fav);
            if (tileState.fullscreen){
                tileState.setTile();
            }
        }
    };

    this.getCurrentUrlRequest = function(){
        var re = new RegExp(/(^.*\/)(app\/www\/\#\/stack\/(.*))/);
        var re_result = re.exec(window.location.href);
        var code = re_result && re_result[3] ? re_result[3] : '';
        deblog('getCurrentUrlRequest found code ', code);
        return code;
    };

    this.checkAuth = function(event, args){        
        var token = AccessToken.get();
        if (!token) {
            //token might be retrieved from the session upon a complete refresh
            token = AccessToken.set();
        }
        if (args && args.stack_intent){
            _this.stack_intent = args.stack_intent;
        }
        if (token){
            var profile = Profile.get();
            if (profile){
                _this.profile = profile;
            } else {
                Profile.find(callApi.apisettings.profile_uri);
            }
        }   
        
        /* Upon a route change the routeParameters will be read and set into
         * the stack_intent in this controller. When the settings are read, we 
         * will arrive here too and in theory this could be before the routeChange 
         * has set the getStack in motion. In that case we want to get the stack
         * code from the route and not from the default getStartupStackId that
         * will be used in the callApi module.
         * Note that if we are in a subpage like settings/favourites/about etc.
         * there is no need to load any stack and related references and messages.
         */
        if (typeof event !== 'undefined'){
            if (_this.stack_intent) {
                if (_this.stack_intent !== _this.loading_stack){
                    if (callApi.apisettings && callApi.apisettings.api_uri){
                        //When no api uri is known yet, we will be calling a
                        //undefined/undefined/[this_stack_intent] which leads
                        //to a failure obviously
                        _this.loading_stack = _this.stack_intent;
                        _this.followIntent(_this.stack_intent, true);

                    }
                }
            } else {
                var passed_code = _this.getCurrentUrlRequest();
                if (passed_code){
                    //Edwin: 13-5-2016: there is a rat racing between the event of 
                    //the outside:event and the settings:update. Both are necessary
                    //so whoever comes here first takes responsibility of getting the 
                    //stack.
                    //We have seen this case when the settings are not retrieved
                    //the event outside:intent is then fired after that we came here
                    //by keeping the last loading stack we prevent loading twice.
                    if (passed_code !== _this.loading_stack){
                        _this.loading_stack = passed_code;
                            callApi.getStack(passed_code);
                    }
                } else if (!callApi.isreloading){
                    var stack_code = callApi.getStartupStackId();
                    if (stack_code !== _this.loading_stack){
                        //This case could occur if the url is referring to a stack
                        //that is also by coincidence the start stack. In most cases though
                        //we expect the route change to pickup the new stack sooner
                        //than the finish of the settings load
                        _this.loading_stack = stack_code;
                        _this.loadStack(stack_code);
                    }
                }
            }
        }
            
        if (token){
            _this.next_refresh = token.expires_at;
            _this.userIsLogged = true;
        } else {
            _this.next_refresh = false;
            _this.userIsLogged = false;
        }
        
        if (!$scope.$$phase){
            $scope.$apply();
        }
    };

    this.scanQR = function() {
        this.toggleComm(true);
        try {
            $cordovaBarcodeScanner
                    .scan()
                    .then(function(result){
                        if (!result.cancelled) {
                            var res_url = result.text;
                            if(res_url.indexOf('show/') > 0){
                                //looking for format [url]/show/[stackcode]|[boxcode?]
                                var parts = res_url.split('show/');
                                _this.followIntent(parts[1], true);

                            }
                        }
                    }, function(error) {
                        deblog("Scanning failed: " + error);
            });
        } catch(e) {
            callApi.alerts.add(gettextCatalog.getString('QR reader not available'), 'warning');
        }
    };
    
    this.toggleFavourite = function() {
        if (callApi.state.stackfields.favourite == 1) {
            callApi.deleteFavouriteStack(callApi.state.stackfields);
            $scope.iconStar = "fa fa-star-o";
        } else {
            callApi.setFavouriteStack(callApi.state.stackfields);
            $scope.iconStar = "fa fa-star";
        }
    };
    
    this.isFavourite = function(){
        return callApi.stackIsfavourite(callApi.state.stackfields);
    };
    
    
    this.getStarIcon = function(stack) {
        var fav = 0;
        if (stack){
            fav = callApi.stackIsfavourite(stack);
        } 
        if(fav === 2){
            return "fa fa-star-half-o";
        }else if(fav === 1){
            return "fa fa-star";
        }else{
            return "fa fa-star-o";
        }
        
        
    };

    this.toScreen = function(screenid){
        callApi.getTiles(screenid);
    };
    
    this.goScreenHome = function() {
        _this.navigate('stack');
        callApi.getTiles();
    };
    
    this.isStartScreen = function() {
        return callApi.isStartScreen();
    };
    
    this.reloadStack = function() {
	
        _this.toggleComm(true);
		
        callApi.reloadStack();
    };
    
    this.init = function(){
        //Initialisation upon loading controller
        this.profile = {};
        //TODO perhaps get these from localStorage??
        this.user_role = '';
        this.user_code = '';
        this.unread_messages_count = 0;
        this.stack_intent = false;
        this.commOpen = false;
        this.menuOpen = false;
        tileState.edit_stack = false;
        tileState.controllerName = 'StackAppController';
        this.state = callApi.state;
        callApi.registerLoading('getStack', true);
        this.loading = callApi.loading_queue;
        this.currentNav = false;
        //it is never in edit modus when viewing the stack in your phone
        //this.edit = tileState.edit;
        this.userIsLogged = null;
        this.showLogin = false;
        this.thetiletype = 'default';
        this.fullscreen = tileState.fullscreen;
        this.loading_stack = '';
        this.message_alert_shown = {};
        this.messages_interval_interrupt = false;
        this.messages_poll_interval = 300000;//300000 for every 5 minutes
        
        //Define event listeners
        //This is a controller for the android device backbutton
        document.addEventListener('backbutton', function (event) {
            event.preventDefault();
            event.stopPropagation();
            $rootScope.$broadcast('navigate', null);
        }, false);

        $rootScope.$on('navigate', function(){
            _this.navigate(null, null, true, true);
        });
        
        $rootScope.$on('ltbapi:stack open', function(){
            //Close a possible open tile and then change the state to the new stack opened
            tileState.setTile();
            _this.state = callApi.state;
                        
            if(!_this.userIsLogged){
                deblog('stack open', callApi.stackIsfavourite(_this.state.stack), _this.state.stack);
//                if(callApi.stackIsfavourite(_this.state.stackfields)){
//                    _this.state.stackfields.favourite = '1'; 
//                }
            }
            
            if (_this.state.stack && 
                    _this.state.stack.settings && 
                    _this.state.stack.settings.chat){
                
                chatService.set_room(_this.state.stackid, _this.profile.user_code);
                $scope.$on('$destroy', function() {
                    chatService.stop_interval();
                });
            }
        });
        
        $rootScope.$on('ltbapi:stack reload', function(){
            if (tileState.fullscreen) {
                var tileIndex =  tileState.tileindex;
                var tile = tileIndex ? callApi.state.screen.tiles[tileIndex] : tileState.selectedTile;
                tileState.setTile(tile, 'full',  tileIndex, tileState.subscreen, true);
            }
            _this.state = callApi.state;
        });
        
        $rootScope.$on('oauth:login', _this.checkAuth);
        $rootScope.$on('oauth:authorized', _this.checkAuth);
        $rootScope.$on('oauth:logout', _this.checkAuth);
        $rootScope.$on('outside:intent', _this.checkAuth);
        
        $rootScope.$on('ltbapi:stack open', _this.stopLoadingStack);
        $rootScope.$on('ltbapi:stack failed', _this.stopLoadingStack);
        $rootScope.$on('ltbapi:stack loading', _this.startLoadingStack);
        $rootScope.$on('tilestate:setTile', function (){
            _this.fullscreen = tileState.fullscreen;
        });
        $rootScope.$on('messageList:count_update', function(e, increase_count){
           _this.unread_messages_count = Math.max(0, _this.unread_messages_count + increase_count);
        });
        
        //Check authentication and set logged in vars. Since we do not pass an event
        //no stack is retrieved. I think the loadStack can go from the checkAuth
        $rootScope.$on('settings:update', function(e, data){
            _this.checkAuth(e, data);//Before we had e, data
        });
        
        //EDWIN: 2016-05-10: it seems this first checkAuth causes a stack load when we
        //loosen the condition in checkAuth (change by Ray to load stack always rolled back now)
        if (callApi.apisettings){
            deblog('it is calling checkAuth since settings are known');
            this.checkAuth();
        }
    };
    
    this.tileStyle = function(tile){
        return sfsService.tileStyle(tile);
    };
    
    this.tileAutoContent = function(tile, size){
        return sfsService.tileAutoContent(tile, size);
    };
    
    this.setMessagesInterval = function(){
        this.stopMessagesInterval();
        callApi.getStackMessages(null, true);
        this.messages_interval_interrupt = $interval(function() {
                callApi.getStackMessages(null, true);
            }, 
            this.messages_poll_interval
        );
    };

    this.stopMessagesInterval = function(){
        $interval.cancel(this.messages_interval_interrupt);
    };
    
    // LANDING PAGE MESSAGES SECTION
    // =============================
    this.initMessages = function() {
        $rootScope.$on('ltbapi:stack open', function(){
            //TODO fix handling of messages
            if (_this.userIsLogged){
                _this.setMessagesInterval();
            }
        });
        $rootScope.$on('ltbapi:stack reload', function(){
            //TODO fix handling of messages
			if (_this.userIsLogged){
			//	_this.message_alert_shown = {}; // it would be better if stackcode is known, so _this.message_alert_shown[stack_code] can be set to false.
                _this.setMessagesInterval();
            }
        });

        $rootScope.$on('ltbapi:messages-loaded', function(event, messages){
            var stack_code = messages['stack'].length ? messages['stack'][0].entity_code : null;
            _this.unread_messages_count = $filter('filter')(messages['stack'], {read: "0"}).length;
            //For backwards comp.
            if (_this.message_alert_shown[stack_code] === true){
                _this.message_alert_shown[stack_code] = 1;//we choose 1 because we have to choose some 
                //number. Users might have data stored in their mobile saying that messages have been
                //read for stack XX, so the first time that happens, we want to assure it is an int.
            }
            if (_this.unread_messages_count > 0 && (!_this.message_alert_shown[stack_code] ||
                    (_this.message_alert_shown[stack_code] !== _this.unread_messages_count))){
                tileState.alerts.add(
                    gettextCatalog.getString('You have new unread messages for this Stack.'), 'info');
                _this.message_alert_shown[stack_code] = _this.unread_messages_count;
            }
        });
    };
    
    //START CONTROLLER
    this.initMessages();
    this.init();
}])

.directive("stackApp", function() {
    return {
      restrict: "E",
      controller: 'StackAppController',
      controllerAs: 'StackCtrl',
      templateUrl: path_root + "modules/stack-app/stack-app.html"
    };
})

.directive("stackAppPlayer", function() {
    return {
      restrict: "E",
      templateUrl: path_root + "modules/stack-app/stack-app-player.html"
    };
});
