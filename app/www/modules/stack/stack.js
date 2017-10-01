'use strict';

angular.module('LTBApp.stack', ['ngRoute','ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/stack', {
    templateUrl: path_root + 'modules/stack/stack_view.html',
    controller: 'StackController',
    controllerAs: 'StackCtrl'
  });
  
  $routeProvider.when('/stack/:stackcode', {
    templateUrl: path_root + 'modules/stack/stack_view.html',
    controller: 'StackController',
    controllerAs: 'StackCtrl'
  });
  
  $routeProvider.when('/stack_edit', {
    redirectTo: '/my-stacks'
  });
  
  $routeProvider.when('/stack_edit/:stackcode', {
    templateUrl: path_root + 'modules/stack/stack_edit.html',
    controller: 'StackController',
    controllerAs: 'StackCtrl'
   });
}])
.controller('StackController', ["callApi", "tileState", "alerts", "sfsService", "sfsServiceUnsplash", "gettextCatalog",
        "$scope", "$rootScope", "$http", "$filter", "$routeParams", "$location", "modalService",
        "$timeout",
    function(callApi, tileState, alerts, sfsService, sfsServiceUnsplash, gettextCatalog, $scope, $rootScope,
        $http, $filter, $routeParams, $location, modalService, $timeout) {
    
    var _this = this;
    tileState.controllerName = 'StackController';
    var stackcode = $routeParams.stackcode || 0;
    
    this.tilereadonly = false;
    
    this.init = function(){
        //this.currentStack = callApi.getCurrentStackState();
		deblog('stackcontroller > init');
        this.stackfields = angular.copy(callApi.state.stackfields);
		
        this.confirmed_modal = false;
        this.stack_deletion = false;
        this.initial_state = null;
        this.tile_id = null;
        this.thetiletype = 'default';
        //TODO: this seems strange. Why would a stack be in edit modus by default?
        //It seems that a better name would be edit_stack_possible
        tileState.edit_stack = true;
        tileState.setTile();
        //enable scrolling buttons by default
        $.mCustomScrollbar.defaults.scrollButtons.enable=true;
        this.fullscreen = tileState.fullscreen;
        this.edit = tileState.edit;
        this.templates = tileState.getTemplates(); //make sure templates have been translated
        this.alltemplates = angular.copy(this.templates);
        
        this.loading = callApi.loading_queue;
        this.appisetting = callApi.apisettings;
        
        this.stack_code = stackcode;
        var initialise_state = true;
        if (stackcode && (stackcode === "copy")){
            this.new_stack = true;
            callApi.initialiseStack(true);
        } else if (stackcode && (stackcode !== "0")){
            this.new_stack = false;
            if (!callApi.state.stack || callApi.state.stackid !== stackcode){
                initialise_state = false;
                callApi.getStack(stackcode);
            }
        } else {
            this.new_stack = true;
            callApi.initialiseStack(false);
        }
        //verplaats dit naar de open stack handler
        if (initialise_state){
            this.state = callApi.state;
            this.storeCurrentState();
        }
		this.screen_id = callApi.state.screen.id;
//        this.storeCurrentState();
        
        if (this.onRouteChangeOff == null) {
                //from: http://weblogs.asp.net/dwahlin/cancelling-route-navigation-in-angularjs
            /* The rootscope.$on function defines a listener-event connection and returns a 
             * deregistrating function to unlose this connection. So the anonymous function 
             * coupled will be called no more after calling onRouteChangeOff. This prevents
             * a number of times the modal being called
             */    
            this.onRouteChangeOff = $rootScope.$on('$routeChangeStart', function(event, new_route){
                var to_path = new_route.$$route.originalPath;
//                deblog(' A route change detected', _this.stack_deletion, to_path.indexOf('my-stacks'));
                //On every tick it seems this function is called, showing another modal
                if (_this.confirmed_modal){
//                    deblog('A modal was being shown and confirmed to leave');
                    return true;
                }
                if (_this.hasChanges() && to_path.indexOf('stack_edit') < 0){
                    var modalOptions = {
                        closeButtonText: gettextCatalog.getString('Do not leave'),
                        actionButtonText: gettextCatalog.getString('Ignore changes'),
                        headerText: gettextCatalog.getString('You have unsaved changes'),
                        bodyText: gettextCatalog.getString('Do you want to leave the page anyway?')
                    };
                    
                    modalService.confirmRouteChangeModal(
                        modalOptions, 
                        function(result) {
                            _this.confirmed_modal = true;
                            callApi.state.stack = _this.initial_state.stack;
                            callApi.state.stackfields = _this.initial_state.stackfields;
                            _this.initial_state = null;
                            callApi.getTiles();
                        },
                        null,
                        event,
                        new_route,
                        _this.onRouteChangeOff
                    );
                }
                return;
            });
        }
    };
    
    this.getLastLocationName = function(){
        var last_screen = callApi.getPrevScreen();
        var last_screen_id = last_screen ? last_screen.screen : null;
        if (last_screen_id){
            var screen = $filter('filter')(callApi.state.stack.screens, function (s) {
                    return s.id === last_screen_id;
                }) || null;
            return (screen ? screen[0].name : "");
        }
    };
    
    this.deleteTile = function (){
        tileState.tileDelete();        
    };
    
    this.tileTypeName = function(){
        return tileState.tileTypeName();
    };
    
    this.previewStack = function(){
        if (this.new_stack || this.hasChanges()){
            alerts.add(gettextCatalog.getString('Please save you Stack first'), 'warning');
        } else {
            window.open(callApi.getPreviewLocation(callApi.state.stackid), '_blank');
        }
    };
    
    this.getStarIcon = function(stack) {
        var fav = 0;
        if (stack){
            fav = callApi.stackIsfavourite(stack)
        } 
        
        if(fav === 2){
            return "fa fa-star-half-o";
        }else if(fav === 1){
            return "fa fa-star";
        }else{
            return "fa fa-star-o";
        }
        
        
    };
    
    this.closeEditor= function(){
        if (callApi.state.stackid == 0){
            $location.path("/my-stacks");
        } else {
            $location.path("/viewStack/"+callApi.state.stackid);
        }
    };
    
    this.isStartScreen = function(screen){
        if (!this.state) return false;
        if (! screen){
            screen = this.state.screen;
        }
        return callApi.isStartScreen(screen);
    };
    
    this.markStartScreen = function(screen){
        if (!this.state) return false;
        if (!screen) screen = this.state.screen;
        this.state.stack.startscreen = screen.id;
    };
    
    this.startScreenDistinctionClass = function(screen){
        if (!this.state) return "";
        if (!screen) screen = this.state.screen;
        if (screen && callApi.isStartScreen(screen)){
            return "fa fa-home";
        } else {
            return "";
        }
    };
    
    this.toggleFavourite = function() {
         if (callApi.state.stackfields.favourite == 1) {
            callApi.deleteFavouriteStack(callApi.state.stackfields);
            $scope.iconStar = "fa fa-star-o";
        }
        else {
            callApi.setFavouriteStack(callApi.state.stackfields);
            $scope.iconStar = "fa fa-star";
        }
    };
        
    this.hasHistory = function(){
        return callApi.hasHistory();
    };
    
    this.goBack = function() {
        callApi.fromStackHistory();
    };
        
    

    this.toScreen = function(screenid, no_history){
        if (!screenid) {
            screenid = this.state.stack.startscreen;
        }
        this.closeTile();
        callApi.saveCurrentScreen();
        
        if (no_history){
            callApi.clearHistory();
        }
        callApi.getTiles(screenid, no_history);
		_this.screen_id = callApi.state.screen.id;
    };
    
    this.addScreen = function (){
        this.closeTile();
        callApi.addScreen();
    };
    
    this.deleteScreen = function(){
        var modalOptions = {
            closeButtonText: gettextCatalog.getString('Cancel'),
            actionButtonText: gettextCatalog.getString('Delete'),
            headerText: gettextCatalog.getString('Confirm delete'),
            bodyText: gettextCatalog.getString('Are you sure you want to delete this screen with all the tiles?')
        };                   
        deblog(gettextCatalog.getString("Your Stack is now private"));
        modalService.confirmModal(
            modalOptions,
            function () {
                if (callApi.deleteCurrentScreen()) {
                    _this.toScreen();
                    console.log('Your screen has been successfully deleted');
                    alerts.add(gettextCatalog.getString('Your screen has been successfully deleted'), 'success', true, 'deletescreen');
               };

            }
        );
    };
    
    this.closeTile = function(){
        $rootScope.$emit('LTBApp.stack: close active tile');
    };
    
    this.randomUuid = function () {
        return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).slice(-4)
    };
    
    this.cloneScreen = function () {
        var screen = angular.copy(callApi.state.screen);
        callApi.addScreen(null, null, screen.tiles);
        callApi.state.screen.tiles = screen.tiles;
    };
    
    this.cloneTile = function() {
        var tileAux = angular.copy(tileState.selectedTile);
        tileAux.tile_id = this.randomUuid();
        callApi.state.screen.tiles.push(tileAux);
    };
    
    this.changeTileScreen = function () {
        var tileAux = angular.copy(tileState.selectedTile);
        var tileIndex = tileState.tileindex;
        callApi.deleteTile(tileIndex);
        this.toScreen(this.screen_id, false);
        callApi.state.screen.tiles.push(tileAux);
    };
    
    this.tileStyle = function(tile){
        return sfsService.tileStyle(tile);
    };
    
    this.tileAutoContent = function(tile, size){
        return sfsService.tileAutoContent(tile, size);
    };
    
    this.isCurrentTileId = function(tile_id){
       return tileState.tileEdit_id === tile_id;
    };
    
    this.getTileId = function(tile){
      return (tile.tile_id) ?  tile.tile_id : tileState.randomUuid();
    };
   
   this.storeCurrentState = function(){
        this.initial_state = angular.copy(callApi.state);
    };
    
    this.saveStack = function(){
        this.storeCurrentState();
        callApi.saveStack(null, null, 'saveStack');
        if (this.new_stack) {
            this.new_stack = false;
            this.stack_code = callApi.state.stackid;
        }
    };
    
    this.showStatus = function(m){
        var loc = m ? m : ' no location';
    };
    
    this.deleteStack = function(){
        var modalOptions = {
            closeButtonText: gettextCatalog.getString('Cancel'),
            actionButtonText: gettextCatalog.getString('Delete'),
            headerText: gettextCatalog.getString('Confirm delete'),
            bodyText: gettextCatalog.getString('Are you sure you want to delete this Stack?')
        };
        
        modalService.confirmModal(
                modalOptions,
                function () {
                    _this.confirmed_modal = true;
                    callApi.deleteStack(
                        function(data){
                            alerts.add(gettextCatalog.getString('Your Stack has been successfully deleted.'), 'success', true, 'deletestack');
                            //To prevent a warning on possible unsaved changes, we fake that the stack
                            //has not been changed
                            
// DOES NOT WORK: gives  Error: [$rootScope:inprog] $digest already in progress
//                          $scope.$apply(function(){
//                                _this.initial_state = null;
//                            });

                        //Wait for the next tick to go to the my stacks to be sure to have the effect
                        //of setting the state to null
                        //_this.stack_deletion = true;
                        $timeout(function() {
                            $location.path("/my-stacks");
                        });
                            
                        },
                        function(result){
                           alerts.add(gettextCatalog.getString('Your Stack could not be removed'), 'danger');

                        }
                    );
                }
        );
    };
    this.hasChanges = function () {
        if (! this.initial_state || !this.state) {
            return false;
        }
        
        var stackfield_changes = ! angular.equals(this.initial_state.stackfields, this.state.stackfields);
        var stack_changes = ! angular.equals(this.initial_state.stack, this.state.stack);
        var tiles_changes = ! angular.equals(this.initial_state.tiles, this.state.tiles);
        if (stackfield_changes || stack_changes || tiles_changes){
//            deblog('veranderingen geconstateerd stackfield_changes || stack_changes || tiles_changes',
//            stackfield_changes , stack_changes , tiles_changes);
//            deblog('heel wat vergelijkingen ',
//                this.initial_state.stackfields, this.state.stackfields,
//                this.initial_state.stack, this.state.stack,
//                this.initial_state.tiles, this.state.tiles
//            );
            return true;
        } else {
            //nothing changed
            return false;
        }
    }; 
    
    //Main function
    this.init();
    
    $rootScope.$on('ltbapi:stack open', function(){
        if ((typeof callApi.state.stack.settings === 'undefined') || ! callApi.state.stack.settings){
            callApi.state.stack.settings = {};
        } else if (callApi.state.stack.settings.constructor === Array){
            callApi.state.stack.settings = {};
        }
        _this.state = callApi.state;
        //_this.screen = angular.copy(callApi.state.screen);
		_this.screen_id = callApi.state.screen.id;
        _this.storeCurrentState();
        _this.closeTile();
        if (! _this.state.stackfields ||  !_this.state.stackfields.name){
            //set class of favourite mark-star
            $scope.iconStar = _this.getStarIcon(null);
        } else {
            //set class of favourite mark-star
            $scope.iconStar = _this.getStarIcon(_this.state.stackfields);
        }
    });
    
    $rootScope.$on('ltbapi:stack save succeed', function(){
        _this.state = callApi.state;
        _this.storeCurrentState();
        //_this.closeTile();
    });
    
    $rootScope.$on('tilestate:setTile', function (){
        _this.fullscreen = tileState.fullscreen;
        _this.edit = tileState.edit;
        //TODO Ik denk dat dit definitief weg kan
        //_this.screen = angular.copy(callApi.state.screen);
    });
    
    this.tmpList = [];
	this.library = false;
	
	this.sortableOptions = {
	};
    this.draggableOptions = {
        connectWith: ".worksheet",
        helper: "clone",
//        activate: function () {
//            deblog("activate");
//        },
//        beforeStop: function () {
//            deblog("beforeStop");
//        },
//        change: function (event, ui) {
//            deblog("change");
//        },
//        create: function () {
//            deblog("create");
//        },
//        deactivate: function () {
//            deblog("deactivate");
//        },
//        out: function () {
//            deblog("out");
//        },
//        over: function () {
//            deblog("over");
//        },
//        receive: function (event, ui) {
//			deblog("receive");
//        },
//        remove: function () {
//            deblog("remove");
//        },
//        sort: function (event, ui) {
//            deblog("sort");
//        },
        start: function (event, ui) {
			ui.item.show();
            _this.tmpList = angular.copy(_this.alltemplates);
			
        },
//        update: function (event, ui) {
//            deblog("update");
//        },
        stop: function (event, ui) {
			_this.alltemplates = _this.tmpList;
        }
    };
    
}])

