'use strict';

angular.module('LTBApp.favStack', ['ngRoute'])

.config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/favourites', {
            templateUrl:path_root +  'modules/stack-app/stack-favourites.html',
            controller: 'StackFavouritesController',
            controllerAs: 'favStackCtrl'
        });
    }])

.controller('StackFavouritesController', ['$scope', '$http', 'callApi', '$location','$rootScope', 'sharedFunctions', 
    function ($scope, $http, callApi, $location, $rootScope, sharedFunctions) {

    this.favourites = [];
    
    var _this = this;
    
    this.init = function(){
        callApi.getFavourites();
        this.favourites = callApi.state.favourites;
    
        this.manage = false;
    
        this.loading = callApi.loading_queue;
        $rootScope.$on('ltbapi:getFavourites-loaded', function () {
            _this.favourites = callApi.state.favourites;//angular.copy(callApi.state.favourites);
        });
        
    };
    
    if (callApi.initialised){
        this.init();
    } else {
        $rootScope.$on('settings:update', function(){
            _this.init()
        });
    }

    this.selectStack = function(stackSelected) {
        callApi.getStack(stackSelected.stack_code);
        $location.path("/");
    };
    
    this.removeFromFavourites = function(selected_favourite) {
        callApi.deleteFavouriteStack(selected_favourite);
    };
    
    this.addToFavourites = function(selected_favourite) {
        callApi.setFavouriteStack(selected_favourite);
    };
    
    this.cancel = function () {
        deblog("Redirecting to root in myFavouriteStack.cancel. ");
        $location.path("/");
    };
}])

.controller('favouritePopupController', ['callApi', 'alerts', function (callApi, alerts) {
    
    this.favourite = function (force) {
        if(force !== false){
            callApi.setFavouriteStack(callApi.state.stackfields)
        }
        alerts.favourite(false);
    };  
	

}])

.directive("appFavourite", function() {
    return {
      restrict: "E",
      controller: 'favouritePopupController',
      controllerAs: 'favPCtrl',
      templateUrl: path_root + "modules/stack-app/popup-favourite.html"
    };
});
