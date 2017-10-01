'use strict';

angular.module('LTBApp.mystacks', ['ngRoute'])
        
.config(['$routeProvider', function($routeProvider) {  
    $routeProvider.when('/my-stacks', {
        templateUrl:path_root + 'modules/stack/stacks_my.html',
        controller:'MyStacksController',
        controllerAs: 'mySCtrl'
    });
}])

.controller('MyStacksController', ['callApi', '$http', '$location', '$scope', '$rootScope',  
    function(callApi, $http, $location, $scope, $rootScope) {
    //TODO: find out whether calling clearState is necessary
    deblog(' it seems the clearState is unnecessary');
    callApi.clearState(false, 'mystackscontroller');
    callApi.registerLoading('getMyStacks');
    callApi.registerLoading('getFavourites');
    
    this.myStacks = [];
    this.myFavourites = [];
    //The following is only necessary if we want to evaluate a loading expression for a 
    //combined waiting icon. I.e. one spinning wheel waiting for more than one action to finish and
    //so using the directive waiting-multiple-icon
    //    this.loading = callApi.loading_queue;
    
    var _this = this;

    this.newStack = function(){
        $location.path("/stack_edit/0");
    };
    
    this.viewStack= function(stackid){
        $location.path("/viewStack/"+stackid);
    };
	
    this.qrUrl = function(stack){
		return callApi.qrUrl(stack);
    };
    
    $rootScope.$on('ltbapi:mystacks-loaded', function (){
        _this.myStacks = callApi.state.mystacks;
		deblog('mystacks', callApi.state.mystacks);
    });

    $rootScope.$on('ltbapi:getFavourites-loaded', function (){
        _this.myFavourites = callApi.state.favourites;
    });
    
    //local function to init the stacks: owned stacks and favourite stacks
    this.init = function () {
        callApi.getMyStacks();
        callApi.getFavourites();
    };
    this.init();
    
}]);