.controller("emulatorSlideBarController", ['$scope', function($scope){
    var scrollOffset = 80;
    
    $scope.scrollUp = function() {
        var scrollTop = $("#scrollAreaHidden").scrollTop();
        var scroll = scrollTop;
        if (scrollTop - scrollOffset > 0) {
            scroll = scrollOffset;
        }
        
        $("#scrollAreaHidden").animate({
            scrollTop: "-=" + scroll + "px"
        });
    };

    $scope.scrollDown = function() {
        var scrollTop = $("#scrollAreaHidden").scrollTop();
        var maxScroll = $("#scrollAreaHidden").height();
        var scroll = maxScroll;
        
        if (scrollTop + scrollOffset <= maxScroll) {
            scroll = scrollOffset;
        }
        
        $("#scrollAreaHidden").animate({
            scrollTop: "+=" + scroll + "px"
        });
    };    
}])

.directive("stack", function() {
    return {
      restrict: "E",
      templateUrl: path_root + "modules/stack/stack.html"
    };
})

.directive("stackplayer", function() {
    return {
      restrict: "E",
      templateUrl: path_root + "modules/stack/stack_player.html"
    };
})

.directive("stackemulate", function() {
    return {
        restrict: "E",
        templateUrl: path_root + "modules/stack/stack_emulate.html"
    };
})

.directive("tile", function() {
    return {
      restrict: "E",
      templateUrl: path_root + "modules/stack/tile.html"
    };
})

.directive("emulatorSlideBar", function(){
    return {
        restrict: "E",
        templateUrl: path_root + "modules/stack/slidebar.html",
        controller: "emulatorSlideBarController"
    };
})
;
